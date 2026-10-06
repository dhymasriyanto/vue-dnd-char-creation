<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useCharacterStore } from '../stores/character'
import { useCompendiumModal } from '../composables/useCompendiumModal'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { renderAnnotatedText, formatPrerequisite, format5eEntries } from '../utils/textRenderer'
import { IconExternalLink } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const characterStore = useCharacterStore()
const { isOpen, modalTitle, modalCategory, modalParams, closeModal } = useCompendiumModal()
const { openCompendium } = useCompendiumNav()

const openFullCompendium = () => {
  const cat = modalCategory.value
  const search = searchQuery.value
  const url = `${window.location.origin}${window.location.pathname}?compendium=1&tab=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}`
  window.open(url, '_blank')
}

const onBackdropClick = (e) => {
  if (e.target.classList.contains('dnd-compendium-modal')) {
    closeModal()
  }
}

const isLoading = ref(false)
const rawItems = ref([])
const searchQuery = ref('')
const selectedSpellLevel = ref('all')
const expandedItemId = ref(null)

const spellLevelPills = [
  { label: 'All', value: 'all' },
  { label: 'Cantrip', value: 0 },
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
  { label: '6th', value: 6 },
  { label: '7th', value: 7 },
  { label: '8th', value: 8 },
  { label: '9th', value: 9 }
]

const fetchData = async () => {
  if (!isOpen.value) return
  isLoading.value = true
  rawItems.value = []
  searchQuery.value = ''
  expandedItemId.value = null

  const edition = characterStore.edition || '2024'
  const cat = modalCategory.value

  try {
    if (cat === 'spells') {
      const p = {
        edition,
        ...modalParams.value
      }
      if (modalParams.value.class) {
        p.className = modalParams.value.class
      }
      // If modalParams specified level e.g. level=0
      if (modalParams.value.level != null && modalParams.value.level !== '') {
        const num = Number(modalParams.value.level)
        if (!isNaN(num)) {
          selectedSpellLevel.value = num
        }
      } else {
        selectedSpellLevel.value = 'all'
      }

      const res = await axios.get(`${API_URL}/compendium/spells`, { params: p })
      rawItems.value = Array.isArray(res.data?.data) ? res.data.data : []
    } else if (cat === 'items') {
      const p = {
        edition,
        limit: 120,
        ...modalParams.value
      }
      const res = await axios.get(`${API_URL}/compendium/items`, { params: p })
      rawItems.value = Array.isArray(res.data?.data) ? res.data.data : []
    } else if (cat === 'feats') {
      const p = {
        edition,
        ...modalParams.value
      }
      const res = await axios.get(`${API_URL}/compendium/feats`, { params: p })
      rawItems.value = Array.isArray(res.data?.data) ? res.data.data : []
    } else if (cat === 'optionalfeatures' || cat === 'optfeatures' || cat === 'optional_features') {
      const p = {
        edition,
        ...modalParams.value
      }
      const res = await axios.get(`${API_URL}/compendium/optionalfeatures`, { params: p })
      rawItems.value = Array.isArray(res.data?.data) ? res.data.data : []
    }
  } catch (err) {
    console.warn('[WARN] Compendium modal fetch error:', err.message)
    rawItems.value = []
  } finally {
    isLoading.value = false
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    fetchData()
  } else {
    rawItems.value = []
    expandedItemId.value = null
  }
})

const filteredItems = computed(() => {
  let list = rawItems.value
  const q = searchQuery.value.trim().toLowerCase()

  if (modalCategory.value === 'spells' && selectedSpellLevel.value !== 'all') {
    const targetLvl = Number(selectedSpellLevel.value)
    list = list.filter(item => Number(item.level) === targetLvl)
  }

  if (q) {
    list = list.filter(item => {
      const name = (item.name || '').toLowerCase()
      const school = (item.school || '').toLowerCase()
      const featureTypeStr = Array.isArray(item.featureType) ? item.featureType.join(' ') : (item.featureType || '')
      const type = (item.type || item.itemType || featureTypeStr).toLowerCase()
      return name.includes(q) || school.includes(q) || type.includes(q)
    })
  }

  return list
})

const toggleExpand = (id) => {
  expandedItemId.value = expandedItemId.value === id ? null : id
}

const formatSpellLevel = (level) => {
  const lvl = Number(level)
  if (lvl === 0) return 'Cantrip'
  if (lvl === 1) return '1st Level'
  if (lvl === 2) return '2nd Level'
  if (lvl === 3) return '3rd Level'
  return `${lvl}th Level`
}

const formatEntries = (entries) => {
  return format5eEntries(entries)
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && isOpen.value) {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    v-if="isOpen"
    class="dnd-compendium-modal fixed inset-0 z-[10000] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    @click="onBackdropClick"
  >
    <div
      @click.stop
      class="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col text-xs text-gray-800 overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/70">
        <div class="min-w-0">
          <h2 class="font-semibold text-gray-900 text-sm truncate">
            {{ modalTitle }}
          </h2>
          <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
            <span class="uppercase tracking-wider font-medium text-indigo-600">{{ modalCategory }}</span>
            <span>•</span>
            <span>Edition {{ characterStore.edition || '2024' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openFullCompendium"
            class="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 border border-indigo-200 transition cursor-pointer flex items-center gap-1"
          >
            <span>Full Page</span>
            <IconExternalLink class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            @click.stop="closeModal"
            class="text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer text-xs font-bold"
            aria-label="Close"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="p-3 border-b border-gray-100 space-y-2.5 bg-white">
        <!-- Search Input -->
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter by name, type, or school..."
          class="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded focus:border-indigo-500 focus:outline-none"
        />

        <!-- Level Pills (Spells only) -->
        <div
          v-if="modalCategory === 'spells'"
          class="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar"
        >
          <button
            v-for="pill in spellLevelPills"
            :key="pill.value"
            type="button"
            @click="selectedSpellLevel = pill.value"
            :class="[
              'px-2 py-0.5 rounded transition-colors whitespace-nowrap cursor-pointer',
              selectedSpellLevel === pill.value
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            {{ pill.label }}
          </button>
        </div>
      </div>

      <!-- Modal Body (List) -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-100">
        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 text-center text-gray-500 space-y-2">
          <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs">Loading compendium entries...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredItems.length === 0" class="py-12 text-center text-gray-500">
          <p class="text-xs">No entries found matching filters.</p>
        </div>

        <!-- Items Rows -->
        <div
          v-for="item in filteredItems"
          :key="item.id || item.name"
          class="pt-2 first:pt-0"
        >
          <div
            @click="toggleExpand(item.id || item.name)"
            class="flex items-start justify-between gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
          >
            <div class="min-w-0">
              <div class="font-medium text-gray-900 text-xs flex items-center gap-1.5 flex-wrap">
                <span>{{ item.name }}</span>
                <span
                  v-if="item.source"
                  class="text-[10px] text-gray-400 font-normal uppercase"
                >
                  [{{ item.source }}]
                </span>
              </div>

              <!-- Spell Meta -->
              <div
                v-if="modalCategory === 'spells'"
                class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap"
              >
                <span>{{ formatSpellLevel(item.level) }}</span>
                <span>•</span>
                <span class="capitalize">{{ item.school || 'Magic' }}</span>
                <span v-if="item.time?.[0]">
                  • {{ item.time[0].number }} {{ item.time[0].unit }}
                </span>
                <span v-if="item.duration?.[0]">
                  • {{ item.duration[0].type || 'Instant' }}
                </span>
              </div>

              <!-- Item Meta -->
              <div
                v-else-if="modalCategory === 'items'"
                class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap"
              >
                <span class="capitalize">{{ item.type || item.itemType || 'Item' }}</span>
                <span v-if="item.damageDice || item.dmg1">• {{ item.damageDice || item.dmg1 }}</span>
                <span v-if="item.ac || item.baseAc">• AC {{ item.ac || item.baseAc }}</span>
                <span v-if="item.value || item.costCp">• {{ item.value ? `${item.value} cp` : '' }}</span>
              </div>

              <!-- Feat Meta -->
              <div
                v-else-if="modalCategory === 'feats'"
                class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap"
              >
                <span v-if="item.category" class="capitalize">{{ item.category }} Feat</span>
                <span v-if="item.prerequisite">• Req: {{ formatPrerequisite(item.prerequisite) }}</span>
              </div>

              <!-- Optional Feature Meta -->
              <div
                v-else-if="modalCategory === 'optionalfeatures' || modalCategory === 'optfeatures' || modalCategory === 'optional_features'"
                class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap"
              >
                <span class="capitalize">
                  {{ item.featureType ? (Array.isArray(item.featureType) ? item.featureType.join(', ') : item.featureType) : 'Feature' }}
                </span>
                <span v-if="item.prerequisite">• Req: {{ formatPrerequisite(item.prerequisite) }}</span>
              </div>
            </div>

            <!-- Expand icon -->
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700 text-xs px-1"
            >
              {{ expandedItemId === (item.id || item.name) ? '▲' : '▼' }}
            </button>
          </div>

          <!-- Expanded Description -->
          <div
            v-if="expandedItemId === (item.id || item.name)"
            class="mt-1 mb-2 p-3 bg-gray-50/80 rounded border border-gray-100 text-xs text-gray-700 space-y-2 leading-relaxed"
          >
            <!-- Spell Details Table -->
            <div
              v-if="modalCategory === 'spells'"
              class="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-gray-200 text-[11px]"
            >
              <div>
                <span class="text-gray-400 block">Casting Time</span>
                <span class="font-medium text-gray-800">
                  {{ item.time?.[0] ? `${item.time[0].number} ${item.time[0].unit}` : (item.castingTime || '1 action') }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block">Range</span>
                <span class="font-medium text-gray-800">
                  {{ item.range?.type || item.range || 'Self' }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block">Components</span>
                <span class="font-medium text-gray-800">
                  {{ item.components ? (typeof item.components === 'string' ? item.components : 'V, S') : 'V, S' }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block">Duration</span>
                <span class="font-medium text-gray-800">
                  {{ item.duration?.[0] ? `${item.duration[0].concentration ? 'Concentration, ' : ''}${item.duration[0].type || ''}` : (item.duration || 'Instantaneous') }}
                </span>
              </div>
            </div>

            <!-- Full Text Entries -->
            <div
              class="prose-xs space-y-1.5"
              v-html="renderAnnotatedText(formatEntries(item.entries))"
            ></div>

            <!-- Higher levels if available -->
            <div v-if="item.entriesHigherLevel" class="pt-2 border-t border-gray-200 text-[11px]">
              <span class="font-semibold text-gray-800">At Higher Levels: </span>
              <span v-html="renderAnnotatedText(formatEntries(item.entriesHigherLevel))"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs bg-gray-50/50">
        <span class="text-gray-500">
          Showing {{ filteredItems.length }} {{ modalCategory }}
        </span>
        <button
          type="button"
          @click="closeModal"
          class="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded transition-colors cursor-pointer font-medium"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
