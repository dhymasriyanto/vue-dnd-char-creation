<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { BUILTIN_RULES, findBuiltinRule, formatPrerequisite, format5eEntries, renderAnnotatedText } from '../utils/textRenderer'
import { useConfig } from '../config'
import { useCompendiumModal } from '../composables/useCompendiumModal'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { IconExternalLink } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const { openCompendiumModal } = useCompendiumModal()
const { openCompendium } = useCompendiumNav()

const isVisible = ref(false)
const popoverTitle = ref('')
const popoverBadge = ref('')
const popoverSubtitle = ref('')
const popoverEntries = ref([])
const popoverStats = ref([])
const isLoading = ref(false)

const popoverX = ref(0)
const popoverY = ref(null)
const popoverBottom = ref(null)
const popoverPlacement = ref('top') // 'top' | 'bottom'

const cache = new Map()
let hoverTimeout = null
let closeTimeout = null
let currentAnchor = null

const formatRuleKey = (str) => {
  if (typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/[\s-]/g, '_')
}

const showTooltip = async (targetEl) => {
  if (!targetEl) return
  currentAnchor = targetEl

  const tag = (targetEl.getAttribute('data-tag') || '').toLowerCase().trim()
  const rawTarget = targetEl.getAttribute('data-target') || ''
  const source = targetEl.getAttribute('data-source') || ''
  const display = targetEl.getAttribute('data-display') || rawTarget

  const found = findBuiltinRule(rawTarget, display)

  popoverTitle.value = display || rawTarget
  popoverBadge.value = tag.toUpperCase()
  popoverSubtitle.value = source ? `Source: ${source.toUpperCase()}` : ''
  popoverEntries.value = []
  popoverStats.value = []

  if (found) {
    const builtin = found.rule
    isLoading.value = false
    popoverTitle.value = builtin.name || display || rawTarget
    popoverBadge.value = (builtin.badge || builtin.type || tag).toUpperCase()
    popoverSubtitle.value = builtin.type ? builtin.type.toUpperCase() : ''
    popoverEntries.value = builtin.entries || []
    updatePosition(targetEl)
    isVisible.value = true
    return
  }

  // Position calculation
  updatePosition(targetEl)
  isVisible.value = true

  // Network lookup with cache
  const cacheKey = `${tag}:${rawTarget.toLowerCase()}:${source.toLowerCase()}`
  if (cache.has(cacheKey)) {
    applyData(cache.get(cacheKey))
    updatePosition(targetEl)
    return
  }

  isLoading.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/lookup`, {
      params: {
        type: tag,
        name: rawTarget,
        source: source
      }
    })

    const payload = res.data?.data
    if (payload) {
      cache.set(cacheKey, payload)
      if (currentAnchor === targetEl) {
        applyData(payload)
      }
    } else {
      fallbackDisplay(rawTarget, tag)
    }
  } catch (err) {
    fallbackDisplay(rawTarget, tag)
  } finally {
    if (currentAnchor === targetEl) {
      isLoading.value = false
      updatePosition(targetEl)
    }
  }
}

const applyData = (data) => {
  isLoading.value = false
  popoverTitle.value = data.name || popoverTitle.value
  popoverBadge.value = (data.school || data.itemType || data.type || popoverBadge.value).toUpperCase()

  const sub = []
  if (data.level) sub.push(data.level)
  if (data.source) sub.push(data.source.toUpperCase())
  if (data.rarity) sub.push(data.rarity)
  popoverSubtitle.value = sub.join(' • ')

  const stats = []
  if (data.castingTime) stats.push({ label: 'Cast Time', value: data.castingTime })
  if (data.range) stats.push({ label: 'Range', value: data.range })
  if (data.duration) stats.push({ label: 'Duration', value: data.duration })
  if (data.components) stats.push({ label: 'Components', value: data.components })
  if (data.weight) stats.push({ label: 'Weight', value: `${data.weight} lb` })
  if (data.value) stats.push({ label: 'Value', value: data.value })
  if (data.prerequisite) stats.push({ label: 'Prerequisite', value: formatPrerequisite(data.prerequisite) })
  popoverStats.value = stats

  if (data.entries) {
    if (typeof data.entries === 'object' && !Array.isArray(data.entries)) {
      popoverEntries.value = [format5eEntries(data.entries)]
    } else if (Array.isArray(data.entries)) {
      popoverEntries.value = data.entries.map(e => typeof e === 'object' ? format5eEntries(e) : String(e))
    } else {
      popoverEntries.value = [String(data.entries)]
    }
  } else {
    popoverEntries.value = []
  }
}

const fallbackDisplay = (target, tag) => {
  isLoading.value = false
  popoverEntries.value = ['No detailed compendium entry found for this term.']
}

const updatePosition = (el) => {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const popoverWidth = Math.min(320, window.innerWidth - 24)

  let left = rect.left + rect.width / 2 - popoverWidth / 2
  left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12))

  if (rect.top > 210) {
    popoverPlacement.value = 'top'
    popoverY.value = null
    popoverBottom.value = Math.max(12, Math.round(window.innerHeight - rect.top + 8))
  } else {
    popoverPlacement.value = 'bottom'
    popoverY.value = Math.round(rect.bottom + 8)
    popoverBottom.value = null
  }

  popoverX.value = Math.round(left)
}

const hideTooltip = () => {
  isVisible.value = false
  currentAnchor = null
  isLoading.value = false
}

const onGlobalMouseOver = (e) => {
  const popoverEl = e.target.closest('.dnd-tooltip-popover')
  if (popoverEl) {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
    return
  }

  const refEl = e.target.closest('.dnd-tag-ref')
  if (refEl) {
    if (refEl.classList.contains('dnd-filter-link') || refEl.getAttribute('data-tag') === 'filter') {
      return
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
    if (currentAnchor === refEl && isVisible.value) return

    clearTimeout(hoverTimeout)
    hoverTimeout = setTimeout(() => {
      showTooltip(refEl)
    }, 100)
  }
}

const onGlobalMouseOut = (e) => {
  const refEl = e.target.closest('.dnd-tag-ref')
  if (refEl) {
    if (e.relatedTarget && (refEl.contains(e.relatedTarget) || e.relatedTarget.closest?.('.dnd-tooltip-popover'))) {
      return
    }
    clearTimeout(hoverTimeout)
    closeTimeout = setTimeout(() => {
      hideTooltip()
    }, 250)
  }
}

const parseFilterParams = (queryStr) => {
  const params = {}
  if (!queryStr) return params
  const pairs = queryStr.split('&')
  for (const pair of pairs) {
    if (!pair) continue
    const [k, v] = pair.split('=')
    if (k) {
      params[k.trim()] = v ? decodeURIComponent(v.trim()) : true
    }
  }
  return params
}

const openFilterModalFromElement = (el) => {
  const category = (el.getAttribute('data-filter-category') || 'spells').toLowerCase()
  const queryStr = el.getAttribute('data-filter-query') || ''
  const display = el.getAttribute('data-display') || el.innerText || 'Compendium List'
  const params = parseFilterParams(queryStr)

  openCompendiumModal({
    title: display,
    category,
    params
  })
}

const openInCompendiumFromPopover = () => {
  if (!currentAnchor) return
  const tag = (currentAnchor.getAttribute('data-tag') || '').toLowerCase().trim()
  const rawTarget = currentAnchor.getAttribute('data-target') || popoverTitle.value
  const isFilter = currentAnchor.classList.contains('dnd-filter-link') || tag === 'filter'

  hideTooltip()

  if (isFilter) {
    openFilterModalFromElement(currentAnchor)
    return
  }

  let category = 'all'
  if (tag === 'spell') category = 'spells'
  else if (tag === 'item') category = 'items'
  else if (tag === 'feat') category = 'feats'
  else if (['rule', 'variantrule', 'action', 'condition', 'status', 'skill', 'sense'].includes(tag)) category = 'rules'
  else if (['optfeature', 'optionalfeature'].includes(tag)) category = 'optionalfeatures'
  else if (['monster', 'creature', 'bestiary'].includes(tag)) category = 'monsters'

  const url = `${window.location.origin}${window.location.pathname}?compendium=1&tab=${encodeURIComponent(category)}&search=${encodeURIComponent(rawTarget)}`
  window.open(url, '_blank')
}

const onGlobalClick = (e) => {
  const refEl = e.target.closest('.dnd-tag-ref')
  const popoverEl = e.target.closest('.dnd-tooltip-popover')
  const modalEl = e.target.closest('.dnd-compendium-modal')
  if (modalEl) return

  if (refEl) {
    const isFilterLink = refEl.classList.contains('dnd-filter-link') || refEl.getAttribute('data-tag') === 'filter'
    if (isFilterLink) {
      e.stopPropagation()
      hideTooltip()
      openFilterModalFromElement(refEl)
      return
    }

    e.stopPropagation()
    if (isVisible.value && currentAnchor === refEl) {
      hideTooltip()
    } else {
      showTooltip(refEl)
    }
    return
  }

  if (!popoverEl && isVisible.value) {
    hideTooltip()
  }
}

const onPopoverMouseEnter = () => {
  if (closeTimeout) {
    clearTimeout(closeTimeout)
    closeTimeout = null
  }
}

const onPopoverMouseLeave = (e) => {
  if (e?.relatedTarget && (currentAnchor?.contains(e.relatedTarget) || e.relatedTarget.closest?.('.dnd-tag-ref'))) {
    return
  }
  closeTimeout = setTimeout(() => {
    hideTooltip()
  }, 200)
}

onMounted(() => {
  document.addEventListener('mouseover', onGlobalMouseOver)
  document.addEventListener('mouseout', onGlobalMouseOut)
  document.addEventListener('click', onGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseover', onGlobalMouseOver)
  document.removeEventListener('mouseout', onGlobalMouseOut)
  document.removeEventListener('click', onGlobalClick)
  if (hoverTimeout) clearTimeout(hoverTimeout)
  if (closeTimeout) clearTimeout(closeTimeout)
})
</script>

<template>
  <div
    v-if="isVisible"
    class="dnd-tooltip-popover fixed z-[9999] w-[320px] max-w-[calc(100vw-24px)] max-h-72 bg-white text-gray-800 border border-gray-200 rounded-md shadow-lg p-3 text-xs overflow-y-auto font-sans leading-relaxed pointer-events-auto"
    :style="{
      left: `${popoverX}px`,
      top: popoverY !== null ? `${popoverY}px` : 'auto',
      bottom: popoverBottom !== null ? `${popoverBottom}px` : 'auto'
    }"
    @mouseenter="onPopoverMouseEnter"
    @mouseleave="onPopoverMouseLeave"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 border-b border-gray-100 pb-1.5 mb-2">
      <div>
        <div class="font-bold text-gray-900 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
          <span>{{ popoverTitle }}</span>
          <span
            v-if="popoverBadge"
            class="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase"
          >
            {{ popoverBadge }}
          </span>
        </div>
        <div v-if="popoverSubtitle" class="text-[11px] text-gray-500 font-medium mt-0.5">
          {{ popoverSubtitle }}
        </div>
      </div>
      <button
        type="button"
        @click="hideTooltip"
        class="text-gray-400 hover:text-gray-700 text-base leading-none p-1 rounded hover:bg-gray-100"
        aria-label="Close"
      >
        &times;
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-4 text-center text-gray-500 flex items-center justify-center gap-2">
      <div class="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-[11px]">Loading rule details...</span>
    </div>

    <!-- Content -->
    <div v-else class="space-y-2">
      <!-- Quick Stats Grid (for spells / items) -->
      <div v-if="popoverStats.length > 0" class="grid grid-cols-2 gap-x-2 gap-y-1 bg-gray-50 p-1.5 rounded border border-gray-100 text-[11px]">
        <div v-for="stat in popoverStats" :key="stat.label">
          <span class="text-gray-500 font-medium">{{ stat.label }}: </span>
          <span class="text-gray-800">{{ stat.value }}</span>
        </div>
      </div>

      <!-- Description Entries -->
      <div v-if="popoverEntries.length > 0" class="space-y-1.5 text-gray-700">
        <div v-for="(entry, idx) in popoverEntries" :key="idx" class="leading-relaxed" v-html="renderAnnotatedText(entry)"></div>
      </div>
      <div v-else class="text-gray-400 italic text-[11px]">
        No detailed description available.
      </div>

      <!-- Action button for compendium -->
      <div class="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
        <span class="text-[10px] text-gray-400">Click outside to dismiss</span>
        <button
          type="button"
          @click="openInCompendiumFromPopover"
          class="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>Open in compendium</span>
          <IconExternalLink class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dnd-tooltip-popover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}
</style>
