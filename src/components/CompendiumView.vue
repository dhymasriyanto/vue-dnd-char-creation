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
import { IconArrowLeft, IconX, IconPlus, IconTrash } from '@tabler/icons-vue'

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
const showHomebrewModal = ref(false)
const homebrewCategory = ref('spell')
const isSavingHomebrew = ref(false)
const homebrewError = ref('')
const homebrewToast = ref('')

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

const homebrewForm = ref({
  name: '',
  // spell
  level: 1,
  school: 'evocation',
  casting_time: '1 action',
  range: '60 ft.',
  components: 'V, S',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  damage_type: '',
  damage_dice: '',
  save_ability: '',
  classes: '',
  // item
  item_type: 'gear',
  rarity: 'none',
  cost_cp: 0,
  weight: '1',
  base_ac: 10,
  ac_dex_bonus: false,
  // monster
  cr: '1',
  size: 'M',
  type: 'humanoid',
  alignment: 'U',
  ac: 10,
  hp: 10,
  speed: 30,
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  // feat
  category: 'G',
  prerequisite: '',
  repeatable: false,
  // adventure
  level_range: 'Level 1-5',
  summary: '',
  // subclass
  class_name: 'Fighter',
  short_name: '',
  spellcasting_ability: '',
  // subrace
  race_name: 'Elf',
  // common
  entries: ''
})

const openCreateHomebrew = () => {
  homebrewError.value = ''
  const catMap = {
    spells: 'spell',
    items: 'item',
    monsters: 'monster',
    feats: 'feat',
    adventures: 'adventure',
    classes: 'subclass',
    races: 'subrace'
  }
  homebrewCategory.value = catMap[activeTab.value] || 'spell'
  showHomebrewModal.value = true
}

const submitHomebrew = async () => {
  if (!homebrewForm.value.name.trim()) {
    homebrewError.value = 'Name is required'
    return
  }
  isSavingHomebrew.value = true
  homebrewError.value = ''
  try {
    const cat = homebrewCategory.value
    const f = homebrewForm.value
    const data = {
      name: f.name.trim(),
      source: 'Homebrew',
      edition: currentEdition.value,
      entries: f.entries ? f.entries.split('\n\n').filter(Boolean) : []
    }

    if (cat === 'spell') {
      data.level = Number(f.level) || 0
      data.school = f.school
      data.casting_time = f.casting_time
      data.range = f.range
      data.components = f.components
      data.duration = f.duration
      data.concentration = Boolean(f.concentration)
      data.ritual = Boolean(f.ritual)
      data.damage_type = f.damage_type || null
      data.damage_dice = f.damage_dice || null
      data.save_ability = f.save_ability || null
      data.classes = f.classes ? f.classes.split(',').map(s => s.trim()).filter(Boolean) : []
    } else if (cat === 'item') {
      data.item_type = f.item_type
      data.rarity = f.rarity
      data.cost_cp = Number(f.cost_cp) || 0
      data.weight = f.weight || null
      data.damage_dice = f.damage_dice || null
      data.damage_type = f.damage_type || null
      data.base_ac = Number(f.base_ac) || null
      data.ac_dex_bonus = Boolean(f.ac_dex_bonus)
      data.equip_type = f.item_type === 'weapon' ? 'weapon' : (f.item_type === 'armor' ? 'armor' : null)
    } else if (cat === 'monster') {
      data.cr = String(f.cr || '1')
      data.size = f.size || 'M'
      data.type = f.type || 'humanoid'
      data.alignment = f.alignment || 'U'
      data.ac = Number(f.ac) || 10
      data.hp = Number(f.hp) || 10
      data.speed = Number(f.speed) || 30
      data.str = Number(f.str) || 10
      data.dex = Number(f.dex) || 10
      data.con = Number(f.con) || 10
      data.int = Number(f.int) || 10
      data.wis = Number(f.wis) || 10
      data.cha = Number(f.cha) || 10
    } else if (cat === 'feat') {
      data.category = f.category || 'G'
      data.prerequisite = f.prerequisite || null
      data.repeatable = Boolean(f.repeatable)
    } else if (cat === 'adventure') {
      data.level_range = f.level_range || 'Level 1-5'
      data.summary = f.summary || ''
    } else if (cat === 'subclass') {
      data.class_name = f.class_name
      data.short_name = f.short_name || f.name
      data.spellcasting_ability = f.spellcasting_ability || null
    } else if (cat === 'subrace') {
      data.race_name = f.race_name
    }

    await axios.post(`${API_URL}/compendium/homebrew`, {
      category: cat,
      data
    })

    showHomebrewModal.value = false
    homebrewToast.value = `${f.name} saved to Homebrew!`
    setTimeout(() => { homebrewToast.value = '' }, 3000)
    fetchData()
  } catch (err) {
    homebrewError.value = err.response?.data?.message || err.message
  } finally {
    isSavingHomebrew.value = false
  }
}

const deleteHomebrewItem = async (item) => {
  if (!item || item.source !== 'Homebrew' || !item.id) return
  if (!confirm(`Are you sure you want to delete homebrew "${item.name}"?`)) return
  try {
    const catMap = {
      spells: 'spell',
      items: 'item',
      monsters: 'monster',
      feats: 'feat',
      adventures: 'adventure',
      classes: 'subclass',
      races: 'subrace'
    }
    const cat = catMap[item._category] || item._category || activeTab.value.replace(/s$/, '')
    await axios.delete(`${API_URL}/compendium/homebrew/${cat}/${item.id}`)
    rawList.value = rawList.value.filter(i => i.id !== item.id)
    if (selectedItem.value?.id === item.id) {
      selectedItem.value = rawList.value[0] || null
    }
    homebrewToast.value = `Homebrew ${item.name} deleted`
    setTimeout(() => { homebrewToast.value = '' }, 3000)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete homebrew')
  }
}

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

const CORE_SOURCES_2024 = ['XPHB', 'XDMG', 'XMM', 'Homebrew']
const EXPANDED_SOURCES_2024 = [
  'TCE', 'XGE', 'EFA', 'FRHoF', 'AU', 'RHW', 'SCAG', 'EGW', 'FTD', 'BGG', 'VRGR',
  'DSotDQ', 'BGDIA', 'AI', 'GGR', 'SCC', 'AAG', 'BMT', 'GoS', 'SatO', 'ABH',
  'PSA', 'PSK', 'PSI', 'PSZ', 'PSX', 'PSD', 'EEPC', 'ERLW', 'MOT', 'WBtW', 'ToA',
  'IDRotF', 'LLK', 'LFL', 'AWM', 'LR', 'OGA', 'TTP', 'PHB', 'DMG', 'MM', 'MPMM'
]

const CORE_SOURCES_2014 = ['PHB', 'DMG', 'MM', 'Homebrew']
const EXPANDED_SOURCES_2014 = [
  'TCE', 'XGE', 'SCAG', 'EFA', 'EGW', 'ERLW', 'FTD', 'MPMM', 'VGM', 'MTF',
  'BGG', 'DSotDQ', 'VRGR', 'GGR', 'BGDIA', 'SCC', 'AI', 'SatO', 'AAG', 'RHW',
  'MOT', 'EEPC', 'BMT', 'GoS', 'WBtW', 'FRHoF', 'PSA', 'PSK', 'PSZ', 'PSX',
  'PSI', 'PSD', 'AU', 'UATheMysticClass', 'AWM', 'LR', 'OGA', 'TTP', 'ToA', 'IDRotF', 'LLK'
]

const SOURCE_LABELS = {
  // Core
  XPHB: "Player's Handbook 2024",
  XDMG: "Dungeon Master's Guide 2024",
  XMM: "Monster Manual 2024",
  Homebrew: "Homebrew (Custom)",
  PHB: "Player's Handbook 2014",
  DMG: "Dungeon Master's Guide 2014",
  MM: "Monster Manual 2014",

  // Major Expansions
  TCE: "Tasha's Cauldron of Everything",
  XGE: "Xanathar's Guide to Everything",
  MPMM: "Mordenkainen Presents: MotM",
  VGM: "Volo's Guide to Monsters",
  MTF: "Mordenkainen's Tome of Foes",
  FTD: "Fizban's Treasury of Dragons",
  BGG: "Bigby Presents: Glory of the Giants",
  BMT: "The Book of Many Things",

  // Settings & Supplements
  EFA: "Eberron: Forge of the Artificer",
  ERLW: "Eberron: Rising from the Last War",
  SCAG: "Sword Coast Adventurer's Guide",
  EGW: "Explorer's Guide to Wildemount",
  VRGR: "Van Richten's Guide to Ravenloft",
  GGR: "Guildmasters' Guide to Ravnica",
  MOT: "Mythic Odysseys of Theros",
  DSotDQ: "Dragonlance: Shadow of the Dragon Queen",
  SCC: "Strixhaven: Curriculum of Chaos",
  SatO: "Planescape: Sigil & Outlands",
  AAG: "Astral Adventurer's Guide",
  AI: "Acquisitions Incorporated",
  EEPC: "Elemental Evil Player's Companion",

  // Adventures & Extras
  BGDIA: "Baldur's Gate: Descent into Avernus",
  GoS: "Ghosts of Saltmarsh",
  WBtW: "The Wild Beyond the Witchlight",
  FRHoF: "Heroes of Faerûn",
  RHW: "Red Hand of Doom",
  ABH: "Adventures & Backgrounds",

  // Plane Shift & Unearthed Arcana
  PSA: "Plane Shift: Amonkhet",
  PSK: "Plane Shift: Kaladesh",
  PSZ: "Plane Shift: Zendikar",
  PSX: "Plane Shift: Ixalan",
  PSI: "Plane Shift: Innistrad",
  PSD: "Plane Shift: Dominaria",
  AU: "Unearthed Arcana",
  UATheMysticClass: "Mystic (UA)",
  AWM: "Adventure with Monsters",
  LR: "Locathah Rising",
  OGA: "One Grung Above",
  TTP: "The Tortle Package",
  LFL: "Legends from Lorwyn",
  ToA: "Tomb of Annihilation",
  IDRotF: "Rime of the Frostmaiden",
  LLK: "Lost Laboratory of Kwalish"
}

const getDefaultSources = (edition) => {
  return edition === '2024'
    ? new Set(CORE_SOURCES_2024)
    : new Set([...CORE_SOURCES_2014, ...EXPANDED_SOURCES_2014])
}

const selectedSources = ref(getDefaultSources(currentEdition.value))
const isSourceDropdownOpen = ref(false)
const sourceDropdownRef = ref(null)

const currentCoreSourceList = computed(() => {
  const list = currentEdition.value === '2024' ? CORE_SOURCES_2024 : CORE_SOURCES_2014
  return list.map(code => ({ code, label: SOURCE_LABELS[code] || code }))
})

const currentExpandedSourceList = computed(() => {
  const list = currentEdition.value === '2024' ? EXPANDED_SOURCES_2024 : EXPANDED_SOURCES_2014
  return list.map(code => ({ code, label: SOURCE_LABELS[code] || code }))
})

const currentAllSources = computed(() => {
  return currentEdition.value === '2024'
    ? [...CORE_SOURCES_2024, ...EXPANDED_SOURCES_2024]
    : [...CORE_SOURCES_2014, ...EXPANDED_SOURCES_2014]
})

const isSourceSelected = (code) => {
  return selectedSources.value.has(code)
}

const toggleSource = (code) => {
  const next = new Set(selectedSources.value)
  if (next.has(code)) {
    next.delete(code)
  } else {
    next.add(code)
  }
  selectedSources.value = next
  fetchData()
}

const setSourcesSelectAll = () => {
  selectedSources.value = new Set(currentAllSources.value)
  fetchData()
}

const setSourcesCoreOnly = () => {
  const coreList = currentEdition.value === '2024' ? CORE_SOURCES_2024 : CORE_SOURCES_2014
  selectedSources.value = new Set(coreList)
  fetchData()
}

const clearAllSources = () => {
  selectedSources.value = new Set()
  fetchData()
}

const sourceDropdownLabel = computed(() => {
  const coreList = currentEdition.value === '2024' ? CORE_SOURCES_2024 : CORE_SOURCES_2014
  const allList = currentAllSources.value
  const size = selectedSources.value.size

  if (size === 0) return 'No Sources'
  if (size === allList.length && allList.every(s => selectedSources.value.has(s))) {
    return 'All Sources'
  }
  if (size === coreList.length && coreList.every(s => selectedSources.value.has(s))) {
    return 'Core Only'
  }
  return `Sources (${size})`
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
    } else if (activeTab.value === 'adventures') {
      const params = { edition }
      if (q) params.search = q
      const res = await axios.get(`${API_URL}/compendium/adventures`, { params })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      hasMore.value = false
      rawList.value = list.map(item => ({ ...item, _category: 'adventures' }))
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
  classTableCache.clear()
  subclassCache.clear()
  selectedSubclass.value = null
  subclassDetail.value = null
  inspectingClassFeature.value = null
  selectedSources.value = getDefaultSources(newEd)
  fetchData()
})

watch(selectedSources, (newSet) => {
  if (selectedSubclass.value && selectedSubclass.value.source) {
    const upperSet = new Set(Array.from(newSet).map(s => s.toUpperCase()))
    if (!upperSet.has(selectedSubclass.value.source.toUpperCase())) {
      clearSelectedSubclass()
    }
  }
})

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const formatSkillChoices = (choices) => {
  if (!choices) return ''
  const arr = Array.isArray(choices) ? choices : [choices]
  return arr.map(c => {
    if (!c) return ''
    if (c.any) return `Choose any ${c.any} skills`
    if (c.choose) {
      const from = (c.choose.from || []).map(s => String(s).charAt(0).toUpperCase() + String(s).slice(1)).join(', ')
      return `Choose ${c.choose.count || 1} from ${from}`
    }
    return ''
  }).filter(Boolean).join('; ')
}

const formatClassEquipment = (eq) => {
  if (!eq) return ''
  if (typeof eq === 'string') return eq
  if (Array.isArray(eq.entries)) return eq.entries.map(clean5eToolsMarkup).join(' ')
  return ''
}

const filteredSubclasses = computed(() => {
  if (!selectedItem.value?.subclasses) return []
  const upperSet = new Set(Array.from(selectedSources.value).map(s => s.toUpperCase()))
  return selectedItem.value.subclasses.filter(sc => {
    if (!sc.source) return true
    return upperSet.has(sc.source.toUpperCase())
  })
})

const subclassLevelsList = computed(() => {
  if (!subclassDetail.value?.features || !subclassDetail.value.features.length) return ''
  const levels = Array.from(new Set(subclassDetail.value.features.map(f => Number(f.level) || 1))).sort((a, b) => a - b)
  return levels.map(lvl => `Level ${lvl}`).join(', ')
})

const groupedClassFeatures = computed(() => {
  if (!classTableData.value?.allFeatures) return []
  const baseMap = new Map()
  for (const f of classTableData.value.allFeatures) {
    const lvl = Number(f.level) || 1
    if (!baseMap.has(lvl)) baseMap.set(lvl, [])
    baseMap.get(lvl).push({ ...f, isSubclassFeature: false })
  }

  const scMap = new Map()
  if (subclassDetail.value?.features && Array.isArray(subclassDetail.value.features)) {
    for (const scf of subclassDetail.value.features) {
      const lvl = Number(scf.level) || 1
      if (!scMap.has(lvl)) scMap.set(lvl, [])
      scMap.get(lvl).push({
        ...scf,
        isSubclassFeature: true,
        subclassName: subclassDetail.value.name
      })
    }
  }

  const allLevels = new Set([...baseMap.keys(), ...scMap.keys()])
  const result = []

  for (const lvl of Array.from(allLevels).sort((a, b) => a - b)) {
    let baseList = baseMap.get(lvl) || []
    const scList = scMap.get(lvl) || []

    if (scList.length > 0) {
      baseList = baseList.filter(f => !/subclass\s+feature/i.test(f.name || ''))
    }

    const merged = [...baseList, ...scList]
    if (merged.length > 0) {
      result.push({
        level: lvl,
        levelLabel: getOrdinal(lvl),
        features: merged
      })
    }
  }

  return result
})

const totalFeaturesCount = computed(() => {
  return groupedClassFeatures.value.reduce((acc, g) => acc + g.features.length, 0)
})

const getRowFeatures = (row) => {
  if (!row) return []
  const baseFeats = (row.features || []).map(f => ({ ...f, isSubclassFeature: false }))
  if (!subclassDetail.value?.features) return baseFeats

  const scFeats = subclassDetail.value.features
    .filter(f => Number(f.level) === Number(row.level))
    .map(f => ({
      ...f,
      isSubclassFeature: true,
      subclassName: subclassDetail.value.name
    }))

  if (scFeats.length === 0) return baseFeats

  const filteredBase = baseFeats.filter(f => !/subclass\s+feature/i.test(f.name || ''))
  return [...filteredBase, ...scFeats]
}

const fetchClassTableForCompendium = async (className, edition = '2024') => {
  if (!className) return
  const cacheKey = `${className.toLowerCase()}_${edition}`
  if (classTableCache.has(cacheKey)) {
    classTableData.value = classTableCache.get(cacheKey)
    return
  }
  isLoadingClassTable.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/class-table`, {
      params: { name: className, edition }
    })
    if (res.data?.data) {
      classTableData.value = res.data.data
      classTableCache.set(cacheKey, res.data.data)
    } else {
      classTableData.value = null
    }
  } catch (err) {
    console.warn('Failed to load class table in compendium:', err)
    classTableData.value = null
  } finally {
    isLoadingClassTable.value = false
  }
}

const selectSubclass = async (sc) => {
  if (selectedSubclass.value?.id === sc.id || (selectedSubclass.value?.name === sc.name && selectedSubclass.value?.source === sc.source)) {
    selectedSubclass.value = null
    subclassDetail.value = null
    return
  }
  classViewTab.value = 'features'
  selectedSubclass.value = sc
  const cacheKey = sc.id || `${sc.name}_${sc.source}_${sc.edition || currentEdition.value}`
  if (subclassCache.has(cacheKey)) {
    subclassDetail.value = subclassCache.get(cacheKey)
    return
  }
  isLoadingSubclass.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/subclass-detail`, {
      params: {
        id: sc.id || undefined,
        name: sc.name,
        class_name: selectedItem.value?.name,
        edition: sc.edition || currentEdition.value
      }
    })
    if (res.data?.data) {
      subclassDetail.value = res.data.data
      subclassCache.set(cacheKey, res.data.data)
    } else {
      subclassDetail.value = null
    }
  } catch (err) {
    console.warn('Failed to load subclass detail:', err)
    subclassDetail.value = null
  } finally {
    isLoadingSubclass.value = false
  }
}

const clearSelectedSubclass = () => {
  selectedSubclass.value = null
  subclassDetail.value = null
}

watch(() => selectedItem.value, (newItem) => {
  selectedSubclass.value = null
  subclassDetail.value = null
  inspectingClassFeature.value = null
  if (newItem && (newItem._category === 'classes' || newItem.hitDice)) {
    fetchClassTableForCompendium(newItem.name, newItem.edition || currentEdition.value)
  }
}, { immediate: true })

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
  if (item._category === 'adventures' || item.levelRange) {
    return item.levelRange ? `Adventure (${item.levelRange})` : 'Adventure'
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
          <button
            type="button"
            @click="setTab('adventures')"
            :class="[
              'px-3.5 py-1.5 font-semibold uppercase tracking-wider rounded transition cursor-pointer whitespace-nowrap text-[11px]',
              activeTab === 'adventures' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Adventures
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

        <!-- Right Column: Detail Card (7 cols on md) -->
        <div
          class="md:col-span-7 bg-white rounded border border-gray-200 shadow-xs p-4 sm:p-5 flex flex-col h-[650px] overflow-y-auto"
          :data-edition="selectedItem?.edition || currentEdition"
          :data-source="selectedItem?.source || (selectedSources.size > 0 ? Array.from(selectedSources)[0] : (currentEdition === '2024' ? 'XPHB' : 'PHB'))"
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

                <!-- Delete Homebrew Button -->
                <button
                  v-if="selectedItem.source === 'Homebrew'"
                  type="button"
                  @click="deleteHomebrewItem(selectedItem)"
                  class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition shadow-xs flex items-center gap-1 shrink-0"
                  title="Delete this homebrew entry"
                >
                  <IconTrash class="w-3.5 h-3.5" />
                  <span>Delete Homebrew</span>
                </button>
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
                <div v-if="selectedItem.skillChoices && formatSkillChoices(selectedItem.skillChoices)">
                  <strong class="text-gray-700">Skills:</strong> {{ formatSkillChoices(selectedItem.skillChoices) }}
                </div>
                <div v-if="selectedItem.startingEquipment && formatClassEquipment(selectedItem.startingEquipment)">
                  <strong class="text-gray-700">Starting Equipment:</strong> <span v-html="renderAnnotatedText(formatClassEquipment(selectedItem.startingEquipment))"></span>
                </div>
              </div>

              <div v-if="selectedItem.subclasses && selectedItem.subclasses.length" class="pt-2 border-t border-gray-200 space-y-1.5">
                <div class="flex items-center justify-between flex-wrap gap-1">
                  <h4 class="font-bold text-xs uppercase tracking-wider text-gray-900">
                    {{ selectedItem.subclassTitle || 'Subclasses' }} ({{ selectedItem.subclasses.length }})
                  </h4>
                  <span class="text-[10px] text-gray-500 italic">Click subclass to view embedded features</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="sc in selectedItem.subclasses"
                    :key="sc.id || (sc.name + sc.source)"
                    type="button"
                    @click="selectSubclass(sc)"
                    :class="[
                      'px-2 py-1 rounded font-medium text-[11px] shadow-2xs flex items-center gap-1.5 transition cursor-pointer border',
                      (selectedSubclass?.id === sc.id || (selectedSubclass?.name === sc.name && selectedSubclass?.source === sc.source))
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm ring-1 ring-gray-900'
                        : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200 hover:border-gray-300'
                    ]"
                  >
                    <span>{{ sc.name }}</span>
                    <span
                      v-if="sc.source"
                      :class="(selectedSubclass?.id === sc.id || (selectedSubclass?.name === sc.name && selectedSubclass?.source === sc.source)) ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'"
                      class="text-[9px] font-mono px-1 py-0.2 rounded"
                    >
                      {{ sc.source }}
                    </span>
                  </button>
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

            <!-- Adventure Details -->
            <div
              v-else-if="selectedItem._category === 'adventures' || selectedItem.levelRange"
              class="space-y-2.5 bg-gray-50 p-3 rounded border border-gray-200 text-[11px]"
            >
              <div v-if="selectedItem.levelRange">
                <span class="text-gray-400 block font-medium">Recommended Levels</span>
                <span class="font-semibold text-gray-800">{{ selectedItem.levelRange }}</span>
              </div>
              <div v-if="selectedItem.summary" class="pt-1 border-t border-gray-200">
                <span class="text-gray-400 block font-medium mb-0.5">Summary</span>
                <p class="text-gray-700 leading-relaxed">{{ selectedItem.summary }}</p>
              </div>
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
              <div v-if="selectedItem._category !== 'monsters' && selectedItem.cr === undefined && selectedItem.entries && (Array.isArray(selectedItem.entries) ? selectedItem.entries.length : true) && selectedItem._category !== 'classes'" v-html="renderAnnotatedText(formatEntries(selectedItem.entries))"></div>
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

              <!-- Comprehensive Class Progression Table, Class Features, and Embedded Subclass -->
              <div v-else-if="selectedItem._category === 'classes'" class="space-y-4 not-prose">
                <!-- Class Navigation Tabs -->
                <div class="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <button
                    type="button"
                    @click="classViewTab = 'features'"
                    :class="[
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5',
                      classViewTab === 'features'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    <span>Class Features & Subclasses</span>
                  </button>
                  <button
                    type="button"
                    @click="classViewTab = 'table'"
                    :class="[
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5',
                      classViewTab === 'table'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    <span>Class Progression Table (1–20)</span>
                    <span v-if="classTableData?.rows" class="text-[10px] font-mono px-1 rounded bg-white/20 text-white">1–20</span>
                  </button>
                </div>

                <!-- Loading State -->
                <div v-if="isLoadingClassTable" class="p-6 text-center text-gray-400 italic text-xs">
                  Loading class progression and features...
                </div>

                <!-- TAB 1: Features & Subclasses -->
                <div v-else-if="classViewTab === 'features'" class="space-y-4">
                  <!-- Subclass Selector Bar in Features Tab -->
                  <div
                    v-if="filteredSubclasses.length"
                    class="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-2"
                  >
                    <div class="flex items-center justify-between flex-wrap gap-1">
                      <div class="font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <span>{{ selectedItem.subclassTitle || 'Subclasses' }}</span>
                        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-normal">
                          {{ filteredSubclasses.length }}
                        </span>
                      </div>
                      <span class="text-[10px] text-gray-500 italic">
                        Klik subclass untuk melihat detail &amp; seluruh fitur langsung di sini
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="sc in filteredSubclasses"
                        :key="sc.id || (sc.name + sc.source)"
                        type="button"
                        @click="selectSubclass(sc)"
                        :class="[
                          'px-2.5 py-1 rounded font-medium text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer border',
                          (selectedSubclass?.id === sc.id || (selectedSubclass?.name === sc.name && selectedSubclass?.source === sc.source))
                            ? 'bg-gray-900 text-white border-gray-900 shadow-xs ring-1 ring-gray-900'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200 hover:border-gray-300'
                        ]"
                      >
                        <span>{{ sc.name }}</span>
                        <span
                          v-if="sc.source"
                          :class="(selectedSubclass?.id === sc.id || (selectedSubclass?.name === sc.name && selectedSubclass?.source === sc.source)) ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-600'"
                          class="text-[9px] font-mono px-1 py-0.2 rounded"
                        >
                          {{ sc.source }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- Active Subclass Summary Banner (Clean bordered theme, concise) -->
                  <div
                    v-if="selectedSubclass"
                    class="p-3.5 sm:p-4 bg-white border-2 border-gray-800 rounded-lg space-y-2 text-gray-900 shadow-xs"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                      <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Active Subclass Preview
                        </div>
                        <h3 class="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                          <span>{{ subclassDetail?.name || selectedSubclass.name }}</span>
                          <span
                            v-if="subclassDetail?.source || selectedSubclass.source"
                            class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-700"
                          >
                            {{ subclassDetail?.source || selectedSubclass.source }}
                          </span>
                        </h3>
                      </div>
                      <button
                        type="button"
                        @click="clearSelectedSubclass"
                        class="px-2 py-1 text-xs text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition cursor-pointer flex items-center gap-1 shrink-0 font-medium"
                        title="Deselect subclass"
                      >
                        ✕ Close Subclass
                      </button>
                    </div>

                    <div v-if="isLoadingSubclass" class="py-2 text-center text-gray-400 italic text-xs">
                      Loading subclass features...
                    </div>

                    <div v-else-if="subclassDetail" class="space-y-2">
                      <div
                        v-if="subclassDetail.entries && subclassDetail.entries.length"
                        class="text-xs text-gray-600 leading-relaxed italic"
                        v-html="renderAnnotatedText(formatEntries(subclassDetail.entries))"
                      ></div>
                    </div>
                  </div>

                  <!-- Complete Class Features (Levels 1 to 20 with Embedded Subclass Features) -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-1">
                      <h3 class="font-bold text-xs uppercase tracking-wider text-gray-900">
                        Class Features (Levels 1–20)
                      </h3>
                      <span v-if="totalFeaturesCount" class="text-[10px] text-gray-500 font-mono">
                        {{ totalFeaturesCount }} Features Total
                      </span>
                    </div>

                    <div v-if="groupedClassFeatures.length" class="space-y-4">
                      <div
                        v-for="group in groupedClassFeatures"
                        :key="group.level"
                        class="space-y-2 border-l-2 border-gray-300 pl-3 pt-0.5"
                      >
                        <div class="font-bold text-xs text-gray-900 flex items-center gap-2">
                          <span class="px-2 py-0.5 rounded bg-gray-200 text-gray-800 text-[10px] font-mono">
                            {{ group.levelLabel }} Level
                          </span>
                        </div>

                        <div class="space-y-2.5">
                          <div
                            v-for="feat in group.features"
                            :key="(feat.isSubclassFeature ? 'sc_' : 'base_') + (feat.id || feat.name)"
                            :class="[
                              feat.isSubclassFeature
                                ? 'p-3 bg-white border-2 border-gray-800 rounded-md space-y-1.5 shadow-xs'
                                : 'p-3 bg-gray-50/70 border border-gray-200 rounded-md space-y-1.5 shadow-2xs'
                            ]"
                          >
                            <div
                              :class="[
                                'flex items-center justify-between flex-wrap gap-1 border-b pb-1',
                                feat.isSubclassFeature ? 'border-gray-200' : 'border-gray-200/60'
                              ]"
                            >
                              <div class="flex items-center gap-2">
                                <span
                                  v-if="feat.isSubclassFeature"
                                  class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-semibold border border-gray-400"
                                >
                                  Level {{ feat.level }} Subclass Feature
                                </span>
                                <h4 class="font-bold text-xs text-gray-900">
                                  {{ feat.name }}
                                </h4>
                              </div>
                              <div class="flex items-center gap-1.5 text-[9px] font-mono">
                                <span v-if="feat.isSubclassFeature" class="text-gray-600 font-sans font-medium">
                                  {{ feat.subclassName }}
                                </span>
                                <span
                                  v-if="feat.source"
                                  class="text-gray-400"
                                >
                                  {{ feat.source }}<span v-if="feat.page"> p. {{ feat.page }}</span>
                                </span>
                              </div>
                            </div>
                            <div
                              class="text-xs leading-relaxed text-gray-700"
                              v-html="renderAnnotatedText(formatEntries(feat.entries))"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-else class="text-gray-400 italic text-xs py-4 text-center">
                      No features available for this class.
                    </div>
                  </div>
                </div>

                <!-- TAB 2: Class Progression Table (1-20) -->
                <div v-else-if="classViewTab === 'table'" class="space-y-3">
                  <div v-if="classTableData" class="overflow-x-auto border border-gray-200 rounded shadow-xs bg-white">
                    <table class="w-full text-left text-xs divide-y divide-gray-200">
                      <thead class="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                        <tr>
                          <th class="py-2.5 px-3 whitespace-nowrap text-center">Level</th>
                          <th class="py-2.5 px-3 whitespace-nowrap text-center">PB</th>
                          <th class="py-2.5 px-3 min-w-[200px]">Class Features</th>
                          <th
                            v-for="(hdr, hIdx) in classTableData.headers"
                            :key="hIdx"
                            class="py-2.5 px-3 whitespace-nowrap text-center font-mono"
                          >
                            {{ hdr }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 bg-white">
                        <tr
                          v-for="row in classTableData.rows"
                          :key="row.level"
                          class="hover:bg-gray-50/80 transition"
                        >
                          <td class="py-2 px-3 text-center whitespace-nowrap font-mono text-gray-700">
                            {{ row.levelLabel }}
                          </td>
                          <td class="py-2 px-3 text-center whitespace-nowrap font-mono text-gray-600">
                            {{ row.proficiencyBonus }}
                          </td>
                          <td class="py-2 px-3">
                            <div v-if="getRowFeatures(row).length" class="flex flex-wrap gap-1">
                              <button
                                v-for="feat in getRowFeatures(row)"
                                :key="(feat.isSubclassFeature ? 'sc_' : 'base_') + (feat.id || feat.name)"
                                type="button"
                                @click="inspectingClassFeature = feat"
                                :class="[
                                  'px-2 py-0.5 rounded text-[11px] border transition cursor-pointer text-left flex items-center gap-1 shadow-2xs',
                                  feat.isSubclassFeature
                                    ? (inspectingClassFeature?.name === feat.name
                                        ? 'border-2 border-gray-900 bg-gray-100 text-gray-900 font-semibold'
                                        : 'border-2 border-gray-800 bg-white hover:bg-gray-50 text-gray-900 font-medium')
                                    : inspectingClassFeature?.name === feat.name
                                      ? 'border-gray-900 bg-gray-100 text-gray-900 font-semibold'
                                      : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-800'
                                ]"
                              >
                                <span
                                  v-if="feat.isSubclassFeature"
                                  class="text-[9px] px-1 py-0.2 rounded bg-gray-100 border border-gray-300 text-gray-600 font-mono"
                                >
                                  Subclass
                                </span>
                                <span>{{ feat.name }}</span>
                              </button>
                            </div>
                            <span v-else class="text-gray-400 italic text-[11px]">—</span>
                          </td>
                          <td
                            v-for="(val, vIdx) in row.customValues"
                            :key="vIdx"
                            class="py-2 px-3 text-center whitespace-nowrap font-mono text-gray-700"
                          >
                            {{ val || '—' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div v-else-if="!selectedItem.trait && !selectedItem.action && selectedItem._category !== 'monsters' && selectedItem.cr === undefined && selectedItem._category !== 'classes'" class="text-gray-400 italic text-xs py-2">
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

    <!-- Homebrew Creation Modal -->
    <div
      v-if="showHomebrewModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-xl w-full p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-gray-900 text-sm">Create Homebrew Entry</h3>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Custom</span>
          </div>
          <button type="button" @click="showHomebrewModal = false" class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer">
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="submitHomebrew" class="space-y-3">
          <!-- Category Selector -->
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Category *</label>
            <select
              v-model="homebrewCategory"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900 capitalize"
            >
              <option value="spell">Spell</option>
              <option value="item">Item / Equipment</option>
              <option value="monster">Monster / Creature</option>
              <option value="feat">Feat</option>
              <option value="adventure">Adventure</option>
              <option value="subclass">Subclass</option>
              <option value="subrace">Subrace / Lineage</option>
            </select>
          </div>

          <!-- Name -->
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              v-model="homebrewForm.name"
              required
              placeholder="e.g. Eldritch Blade, Vorpal Greatsword, Dire Drake"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <!-- SPELL Fields -->
          <div v-if="homebrewCategory === 'spell'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Spell Attributes</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Level</label>
                <select v-model.number="homebrewForm.level" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                  <option :value="0">Cantrip (0)</option>
                  <option v-for="l in 9" :key="l" :value="l">Level {{ l }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">School</label>
                <select v-model="homebrewForm.school" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                  <option value="abjuration">Abjuration</option>
                  <option value="conjuration">Conjuration</option>
                  <option value="divination">Divination</option>
                  <option value="enchantment">Enchantment</option>
                  <option value="evocation">Evocation</option>
                  <option value="illusion">Illusion</option>
                  <option value="necromancy">Necromancy</option>
                  <option value="transmutation">Transmutation</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Casting Time</label>
                <input type="text" v-model="homebrewForm.casting_time" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Range</label>
                <input type="text" v-model="homebrewForm.range" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Components</label>
                <input type="text" v-model="homebrewForm.components" placeholder="V, S" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Duration</label>
                <input type="text" v-model="homebrewForm.duration" placeholder="Instantaneous" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Dice</label>
                <input type="text" v-model="homebrewForm.damage_dice" placeholder="e.g. 2d8" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
                <input type="text" v-model="homebrewForm.damage_type" placeholder="e.g. fire" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Save Ability</label>
                <select v-model="homebrewForm.save_ability" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs uppercase">
                  <option value="">None</option>
                  <option value="str">STR</option>
                  <option value="dex">DEX</option>
                  <option value="con">CON</option>
                  <option value="int">INT</option>
                  <option value="wis">WIS</option>
                  <option value="cha">CHA</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Classes (comma separated)</label>
                <input type="text" v-model="homebrewForm.classes" placeholder="Wizard, Sorcerer" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div class="flex items-center gap-4 pt-1">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="homebrewForm.concentration" class="rounded text-gray-900" />
                <span>Concentration</span>
              </label>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="homebrewForm.ritual" class="rounded text-gray-900" />
                <span>Ritual</span>
              </label>
            </div>
          </div>

          <!-- ITEM Fields -->
          <div v-if="homebrewCategory === 'item'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Item Attributes</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Type</label>
                <select v-model="homebrewForm.item_type" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                  <option value="gear">Gear</option>
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                  <option value="potion">Potion</option>
                  <option value="scroll">Scroll</option>
                  <option value="ring">Ring</option>
                  <option value="rod">Rod</option>
                  <option value="staff">Staff</option>
                  <option value="wand">Wand</option>
                  <option value="wondrous item">Wondrous Item</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Rarity</label>
                <select v-model="homebrewForm.rarity" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                  <option value="none">None / Common</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="very rare">Very Rare</option>
                  <option value="legendary">Legendary</option>
                  <option value="artifact">Artifact</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Weight (lb)</label>
                <input type="text" v-model="homebrewForm.weight" placeholder="1" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Cost (CP)</label>
                <input type="number" min="0" v-model.number="homebrewForm.cost_cp" placeholder="100" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div v-if="homebrewForm.item_type === 'weapon'" class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Dice</label>
                <input type="text" v-model="homebrewForm.damage_dice" placeholder="e.g. 1d8" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
                <input type="text" v-model="homebrewForm.damage_type" placeholder="e.g. slashing" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div v-if="homebrewForm.item_type === 'armor'" class="grid grid-cols-2 gap-2 items-center">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Base AC</label>
                <input type="number" min="0" v-model.number="homebrewForm.base_ac" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div class="pt-3">
                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="homebrewForm.ac_dex_bonus" class="rounded text-gray-900" />
                  <span>DEX Bonus to AC</span>
                </label>
              </div>
            </div>
          </div>

          <!-- MONSTER Fields -->
          <div v-if="homebrewCategory === 'monster'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Monster Stats</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">CR</label>
                <input type="text" v-model="homebrewForm.cr" placeholder="1" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Size</label>
                <select v-model="homebrewForm.size" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                  <option value="T">Tiny (T)</option>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="H">Huge (H)</option>
                  <option value="G">Gargantuan (G)</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Type</label>
                <input type="text" v-model="homebrewForm.type" placeholder="humanoid, beast" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Alignment</label>
                <input type="text" v-model="homebrewForm.alignment" placeholder="neutral" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Armor Class (AC)</label>
                <input type="number" min="0" v-model.number="homebrewForm.ac" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Hit Points (HP)</label>
                <input type="number" min="1" v-model.number="homebrewForm.hp" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Speed (ft)</label>
                <input type="number" min="0" step="5" v-model.number="homebrewForm.speed" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <!-- Ability Scores 6-grid -->
            <div>
              <span class="block text-[11px] text-gray-600 mb-1">Ability Scores</span>
              <div class="grid grid-cols-6 gap-1 text-center font-mono">
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">STR</span>
                  <input type="number" v-model.number="homebrewForm.str" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">DEX</span>
                  <input type="number" v-model.number="homebrewForm.dex" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">CON</span>
                  <input type="number" v-model.number="homebrewForm.con" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">INT</span>
                  <input type="number" v-model.number="homebrewForm.int" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">WIS</span>
                  <input type="number" v-model.number="homebrewForm.wis" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
                <div>
                  <span class="block text-[9px] uppercase font-bold text-gray-500">CHA</span>
                  <input type="number" v-model.number="homebrewForm.cha" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
                </div>
              </div>
            </div>
          </div>

          <!-- FEAT Fields -->
          <div v-if="homebrewCategory === 'feat'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Feat Details</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Category</label>
                <select v-model="homebrewForm.category" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                  <option value="G">General Feat</option>
                  <option value="O">Origin Feat</option>
                  <option value="FS">Fighting Style Feat</option>
                  <option value="EB">Epic Boon Feat</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Prerequisite</label>
                <input type="text" v-model="homebrewForm.prerequisite" placeholder="e.g. Level 4+, Strength 13" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            <div>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="homebrewForm.repeatable" class="rounded text-gray-900" />
                <span>Repeatable Feat</span>
              </label>
            </div>
          </div>

          <!-- ADVENTURE Fields -->
          <div v-if="homebrewCategory === 'adventure'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Adventure Details</div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Recommended Level Range</label>
              <input type="text" v-model="homebrewForm.level_range" placeholder="Level 1-5" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Summary</label>
              <textarea v-model="homebrewForm.summary" rows="2" placeholder="Brief premise of the adventure..." class="w-full bg-white border border-gray-300 rounded p-2 text-xs"></textarea>
            </div>
          </div>

          <!-- SUBCLASS Fields -->
          <div v-if="homebrewCategory === 'subclass'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Subclass Details</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Parent Class *</label>
                <select v-model="homebrewForm.class_name" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                  <option value="Barbarian">Barbarian</option>
                  <option value="Bard">Bard</option>
                  <option value="Cleric">Cleric</option>
                  <option value="Druid">Druid</option>
                  <option value="Fighter">Fighter</option>
                  <option value="Monk">Monk</option>
                  <option value="Paladin">Paladin</option>
                  <option value="Ranger">Ranger</option>
                  <option value="Rogue">Rogue</option>
                  <option value="Sorcerer">Sorcerer</option>
                  <option value="Warlock">Warlock</option>
                  <option value="Wizard">Wizard</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Spellcasting Ability (if any)</label>
                <select v-model="homebrewForm.spellcasting_ability" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs uppercase">
                  <option value="">None</option>
                  <option value="int">INT</option>
                  <option value="wis">WIS</option>
                  <option value="cha">CHA</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SUBRACE Fields -->
          <div v-if="homebrewCategory === 'subrace'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
            <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Subrace / Lineage Details</div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Parent Species / Race *</label>
              <input type="text" v-model="homebrewForm.race_name" placeholder="e.g. Elf, Dwarf, Human" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>

          <!-- Common Description / Rules Text -->
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Description / Rules Text</label>
            <textarea
              v-model="homebrewForm.entries"
              rows="4"
              placeholder="Full description, traits, features, or background lore..."
              class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <div v-if="homebrewError" class="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
            {{ homebrewError }}
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              @click="showHomebrewModal = false"
              class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSavingHomebrew"
              class="px-4 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs"
            >
              {{ isSavingHomebrew ? 'Saving...' : 'Save Homebrew' }}
            </button>
          </div>
        </form>
      </div>
    </div>

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
