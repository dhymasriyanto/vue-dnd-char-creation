<script setup>
import { useCompendiumHomebrew } from '../composables/compendium/useCompendiumHomebrew'
import { useCompendiumSources } from '../composables/compendium/useCompendiumSources'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useCharacterStore } from '../stores/character'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { IconArrowLeft, IconX, IconPlus } from '@tabler/icons-vue'
import CompendiumHomebrewModal from './compendium/CompendiumHomebrewModal.vue'
import CompendiumDetailView from './compendium/CompendiumDetailView.vue'
import { getItemBadge } from '../utils/compendiumFormatters'
import { renderAnnotatedText, format5eEntries as formatEntries } from '../utils/textRenderer'

const API_URL = useConfig().API_URL
const characterStore = useCharacterStore()
const {
  isCompendiumOpen,
  compendiumCategory,
  compendiumSearch,
  compendiumParams,
  compendiumSelectedItem,
  closeCompendium
} = useCompendiumNav()

const currentEdition = ref(characterStore.edition || '2024')
const activeTab = ref('spells') // 'all' | 'spells' | 'items' | 'monsters' | 'feats' | 'rules' | 'optionalfeatures'
const searchQuery = ref('')
const isLoading = ref(false)
const rawList = ref([])
const selectedItem = ref(null)

// Specific sub-filters
const spellLevelFilter = ref('all')
const spellClassFilter = ref('all')
const itemTypeFilter = ref('all')
const monsterCrFilter = ref('all')
const monsterTypeFilter = ref('all')
const featCategoryFilter = ref('all')
const ruleCategoryFilter = ref('all')

const PAGE_SIZE = 60
const hasMore = ref(true)
const isLoadingMore = ref(false)
const allPage = ref(0)

// Homebrew state
// Homebrew Management Composable
const {
  showHomebrewModal,
  homebrewCategory,
  isSavingHomebrew,
  homebrewError,
  homebrewToast,
  homebrewForm,
  openCreateHomebrew,
  submitHomebrew,
  deleteHomebrewItem
} = useCompendiumHomebrew({
  API_URL,
  currentEdition,
  activeTab,
  rawList,
  selectedItem,
  fetchData: () => fetchData()
})
// Class Table & Subclass Detail state in Compendium
const classTableData = ref(null)
const isLoadingClassTable = ref(false)
const classViewTab = ref('features') // 'features' | 'table'
const selectedSubclass = ref(null)
const subclassDetail = ref(null)
const isLoadingSubclass = ref(false)
const inspectingClassFeature = ref(null)
const classTableCache = new Map()
const subclassCache = new Map()

const onListScroll = (e) => {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    if (hasMore.value && !isLoadingMore.value && !isLoading.value) {
      fetchMore()
    }
  }
}

const isItemSelected = (item) => {
  if (!selectedItem.value || !item) return false
  if (selectedItem.value === item) return true

  const cat1 = selectedItem.value._category || ''
  const cat2 = item._category || ''
  if (cat1 && cat2 && cat1 !== cat2) return false

  const id1 = selectedItem.value.id
  const id2 = item.id
  if (id1 && id2 && cat1 === cat2) {
    if (String(id1) !== String(id2)) return false
  }

  const name1 = (selectedItem.value.name || '').trim().toLowerCase()
  const name2 = (item.name || '').trim().toLowerCase()
  if (name1 !== name2) return false

  const src1 = (selectedItem.value.source || '').toUpperCase()
  const src2 = (item.source || '').toUpperCase()
  if (src1 && src2 && src1 !== src2) return false

  const ed1 = String(selectedItem.value.edition || '')
  const ed2 = String(item.edition || '')
  if (ed1 && ed2 && ed1 !== ed2) return false

  if (id1 && id2 && String(id1) === String(id2)) return true

  return (selectedItem.value.source || '') === (item.source || '')
}

// Source Books Selection Composable
const {
  selectedSources,
  isSourceDropdownOpen,
  sourceDropdownRef,
  currentCoreSourceList,
  currentExpandedSourceList,
  currentAllSources,
  isSourceSelected,
  toggleSource,
  setSourcesSelectAll,
  setSourcesCoreOnly,
  clearAllSources,
  sourceDropdownLabel,
  SOURCE_LABELS
} = useCompendiumSources({ currentEdition })
const monsterCrList = [
  { label: 'All CRs', value: 'all' },
  { label: 'CR 0', value: '0' },
  { label: 'CR 1/8', value: '1/8' },
  { label: 'CR 1/4', value: '1/4' },
  { label: 'CR 1/2', value: '1/2' },
  { label: 'CR 1', value: '1' },
  { label: 'CR 2', value: '2' },
  { label: 'CR 3', value: '3' },
  { label: 'CR 4', value: '4' },
  { label: 'CR 5', value: '5' },
  { label: 'CR 6', value: '6' },
  { label: 'CR 7', value: '7' },
  { label: 'CR 8', value: '8' },
  { label: 'CR 9', value: '9' },
  { label: 'CR 10', value: '10' },
  { label: 'CR 11-15', value: '11' },
  { label: 'CR 16-20', value: '16' },
  { label: 'CR 20+', value: '20' }
]

const monsterTypeList = [
  { label: 'All Creature Types', value: 'all' },
  { label: 'Aberration', value: 'aberration' },
  { label: 'Beast', value: 'beast' },
  { label: 'Celestial', value: 'celestial' },
  { label: 'Construct', value: 'construct' },
  { label: 'Dragon', value: 'dragon' },
  { label: 'Elemental', value: 'elemental' },
  { label: 'Fey', value: 'fey' },
  { label: 'Fiend', value: 'fiend' },
  { label: 'Giant', value: 'giant' },
  { label: 'Humanoid', value: 'humanoid' },
  { label: 'Monstrosity', value: 'monstrosity' },
  { label: 'Ooze', value: 'ooze' },
  { label: 'Plant', value: 'plant' },
  { label: 'Undead', value: 'undead' }
]

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

const spellClasses = [
  { label: 'All Classes', value: 'all' },
  { label: 'Artificer', value: 'artificer' },
  { label: 'Bard', value: 'bard' },
  { label: 'Cleric', value: 'cleric' },
  { label: 'Druid', value: 'druid' },
  { label: 'Paladin', value: 'paladin' },
  { label: 'Ranger', value: 'ranger' },
  { label: 'Sorcerer', value: 'sorcerer' },
  { label: 'Warlock', value: 'warlock' },
  { label: 'Wizard', value: 'wizard' }
]

const itemTypes = [
  { label: 'All Items', value: 'all' },
  { label: 'Weapons', value: 'weapon' },
  { label: 'Armor & Shields', value: 'armor' },
  { label: 'Tools & Kits', value: 'tool' },
  { label: 'Adventuring Gear', value: 'gear' },
  { label: 'Vehicles', value: 'vehicle' },
  { label: 'Mounts', value: 'mount' },
  { label: 'Wondrous Items', value: 'wondrous' },
  { label: 'Consumables & Potions', value: 'consumable' }
]

const featCategories = [
  { label: 'All Feats', value: 'all' },
  { label: 'Origin', value: 'O' },
  { label: 'General', value: 'G' },
  { label: 'Fighting Style', value: 'FS' },
  { label: 'Epic Boon', value: 'EB' }
]

const ruleCategories = [
  { label: 'All Rules', value: 'all' },
  { label: 'Rules & Glossary', value: 'rule' },
  { label: 'Vehicles & Ships', value: 'vehicle' },
  { label: 'Actions', value: 'action' },
  { label: 'Conditions & Status', value: 'condition' },
  { label: 'Skills', value: 'skill' },
  { label: 'Senses', value: 'sense' },
  { label: 'Traps & Hazards', value: 'hazard' },
  { label: 'Languages', value: 'language' },
  { label: 'Diseases', value: 'disease' },
  { label: 'Damage Types', value: 'damage type' }
]

const normalizeKey = (s) => (s || '').toLowerCase().replace(/['’]/g, '').trim()

const initFromNavState = () => {
  if (compendiumCategory.value) {
    activeTab.value = compendiumCategory.value
  }
  if (compendiumSearch.value) {
    searchQuery.value = compendiumSearch.value
  } else {
    searchQuery.value = ''
  }

  // Handle passed filter params (e.g. from class spell lists: { class: 'cleric' })
  if (compendiumParams.value) {
    if (compendiumParams.value.edition) {
      currentEdition.value = compendiumParams.value.edition
      selectedSources.value = getDefaultSources(compendiumParams.value.edition)
    }
    if (compendiumParams.value.source) {
      selectedSources.value = new Set([compendiumParams.value.source])
    }
    if (compendiumParams.value.class) {
      spellClassFilter.value = compendiumParams.value.class.toLowerCase()
    } else {
      spellClassFilter.value = 'all'
    }

    if (compendiumParams.value.level !== undefined && compendiumParams.value.level !== null && compendiumParams.value.level !== '') {
      const lvl = Number(compendiumParams.value.level)
      spellLevelFilter.value = isNaN(lvl) ? 'all' : lvl
    } else {
      spellLevelFilter.value = 'all'
    }
  }

  fetchData()
}

let searchDebounceTimeout = null
const onSearchInput = () => {
  clearTimeout(searchDebounceTimeout)
  searchDebounceTimeout = setTimeout(() => {
    fetchData()
  }, 220)
}

const clearSearch = () => {
  searchQuery.value = ''
  fetchData()
}

const setTab = (tab) => {
  activeTab.value = tab
  selectedItem.value = null
  fetchData()
}

const fetchData = async () => {
  isLoading.value = true
  hasMore.value = true
  const edition = currentEdition.value
  const q = searchQuery.value.trim()
  const sourcesArr = Array.from(selectedSources.value)

  if (sourcesArr.length === 0) {
    rawList.value = []
    hasMore.value = false
    isLoading.value = false
    return
  }

  const sourcesParam = sourcesArr.join(',')

  try {
    if (activeTab.value === 'spells') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q
      if (spellClassFilter.value !== 'all') params.className = spellClassFilter.value
      if (spellLevelFilter.value !== 'all') params.level = spellLevelFilter.value

      const res = await axios.get(`${API_URL}/compendium/spells`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'spells' }))
    } else if (activeTab.value === 'items') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q
      if (itemTypeFilter.value !== 'all') params.type = itemTypeFilter.value

      const res = await axios.get(`${API_URL}/compendium/items`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'items' }))
    } else if (activeTab.value === 'monsters') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q
      if (monsterCrFilter.value !== 'all') params.cr = monsterCrFilter.value
      if (monsterTypeFilter.value !== 'all') params.type = monsterTypeFilter.value

      const res = await axios.get(`${API_URL}/compendium/monsters`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'monsters' }))
    } else if (activeTab.value === 'feats') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q
      if (featCategoryFilter.value !== 'all') params.category = featCategoryFilter.value

      const res = await axios.get(`${API_URL}/compendium/feats`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'feats' }))
    } else if (activeTab.value === 'rules') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q
      if (ruleCategoryFilter.value !== 'all') params.category = ruleCategoryFilter.value

      const res = await axios.get(`${API_URL}/compendium/rules`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'rules' }))
    } else if (activeTab.value === 'optionalfeatures') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q

      const res = await axios.get(`${API_URL}/compendium/optionalfeatures`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'optionalfeatures' }))
    } else if (activeTab.value === 'backgrounds') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q

      const res = await axios.get(`${API_URL}/compendium/backgrounds`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'backgrounds' }))
    } else if (activeTab.value === 'classes') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q

      const res = await axios.get(`${API_URL}/compendium/classes`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'classes' }))
    } else if (activeTab.value === 'races') {
      const params = { edition, limit: PAGE_SIZE, offset: 0, sources: sourcesParam }
      if (q) params.search = q

      const res = await axios.get(`${API_URL}/compendium/races`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'races' }))
    } else if (activeTab.value === 'all') {
      allPage.value = 1
      const baseParams = { edition, sources: sourcesParam }
      if (q) baseParams.search = q
      const [classesRes, racesRes, spellsRes, itemsRes, monstersRes, featsRes, rulesRes, optRes, bgRes] = await Promise.all([
        axios.get(`${API_URL}/compendium/classes`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/races`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/spells`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/items`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/monsters`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/feats`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/rules`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/optionalfeatures`, { params: { ...baseParams, limit: 20, offset: 0 } }),
        axios.get(`${API_URL}/compendium/backgrounds`, { params: { ...baseParams, limit: 20, offset: 0 } })
      ])

      const classes = (Array.isArray(classesRes.data?.data) ? classesRes.data.data : []).map(i => ({ ...i, _category: 'classes' }))
      const races = (Array.isArray(racesRes.data?.data) ? racesRes.data.data : []).map(i => ({ ...i, _category: 'races' }))
      const spells = (Array.isArray(spellsRes.data?.data) ? spellsRes.data.data : []).map(i => ({ ...i, _category: 'spells' }))
      const items = (Array.isArray(itemsRes.data?.data) ? itemsRes.data.data : []).map(i => ({ ...i, _category: 'items' }))
      const monsters = (Array.isArray(monstersRes.data?.data) ? monstersRes.data.data : []).map(i => ({ ...i, _category: 'monsters' }))
      const feats = (Array.isArray(featsRes.data?.data) ? featsRes.data.data : []).map(i => ({ ...i, _category: 'feats' }))
      const rules = (Array.isArray(rulesRes.data?.data) ? rulesRes.data.data : []).map(i => ({ ...i, _category: 'rules' }))
      const optFeatures = (Array.isArray(optRes.data?.data) ? optRes.data.data : []).map(i => ({ ...i, _category: 'optionalfeatures' }))
      const backgrounds = (Array.isArray(bgRes.data?.data) ? bgRes.data.data : []).map(i => ({ ...i, _category: 'backgrounds' }))

      const combined = [...classes, ...races, ...spells, ...items, ...monsters, ...feats, ...rules, ...optFeatures, ...backgrounds]
      const anyHasMore = [classesRes, racesRes, spellsRes, itemsRes, monstersRes, featsRes, rulesRes, optRes, bgRes].some(
        r => (r.data?.data?.length || 0) >= 20
      )
      hasMore.value = anyHasMore

      const seen = new Set()
      rawList.value = combined.filter(item => {
        const key = `${item._category}:${item.id ?? item.name}:${item.source || ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    if (sourcesArr.length > 0) {
      const srcUpper = new Set(sourcesArr.map(s => s.toUpperCase()))
      rawList.value = rawList.value.filter(item => {
        if (!item.source) return true
        return srcUpper.has(item.source.toUpperCase())
      })
    }

    // Auto-select initial or matching item
    if (compendiumSelectedItem.value) {
      const match = rawList.value.find(i => normalizeKey(i.name) === normalizeKey(compendiumSelectedItem.value.name || compendiumSelectedItem.value))
      selectedItem.value = match || rawList.value[0] || null
    } else if (searchQuery.value && rawList.value.length > 0) {
      const match = rawList.value.find(i => normalizeKey(i.name) === normalizeKey(searchQuery.value))
      selectedItem.value = match || rawList.value[0]
    } else if (!selectedItem.value && rawList.value.length > 0) {
      selectedItem.value = rawList.value[0]
    }
  } catch (err) {
    console.error('Failed to fetch compendium data:', err)
    rawList.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchMore = async () => {
  if (!hasMore.value || isLoadingMore.value || isLoading.value) return

  isLoadingMore.value = true
  const edition = currentEdition.value
  const q = searchQuery.value.trim()
  const sourcesArr = Array.from(selectedSources.value)
  if (sourcesArr.length === 0) {
    isLoadingMore.value = false
    hasMore.value = false
    return
  }
  const sourcesParam = sourcesArr.join(',')

  try {
    if (activeTab.value === 'all') {
      const offset = allPage.value * 20
      allPage.value++
      const baseParams = { edition, limit: 20, offset, sources: sourcesParam }
      if (q) baseParams.search = q

      const [classesRes, racesRes, spellsRes, itemsRes, monstersRes, featsRes, rulesRes, optRes, bgRes] = await Promise.all([
        axios.get(`${API_URL}/compendium/classes`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/races`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/spells`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/items`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/monsters`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/feats`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/rules`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/optionalfeatures`, { params: baseParams }),
        axios.get(`${API_URL}/compendium/backgrounds`, { params: baseParams })
      ])

      const classes = (Array.isArray(classesRes.data?.data) ? classesRes.data.data : []).map(i => ({ ...i, _category: 'classes' }))
      const races = (Array.isArray(racesRes.data?.data) ? racesRes.data.data : []).map(i => ({ ...i, _category: 'races' }))
      const spells = (Array.isArray(spellsRes.data?.data) ? spellsRes.data.data : []).map(i => ({ ...i, _category: 'spells' }))
      const items = (Array.isArray(itemsRes.data?.data) ? itemsRes.data.data : []).map(i => ({ ...i, _category: 'items' }))
      const monsters = (Array.isArray(monstersRes.data?.data) ? monstersRes.data.data : []).map(i => ({ ...i, _category: 'monsters' }))
      const feats = (Array.isArray(featsRes.data?.data) ? featsRes.data.data : []).map(i => ({ ...i, _category: 'feats' }))
      const rules = (Array.isArray(rulesRes.data?.data) ? rulesRes.data.data : []).map(i => ({ ...i, _category: 'rules' }))
      const optFeatures = (Array.isArray(optRes.data?.data) ? optRes.data.data : []).map(i => ({ ...i, _category: 'optionalfeatures' }))
      const backgrounds = (Array.isArray(bgRes.data?.data) ? bgRes.data.data : []).map(i => ({ ...i, _category: 'backgrounds' }))

      const nextBatch = [...classes, ...races, ...spells, ...items, ...monsters, ...feats, ...rules, ...optFeatures, ...backgrounds]
      const existingKeys = new Set(rawList.value.map(i => `${i._category}:${i.id ?? i.name}:${i.source || ''}`))
      let uniqueNext = nextBatch.filter(i => !existingKeys.has(`${i._category}:${i.id ?? i.name}:${i.source || ''}`))
      if (sourcesArr.length > 0) {
        const srcUpper = new Set(sourcesArr.map(s => s.toUpperCase()))
        uniqueNext = uniqueNext.filter(item => !item.source || srcUpper.has(item.source.toUpperCase()))
      }

      const anyHasMore = [classesRes, racesRes, spellsRes, itemsRes, monstersRes, featsRes, rulesRes, optRes, bgRes].some(
        r => (r.data?.data?.length || 0) >= 20
      )
      hasMore.value = anyHasMore && uniqueNext.length > 0

      if (uniqueNext.length > 0) {
        rawList.value = [...rawList.value, ...uniqueNext]
      }
      return
    }

    const offset = rawList.value.length
    let endpoint = ''
    const params = { edition, limit: PAGE_SIZE, offset, sources: sourcesParam }
    if (q) params.search = q

    if (activeTab.value === 'classes') {
      endpoint = `${API_URL}/compendium/classes`
    } else if (activeTab.value === 'races') {
      endpoint = `${API_URL}/compendium/races`
    } else if (activeTab.value === 'spells') {
      endpoint = `${API_URL}/compendium/spells`
      if (spellClassFilter.value !== 'all') params.className = spellClassFilter.value
      if (spellLevelFilter.value !== 'all') params.level = spellLevelFilter.value
    } else if (activeTab.value === 'items') {
      endpoint = `${API_URL}/compendium/items`
      if (itemTypeFilter.value !== 'all') params.type = itemTypeFilter.value
    } else if (activeTab.value === 'monsters') {
      endpoint = `${API_URL}/compendium/monsters`
      if (monsterCrFilter.value !== 'all') params.cr = monsterCrFilter.value
      if (monsterTypeFilter.value !== 'all') params.type = monsterTypeFilter.value
    } else if (activeTab.value === 'feats') {
      endpoint = `${API_URL}/compendium/feats`
      if (featCategoryFilter.value !== 'all') params.category = featCategoryFilter.value
    } else if (activeTab.value === 'rules') {
      endpoint = `${API_URL}/compendium/rules`
      if (ruleCategoryFilter.value !== 'all') params.category = ruleCategoryFilter.value
    } else if (activeTab.value === 'optionalfeatures') {
      endpoint = `${API_URL}/compendium/optionalfeatures`
    } else if (activeTab.value === 'backgrounds') {
      endpoint = `${API_URL}/compendium/backgrounds`
    }

    if (!endpoint) return

    const res = await axios.get(endpoint, { params })
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const mapped = list.map(item => ({ ...item, _category: activeTab.value }))

    const existingKeys = new Set(rawList.value.map(i => `${i._category}:${i.id ?? i.name}:${i.source || ''}`))
    let uniqueNext = mapped.filter(i => !existingKeys.has(`${i._category}:${i.id ?? i.name}:${i.source || ''}`))
    if (sourcesArr.length > 0) {
      const srcUpper = new Set(sourcesArr.map(s => s.toUpperCase()))
      uniqueNext = uniqueNext.filter(item => !item.source || srcUpper.has(item.source.toUpperCase()))
    }

    if (mapped.length < PAGE_SIZE || uniqueNext.length === 0) {
      hasMore.value = false
    }

    if (uniqueNext.length > 0) {
      rawList.value = [...rawList.value, ...uniqueNext]
    }
  } catch (err) {
    console.error('Failed to load more compendium entries:', err)
    hasMore.value = false
  } finally {
    isLoadingMore.value = false
  }
}

watch(isCompendiumOpen, (isOpen) => {
  if (isOpen) {
    initFromNavState()
  }
})

watch(currentEdition, (newEd) => {
  selectedSources.value = getDefaultSources(newEd)
  fetchData()
})

const handleBack = () => {
  closeCompendium(true)
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && isCompendiumOpen.value) {
    handleBack()
  }
}

const onClickOutside = (e) => {
  if (sourceDropdownRef.value && !sourceDropdownRef.value.contains(e.target)) {
    isSourceDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('click', onClickOutside)
  if (isCompendiumOpen.value) {
    initFromNavState()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div
    v-if="isCompendiumOpen"
    class="min-h-screen bg-gray-100 flex flex-col text-xs text-gray-800"
    :data-edition="currentEdition"
    :data-source="selectedSources.size > 0 ? Array.from(selectedSources)[0] : (currentEdition === '2024' ? 'XPHB' : 'PHB')"
  >
    <!-- Top Navigation Bar -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-3 shadow-xs">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <!-- Left: Back Button & Title -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="handleBack"
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <IconArrowLeft class="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 class="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Compendium Browser</span>
            </h1>
          </div>
        </div>

        <!-- Right: Edition Toggle & Close -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-medium">Edition:</span>
            <div class="inline-flex rounded border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                @click="currentEdition = '2024'"
                :class="[
                  'px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer',
                  currentEdition === '2024' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                2024 (Revised)
              </button>
              <button
                type="button"
                @click="currentEdition = '2014'"
                :class="[
                  'px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer',
                  currentEdition === '2014' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                2014 (Legacy)
              </button>
            </div>
          </div>
          <button
            type="button"
            @click="handleBack"
            class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded font-semibold text-xs transition cursor-pointer border border-gray-200 flex items-center gap-1"
          >
            <IconX class="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1 flex flex-col gap-4">
      <!-- Toolbar: Tabs & Search -->
      <div class="bg-white rounded border border-gray-200 p-3 sm:p-4 shadow-xs space-y-3">
        <!-- Category Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-100 no-scrollbar">
          <button
            type="button"
            @click="setTab('all')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            All
          </button>
          <button
            type="button"
            @click="setTab('classes')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'classes' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Classes
          </button>
          <button
            type="button"
            @click="setTab('races')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'races' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Species & Races
          </button>
          <button
            type="button"
            @click="setTab('spells')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'spells' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Spells
          </button>
          <button
            type="button"
            @click="setTab('items')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'items' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Items & Equipment
          </button>
          <button
            type="button"
            @click="setTab('monsters')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'monsters' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Monsters & Bestiary
          </button>
          <button
            type="button"
            @click="setTab('feats')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'feats' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Feats
          </button>
          <button
            type="button"
            @click="setTab('backgrounds')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'backgrounds' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Backgrounds
          </button>
          <button
            type="button"
            @click="setTab('rules')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'rules' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Rules & Glossary
          </button>
          <button
            type="button"
            @click="setTab('optionalfeatures')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'optionalfeatures' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Optional Features
          </button>
        </div>

        <!-- Search Bar & Filters -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <!-- Universal Search Input -->
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Search by name, rule, type, or property..."
              class="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:border-gray-900 focus:outline-none text-xs"
            />
            <svg class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <button
              v-if="searchQuery"
              type="button"
              @click="clearSearch"
              class="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              aria-label="Clear search"
            >
              <IconX class="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            @click="openCreateHomebrew"
            class="px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Create Homebrew</span>
          </button>

          <!-- Source Multi-Select Checklist Dropdown -->
          <div class="relative min-w-[140px]" ref="sourceDropdownRef">
            <button
              type="button"
              @click="isSourceDropdownOpen = !isSourceDropdownOpen"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-800 hover:bg-white flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
            >
              <span class="truncate">{{ sourceDropdownLabel }}</span>
              <svg
                class="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform"
                :class="isSourceDropdownOpen ? 'rotate-180' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="isSourceDropdownOpen"
              class="absolute left-0 md:right-0 md:left-auto top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 space-y-2 text-xs"
            >
              <!-- Quick Action Buttons -->
              <div class="flex items-center justify-between border-b border-gray-100 pb-1.5 text-[11px]">
                <button
                  type="button"
                  @click="setSourcesCoreOnly"
                  class="text-gray-700 hover:text-black font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-gray-100"
                >
                  Core Only
                </button>
                <button
                  type="button"
                  @click="setSourcesSelectAll"
                  class="text-gray-700 hover:text-black font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-gray-100"
                >
                  Select All
                </button>
                <button
                  type="button"
                  @click="clearAllSources"
                  class="text-red-600 hover:text-red-800 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-50"
                >
                  Clear
                </button>
              </div>

              <!-- Sources List -->
              <div class="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
                <!-- Core Section -->
                <div class="space-y-0.5">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 pt-0.5">
                    Core {{ currentEdition }}
                  </div>
                  <label
                    v-for="src in currentCoreSourceList"
                    :key="src.code"
                    class="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer text-gray-800 select-none"
                  >
                    <input
                      type="checkbox"
                      :checked="isSourceSelected(src.code)"
                      @change="toggleSource(src.code)"
                      class="rounded text-gray-900 focus:ring-0 cursor-pointer"
                    />
                    <span class="font-mono font-bold text-[11px] text-gray-900 w-14 shrink-0">{{ src.code }}</span>
                    <span class="truncate text-[11px] text-gray-600">{{ src.label }}</span>
                  </label>
                </div>

                <!-- Expanded / Supplements Section -->
                <div v-if="currentExpandedSourceList.length" class="space-y-0.5 pt-1.5">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                    {{ currentEdition === '2024' ? 'Expanded / Legacy (2014)' : 'Supplements & Settings' }}
                  </div>
                  <label
                    v-for="src in currentExpandedSourceList"
                    :key="src.code"
                    class="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer text-gray-800 select-none"
                  >
                    <input
                      type="checkbox"
                      :checked="isSourceSelected(src.code)"
                      @change="toggleSource(src.code)"
                      class="rounded text-gray-900 focus:ring-0 cursor-pointer"
                    />
                    <span class="font-mono font-bold text-[11px] text-gray-700 w-14 shrink-0">{{ src.code }}</span>
                    <span class="truncate text-[11px] text-gray-600">{{ src.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Spells Sub-filters: Class Dropdown -->
          <div v-if="activeTab === 'spells'" class="flex items-center gap-2 min-w-[130px]">
            <v-select
              v-model="spellClassFilter"
              :options="spellClasses"
              :reduce="cls => cls.value"
              label="label"
              :clearable="false"
              class="w-full"
              @update:model-value="fetchData"
            />
          </div>

          <!-- Items Sub-filters -->
          <div v-if="activeTab === 'items'" class="flex items-center gap-2 min-w-[130px]">
            <v-select
              v-model="itemTypeFilter"
              :options="itemTypes"
              :reduce="t => t.value"
              label="label"
              :clearable="false"
              class="w-full"
              @update:model-value="fetchData"
            />
          </div>

          <!-- Monsters Sub-filters: CR and Type -->
          <div v-if="activeTab === 'monsters'" class="flex items-center gap-2 flex-wrap">
            <v-select
              v-model="monsterCrFilter"
              :options="monsterCrList"
              :reduce="cr => cr.value"
              label="label"
              :clearable="false"
              class="min-w-[120px]"
              @update:model-value="fetchData"
            />
            <v-select
              v-model="monsterTypeFilter"
              :options="monsterTypeList"
              :reduce="mt => mt.value"
              label="label"
              :clearable="false"
              class="min-w-[120px]"
              @update:model-value="fetchData"
            />
          </div>

          <!-- Feats Sub-filters -->
          <div v-if="activeTab === 'feats'" class="flex items-center gap-2 min-w-[130px]">
            <v-select
              v-model="featCategoryFilter"
              :options="featCategories"
              :reduce="fc => fc.value"
              label="label"
              :clearable="false"
              class="w-full"
              @update:model-value="fetchData"
            />
          </div>

          <!-- Rules Sub-filters -->
          <div v-if="activeTab === 'rules'" class="flex items-center gap-2 min-w-[130px]">
            <v-select
              v-model="ruleCategoryFilter"
              :options="ruleCategories"
              :reduce="rc => rc.value"
              label="label"
              :clearable="false"
              class="w-full"
              @update:model-value="fetchData"
            />
          </div>
        </div>

        <!-- Spell Level Pills -->
        <div
          v-if="activeTab === 'spells'"
          class="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar pt-1"
        >
          <span class="text-gray-400 font-medium mr-1">Level:</span>
          <button
            v-for="pill in spellLevelPills"
            :key="pill.value"
            type="button"
            @click="spellLevelFilter = pill.value; fetchData()"
            :class="[
              'px-2 py-0.5 rounded transition cursor-pointer whitespace-nowrap',
              spellLevelFilter === pill.value
                ? 'bg-gray-900 text-white font-semibold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ pill.label }}
          </button>
        </div>
      </div>

      <!-- Two-Column Master / Detail View -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
        <!-- Left Column: Results List (5 cols on md) -->
        <div class="md:col-span-5 bg-white rounded border border-gray-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
          <div class="px-3 py-2 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <span class="text-gray-500 font-medium">
              Showing <strong class="text-gray-800">{{ rawList.length }}</strong> entries
              <span v-if="hasMore" class="text-gray-700 font-medium ml-1">(scroll for more)</span>
              <span v-else class="text-gray-400 font-normal ml-1">(all loaded)</span>
            </span>
            <div v-if="isLoadingMore" class="flex items-center gap-1.5 text-[11px] text-gray-700">
              <div class="w-3 h-3 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading more...</span>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-2">
            <div class="w-6 h-6 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs">Loading compendium entries...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="rawList.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-1">
            <svg class="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <p class="font-medium text-gray-600">No matching entries found</p>
            <p class="text-[11px]">Try adjusting your search query or filters.</p>
          </div>

          <!-- Results Scroll List -->
          <div
            v-else
            class="flex-1 overflow-y-auto divide-y divide-gray-100"
            @scroll="onListScroll"
          >
            <div
              v-for="item in rawList"
              :key="(item._category || '') + '_' + (item.id || item.name) + '_' + (item.source || '') + '_' + (item.edition || '')"
              @click="selectedItem = item"
              :class="[
                'p-3 cursor-pointer transition border-l-3',
                isItemSelected(item)
                  ? 'bg-gray-100 border-l-gray-900'
                  : 'hover:bg-gray-50 border-l-transparent'
              ]"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-bold text-gray-900 leading-tight">
                  {{ item.name }}
                </h3>
                <span
                  v-if="item.source"
                  class="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-100 text-gray-500 shrink-0"
                >
                  {{ item.source }}
                </span>
              </div>
              <div class="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
                <span class="font-medium text-gray-700 bg-gray-100 border border-gray-200 px-1 rounded">
                  {{ getItemBadge(item) }}
                </span>
                <span v-if="item.school">• {{ item.school }}</span>
                <span v-if="item.damageDice || item.dmg1">• {{ item.damageDice || item.dmg1 }}</span>
                <span v-if="item.time?.[0]">• {{ item.time[0].number }} {{ item.time[0].unit }}</span>
              </div>
            </div>

            <div v-if="isLoadingMore" class="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
              <div class="w-3.5 h-3.5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading more entries...</span>
            </div>
            <div v-else-if="hasMore" class="p-2 text-center border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                @click="fetchMore"
                class="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-xs transition cursor-pointer font-medium"
              >
                Load more entries
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Detail Card -->
        <CompendiumDetailView
          :selected-item="selectedItem"
          :current-edition="currentEdition"
          :selected-sources="selectedSources"
          @delete-homebrew="deleteHomebrewItem"
        />
      </div>
    </main>

    <!-- Homebrew Creation Modal -->
    <CompendiumHomebrewModal
      v-model:show="showHomebrewModal"
      v-model:homebrew-category="homebrewCategory"
      :homebrew-form="homebrewForm"
      :homebrew-error="homebrewError"
      :is-saving-homebrew="isSavingHomebrew"
      @submit="submitHomebrew"
    />

    <!-- Homebrew Toast Notification -->
    <transition name="fade">
      <div
        v-if="homebrewToast"
        class="fixed top-5 right-5 z-50 bg-gray-900 text-white text-xs px-3.5 py-2 rounded shadow-lg flex items-center gap-2"
      >
        <IconPlus class="w-4 h-4 text-emerald-400" />
        <span>{{ homebrewToast }}</span>
      </div>
    </transition>

    <!-- Class Feature Detail Modal in Compendium -->
    <div
      v-if="inspectingClassFeature"
      @click.self="inspectingClassFeature = null"
      class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-xs">
        <div class="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Level {{ inspectingClassFeature.level }} {{ inspectingClassFeature.isSubclassFeature ? ('Subclass Feature • ' + (inspectingClassFeature.subclassName || '')) : 'Feature' }}
            </span>
            <h4 class="font-bold text-sm text-gray-900">{{ inspectingClassFeature.name }}</h4>
          </div>
          <button
            type="button"
            @click="inspectingClassFeature = null"
            class="text-gray-400 hover:text-gray-700 p-1 cursor-pointer leading-none"
          >
            <IconX class="w-4 h-4" />
          </button>
        </div>
        <div
          class="p-4 overflow-y-auto space-y-2 text-xs text-gray-800 leading-relaxed"
          v-html="renderAnnotatedText(formatEntries(inspectingClassFeature.entries))"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
:deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}
:deep(li) {
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}
:deep(p) {
  margin-bottom: 0.4rem;
}
:deep(p:last-child) {
  margin-bottom: 0;
}
</style>
