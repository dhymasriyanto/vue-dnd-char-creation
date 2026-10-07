<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { formatPrerequisite, format5eEntries, renderAnnotatedText, synthesizeItemEntries } from '../utils/textRenderer'
import { useConfig } from '../config'
import { useCharacterStore } from '../stores/character'
import { useCompendiumModal } from '../composables/useCompendiumModal'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { IconExternalLink, IconX } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const characterStore = useCharacterStore()
const { openCompendiumModal } = useCompendiumModal()
const { openCompendium } = useCompendiumNav()

const isVisible = ref(false)
const popoverTitle = ref('')
const popoverBadge = ref('')
const popoverSubtitle = ref('')
const popoverEntries = ref([])
const popoverStats = ref([])
const popoverCompendiumUrl = ref('')
const isLoading = ref(false)

const popoverX = ref(0)
const popoverY = ref(null)
const popoverBottom = ref(null)
const popoverPlacement = ref('top') // 'top' | 'bottom'

const cache = new Map()
let hoverTimeout = null
let closeTimeout = null
let currentAnchor = null
let isOverAnchor = false
let isOverPopover = false

const showTooltip = async (targetEl) => {
  if (!targetEl) return
  currentAnchor = targetEl

  const tag = (targetEl.getAttribute('data-tag') || '').toLowerCase().trim()
  const rawTarget = targetEl.getAttribute('data-target') || ''
  let source = (targetEl.getAttribute('data-source') || '').trim()
  const display = targetEl.getAttribute('data-display') || rawTarget

  const containerEdition = targetEl.closest?.('[data-edition]')?.getAttribute('data-edition')
  const edition = containerEdition || characterStore.edition || '2024'

  if (!source) {
    const containerSource = targetEl.closest?.('[data-source]')?.getAttribute('data-source')
    if (containerSource && containerSource !== 'all') {
      source = containerSource
    } else if (characterStore.selectedSources && characterStore.selectedSources.length > 0) {
      source = characterStore.selectedSources[0]
    } else {
      source = edition === '2024' ? 'XPHB' : 'PHB'
    }
  }

  let lookupTag = tag
  if (tag === 'filter') {
    const filterCat = (targetEl.getAttribute('data-filter-category') || 'rule').toLowerCase().trim()
    if (filterCat === 'spells') lookupTag = 'spell'
    else if (filterCat === 'items') lookupTag = 'item'
    else if (filterCat === 'feats') lookupTag = 'feat'
    else lookupTag = 'rule'
  }

  popoverTitle.value = display || rawTarget
  popoverBadge.value = lookupTag.toUpperCase()
  popoverSubtitle.value = source ? `Source: ${source.toUpperCase()}` : ''
  popoverEntries.value = []
  popoverStats.value = []

  let category = 'all'
  if (lookupTag === 'spell' || tag === 'spell') category = 'spells'
  else if (lookupTag === 'item' || tag === 'item') category = 'items'
  else if (lookupTag === 'feat' || tag === 'feat') category = 'feats'
  else if (['rule', 'variantrule', 'action', 'condition', 'status', 'skill', 'sense', 'vehicle', 'object', 'ship'].includes(lookupTag) || ['rule', 'variantrule', 'action', 'condition', 'status', 'skill', 'sense', 'vehicle', 'object', 'ship'].includes(tag)) category = 'rules'
  else if (['optfeature', 'optionalfeature'].includes(lookupTag) || ['optfeature', 'optionalfeature'].includes(tag)) category = 'optionalfeatures'
  else if (['monster', 'creature', 'bestiary'].includes(lookupTag) || ['monster', 'creature', 'bestiary'].includes(tag)) category = 'monsters'
  else if (['race', 'subrace'].includes(lookupTag) || ['race', 'subrace'].includes(tag)) category = 'races'
  else if (['class', 'subclass', 'classfeature', 'subclassfeature'].includes(lookupTag) || ['class', 'subclass', 'classfeature', 'subclassfeature'].includes(tag)) category = 'classes'
  else if (['background'].includes(lookupTag) || ['background'].includes(tag)) category = 'backgrounds'

  const filterQuery = targetEl.getAttribute('data-filter-query') || ''
  updateCompendiumUrl(rawTarget || display, category, edition, source, filterQuery)

  // Position calculation
  updatePosition(targetEl)
  isVisible.value = true

  // Network lookup with cache
  const cacheKey = `${lookupTag}:${rawTarget.toLowerCase()}:${source.toLowerCase()}:${edition}`
  if (cache.has(cacheKey)) {
    applyData(cache.get(cacheKey))
    return
  }

  isLoading.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/lookup`, {
      params: {
        type: lookupTag,
        name: rawTarget,
        source: source,
        edition: edition
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
    }
  }
}

const applyData = (data) => {
  isLoading.value = false
  popoverTitle.value = data.name || popoverTitle.value
  popoverBadge.value = (data.school || data.itemType || data.type || popoverBadge.value).toUpperCase()

  if (data.name && popoverCompendiumUrl.value) {
    try {
      const urlObj = new URL(popoverCompendiumUrl.value, window.location.origin)
      urlObj.searchParams.set('search', data.name)
      popoverCompendiumUrl.value = urlObj.toString()
    } catch (_) {}
  }

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

  // Damage with versatile handling
  const dmgBase = data.dmg1 || data.damageDice
  const dmgVersatile = data.dmg2 || data.versatileDice
  const dmgTypeStr = data.dmgType || ''
  let dmgVal = data.damage
  if (!dmgVal && dmgBase) {
    dmgVal = `${dmgBase}${dmgVersatile ? ' (Versatile ' + dmgVersatile + ')' : ''}${dmgTypeStr ? ' ' + dmgTypeStr : ''}`
  }
  if (dmgVal) stats.push({ label: 'Damage', value: dmgVal })

  // AC
  const acVal = data.ac || data.baseAc
  if (acVal && String(acVal) !== '0') stats.push({ label: 'AC', value: String(acVal) })

  // Mastery
  const masteryVal = Array.isArray(data.mastery)
    ? data.mastery.filter(Boolean).join(', ')
    : (data.mastery || null)
  if (masteryVal) stats.push({ label: 'Mastery', value: masteryVal })

  // Properties
  const propVal = Array.isArray(data.properties || data.property)
    ? (data.properties || data.property).filter(Boolean).join(', ')
    : (data.properties || data.property || null)
  if (propVal) stats.push({ label: 'Properties', value: propVal })

  if (data.weight) stats.push({ label: 'Weight', value: String(data.weight).includes('lb') ? data.weight : `${data.weight} lb` })
  if (data.cost || data.value) stats.push({ label: 'Cost', value: data.cost || (data.value ? `${data.value} cp` : '') })
  if (data.prerequisite) stats.push({ label: 'Prerequisite', value: formatPrerequisite(data.prerequisite) })
  popoverStats.value = stats

  const rawEntries = data.entries && (Array.isArray(data.entries) ? data.entries.length > 0 : true) ? data.entries : []
  if (rawEntries.length > 0) {
    popoverEntries.value = [format5eEntries(rawEntries)]
  } else {
    const synth = synthesizeItemEntries(data)
    if (synth.length > 0) {
      popoverEntries.value = [format5eEntries(synth)]
    } else {
      popoverEntries.value = []
    }
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
  isOverAnchor = false
  isOverPopover = false
}

const scheduleClose = () => {
  if (closeTimeout) clearTimeout(closeTimeout)
  closeTimeout = setTimeout(() => {
    if (!isOverAnchor && !isOverPopover) {
      hideTooltip()
    }
  }, 900)
}

const onGlobalMouseOver = (e) => {
  const popoverEl = e.target.closest('.dnd-tooltip-popover')
  if (popoverEl) {
    isOverPopover = true
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
    return
  }

  const refEl = e.target.closest('.dnd-tag-ref')
  if (refEl) {
    isOverAnchor = true
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
    if (currentAnchor === refEl && isVisible.value) return

    clearTimeout(hoverTimeout)
    hoverTimeout = setTimeout(() => {
      showTooltip(refEl)
    }, 120)
  }
}

const onGlobalMouseOut = (e) => {
  const popoverEl = e.target.closest('.dnd-tooltip-popover')
  if (popoverEl) {
    if (e.relatedTarget && (popoverEl.contains(e.relatedTarget) || (currentAnchor && currentAnchor.contains(e.relatedTarget)))) return
    isOverPopover = false
    scheduleClose()
    return
  }

  const refEl = e.target.closest('.dnd-tag-ref')
  if (refEl) {
    if (e.relatedTarget && (refEl.contains(e.relatedTarget) || (e.relatedTarget.closest && e.relatedTarget.closest('.dnd-tooltip-popover')))) return
    isOverAnchor = false
    clearTimeout(hoverTimeout)
    scheduleClose()
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

const updateCompendiumUrl = (target, category, edition, source, filterQuery = '') => {
  const params = new URLSearchParams()
  params.set('compendium', '1')
  params.set('tab', category || 'all')
  if (target) params.set('search', target)
  if (edition) params.set('edition', edition)
  if (source && source !== 'all') params.set('source', source)

  if (filterQuery) {
    const filterParams = parseFilterParams(filterQuery)
    for (const [k, v] of Object.entries(filterParams)) {
      if (v !== true && v !== false) params.set(k, String(v))
    }
  }

  const origin = window.location.origin || ''
  const pathname = window.location.pathname || '/'
  popoverCompendiumUrl.value = `${origin}${pathname}?${params.toString()}`
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

const onOpenInCompendium = (e) => {
  if (popoverCompendiumUrl.value) {
    try {
      window.open(popoverCompendiumUrl.value, '_blank', 'noopener,noreferrer')
    } catch (_) {}
  }
  setTimeout(() => {
    hideTooltip()
  }, 150)
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
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 border-b border-gray-100 pb-1.5 mb-2">
      <div>
        <div class="font-bold text-gray-900 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
          <span>{{ popoverTitle }}</span>
          <span
            v-if="popoverBadge"
            class="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200 uppercase"
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
        class="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <IconX class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-4 text-center text-gray-500 flex items-center justify-center gap-2">
      <div class="w-3.5 h-3.5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
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
        <a
          :href="popoverCompendiumUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop="onOpenInCompendium"
          class="text-[11px] font-semibold text-gray-800 hover:text-black hover:underline cursor-pointer flex items-center gap-1 select-none"
        >
          <span>Open in compendium</span>
          <IconExternalLink class="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dnd-tooltip-popover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}
:deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
:deep(li) {
  margin-top: 0.125rem;
  margin-bottom: 0.125rem;
}
:deep(p) {
  margin-bottom: 0.35rem;
}
:deep(p:last-child) {
  margin-bottom: 0;
}
</style>
