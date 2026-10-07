<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useCharacterStore } from '../stores/character'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import {
  renderAnnotatedText,
  clean5eToolsMarkup,
  formatPrerequisite,
  format5eEntries,
  formatBackgroundAbility,
  formatBackgroundFeats,
  formatBackgroundEquipment,
  formatProficiencies,
  formatFeatCategory,
  getItemCategoryAndRange,
  getItemExpandedProperties,
  getItemMastery,
  getItemArmorDetails,
  formatItemPropertyNames
} from '../utils/textRenderer'
import { IconArrowLeft, IconX } from '@tabler/icons-vue'

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
const sourceFilter = ref('all')
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

const sourceOptions2024 = [
  { label: 'All Sources', value: 'all' },
  { label: "XPHB (Player's Handbook 2024)", value: 'XPHB' },
  { label: "XDMG (DM Guide 2024)", value: 'XDMG' },
  { label: "XMM (Monster Manual 2024)", value: 'XMM' },
  { label: 'PHB (2014 Core)', value: 'PHB' },
  { label: 'DMG (2014 Core)', value: 'DMG' },
  { label: 'MM (2014 Core)', value: 'MM' },
  { label: 'MPMM (Multiverse)', value: 'MPMM' },
  { label: 'TCE (Tasha)', value: 'TCE' },
  { label: 'XGE (Xanathar)', value: 'XGE' },
  { label: 'FTD (Fizban)', value: 'FTD' },
  { label: 'BGG (Bigby)', value: 'BGG' },
  { label: 'ERLW (Eberron)', value: 'ERLW' },
  { label: 'SCAG (Sword Coast)', value: 'SCAG' },
  { label: 'GoS (Ghosts of Saltmarsh)', value: 'GoS' },
  { label: 'AAG (Spelljammer)', value: 'AAG' },
  { label: 'BGDIA (Descent into Avernus)', value: 'BGDIA' },
  { label: 'AI (Acquisitions Inc.)', value: 'AI' },
  { label: 'EGW (Wildemount)', value: 'EGW' },
  { label: 'VRGR (Van Richten)', value: 'VRGR' },
  { label: 'FRHoF (Heroes of Faerûn)', value: 'FRHoF' },
  { label: 'EFA (Elemental Evil / Eberron)', value: 'EFA' }
]

const sourceOptions2014 = [
  { label: 'All Sources', value: 'all' },
  { label: "PHB (Player's Handbook 2014)", value: 'PHB' },
  { label: 'DMG (Dungeon Master)', value: 'DMG' },
  { label: 'MM (Monster Manual)', value: 'MM' },
  { label: 'XGE (Xanathar)', value: 'XGE' },
  { label: 'TCE (Tasha)', value: 'TCE' },
  { label: 'SCAG (Sword Coast)', value: 'SCAG' },
  { label: 'VGM (Volo)', value: 'VGM' },
  { label: 'MTF (Mordenkainen)', value: 'MTF' },
  { label: 'MPMM (Multiverse)', value: 'MPMM' },
  { label: 'ERLW (Eberron)', value: 'ERLW' },
  { label: 'GoS (Ghosts of Saltmarsh)', value: 'GoS' },
  { label: 'AAG (Spelljammer)', value: 'AAG' },
  { label: 'BGDIA (Descent into Avernus)', value: 'BGDIA' },
  { label: 'AI (Acquisitions Inc.)', value: 'AI' },
  { label: 'EGW (Wildemount)', value: 'EGW' },
  { label: 'VRGR (Van Richten)', value: 'VRGR' }
]

const currentSourceOptions = computed(() => {
  return currentEdition.value === '2024' ? sourceOptions2024 : sourceOptions2014
})

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
    }
    if (compendiumParams.value.source) {
      sourceFilter.value = compendiumParams.value.source
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
  const src = sourceFilter.value !== 'all' ? sourceFilter.value : null

  try {
    if (activeTab.value === 'spells') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src
      if (spellClassFilter.value !== 'all') params.className = spellClassFilter.value
      if (spellLevelFilter.value !== 'all') params.level = spellLevelFilter.value

      const res = await axios.get(`${API_URL}/compendium/spells`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'spells' }))
    } else if (activeTab.value === 'items') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src
      if (itemTypeFilter.value !== 'all') params.type = itemTypeFilter.value

      const res = await axios.get(`${API_URL}/compendium/items`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'items' }))
    } else if (activeTab.value === 'monsters') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src
      if (monsterCrFilter.value !== 'all') params.cr = monsterCrFilter.value
      if (monsterTypeFilter.value !== 'all') params.type = monsterTypeFilter.value

      const res = await axios.get(`${API_URL}/compendium/monsters`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'monsters' }))
    } else if (activeTab.value === 'feats') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src
      if (featCategoryFilter.value !== 'all') params.category = featCategoryFilter.value

      const res = await axios.get(`${API_URL}/compendium/feats`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'feats' }))
    } else if (activeTab.value === 'rules') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src
      if (ruleCategoryFilter.value !== 'all') params.category = ruleCategoryFilter.value

      const res = await axios.get(`${API_URL}/compendium/rules`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'rules' }))
    } else if (activeTab.value === 'optionalfeatures') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src

      const res = await axios.get(`${API_URL}/compendium/optionalfeatures`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'optionalfeatures' }))
    } else if (activeTab.value === 'backgrounds') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src

      const res = await axios.get(`${API_URL}/compendium/backgrounds`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'backgrounds' }))
    } else if (activeTab.value === 'classes') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src

      const res = await axios.get(`${API_URL}/compendium/classes`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'classes' }))
    } else if (activeTab.value === 'races') {
      const params = { edition, limit: PAGE_SIZE, offset: 0 }
      if (q) params.search = q
      if (src) params.source = src

      const res = await axios.get(`${API_URL}/compendium/races`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      if (list.length < PAGE_SIZE) hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'races' }))
    } else if (activeTab.value === 'all') {
      allPage.value = 1
      const baseParams = { edition }
      if (q) baseParams.search = q
      if (src) baseParams.source = src
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

    if (src) {
      const srcUpper = src.toUpperCase()
      rawList.value = rawList.value.filter(item => {
        if (!item.source) return true
        return item.source.toUpperCase() === srcUpper
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
  const src = sourceFilter.value !== 'all' ? sourceFilter.value : null

  try {
    if (activeTab.value === 'all') {
      const offset = allPage.value * 20
      allPage.value++
      const baseParams = { edition, limit: 20, offset }
      if (q) baseParams.search = q
      if (src) baseParams.source = src

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
      if (src) {
        const srcUpper = src.toUpperCase()
        uniqueNext = uniqueNext.filter(item => !item.source || item.source.toUpperCase() === srcUpper)
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
    const params = { edition, limit: PAGE_SIZE, offset }
    if (q) params.search = q
    if (src) params.source = src

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
    const uniqueNext = mapped.filter(i => !existingKeys.has(`${i._category}:${i.id ?? i.name}:${i.source || ''}`))

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

watch(currentEdition, () => {
  fetchData()
})

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

const FEATURE_TYPE_NAMES = {
  EI: 'Eldritch Invocation',
  MM: 'Metamagic',
  MV: 'Maneuver',
  'MV:B': 'Maneuver',
  AI: 'Artificer Infusion',
  AS: 'Arcane Shot',
  FS: 'Fighting Style',
  'FS:F': 'Fighting Style',
  'FS:B': 'Fighting Style',
  'FS:R': 'Fighting Style',
  'FS:P': 'Fighting Style',
  RN: 'Rune',
  PB: 'Pact Boon',
  OR: 'Onomancy Resonant',
  ED: 'Elemental Discipline'
}

const formatFeatureType = (ft) => {
  if (!ft) return 'Optional Feature'
  const list = Array.isArray(ft) ? ft : [ft]
  const names = list.map(t => FEATURE_TYPE_NAMES[String(t).toUpperCase()] || String(t))
  return names.join(', ')
}

const ITEM_TYPE_MAP = {
  w: 'Weapon',
  weapon: 'Weapon',
  la: 'Light Armor',
  ma: 'Medium Armor',
  ha: 'Heavy Armor',
  s: 'Shield',
  armor: 'Armor',
  rg: 'Ring',
  rd: 'Rod',
  sc: 'Scroll',
  st: 'Staff',
  w_: 'Wand',
  wd: 'Wand',
  p: 'Potion',
  g: 'Adventuring Gear',
  gear: 'Adventuring Gear',
  t: 'Tool',
  tool: 'Tool',
  m: 'Melee Weapon',
  r: 'Ranged Weapon',
  vehicle: 'Vehicle',
  mount: 'Mount',
  ship: 'Ship'
}

const formatItemType = (item) => {
  if (!item) return 'Equipment'
  const cat = getItemCategoryAndRange(item)
  if (cat) return cat.replace(/\s*\(Range.*?\)/i, '')
  const t = item.itemType || (typeof item.type === 'string' ? item.type : '')
  if (!t) return 'Equipment'
  const key = t.toLowerCase().trim()
  return ITEM_TYPE_MAP[key] || t.charAt(0).toUpperCase() + t.slice(1)
}

const formatItemProperties = (props, versatileDice = null, weaponName = '') => {
  if (!props) return '—'
  const formatted = formatItemPropertyNames(props, versatileDice, weaponName)
  if (formatted && formatted.length > 0) return formatted.join(', ')
  const arr = Array.isArray(props) ? props : [props]
  return arr.map(p => clean5eToolsMarkup(String(p))).filter(Boolean).join(', ') || '—'
}

const formatRaceSize = (sz) => {
  if (!sz) return 'Medium'
  const list = Array.isArray(sz) ? sz : [sz]
  return list.map(s => SIZE_NAMES[String(s).toUpperCase()] || s).join(', ') || 'Medium'
}

const formatRaceTraits = (traits) => {
  if (!traits) return ''
  const list = Array.isArray(traits) ? traits : [traits]
  return list.map(t => {
    if (typeof t === 'string') return clean5eToolsMarkup(t)
    if (typeof t === 'object' && t !== null) {
      return t.name || t.entry || Object.keys(t).join(', ')
    }
    return String(t)
  }).filter(Boolean).join(', ')
}

const formatClassProf = (list) => {
  if (!list) return '—'
  const arr = Array.isArray(list) ? list : [list]
  return arr.map(item => {
    if (!item) return ''
    if (typeof item === 'object') {
      if (item.choose) {
        const from = (item.choose.from || []).map(formatClassProf).join(', ')
        return `Choose ${item.choose.count || 1} from ${from}`
      }
      return Object.keys(item).map(clean5eToolsMarkup).join(', ')
    }
    const cleaned = clean5eToolsMarkup(String(item))
    return cleaned.replace(/\b([a-zA-Z]+)\b/g, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
  }).filter(Boolean).join(', ') || '—'
}

const CLASS_PRIMARY_FALLBACK = {
  barbarian: 'STR',
  bard: 'CHA',
  cleric: 'WIS',
  druid: 'WIS',
  fighter: 'STR or DEX',
  monk: 'DEX & WIS',
  paladin: 'STR & CHA',
  ranger: 'DEX & WIS',
  rogue: 'DEX',
  sorcerer: 'CHA',
  warlock: 'CHA',
  wizard: 'INT',
  artificer: 'INT',
  mystic: 'INT'
}

const formatMonsterLanguages = (langs) => {
  if (!langs) return '—'
  if (typeof langs === 'string') return langs
  if (Array.isArray(langs)) {
    return langs.map(l => {
      if (typeof l === 'string') return l
      if (typeof l === 'object' && l !== null) {
        return l.name || l.language || Object.keys(l).join(', ')
      }
      return String(l)
    }).filter(Boolean).join(', ') || '—'
  }
  return String(langs)
}

const isItemCategory = (item) => {
  if (!item) return false
  return item._category === 'items' || !!item.itemType || !!item.crew || !!item.vehAc || !!item.damageDice || !!item.dmg1 || Number(item.ac || item.baseAc) > 0 || (Array.isArray(item.property) && item.property.length > 0)
}

const getItemBadge = (item) => {
  if (!item) return ''
  if (item._category === 'classes') {
    return 'Class'
  }
  if (item._category === 'races') {
    return 'Species / Race'
  }
  if (item._category === 'backgrounds') {
    return 'Background'
  }
  if (item._category === 'monsters' || item.cr !== undefined) {
    return `CR ${item.cr ?? '—'}`
  }
  const featType = item.featureType || item.feature_type
  if (item._category === 'optionalfeatures' || featType) {
    return formatFeatureType(featType)
  }
  if (item._category === 'spells' || item.level !== undefined) {
    return formatSpellLevel(item.level)
  }
  if (item._category === 'items' || item.itemType || item.damageDice || item.ac || item.vehAc || item.vehHp || item.crew) {
    const typeStr = typeof item.type === 'object' && item.type !== null ? (item.type.type || '') : (item.type || '')
    const rawT = String(item.itemType || typeStr).toLowerCase()
    if (rawT === 'vehicle' || item.vehAc || item.vehHp || item.crew) return 'Vehicle'
    if (rawT === 'mount') return 'Mount'
    if (rawT === 'wondrous') return 'Wondrous Item'
    if (rawT === 'consumable') return 'Consumable'
    if (rawT === 'weapon') return 'Weapon'
    if (rawT === 'armor') return 'Armor'
    if (rawT === 'tool') return 'Tool'
    if (rawT === 'gear') return 'Gear'
    return item.itemType || typeStr || 'Item'
  }
  if (item._category === 'rules') {
    const rawC = String(item.category || item.type || '').toLowerCase()
    if (['ship', 'vehicle', 'spelljammer', 'elemental_airship', 'air', 'infwar'].includes(rawC) || item.vehAc || item.vehHp || item.crew) return 'Vehicle'
    return item.category || item.type || 'Rule'
  }
  if (item._category === 'feats') {
    const catMap = { O: 'Origin Feat', G: 'General Feat', FS: 'Fighting Style Feat', EB: 'Epic Boon Feat' }
    return catMap[item.category] || (item.category ? `${item.category} Feat` : 'Feat')
  }
  if (featType) {
    return formatFeatureType(featType)
  }
  if (item._category === 'optionalfeatures' || item._category === 'optfeatures') {
    return 'Feature'
  }
  if (item.prerequisite && item._category !== 'rules') {
    return 'Feat'
  }
  return item.type || item.category || 'Rule'
}

const SIZE_NAMES = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan'
}

const formatMonsterSize = (sz) => {
  if (!sz) return 'Medium'
  const list = Array.isArray(sz) ? sz : [sz]
  return list.map(s => SIZE_NAMES[String(s).toUpperCase()] || s).join('/')
}

const formatMonsterType = (t) => {
  if (!t) return 'humanoid'
  if (typeof t === 'string') return t
  if (Array.isArray(t)) return t.map(formatMonsterType).join(', ')
  if (typeof t === 'object') {
    let base = t.type || 'creature'
    if (typeof base === 'object' && base !== null) {
      if (Array.isArray(base.choose)) {
        base = base.choose.join(' or ')
      } else {
        base = 'creature'
      }
    }
    const tags = Array.isArray(t.tags) ? ` (${t.tags.join(', ')})` : ''
    return `${base}${tags}`
  }
  return String(t)
}

const formatMonsterAlignment = (al) => {
  if (!al) return 'unaligned'
  if (Array.isArray(al)) {
    const map = { U: 'unaligned', A: 'any alignment', L: 'lawful', C: 'chaotic', G: 'good', E: 'evil', N: 'neutral' }
    return al.map(a => map[a] || a).join(' ')
  }
  return String(al)
}

const formatMonsterAc = (ac) => {
  if (!ac) return '10'
  if (Array.isArray(ac)) {
    if (ac.length === 0) return '10'
    return ac.map(a => {
      if (typeof a === 'object' && a !== null) {
        if (a.special) return a.special
        const val = a.ac !== undefined ? a.ac : ''
        const from = Array.isArray(a.from) ? ` (${a.from.join(', ')})` : (a.from ? ` (${a.from})` : '')
        const cond = a.condition ? ` ${a.condition}` : ''
        const res = `${val}${from}${cond}`.trim()
        return a.braces ? `(${res})` : res
      }
      return String(a)
    }).filter(Boolean).join(', ')
  }
  if (typeof ac === 'object' && ac !== null) {
    if (ac.special) return ac.special
    const val = ac.ac !== undefined ? ac.ac : ''
    const from = Array.isArray(ac.from) ? ` (${ac.from.join(', ')})` : (ac.from ? ` (${ac.from})` : '')
    const cond = ac.condition ? ` ${ac.condition}` : ''
    const res = `${val}${from}${cond}`.trim()
    return ac.braces ? `(${res})` : res
  }
  return String(ac)
}

const formatMonsterHp = (hp) => {
  if (!hp) return '10'
  if (typeof hp === 'object') {
    if (hp.special) return hp.special
    const avg = hp.average || ''
    const formula = hp.formula ? ` (${hp.formula})` : ''
    return `${avg}${formula}`.trim() || '10'
  }
  return String(hp)
}

const formatMonsterSpeed = (spd) => {
  if (!spd) return '30 ft.'
  if (typeof spd === 'object') {
    const parts = []
    const canHover = spd.canHover
    for (const [k, v] of Object.entries(spd)) {
      if (k === 'canHover') continue
      if (typeof v === 'object' && v !== null) {
        let cond = v.condition ? ` ${v.condition}` : ''
        if (k === 'fly' && canHover && !cond.includes('hover')) {
          cond = cond ? `${cond} (hover)` : ' (hover)'
        }
        parts.push(`${k === 'walk' ? '' : `${k} `}${v.number || 30} ft.${cond}`.trim())
      } else if (typeof v === 'number' || typeof v === 'string') {
        let cond = ''
        if (k === 'fly' && canHover) {
          cond = ' (hover)'
        }
        parts.push(`${k === 'walk' ? '' : `${k} `}${v}${typeof v === 'number' ? ' ft.' : ''}${cond}`.trim())
      }
    }
    return parts.join(', ') || '30 ft.'
  }
  return String(spd)
}

const abMod = (val) => {
  const n = Number(val) || 10
  const m = Math.floor((n - 10) / 2)
  return (m >= 0 ? '+' : '') + m
}

const formatMonsterSaves = (saves) => {
  if (!saves || typeof saves !== 'object') return ''
  return Object.entries(saves).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
}

const formatMonsterSkills = (skills) => {
  if (!skills || typeof skills !== 'object') return ''
  return Object.entries(skills).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`).join(', ')
}

const XP_BY_CR = {
  '0': '10', '1/8': '25', '1/4': '50', '1/2': '100',
  '1': '200', '2': '450', '3': '700', '4': '1,100', '5': '1,800',
  '6': '2,300', '7': '2,900', '8': '3,900', '9': '5,000', '10': '5,900',
  '11': '7,200', '12': '8,400', '13': '10,000', '14': '11,500', '15': '13,000',
  '16': '15,000', '17': '18,000', '18': '20,000', '19': '22,000', '20': '25,000',
  '21': '33,000', '22': '41,000', '23': '50,000', '24': '62,000', '25': '75,000',
  '26': '90,000', '27': '105,000', '28': '120,000', '29': '135,000', '30': '155,000'
}

const getMonsterXp = (cr) => {
  return XP_BY_CR[String(cr)] || '—'
}

const formatMonsterDefenses = (def) => {
  if (!def) return ''
  if (typeof def === 'string') return def
  if (Array.isArray(def)) {
    return def.map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null) {
        if (item.special) return item.special
        const sub = item.resist || item.immune || item.vulnerable || item.conditionImmune || []
        const subStr = Array.isArray(sub) ? sub.join(', ') : String(sub)
        const note = item.note ? ` (${item.note})` : ''
        return `${subStr}${note}`.trim()
      }
      return String(item)
    }).filter(Boolean).join('; ')
  }
  return String(def)
}

const formatMonsterSenses = (item) => {
  if (!item) return ''
  const parts = []
  if (item.senses) {
    if (Array.isArray(item.senses)) {
      parts.push(...item.senses.filter(Boolean))
    } else if (typeof item.senses === 'string' && item.senses.trim()) {
      parts.push(item.senses.trim())
    }
  }
  if (item.passive != null && !parts.some(p => p.toLowerCase().includes('passive perception'))) {
    parts.push(`passive Perception ${item.passive}`)
  }
  return parts.join(', ')
}

const formatRaceSpeed = (item) => {
  if (!item) return '30 ft.'
  const parts = []
  if (item.speed) parts.push(`${item.speed} ft.`)
  if (Number(item.flySpeed) > 0) parts.push(`fly ${item.flySpeed} ft.`)
  if (Number(item.swimSpeed) > 0) parts.push(`swim ${item.swimSpeed} ft.`)
  if (Number(item.climbSpeed) > 0) parts.push(`climb ${item.climbSpeed} ft.`)
  return parts.join(', ') || '30 ft.'
}

const formatPrimaryAbility = (pa, className = '') => {
  if (!pa || (Array.isArray(pa) && pa.length === 0)) {
    const cName = String(className || '').toLowerCase().trim()
    return CLASS_PRIMARY_FALLBACK[cName] || '—'
  }
  if (Array.isArray(pa)) {
    return pa.map(obj => {
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).map(k => k.toUpperCase()).join(' or ')
      }
      return String(obj).toUpperCase()
    }).join(' / ')
  }
  return String(pa)
}

const handleBack = () => {
  closeCompendium(true)
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && isCompendiumOpen.value) {
    handleBack()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  if (isCompendiumOpen.value) {
    initFromNavState()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    v-if="isCompendiumOpen"
    class="min-h-screen bg-gray-100 flex flex-col text-xs text-gray-800"
    :data-edition="currentEdition"
    :data-source="sourceFilter !== 'all' ? sourceFilter : (currentEdition === '2024' ? 'XPHB' : 'PHB')"
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

          <!-- Source Filter Dropdown -->
          <div class="flex items-center gap-1.5 min-w-[130px]">
            <v-select
              v-model="sourceFilter"
              :options="currentSourceOptions"
              :reduce="src => src.value"
              label="label"
              :clearable="false"
              class="w-full"
              @update:model-value="fetchData"
            />
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

        <!-- Right Column: Detail Card (7 cols on md) -->
        <div
          class="md:col-span-7 bg-white rounded border border-gray-200 shadow-xs p-4 sm:p-5 flex flex-col h-[650px] overflow-y-auto"
          :data-edition="selectedItem?.edition || currentEdition"
          :data-source="selectedItem?.source || (sourceFilter !== 'all' ? sourceFilter : (currentEdition === '2024' ? 'XPHB' : 'PHB'))"
        >
          <div v-if="selectedItem" class="space-y-4">
            <!-- Detail Header -->
            <div class="border-b border-gray-200 pb-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-gray-900 leading-snug">
                    {{ selectedItem.name }}
                  </h2>
                  <div class="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                    <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200 font-semibold uppercase">
                      {{ getItemBadge(selectedItem) }}
                    </span>
                    <span v-if="selectedItem.source">Source: <strong>{{ selectedItem.source }}</strong></span>
                    <span v-if="selectedItem.page">p. {{ selectedItem.page }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Spell Stats Grid -->
            <div
              v-if="selectedItem._category === 'spells' || selectedItem.level !== undefined"
              class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200 text-[11px]"
            >
              <div>
                <span class="text-gray-400 block font-medium">Casting Time</span>
                <span class="font-semibold text-gray-800">
                  {{ selectedItem.time?.[0] ? `${selectedItem.time[0].number} ${selectedItem.time[0].unit}` : (selectedItem.castingTime || '1 action') }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block font-medium">Range</span>
                <span class="font-semibold text-gray-800">
                  {{ selectedItem.range?.type || selectedItem.range || 'Self' }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block font-medium">Components</span>
                <span class="font-semibold text-gray-800">
                  {{ selectedItem.components ? (typeof selectedItem.components === 'string' ? selectedItem.components : 'V, S') : 'V, S' }}
                </span>
              </div>
              <div>
                <span class="text-gray-400 block font-medium">Duration</span>
                <span class="font-semibold text-gray-800">
                  {{ selectedItem.duration?.[0] ? `${selectedItem.duration[0].concentration ? 'Concentration, ' : ''}${selectedItem.duration[0].type || ''}` : (selectedItem.duration || 'Instantaneous') }}
                </span>
              </div>
            </div>

            <!-- Item Stats Grid -->
            <div
              v-else-if="selectedItem._category !== 'monsters' && selectedItem.cr === undefined && (selectedItem._category === 'items' || selectedItem.itemType || selectedItem.vehAc || selectedItem.vehHp || selectedItem.crew || selectedItem.capCargo || (selectedItem._category === 'rules' && (selectedItem.capPassenger || selectedItem.carryingCapacity)))"
              class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200 text-[11px]"
            >
              <div>
                <span class="text-gray-400 block font-medium">Type</span>
                <span class="font-semibold text-gray-800 capitalize">{{ formatItemType(selectedItem) }}</span>
              </div>
              <div v-if="selectedItem.damageDice || selectedItem.dmg1">
                <span class="text-gray-400 block font-medium">Damage</span>
                <span class="font-semibold text-gray-800">
                  {{ selectedItem.damageDice || selectedItem.dmg1 }} {{ selectedItem.dmgType || '' }}
                  <span v-if="selectedItem.dmg2 || selectedItem.versatileDice" class="text-gray-500 font-normal">
                    (Versatile {{ selectedItem.dmg2 || selectedItem.versatileDice }})
                  </span>
                </span>
              </div>
              <div v-if="selectedItem.ac || selectedItem.baseAc">
                <span class="text-gray-400 block font-medium">AC</span>
                <span class="font-semibold text-gray-800">{{ formatMonsterAc(selectedItem.ac || selectedItem.baseAc) }}</span>
              </div>
              <div v-if="selectedItem.vehAc || selectedItem.vehHp">
                <span class="text-gray-400 block font-medium">Hull</span>
                <span class="font-semibold text-gray-800">
                  AC {{ selectedItem.vehAc || '—' }}, HP {{ selectedItem.vehHp || '—' }}
                  <span v-if="selectedItem.vehDmgThresh" class="text-gray-500 font-normal">(DT {{ selectedItem.vehDmgThresh }})</span>
                </span>
              </div>
              <div v-if="selectedItem.crew">
                <span class="text-gray-400 block font-medium">Crew</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.crew }}</span>
              </div>
              <div v-if="selectedItem.capPassenger">
                <span class="text-gray-400 block font-medium">Passengers</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.capPassenger }}</span>
              </div>
              <div v-if="selectedItem.capCargo">
                <span class="text-gray-400 block font-medium">Cargo</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.capCargo }}</span>
              </div>
              <div v-if="selectedItem.speed">
                <span class="text-gray-400 block font-medium">Speed</span>
                <span class="font-semibold text-gray-800">{{ formatMonsterSpeed(selectedItem.speed) }}</span>
              </div>
              <div v-if="selectedItem.carryingCapacity">
                <span class="text-gray-400 block font-medium">Capacity</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.carryingCapacity }}</span>
              </div>
              <div v-if="selectedItem.weight">
                <span class="text-gray-400 block font-medium">Weight</span>
                <span class="font-semibold text-gray-800">{{ String(selectedItem.weight).includes('lb') ? selectedItem.weight : `${selectedItem.weight} lb` }}</span>
              </div>
              <div v-if="selectedItem.cost || selectedItem.value || selectedItem.costCp">
                <span class="text-gray-400 block font-medium">Cost</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.cost || (selectedItem.value ? `${selectedItem.value} cp` : (selectedItem.costCp ? `${selectedItem.costCp} cp` : '')) }}</span>
              </div>
              <div v-if="selectedItem.mastery && (!Array.isArray(selectedItem.mastery) || selectedItem.mastery.length > 0)">
                <span class="text-gray-400 block font-medium">Mastery</span>
                <span class="font-semibold text-gray-800 capitalize">{{ Array.isArray(selectedItem.mastery) ? selectedItem.mastery.join(', ') : selectedItem.mastery }}</span>
              </div>
              <div v-if="(selectedItem.property && selectedItem.property.length) || (selectedItem.properties && selectedItem.properties.length)" class="col-span-2 sm:col-span-4">
                <span class="text-gray-400 block font-medium">Properties</span>
                <span class="font-semibold text-gray-800">
                  {{ formatItemProperties(selectedItem.properties || selectedItem.property, selectedItem.dmg2 || selectedItem.versatileDice, selectedItem.name) }}
                </span>
              </div>
            </div>

            <!-- Background Details -->
            <div
              v-else-if="selectedItem._category === 'backgrounds'"
              class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200 text-[11px]"
            >
              <div v-if="selectedItem.ability && selectedItem.ability.length">
                <span class="text-gray-400 block font-medium">Ability Scores</span>
                <span class="font-semibold text-gray-800">{{ formatBackgroundAbility(selectedItem.ability) }}</span>
              </div>
              <div v-if="selectedItem.feats && selectedItem.feats.length">
                <span class="text-gray-400 block font-medium">Feat</span>
                <span class="font-semibold text-gray-800">{{ formatBackgroundFeats(selectedItem.feats) }}</span>
              </div>
              <div v-if="selectedItem.skillProficiencies && selectedItem.skillProficiencies.length">
                <span class="text-gray-400 block font-medium">Skills</span>
                <span class="font-semibold text-gray-800">{{ formatProficiencies(selectedItem.skillProficiencies) }}</span>
              </div>
              <div v-if="selectedItem.toolProficiencies && selectedItem.toolProficiencies.length">
                <span class="text-gray-400 block font-medium">Tools</span>
                <span class="font-semibold text-gray-800">{{ formatProficiencies(selectedItem.toolProficiencies) }}</span>
              </div>
              <div v-if="selectedItem.languageProficiencies && selectedItem.languageProficiencies.length">
                <span class="text-gray-400 block font-medium">Languages</span>
                <span class="font-semibold text-gray-800">{{ formatProficiencies(selectedItem.languageProficiencies) }}</span>
              </div>
              <div v-if="selectedItem.startingEquipment || selectedItem.equipment" class="sm:col-span-2">
                <span class="text-gray-400 block font-medium">Starting Equipment</span>
                <span class="font-semibold text-gray-800 leading-relaxed">{{ formatBackgroundEquipment(selectedItem.startingEquipment || selectedItem.equipment) }}</span>
              </div>
            </div>

            <!-- Class Details -->
            <div
              v-else-if="selectedItem._category === 'classes'"
              class="space-y-3 bg-gray-50 p-3 rounded border border-gray-200 text-[11px]"
            >
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span class="text-gray-400 block font-medium">Hit Die</span>
                  <span class="font-semibold text-gray-800">{{ selectedItem.hitDice ? `1${selectedItem.hitDice} per level` : '—' }}</span>
                </div>
                <div>
                  <span class="text-gray-400 block font-medium">Primary Ability</span>
                  <span class="font-semibold text-gray-800">{{ formatPrimaryAbility(selectedItem.primaryAbility, selectedItem.name) }}</span>
                </div>
                <div>
                  <span class="text-gray-400 block font-medium">Saving Throws</span>
                  <span class="font-semibold text-gray-800">{{ (selectedItem.savingThrows || []).map(s => s.toUpperCase()).join(', ') || '—' }}</span>
                </div>
                <div v-if="selectedItem.spellcastingAbility">
                  <span class="text-gray-400 block font-medium">Spellcasting</span>
                  <span class="font-semibold text-gray-800 uppercase">{{ selectedItem.spellcastingAbility }}</span>
                </div>
              </div>

              <div class="space-y-1 pt-1 border-t border-gray-200">
                <div v-if="selectedItem.armorProficiencies && selectedItem.armorProficiencies.length">
                  <strong class="text-gray-700">Armor Training:</strong> {{ formatClassProf(selectedItem.armorProficiencies) }}
                </div>
                <div v-if="selectedItem.weaponProficiencies && selectedItem.weaponProficiencies.length">
                  <strong class="text-gray-700">Weapon Proficiencies:</strong> {{ formatClassProf(selectedItem.weaponProficiencies) }}
                </div>
                <div v-if="selectedItem.toolProficiencies && selectedItem.toolProficiencies.length">
                  <strong class="text-gray-700">Tool Proficiencies:</strong> {{ formatClassProf(selectedItem.toolProficiencies) }}
                </div>
              </div>

              <div v-if="selectedItem.subclasses && selectedItem.subclasses.length" class="pt-2 border-t border-gray-200 space-y-1.5">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900">
                  {{ selectedItem.subclassTitle || 'Subclasses' }} ({{ selectedItem.subclasses.length }})
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="sc in selectedItem.subclasses"
                    :key="sc.name + sc.source"
                    class="px-2 py-1 bg-white border border-gray-200 rounded text-gray-800 font-medium text-[11px] shadow-xs flex items-center gap-1.5"
                  >
                    <span>{{ sc.name }}</span>
                    <span v-if="sc.source" class="text-[9px] font-mono px-1 py-0.2 bg-gray-100 rounded text-gray-500">{{ sc.source }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Species / Race Details -->
            <div
              v-else-if="selectedItem._category === 'races'"
              class="space-y-3 bg-gray-50 p-3 rounded border border-gray-200 text-[11px]"
            >
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span class="text-gray-400 block font-medium">Creature Type</span>
                  <span class="font-semibold text-gray-800 capitalize">{{ (selectedItem.creatureTypes || []).join(', ') || 'Humanoid' }}</span>
                </div>
                <div>
                  <span class="text-gray-400 block font-medium">Size</span>
                  <span class="font-semibold text-gray-800">{{ formatRaceSize(selectedItem.size) }}</span>
                </div>
                <div>
                  <span class="text-gray-400 block font-medium">Speed</span>
                  <span class="font-semibold text-gray-800">{{ formatRaceSpeed(selectedItem) }}</span>
                </div>
                <div>
                  <span class="text-gray-400 block font-medium">Darkvision</span>
                  <span class="font-semibold text-gray-800">{{ selectedItem.darkvision && Number(selectedItem.darkvision) > 0 ? `${selectedItem.darkvision} ft.` : 'None' }}</span>
                </div>
              </div>

              <div v-if="selectedItem.abilityBonuses && selectedItem.abilityBonuses.length" class="pt-1 border-t border-gray-200">
                <strong class="text-gray-700">Ability Scores:</strong> {{ formatBackgroundAbility(selectedItem.abilityBonuses) }}
              </div>

              <div v-if="selectedItem.traits && selectedItem.traits.length" class="pt-1 border-t border-gray-200">
                <strong class="text-gray-700">Traits:</strong> {{ formatRaceTraits(selectedItem.traits) }}
              </div>

              <div v-if="selectedItem.subraces && selectedItem.subraces.length" class="pt-2 border-t border-gray-200 space-y-1.5">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900">
                  Subraces / Lineages ({{ selectedItem.subraces.length }})
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="sr in selectedItem.subraces"
                    :key="sr.name + sr.source"
                    class="px-2 py-1 bg-white border border-gray-200 rounded text-gray-800 font-medium text-[11px] shadow-xs flex items-center gap-1.5"
                  >
                    <span>{{ sr.name }}</span>
                    <span v-if="sr.source" class="text-[9px] font-mono px-1 py-0.2 bg-gray-100 rounded text-gray-500">{{ sr.source }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Feat Details -->
            <div
              v-else-if="selectedItem._category === 'feats'"
              class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200 text-[11px]"
            >
              <div>
                <span class="text-gray-400 block font-medium">Category</span>
                <span class="font-semibold text-gray-800">{{ formatFeatCategory(selectedItem.category) }}</span>
              </div>
              <div v-if="selectedItem.ability && (Array.isArray(selectedItem.ability) ? selectedItem.ability.length : selectedItem.ability)">
                <span class="text-gray-400 block font-medium">Ability Score Increase</span>
                <span class="font-semibold text-gray-800">{{ formatBackgroundAbility(selectedItem.ability) }}</span>
              </div>
              <div>
                <span class="text-gray-400 block font-medium">Repeatable</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.repeatable ? 'Yes' : 'No' }}</span>
              </div>
            </div>

            <!-- Feat / Feature Prerequisite -->
            <div v-if="selectedItem.prerequisite" class="bg-gray-50 border border-gray-200 text-gray-800 p-2 rounded text-[11px]">
              <strong>Prerequisite: </strong> {{ formatPrerequisite(selectedItem.prerequisite) }}
            </div>

            <!-- Monster Stat Block -->
            <div
              v-if="selectedItem._category === 'monsters' || selectedItem.cr !== undefined"
              class="space-y-3 bg-gray-50/50 border border-gray-200 rounded-md p-3.5"
            >
              <!-- Monster Meta -->
              <div class="italic text-gray-600 text-[11px] border-b border-gray-200 pb-2">
                {{ formatMonsterSize(selectedItem.size) }} {{ formatMonsterType(selectedItem.type) }}, {{ formatMonsterAlignment(selectedItem.alignment) }}
              </div>

              <!-- AC, HP, Speed -->
              <div class="space-y-1 text-[11px] border-b border-gray-200 pb-2 text-gray-800">
                <div><strong class="text-gray-900">Armor Class:</strong> <span v-html="renderAnnotatedText(formatMonsterAc(selectedItem.ac))"></span></div>
                <div><strong class="text-gray-900">Hit Points:</strong> {{ formatMonsterHp(selectedItem.hp) }}</div>
                <div><strong class="text-gray-900">Speed:</strong> {{ formatMonsterSpeed(selectedItem.speed) }}</div>
              </div>

              <!-- Ability Scores Box -->
              <div class="grid grid-cols-6 gap-1 bg-gray-100 p-2 rounded text-center border border-gray-200 text-[11px]">
                <div v-for="ab in ['str', 'dex', 'con', 'int', 'wis', 'cha']" :key="ab">
                  <div class="font-bold text-gray-600 uppercase text-[10px]">{{ ab }}</div>
                  <div class="font-semibold text-gray-900">{{ selectedItem[ab] || 10 }} ({{ abMod(selectedItem[ab] || 10) }})</div>
                </div>
              </div>

              <!-- Stats & Senses -->
              <div class="space-y-1 text-[11px] border-b border-gray-200 pb-2 text-gray-800">
                <div v-if="selectedItem.save && Object.keys(selectedItem.save).length"><strong class="text-gray-900">Saving Throws:</strong> {{ formatMonsterSaves(selectedItem.save) }}</div>
                <div v-if="selectedItem.skill && Object.keys(selectedItem.skill).length"><strong class="text-gray-900">Skills:</strong> {{ formatMonsterSkills(selectedItem.skill) }}</div>
                <div v-if="formatMonsterDefenses(selectedItem.vulnerable || selectedItem.raw_data?.vulnerable)"><strong class="text-gray-900">Damage Vulnerabilities:</strong> {{ formatMonsterDefenses(selectedItem.vulnerable || selectedItem.raw_data?.vulnerable) }}</div>
                <div v-if="formatMonsterDefenses(selectedItem.resist || selectedItem.raw_data?.resist)"><strong class="text-gray-900">Damage Resistances:</strong> {{ formatMonsterDefenses(selectedItem.resist || selectedItem.raw_data?.resist) }}</div>
                <div v-if="formatMonsterDefenses(selectedItem.immune || selectedItem.raw_data?.immune)"><strong class="text-gray-900">Damage Immunities:</strong> {{ formatMonsterDefenses(selectedItem.immune || selectedItem.raw_data?.immune) }}</div>
                <div v-if="formatMonsterDefenses(selectedItem.conditionImmune || selectedItem.raw_data?.conditionImmune)"><strong class="text-gray-900">Condition Immunities:</strong> {{ formatMonsterDefenses(selectedItem.conditionImmune || selectedItem.raw_data?.conditionImmune) }}</div>
                <div v-if="formatMonsterSenses(selectedItem)"><strong class="text-gray-900">Senses:</strong> {{ formatMonsterSenses(selectedItem) }}</div>
                <div v-if="selectedItem.languages && (Array.isArray(selectedItem.languages) ? selectedItem.languages.length : selectedItem.languages)"><strong class="text-gray-900">Languages:</strong> {{ formatMonsterLanguages(selectedItem.languages) }}</div>
                <div><strong class="text-gray-900">Challenge:</strong> {{ selectedItem.cr || '0' }} ({{ getMonsterXp(selectedItem.cr) }} XP)</div>
              </div>

              <!-- Traits -->
              <div v-if="selectedItem.trait && selectedItem.trait.length" class="space-y-2 pt-1">
                <div v-for="(tr, idx) in selectedItem.trait" :key="idx" class="text-[11px]">
                  <strong class="text-gray-900">{{ tr.name }}.</strong>
                  <span class="text-gray-800 ml-1" v-html="renderAnnotatedText(formatEntries(tr.entries))"></span>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="selectedItem.action && selectedItem.action.length" class="space-y-2 pt-2 border-t border-gray-200">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-0.5">Actions</h4>
                <div v-for="(act, idx) in selectedItem.action" :key="idx" class="text-[11px]">
                  <strong class="text-gray-900">{{ act.name }}.</strong>
                  <span class="text-gray-800 ml-1" v-html="renderAnnotatedText(formatEntries(act.entries))"></span>
                </div>
              </div>

              <!-- Bonus Actions -->
              <div v-if="selectedItem.bonus && selectedItem.bonus.length" class="space-y-2 pt-2 border-t border-gray-200">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-0.5">Bonus Actions</h4>
                <div v-for="(b, idx) in selectedItem.bonus" :key="idx" class="text-[11px]">
                  <strong class="text-gray-900">{{ b.name }}.</strong>
                  <span class="text-gray-800 ml-1" v-html="renderAnnotatedText(formatEntries(b.entries))"></span>
                </div>
              </div>

              <!-- Reactions -->
              <div v-if="selectedItem.reaction && selectedItem.reaction.length" class="space-y-2 pt-2 border-t border-gray-200">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-0.5">Reactions</h4>
                <div v-for="(r, idx) in selectedItem.reaction" :key="idx" class="text-[11px]">
                  <strong class="text-gray-900">{{ r.name }}.</strong>
                  <span class="text-gray-800 ml-1" v-html="renderAnnotatedText(formatEntries(r.entries))"></span>
                </div>
              </div>

              <!-- Legendary Actions -->
              <div v-if="selectedItem.legendary && selectedItem.legendary.length" class="space-y-2 pt-2 border-t border-gray-200">
                <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-0.5">Legendary Actions</h4>
                <div v-for="(la, idx) in selectedItem.legendary" :key="idx" class="text-[11px]">
                  <strong class="text-gray-900">{{ la.name }}.</strong>
                  <span class="text-gray-800 ml-1" v-html="renderAnnotatedText(formatEntries(la.entries))"></span>
                </div>
              </div>
            </div>

            <!-- Description Body -->
            <div class="prose-xs leading-relaxed text-gray-800 space-y-2 pt-1">
              <div v-if="selectedItem._category !== 'monsters' && selectedItem.cr === undefined && selectedItem.entries && (Array.isArray(selectedItem.entries) ? selectedItem.entries.length : true)" v-html="renderAnnotatedText(formatEntries(selectedItem.entries))"></div>
              <!-- Dynamic Item Rules fallback for weapons, armor, and gear -->
              <div v-else-if="isItemCategory(selectedItem)" class="space-y-3">
                <div v-if="getItemCategoryAndRange(selectedItem)" class="italic text-gray-600 font-medium">
                  {{ getItemCategoryAndRange(selectedItem) }}
                </div>
                <div v-if="getItemExpandedProperties(selectedItem).length > 0" class="space-y-2">
                  <div v-for="(prop, pIdx) in getItemExpandedProperties(selectedItem)" :key="pIdx" class="text-xs">
                    <strong class="text-gray-900">{{ prop.name }}.</strong>
                    <span class="text-gray-700 ml-1">{{ prop.desc }}</span>
                  </div>
                </div>
                <div v-if="getItemMastery(selectedItem)" class="text-xs">
                  <strong class="text-gray-900">Mastery: {{ getItemMastery(selectedItem).name }}.</strong>
                  <span class="text-gray-700 ml-1">{{ getItemMastery(selectedItem).desc }}</span>
                </div>
                <div v-if="getItemArmorDetails(selectedItem).length > 0" class="space-y-1 text-xs">
                  <div v-for="(detail, dIdx) in getItemArmorDetails(selectedItem)" :key="dIdx">
                    <strong class="text-gray-900">{{ detail.name }}.</strong>
                    <span class="text-gray-700 ml-1">{{ detail.desc }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="!selectedItem.trait && !selectedItem.action && selectedItem._category !== 'monsters' && selectedItem.cr === undefined" class="text-gray-400 italic text-xs py-2">
                No additional rules text recorded for this entry.
              </div>
            </div>

            <!-- At Higher Levels -->
            <div v-if="selectedItem.entriesHigherLevel" class="pt-3 border-t border-gray-200">
              <h4 class="font-bold text-gray-900 text-xs mb-1">Using Higher-Level Slots</h4>
              <div class="prose-xs text-gray-700" v-html="renderAnnotatedText(formatEntries(selectedItem.entriesHigherLevel))"></div>
            </div>
          </div>

          <!-- Empty Detail Placeholder -->
          <div v-else class="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
            <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p class="font-semibold text-gray-600">Select an entry from the list</p>
            <p class="text-[11px]">Click any entry on the left to inspect full stats, rules, and notes.</p>
          </div>
        </div>
      </div>
    </main>
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
