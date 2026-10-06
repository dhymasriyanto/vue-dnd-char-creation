<script setup>
import axios from 'axios'
import RaceSubRaceDetail from './RaceSubRaceDetail.vue'
import ClassSubClassDetail from './ClassSubClassDetail.vue'
import ClassSpellsPicker from './ClassSpellsPicker.vue'
import FeatSpellsPicker from './FeatSpellsPicker.vue'
import { computed, nextTick, onBeforeUpdate, onMounted, onUpdated, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCharacterStore } from '../stores/character'
import { useConfig } from '../config'
import { renderAnnotatedText, clean5eToolsMarkup } from '../utils/textRenderer'
import { IconArrowLeft, IconLock, IconX } from '@tabler/icons-vue'
import {
  formatPrerequisitesText,
  getMulticlassProficiencies,
  checkMulticlassPrerequisites
} from '../utils/multiclassRules'

const API_URL = useConfig().API_URL

const props = defineProps({
  characterToEdit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['back', 'created'])

const characterStore = useCharacterStore()

const isEditMode = computed(() => !!props.characterToEdit?.id)

const selectedEdition = ref('2024')
const currentTab = ref('background')
const scrollRef = ref()
const characterName = ref('')
const characterRace = ref({})
const characterSubRace = ref({})
const strength = ref(10)
const dexterity = ref(10)
const constitution = ref(10)
const intelligence = ref(10)
const wisdom = ref(10)
const charisma = ref(10)
const classSelected = ref('')
const characterClass = ref({})
const characterSubClass = ref({})
const characterBackground = ref('')
const alignment = ref('')
const race = ref({})
const subRace = ref([])
const allClass = ref({})
const subClass = ref([])
const classLevel = ref(1)
const backgrounds = ref([])
const selectedBackgroundObj = ref(null)
const availableFeats = ref([])

// Source Books Configuration
const SOURCE_OPTIONS_2024 = [
  { code: 'XPHB', label: "Player's Handbook 2024 (Core/SRD)" },
  { code: 'XDMG', label: "Dungeon Master's Guide 2024" }
]

const SOURCE_OPTIONS_2014 = [
  { code: 'PHB', label: "Player's Handbook 2014 (Core/SRD)" },
  { code: 'DMG', label: "Dungeon Master's Guide" },
  { code: 'MM', label: "Monster Manual" },
  { code: 'XGE', label: "Xanathar's Guide" },
  { code: 'TCE', label: "Tasha's Cauldron" },
  { code: 'VGM', label: "Volo's Guide" },
  { code: 'MTF', label: "Mordenkainen's Tome" },
  { code: 'MPMM', label: "Monsters Multiverse" },
  { code: 'SCAG', label: "Sword Coast" },
  { code: 'EGW', label: "Explorer's Guide to Wildemount" },
  { code: 'FTD', label: "Fizban's Treasury" },
  { code: 'ERLW', label: "Eberron" }
]

const { selectedSources } = storeToRefs(characterStore)

const currentSourceOptions = computed(() => {
  return selectedEdition.value === '2024' ? SOURCE_OPTIONS_2024 : SOURCE_OPTIONS_2014
})

const toggleSource = (code) => {
  if (!isFirstStep.value) return
  const idx = selectedSources.value.indexOf(code)
  if (idx >= 0) {
    if (selectedSources.value.length > 1) {
      selectedSources.value.splice(idx, 1)
    }
  } else {
    selectedSources.value.push(code)
  }
}

// Source-filtered Compendium Collections
const filteredRaces = computed(() => {
  const rList = Array.isArray(race.value) ? race.value : Object.values(race.value || {})
  return rList.filter(r => {
    const s = (r.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return (selectedSources.value || []).includes(s)
  })
})

const filteredSubRaces = computed(() => {
  const srList = Array.isArray(subRace.value) ? subRace.value : []
  return srList.filter(sr => {
    const s = (sr.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return (selectedSources.value || []).includes(s)
  })
})

const isSubraceRequired = computed(() => {
  if (selectedEdition.value === '2024') return false
  if (!characterRace.value || !characterRace.value.name) return false
  if (filteredSubRaces.value.length === 0) return false

  const rName = (characterRace.value.name || '').toLowerCase()
  // Races that strictly require a subrace in 2014 rules (incomplete stats/traits on base race)
  const mandatoryRaces = ['elf', 'dwarf', 'halfling', 'gnome', 'aasimar', 'genasi', 'gith', 'shifter']
  return mandatoryRaces.some(m => rName.includes(m))
})

const filteredBackgrounds = computed(() => {
  return backgrounds.value.filter(b => {
    const s = (b.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return (selectedSources.value || []).includes(s)
  })
})

const filteredFeats = computed(() => {
  return availableFeats.value.filter(f => {
    const s = (f.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return (selectedSources.value || []).includes(s)
  })
})

const CLASS_SOURCES = {
  artificer: ['TCE', 'ERLW'],
  barbarian: ['PHB', 'XPHB'],
  bard: ['PHB', 'XPHB'],
  cleric: ['PHB', 'XPHB'],
  druid: ['PHB', 'XPHB'],
  fighter: ['PHB', 'XPHB'],
  monk: ['PHB', 'XPHB'],
  paladin: ['PHB', 'XPHB'],
  ranger: ['PHB', 'XPHB'],
  rogue: ['PHB', 'XPHB'],
  sorcerer: ['PHB', 'XPHB'],
  warlock: ['PHB', 'XPHB'],
  wizard: ['PHB', 'XPHB'],
  sidekick: ['TCE'],
  mystic: ['UA']
}

const filteredClasses = computed(() => {
  const res = {}
  for (const [key, val] of Object.entries(allClass.value || {})) {
    const kLower = key.toLowerCase()
    if (selectedEdition.value === '2024' && kLower === 'artificer') continue
    const classSources = CLASS_SOURCES[kLower] || (selectedEdition.value === '2024' ? ['XPHB'] : ['PHB'])
    const hasSource = classSources.some(s => selectedSources.value.includes(s))
    if (!hasSource) continue
    res[key] = val
  }
  return res
})

// In-line error tracking (no separate error banner)
const errors = reactive({})

// --- Ability Scores & ASI System ---
const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
const SHORT_TO_KEY = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma'
}
const KEY_TO_SHORT = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
}
const KEY_TO_LABEL = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
}

const ALL_SKILLS = [
  { key: 'athletics', label: 'Athletics', ability: 'STR' },
  { key: 'acrobatics', label: 'Acrobatics', ability: 'DEX' },
  { key: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'DEX' },
  { key: 'stealth', label: 'Stealth', ability: 'DEX' },
  { key: 'arcana', label: 'Arcana', ability: 'INT' },
  { key: 'history', label: 'History', ability: 'INT' },
  { key: 'investigation', label: 'Investigation', ability: 'INT' },
  { key: 'nature', label: 'Nature', ability: 'INT' },
  { key: 'religion', label: 'Religion', ability: 'INT' },
  { key: 'animal_handling', label: 'Animal Handling', ability: 'WIS' },
  { key: 'insight', label: 'Insight', ability: 'WIS' },
  { key: 'medicine', label: 'Medicine', ability: 'WIS' },
  { key: 'perception', label: 'Perception', ability: 'WIS' },
  { key: 'survival', label: 'Survival', ability: 'WIS' },
  { key: 'deception', label: 'Deception', ability: 'CHA' },
  { key: 'intimidation', label: 'Intimidation', ability: 'CHA' },
  { key: 'performance', label: 'Performance', ability: 'CHA' },
  { key: 'persuasion', label: 'Persuasion', ability: 'CHA' }
]

const STANDARD_LANGUAGES = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
  'Abyssal',
  'Celestial',
  'Draconic',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon'
]

const CLASS_SKILL_FALLBACKS = {
  barbarian: { count: 2, from: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  bard: { count: 3, from: ALL_SKILLS.map(s => s.key) },
  cleric: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  druid: { count: 2, from: ['arcana', 'animal_handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  fighter: { count: 2, from: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  monk: { count: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  paladin: { count: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  ranger: { count: 3, from: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  rogue: { count: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'] },
  sorcerer: { count: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  warlock: { count: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  wizard: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
  artificer: { count: 2, from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight_of_hand'] }
}

const CLASS_PRIMARY_ABILITIES = {
  barbarian: ['Strength', 'Constitution'],
  bard: ['Charisma', 'Dexterity'],
  cleric: ['Wisdom', 'Constitution'],
  druid: ['Wisdom', 'Constitution'],
  fighter: ['Strength or Dexterity', 'Constitution'],
  monk: ['Dexterity', 'Wisdom'],
  paladin: ['Strength', 'Charisma'],
  ranger: ['Dexterity', 'Wisdom'],
  rogue: ['Dexterity', 'Intelligence or Charisma'],
  sorcerer: ['Charisma', 'Constitution'],
  warlock: ['Charisma', 'Constitution'],
  wizard: ['Intelligence', 'Constitution or Dexterity'],
  artificer: ['Intelligence', 'Constitution']
}

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const POINT_BUY_COST = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
}

const scoreMethod = ref('standard')

const baseScores = reactive({
  strength: 15,
  dexterity: 14,
  constitution: 13,
  intelligence: 12,
  wisdom: 10,
  charisma: 8
})

const lastRollLogs = reactive({
  strength: '',
  dexterity: '',
  constitution: '',
  intelligence: '',
  wisdom: '',
  charisma: ''
})

const allClassRecommendations = computed(() => {
  const result = []
  const primaryName = classSelected.value || characterClass.value?.class?.name || ''
  if (primaryName) {
    const pLower = primaryName.toLowerCase()
    let primaryStats = []
    for (const [key, stats] of Object.entries(CLASS_PRIMARY_ABILITIES)) {
      if (pLower.includes(key)) {
        primaryStats = stats
        break
      }
    }
    if (primaryStats.length) {
      result.push({ name: primaryName, stats: primaryStats })
    }
  }

  if (Array.isArray(multiclasses.value)) {
    for (const mc of multiclasses.value) {
      const mcName = mc.classSelected || mc.characterClass?.class?.name || ''
      if (mcName) {
        const mcLower = mcName.toLowerCase()
        let mcStats = []
        for (const [key, stats] of Object.entries(CLASS_PRIMARY_ABILITIES)) {
          if (mcLower.includes(key)) {
            mcStats = stats
            break
          }
        }
        if (mcStats.length && !result.some(r => r.name.toLowerCase() === mcName.toLowerCase())) {
          result.push({ name: mcName, stats: mcStats })
        }
      }
    }
  }
  return result
})

const classPrimaryStats = computed(() => {
  return allClassRecommendations.value.flatMap(cr => cr.stats)
})

const isPrimaryStat = (statKey) => {
  const label = KEY_TO_LABEL[statKey].toLowerCase()
  return allClassRecommendations.value.some(cr =>
    cr.stats.some(ps => ps.toLowerCase().includes(label))
  )
}

const onStandardArraySelect = (statKey, newVal) => {
  const val = Number(newVal)
  const prevVal = baseScores[statKey]
  const swapStat = ABILITY_KEYS.find(k => k !== statKey && baseScores[k] === val)
  if (swapStat) {
    baseScores[swapStat] = prevVal
  }
  baseScores[statKey] = val
}

const pointBuySpent = computed(() => {
  return ABILITY_KEYS.reduce((sum, key) => {
    const val = baseScores[key]
    const clamped = Math.min(15, Math.max(8, val || 8))
    return sum + (POINT_BUY_COST[clamped] ?? 0)
  }, 0)
})

const pointBuyRemaining = computed(() => 27 - pointBuySpent.value)

const canIncrementPointBuy = (stat) => {
  const cur = baseScores[stat] || 8
  if (cur >= 15) return false
  const nextCost = (POINT_BUY_COST[cur + 1] ?? 99) - (POINT_BUY_COST[cur] ?? 0)
  return pointBuyRemaining.value >= nextCost
}

const canDecrementPointBuy = (stat) => {
  const cur = baseScores[stat] || 8
  return cur > 8
}

const incrementPointBuy = (stat) => {
  if (canIncrementPointBuy(stat)) {
    baseScores[stat] = (baseScores[stat] || 8) + 1
  }
}

const decrementPointBuy = (stat) => {
  if (canDecrementPointBuy(stat)) {
    baseScores[stat] = (baseScores[stat] || 8) - 1
  }
}

const resetPointBuy = () => {
  ABILITY_KEYS.forEach(k => { baseScores[k] = 8 })
}

const roll4d6DropLowest = () => {
  const rolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
  rolls.sort((a, b) => a - b)
  const dropped = rolls[0]
  const kept = rolls.slice(1)
  const sum = kept.reduce((a, b) => a + b, 0)
  return {
    sum,
    log: `[${rolls.join(', ')}] drop ${dropped} = ${sum}`
  }
}

const rollSingleStat = (stat) => {
  const res = roll4d6DropLowest()
  baseScores[stat] = res.sum
  lastRollLogs[stat] = res.log
}

const rollAllStats = () => {
  ABILITY_KEYS.forEach(k => {
    rollSingleStat(k)
  })
}

const setScoreMethod = (method) => {
  delete errors.pointbuy
  scoreMethod.value = method
  if (method === 'standard') {
    const sorted = Object.values(baseScores).map(Number).sort((a, b) => b - a)
    const isStd = JSON.stringify(sorted) === JSON.stringify(STANDARD_ARRAY)
    if (!isStd) {
      baseScores.strength = 15
      baseScores.dexterity = 14
      baseScores.constitution = 13
      baseScores.intelligence = 12
      baseScores.wisdom = 10
      baseScores.charisma = 8
    }
  } else if (method === 'pointbuy') {
    const outOfBounds = ABILITY_KEYS.some(k => baseScores[k] < 8 || baseScores[k] > 15)
    if (outOfBounds || pointBuyRemaining.value < 0) {
      resetPointBuy()
    }
  }
}

// 2024 ASI Configuration (from Background)
const bgEligibleAbilities = computed(() => {
  if (selectedEdition.value !== '2024') return []
  const bg = selectedBackgroundObj.value
  const from = bg?.ability?.[0]?.choose?.weighted?.from
  if (Array.isArray(from) && from.length > 0) {
    return from.map(s => SHORT_TO_KEY[s.toLowerCase()] || s.toLowerCase())
  }
  return ABILITY_KEYS
})

const asi2024Mode = ref('plus2_plus1')
const asi2024Plus2 = ref('strength')
const asi2024Plus1 = ref('constitution')

watch(bgEligibleAbilities, (avail) => {
  if (avail && avail.length >= 2) {
    asi2024Plus2.value = avail[0]
    asi2024Plus1.value = avail[1]
  }
}, { immediate: true })

watch(asi2024Plus2, (newPlus2) => {
  if (asi2024Plus1.value === newPlus2) {
    const other = bgEligibleAbilities.value.find(k => k !== newPlus2)
    if (other) asi2024Plus1.value = other
  }
})

// 2014 ASI Configuration (from Race/Subrace)
const asi2014Mode = ref('racial')
const asi2014CustomPlus2 = ref('strength')
const asi2014CustomPlus1 = ref('dexterity')
const raceChooseStats = ref([])

const raceChoiceConfig = computed(() => {
  if (selectedEdition.value !== '2014') return null
  const abList = [
    ...(characterRace.value?.ability || []),
    ...(characterSubRace.value?.ability || [])
  ]
  for (const item of abList) {
    if (item.choose?.from && (item.choose?.count || item.choose?.amount)) {
      return {
        from: item.choose.from.map(k => SHORT_TO_KEY[k.toLowerCase()] || k.toLowerCase()),
        count: item.choose.count || item.choose.amount || 1
      }
    }
  }
  return null
})

watch(raceChoiceConfig, (cfg) => {
  if (cfg) {
    const currentValid = Array.isArray(raceChooseStats.value) &&
      raceChooseStats.value.length === cfg.count &&
      raceChooseStats.value.every(s => cfg.from.includes(s))
    if (!currentValid) {
      raceChooseStats.value = cfg.from.slice(0, cfg.count)
    }
  } else {
    raceChooseStats.value = []
  }
}, { immediate: true })

// --- Feats & ASI at Level 4, 6, 8, etc. ---
const getUnlockedAsiTiersForClass = (className, level) => {
  const lvl = Number(level) || 1
  const cName = (className || '').toLowerCase()
  const isFighter = cName.includes('fighter')
  const isRogue = cName.includes('rogue')

  const tiers = []
  if (lvl >= 4) tiers.push(4)
  if (lvl >= 6 && isFighter) tiers.push(6)
  if (lvl >= 8) tiers.push(8)
  if (lvl >= 10 && isRogue) tiers.push(10)
  if (lvl >= 12) tiers.push(12)
  if (lvl >= 14 && isFighter) tiers.push(14)
  if (lvl >= 16) tiers.push(16)
  if (lvl >= 19) tiers.push(19)
  return tiers
}

const unlockedAsiTiers = computed(() => {
  return getUnlockedAsiTiersForClass(classSelected.value || characterClass.value?.class?.name, classLevel.value)
})

const asiTierChoices = reactive({})

watch(unlockedAsiTiers, (tiers) => {
  for (const t of tiers) {
    if (!asiTierChoices[t]) {
      asiTierChoices[t] = {
        type: '', // unselected by default
        asiMode: '+2',
        plus2Stat: '',
        plus1StatA: '',
        plus1StatB: '',
        featName: '',
        featAbility: ''
      }
    }
  }
}, { immediate: true })

// Multiclass State & Constraints
const multiclasses = ref([])

const totalCharacterLevel = computed(() => {
  const primaryLvl = Number(classLevel.value) || 1
  const mcLvlSum = multiclasses.value.reduce((sum, mc) => sum + (Number(mc.classLevel) || 1), 0)
  return Math.min(20, primaryLvl + mcLvlSum)
})

const maxPrimaryClassLevel = computed(() => {
  const mcLvlSum = multiclasses.value.reduce((sum, mc) => sum + (Number(mc.classLevel) || 1), 0)
  return Math.max(1, 20 - mcLvlSum)
})

const getMaxLevelForMc = (mcIndex) => {
  const primaryLvl = Number(classLevel.value) || 1
  const otherMcSum = multiclasses.value.reduce((sum, mc, idx) => {
    if (idx === mcIndex) return sum
    return sum + (Number(mc.classLevel) || 1)
  }, 0)
  return Math.max(1, 20 - primaryLvl - otherMcSum)
}

const availableClassesForMulticlass = computed(() => {
  const selected = new Set()
  if (classSelected.value) selected.add(classSelected.value.toLowerCase())
  for (const mc of multiclasses.value) {
    if (mc.classSelected) selected.add(mc.classSelected.toLowerCase())
  }
  const result = {}
  for (const [k, v] of Object.entries(filteredClasses.value)) {
    if (!selected.has(k.toLowerCase())) {
      result[k] = v
    }
  }
  return result
})

const addMulticlass = () => {
  if (totalCharacterLevel.value >= 20) return
  const newMc = {
    id: 'mc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    classSelected: '',
    classLevel: 1,
    characterClass: { class: null, classFeature: [] },
    subClassLists: [],
    selectedSubClassKey: '',
    selectedSubClassItem: null,
    asiTierChoices: {},
    chosenSpells: [],
    chosenSkills: [],
    classSubTab: 'features',
    isCollapsed: false
  }
  multiclasses.value.push(newMc)
  nextTick(() => {
    const el = document.getElementById(newMc.id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

const removeMulticlass = (index) => {
  multiclasses.value.splice(index, 1)
  for (const k of Object.keys(errors)) {
    if (k.includes('_mc_')) {
      delete errors[k]
    }
  }
  recheckAbilitiesErrors()
}

const onMcClassChange = async (mc) => {
  mc.characterClass = { class: null, classFeature: [] }
  mc.subClassLists = []
  mc.selectedSubClassKey = ''
  mc.selectedSubClassItem = null
  mc.chosenSpells = []
  mc.chosenSkills = []
  mc.asiTierChoices = {}
  const mcIdx = multiclasses.value.indexOf(mc)
  if (mcIdx !== -1) {
    delete errors['class_mc_' + mcIdx]
    delete errors['subclass_mc_' + mcIdx]
    delete errors['classSpells_mc_' + mcIdx]
    delete errors['skills_mc_' + mcIdx]
  }

  if (!mc.classSelected) {
    recheckAbilitiesErrors()
    return
  }
  try {
    const res = await axios.get(`${API_URL}/class/${mc.classSelected}?edition=${selectedEdition.value}`)
    const data = res.data?.data
    if (data?.class?.length) {
      mc.characterClass.class = data.class[0]
      mc.characterClass.classFeature = data.classFeature || []
      let directSubclasses = data.subclass || data.subClass || []
      mc.subClassLists = directSubclasses
      const c = data.class[0]
      if (c?.name && c?.source) {
        try {
          const scRes = await axios.get(`${API_URL}/sub-class/${c.name.toLowerCase()}/${c.source.toLowerCase()}?edition=${selectedEdition.value}`)
          const scList = scRes.data?.data?.subClass || scRes.data?.data?.subclass || []
          if (scList.length > 0) {
            mc.subClassLists = scList
          }
        } catch (e) {
          console.warn('Multiclass subclass warning', e)
        }
      }
    }
  } catch (err) {
    console.error('Failed to load multiclass data', err)
  } finally {
    recheckAbilitiesErrors()
  }
}

const onMcSubclassSelect = async (mc, key, mcIndex = -1) => {
  mc.selectedSubClassKey = key
  const mcIdx = mcIndex >= 0 ? mcIndex : multiclasses.value.findIndex(m => m.id === mc.id || m === mc)
  if (mcIdx !== -1 && key) {
    delete errors['subclass_mc_' + mcIdx]
  }
  if (!key) {
    mc.selectedSubClassItem = null
    return
  }

  const [name, source] = key.split('|')
  const cleanName = (name || '').trim().toLowerCase()
  const cleanSource = (source || '').trim().toLowerCase()

  const lists = Array.isArray(mc.subClassLists) ? mc.subClassLists : (typeof mc.subClassLists === 'object' ? Object.values(mc.subClassLists) : [])
  const found = lists.find(s => {
    const sName = (s.name || '').trim().toLowerCase()
    const sSource = (s.source || '').trim().toLowerCase()
    if (cleanSource && cleanSource !== 'undefined') {
      return sName === cleanName && sSource === cleanSource
    }
    return sName === cleanName
  }) || lists.find(s => (s.name || '').trim().toLowerCase() === cleanName)

  mc.selectedSubClassItem = found ? { ...found, subClassFeature: [] } : { name, source, subClassFeature: [] }

  if (found) {
    const className = (found.className || mc.classSelected || mc.characterClass?.class?.name || '').toLowerCase()
    const classSource = (found.classSource || mc.characterClass?.class?.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toLowerCase()
    const scName = encodeURIComponent(found.name)
    const scSource = encodeURIComponent(found.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB'))
    const shortName = encodeURIComponent(found.shortName || found.name)
    const page = encodeURIComponent(found.page || '0')

    try {
      const res = await axios.get(`${API_URL}/sub-class/${className}/${classSource}/${scName}/${scSource}/${shortName}/${page}?edition=${selectedEdition.value}`)
      if (res.data?.data) {
        mc.selectedSubClassItem = {
          ...found,
          ...(res.data.data.subClass?.[0] || {}),
          subClassFeature: res.data.data.subClassFeature || []
        }
      }
    } catch (e) {
      console.warn('Failed to load multiclass subclass features', e)
    }
  }
}

const getSubclassUnlockLevel = (className, edition) => {
  if (edition === '2024') return 3
  const cName = (className || '').toLowerCase()
  if (['cleric', 'sorcerer', 'warlock'].some(c => cName.includes(c))) return 1
  if (['druid', 'wizard'].some(c => cName.includes(c))) return 2
  return 3
}

const getMcAvailableSubClasses = (mc) => {
  const lists = mc?.subClassLists || []
  const arr = Array.isArray(lists) ? lists : (typeof lists === 'object' ? Object.values(lists) : [])
  const sources = (selectedSources.value && selectedSources.value.length > 0)
    ? selectedSources.value.map(s => String(s).toUpperCase())
    : (selectedEdition.value === '2024' ? ['XPHB'] : ['PHB'])
  const filtered = arr.filter(sc => {
    const s = (sc.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return sources.includes(s)
  })
  return filtered.length > 0 ? filtered : arr
}

const getMcProficiencies = (mc) => {
  const className = mc.classSelected || mc.characterClass?.class?.name || ''
  return getMulticlassProficiencies(className, selectedEdition.value, mc.characterClass?.class)
}

const getMcSkillConfig = (mc) => {
  const prof = getMcProficiencies(mc)
  const skillsList = prof.skills || []
  if (skillsList.length === 0) return { count: 0, from: [] }
  const first = skillsList[0]
  let from = (first.from && first.from.length > 0)
    ? first.from
    : ALL_SKILLS.map(s => s.key)
  return { count: Number(first.count) || 1, from }
}

const getMcAvailableSkills = (mc) => {
  const cfg = getMcSkillConfig(mc)
  const prior = [...priorGrantedSkills.value, ...chosenClassSkills.value]
  const otherMcSkills = multiclasses.value
    .filter(m => m !== mc)
    .flatMap(m => m.chosenSkills || [])
  const excluded = new Set([...prior, ...otherMcSkills])
  return cfg.from.filter(k => !excluded.has(k))
}

const isSkillPriorGranted = (skillKey, currentMc) => {
  const prior = [...priorGrantedSkills.value, ...chosenClassSkills.value]
  if (prior.includes(skillKey)) return true
  const otherMc = multiclasses.value.find(m => m !== currentMc && (m.chosenSkills || []).includes(skillKey))
  return Boolean(otherMc)
}

const toggleMcSkill = (mc, skillKey, mcIdx) => {
  if (!mc.chosenSkills) mc.chosenSkills = []
  const cfg = getMcSkillConfig(mc)
  const idx = mc.chosenSkills.indexOf(skillKey)
  if (idx >= 0) {
    mc.chosenSkills.splice(idx, 1)
  } else {
    if (mc.chosenSkills.length < cfg.count) {
      mc.chosenSkills.push(skillKey)
    }
  }
  const available = getMcAvailableSkills(mc)
  const needed = Math.min(cfg.count, available.length)
  if (mc.chosenSkills.length >= needed) {
    delete errors['skills_mc_' + mcIdx]
  }
}

const currentAbilityScoresMap = computed(() => ({
  strength: strength.value,
  dexterity: dexterity.value,
  constitution: constitution.value,
  intelligence: intelligence.value,
  wisdom: wisdom.value,
  charisma: charisma.value
}))

const getMcPrereqStatus = (mc) => {
  if (!mc.classSelected) {
    return { met: true, reason: '', details: 'None', scoresAssigned: false }
  }
  return checkMulticlassPrerequisites(
    mc.classSelected,
    currentAbilityScoresMap.value,
    mc.characterClass?.class
  )
}

const isMcPrereqMet = (mc) => {
  if (!mc || !mc.classSelected) return false
  const mcStatus = getMcPrereqStatus(mc)
  return Boolean(mcStatus.met)
}

const checkIsSpellcaster = (className, classLevelVal, subClassName, edition) => {
  if (!className) return false
  const cName = className.toLowerCase()
  const fullCasters = ['wizard', 'cleric', 'druid', 'sorcerer', 'bard', 'warlock', 'artificer']
  if (fullCasters.includes(cName)) return true
  if (cName === 'paladin' || cName === 'ranger') {
    if (edition === '2024') return true
    return Number(classLevelVal) >= 2
  }
  const scName = (subClassName || '').toLowerCase()
  if (cName === 'fighter' && scName.includes('eldritch knight') && Number(classLevelVal) >= 3) return true
  if (cName === 'rogue' && scName.includes('arcane trickster') && Number(classLevelVal) >= 3) return true
  return false
}

const isSpellcasterClass = computed(() => {
  return checkIsSpellcaster(
    characterClass.value?.class?.name || classSelected.value,
    classLevel.value,
    selectedSubClassItem.value?.name || characterStore.characterSubClass?.name,
    selectedEdition.value
  )
})

const isMcSpellcaster = (mc) => {
  return checkIsSpellcaster(
    mc.characterClass?.class?.name || mc.classSelected,
    mc.classLevel,
    mc.selectedSubClassItem?.name,
    selectedEdition.value
  )
}

const allUnlockedAsiList = computed(() => {
  const list = []
  const pName = (classSelected.value || characterClass.value?.class?.name || 'Primary Class')
  for (const tier of unlockedAsiTiers.value) {
    if (!asiTierChoices[tier]) {
      asiTierChoices[tier] = {
        type: '',
        asiMode: '+2',
        plus2Stat: '',
        plus1StatA: '',
        plus1StatB: '',
        featName: '',
        featAbility: ''
      }
    }
    list.push({
      classKey: 'primary',
      className: pName.charAt(0).toUpperCase() + pName.slice(1),
      tier,
      errorKey: `asiTier_${tier}`,
      choice: asiTierChoices[tier]
    })
  }
  for (let idx = 0; idx < multiclasses.value.length; idx++) {
    const mc = multiclasses.value[idx]
    if (!isMcPrereqMet(mc)) continue
    const mcName = mc.classSelected || mc.characterClass?.class?.name || `Class #${idx + 2}`
    const mcTiers = getUnlockedAsiTiersForClass(mc.classSelected, mc.classLevel)
    for (const tier of mcTiers) {
      if (!mc.asiTierChoices[tier]) {
        mc.asiTierChoices[tier] = {
          type: '',
          asiMode: '+2',
          plus2Stat: '',
          plus1StatA: '',
          plus1StatB: '',
          featName: '',
          featAbility: ''
        }
      }
      list.push({
        classKey: `mc_${idx}`,
        className: mcName.charAt(0).toUpperCase() + mcName.slice(1),
        tier,
        errorKey: `asiTier_mc_${idx}_${tier}`,
        choice: mc.asiTierChoices[tier]
      })
    }
  }
  return list
})

watch(maxPrimaryClassLevel, (newMax) => {
  if (Number(classLevel.value) > newMax) {
    classLevel.value = newMax
  }
})

watch(multiclasses, (mcs) => {
  mcs.forEach((mc, idx) => {
    const maxLvl = getMaxLevelForMc(idx)
    if (Number(mc.classLevel) > maxLvl) {
      mc.classLevel = maxLvl
    }
    if (mc.classSelected) {
      delete errors['class_mc_' + idx]
      const mcSubUnlock = getSubclassUnlockLevel(mc.classSelected, selectedEdition.value)
      if (Number(mc.classLevel) < mcSubUnlock) {
        mc.selectedSubClassKey = ''
        mc.selectedSubClassItem = null
        delete errors['subclass_mc_' + idx]
      } else if (mc.selectedSubClassKey) {
        delete errors['subclass_mc_' + idx]
      }
    }
  })
}, { deep: true })

const asiBonuses = computed(() => {
  const bonuses = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }

  if (selectedEdition.value === '2024') {
    if (asi2024Mode.value === 'plus2_plus1') {
      if (asi2024Plus2.value && bonuses[asi2024Plus2.value] !== undefined) {
        bonuses[asi2024Plus2.value] += 2
      }
      if (asi2024Plus1.value && bonuses[asi2024Plus1.value] !== undefined) {
        bonuses[asi2024Plus1.value] += 1
      }
    } else {
      const targets = bgEligibleAbilities.value.slice(0, 3)
      for (const t of targets) {
        if (bonuses[t] !== undefined) bonuses[t] += 1
      }
    }
  } else {
    // 2014 Rules: Background never grants ASI; only Race / Subrace (or custom Tasha +2/+1)
    if (asi2014Mode.value === 'custom') {
      if (asi2014CustomPlus2.value && bonuses[asi2014CustomPlus2.value] !== undefined) {
        bonuses[asi2014CustomPlus2.value] += 2
      }
      if (asi2014CustomPlus1.value && bonuses[asi2014CustomPlus1.value] !== undefined) {
        bonuses[asi2014CustomPlus1.value] += 1
      }
    } else {
      const extract = (abList) => {
        if (!abList || !Array.isArray(abList)) return
        for (const item of abList) {
          for (const [k, v] of Object.entries(item)) {
            const statKey = SHORT_TO_KEY[k.toLowerCase()]
            if (statKey && typeof v === 'number') {
              bonuses[statKey] += v
            }
          }
        }
      }
      extract(characterRace.value?.ability)
      extract(characterSubRace.value?.ability)

      // Fallback for Standard Human 2014 when subrace is empty or Standard without ability array
      if (
        characterRace.value?.name?.toLowerCase() === 'human' &&
        (!characterSubRace.value?.name || characterSubRace.value?.name?.toLowerCase() === 'standard') &&
        (!characterSubRace.value?.ability || characterSubRace.value.ability.length === 0)
      ) {
        bonuses.strength += 1
        bonuses.dexterity += 1
        bonuses.constitution += 1
        bonuses.intelligence += 1
        bonuses.wisdom += 1
        bonuses.charisma += 1
      }

      if (raceChooseStats.value.length > 0) {
        for (const stat of raceChooseStats.value) {
          if (bonuses[stat] !== undefined) bonuses[stat] += 1
        }
      }
    }
  }

  // Add Level 4 / 6 / 8 / etc. ASI bonuses from all classes
  for (const item of allUnlockedAsiList.value) {
    const ch = item.choice
    if (!ch) continue
    if (ch.type === 'asi') {
      if (ch.asiMode === '+2' && ch.plus2Stat && bonuses[ch.plus2Stat] !== undefined) {
        bonuses[ch.plus2Stat] += 2
      } else if (ch.asiMode === '+1_+1') {
        if (ch.plus1StatA && bonuses[ch.plus1StatA] !== undefined) bonuses[ch.plus1StatA] += 1
        if (ch.plus1StatB && bonuses[ch.plus1StatB] !== undefined) bonuses[ch.plus1StatB] += 1
      }
    } else if (ch.type === 'feat') {
      if (ch.featAbility && bonuses[ch.featAbility] !== undefined) {
        bonuses[ch.featAbility] += 1
      }
    }
  }

  return bonuses
})

// --- Subclass System ---
const subclassUnlockLevel = computed(() => {
  return getSubclassUnlockLevel(classSelected.value || characterClass.value?.class?.name, selectedEdition.value)
})

const isSubclassUnlocked = computed(() => {
  return Number(classLevel.value) >= subclassUnlockLevel.value
})

const availableSubClasses = computed(() => {
  const lists = characterStore.subClassLists || subClass.value || []
  const arr = Array.isArray(lists) ? lists : (typeof lists === 'object' ? Object.values(lists) : [])
  return arr.filter(sc => {
    const s = (sc.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    return (selectedSources.value || []).includes(s)
  })
})

const selectedSubClassKey = ref('')
const selectedSubClassItem = ref(null)

const classSubTab = ref('features') // 'features' | 'spells' | 'featSpells'
const chosenSpells = ref([])
const featChosenSpells = ref([])

const SPELL_GRANTING_FEATS_CONFIG = [
  {
    match: /magic initiate/i,
    name: 'Magic Initiate',
    cantrips: 2,
    spells: 1,
    maxLevel: 1,
    desc: 'Choose 2 cantrips and one 1st-level spell'
  },
  {
    match: /fey touched/i,
    name: 'Fey Touched',
    fixed: ['Misty Step'],
    cantrips: 0,
    spells: 1,
    maxLevel: 1,
    schools: ['D', 'E'],
    desc: 'Grants Misty Step and one 1st-level Divination or Enchantment spell'
  },
  {
    match: /shadow touched/i,
    name: 'Shadow Touched',
    fixed: ['Invisibility'],
    cantrips: 0,
    spells: 1,
    maxLevel: 1,
    schools: ['I', 'N'],
    desc: 'Grants Invisibility and one 1st-level Illusion or Necromancy spell'
  },
  {
    match: /ritual caster/i,
    name: 'Ritual Caster',
    cantrips: 0,
    spells: 2,
    maxLevel: 1,
    isRitual: true,
    desc: 'Choose two 1st-level ritual spells'
  },
  {
    match: /spell sniper/i,
    name: 'Spell Sniper',
    cantrips: 1,
    spells: 0,
    maxLevel: 0,
    desc: 'Choose one attack cantrip'
  },
  {
    match: /artificer initiate/i,
    name: 'Artificer Initiate',
    cantrips: 1,
    spells: 1,
    maxLevel: 1,
    className: 'Artificer',
    desc: 'Choose one cantrip and one 1st-level spell from the Artificer spell list'
  },
  {
    match: /telekinetic/i,
    name: 'Telekinetic',
    fixed: ['Mage Hand'],
    cantrips: 0,
    spells: 0,
    maxLevel: 0,
    desc: 'Grants the Mage Hand cantrip'
  },
  {
    match: /telepathic/i,
    name: 'Telepathic',
    fixed: ['Detect Thoughts'],
    cantrips: 0,
    spells: 0,
    maxLevel: 2,
    desc: 'Grants Detect Thoughts'
  }
]

const detectedFeatSpellSources = computed(() => {
  const sources = []
  const bg = selectedBackgroundObj.value
  const bgDetails = parseBackgroundDetails(bg)
  if (bgDetails?.featName) {
    const fDef = SPELL_GRANTING_FEATS_CONFIG.find(f => f.match.test(bgDetails.featName))
    if (fDef) {
      sources.push({
        sourceType: 'background',
        sourceLabel: `Background (${bg?.name || 'Origin'}) Feat`,
        featName: bgDetails.featName,
        config: fDef
      })
    }
  }
  for (const item of allUnlockedAsiList.value) {
    const ch = item.choice
    if (ch && ch.type === 'feat' && ch.featName) {
      const fDef = SPELL_GRANTING_FEATS_CONFIG.find(f => f.match.test(ch.featName))
      if (fDef) {
        sources.push({
          sourceType: 'asi',
          sourceLabel: `${item.className} Level ${item.tier} Feat`,
          featName: ch.featName,
          config: fDef
        })
      }
    }
  }
  return sources
})

const computedProficiencyBonus = computed(() => {
  return Math.floor((Number(totalCharacterLevel.value || 1) - 1) / 4) + 2
})

const onSubClassSelect = async (key) => {
  selectedSubClassKey.value = key
  delete errors.subclass
  if (!key) {
    selectedSubClassItem.value = null
    characterSubClass.value = {}
    characterStore.characterSubClass = {}
    characterStore.isSubClassSelected = false
    characterStore.subClassLevelGained = 0
    return
  }
  const sc = availableSubClasses.value.find(s => `${s.name}|${s.source}` === key)
  if (!sc) return
  selectedSubClassItem.value = sc
  const className = (sc.className || classSelected.value || characterClass.value?.class?.name || '').toLowerCase()
  const classSource = (sc.classSource || characterClass.value?.class?.source || 'PHB').toLowerCase()
  const name = encodeURIComponent(sc.name)
  const source = encodeURIComponent(sc.source)
  const shortName = encodeURIComponent(sc.shortName || sc.name)
  const page = encodeURIComponent(sc.page || '0')
  try {
    const res = await axios.get(`${API_URL}/sub-class/${className}/${classSource}/${name}/${source}/${shortName}/${page}?edition=${selectedEdition.value}`)
    if (res.data?.data) {
      characterSubClass.value = res.data.data
      characterStore.characterSubClass = res.data.data
      characterStore.isSubClassSelected = true
      characterStore.subClassLevelGained = subclassUnlockLevel.value
    }
  } catch (e) {
    console.error('Failed to fetch subclass details', e)
  }
}

// --- Languages System ---
const bgLangConfig = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return { fixed: [], choiceCount: 0 }
  const fixed = []
  let choiceCount = 0
  if (Array.isArray(bg.languageProficiencies)) {
    for (const lp of bg.languageProficiencies) {
      for (const [k, v] of Object.entries(lp)) {
        if (k === 'anyStandard' || k === 'any' || k === 'other') {
          choiceCount += (typeof v === 'number' ? v : 1)
        } else if (v === true && k !== 'anyStandard' && k !== 'any') {
          fixed.push(k.charAt(0).toUpperCase() + k.slice(1))
        }
      }
    }
  } else {
    const details = parseBackgroundDetails(bg)
    if (details?.languagesText) {
      const match = details.languagesText.match(/(\d+|one|two|three)\s+(?:of your choice|additional|standard)/i)
      if (match) {
        const numMap = { one: 1, two: 2, three: 3 }
        choiceCount = numMap[match[1].toLowerCase()] || parseInt(match[1], 10) || 1
      }
    }
  }
  return { fixed, choiceCount }
})

const bgChosenLanguages = ref([])

const raceLangConfig = computed(() => {
  const r = characterRace.value
  const sr = characterSubRace.value
  const fixed = []
  let choiceCount = 0

  const parseLp = (lpList) => {
    if (!Array.isArray(lpList)) return
    for (const lp of lpList) {
      for (const [k, v] of Object.entries(lp)) {
        if (k === 'anyStandard' || k === 'any' || k === 'other') {
          choiceCount += (typeof v === 'number' ? v : 1)
        } else if (v === true) {
          const name = k.charAt(0).toUpperCase() + k.slice(1)
          if (!fixed.includes(name)) fixed.push(name)
        }
      }
    }
  }

  parseLp(r?.languageProficiencies)
  parseLp(sr?.languageProficiencies)

  if (fixed.length === 0 && choiceCount === 0 && r?.name) {
    fixed.push('Common')
  }

  return { fixed, choiceCount }
})

const raceChosenLanguages = ref([])

const allLanguagesList = computed(() => {
  const list = [
    ...raceLangConfig.value.fixed,
    ...raceChosenLanguages.value.filter(Boolean),
    ...bgLangConfig.value.fixed,
    ...bgChosenLanguages.value.filter(Boolean)
  ]
  if (list.length === 0) list.push('Common')
  return [...new Set(list)]
})

// --- Standard Tools, Instruments & Gaming Sets ---
const STANDARD_MUSICAL_INSTRUMENTS = [
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Horn',
  'Lute',
  'Lyre',
  'Pan flute',
  'Shawm',
  'Viol'
]

const STANDARD_ARTISAN_TOOLS = [
  "Alchemist's supplies",
  "Brewer's supplies",
  "Calligrapher's supplies",
  "Carpenter's tools",
  "Cartographer's tools",
  "Cobbler's tools",
  "Cook's utensils",
  "Glassblower's tools",
  "Jeweler's tools",
  "Leatherworker's tools",
  "Mason's tools",
  "Painter's supplies",
  "Potter's tools",
  "Smith's tools",
  "Tinker's tools",
  "Weaver's tools",
  "Woodcarver's tools"
]

const STANDARD_GAMING_SETS = [
  'Dice set',
  'Dragonchess set',
  'Playing card set',
  'Three-Dragon Ante set'
]

const STANDARD_OTHER_TOOLS = [
  'Disguise kit',
  'Forgery kit',
  'Herbalism kit',
  "Navigator's tools",
  "Poisoner's kit",
  "Thieves' tools"
]

const ALL_TOOLS = [
  ...STANDARD_ARTISAN_TOOLS,
  ...STANDARD_MUSICAL_INSTRUMENTS,
  ...STANDARD_GAMING_SETS,
  ...STANDARD_OTHER_TOOLS
]

const CLASS_STARTING_GOLD = {
  barbarian: 50,
  bard: 125,
  cleric: 125,
  druid: 50,
  fighter: 125,
  monk: 12,
  paladin: 125,
  ranger: 125,
  rogue: 100,
  sorcerer: 75,
  warlock: 100,
  wizard: 100,
  artificer: 125
}

const CLASS_DEFAULT_EQUIPMENT = {
  barbarian: [
    { name: 'Greataxe', weight: '7', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Handaxe', weight: '2', amount: 2, status: 'equipped', is_armor: false },
    { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Javelin', weight: '2', amount: 4, status: 'inventory', is_armor: false }
  ],
  bard: [
    { name: 'Rapier', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: "Diplomat's Pack", weight: '36', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 1, status: 'equipped', is_armor: false }
  ],
  cleric: [
    { name: 'Mace', weight: '4', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Scale Mail', weight: '45', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Priest's Pack", weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  druid: [
    { name: 'Wooden Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Scimitar', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Druidic Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  fighter: [
    { name: 'Chain Mail', weight: '55', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Longsword', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  monk: [
    { name: 'Shortsword', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Dart', weight: '0.25', amount: 10, status: 'inventory', is_armor: false }
  ],
  paladin: [
    { name: 'Longsword', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Javelin', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: "Priest's Pack", weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Chain Mail', weight: '55', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  ranger: [
    { name: 'Scale Mail', weight: '45', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Shortsword', weight: '2', amount: 2, status: 'equipped', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Longbow', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arrows (20)', weight: '2.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  rogue: [
    { name: 'Rapier', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shortbow', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arrows (20)', weight: '2.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Burglar's Pack", weight: '47.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false },
    { name: "Thieves' Tools", weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  sorcerer: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false }
  ],
  warlock: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Scholar's Pack", weight: '11', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false }
  ],
  wizard: [
    { name: 'Quarterstaff', weight: '4', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Scholar's Pack", weight: '11', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Spellbook', weight: '3', amount: 1, status: 'inventory', is_armor: false }
  ],
  artificer: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Studded Leather Armor', weight: '13', amount: 1, status: 'equipped', is_armor: true },
    { name: "Thieves' Tools", weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false }
  ]
}

const chosenClassTools = ref([])
const chosenBgTools = ref([])

const classToolConfig = computed(() => {
  const cName = (characterClass.value?.class?.name || classSelected.value || '').toLowerCase()
  if (cName === 'bard') {
    return {
      count: 3,
      type: 'instrument',
      label: 'Musical Instruments (Choose 3)',
      options: STANDARD_MUSICAL_INSTRUMENTS
    }
  }
  if (cName === 'monk') {
    return {
      count: 1,
      type: 'monk_tool',
      label: "Artisan's Tool or Musical Instrument (Choose 1)",
      options: [...STANDARD_ARTISAN_TOOLS, ...STANDARD_MUSICAL_INSTRUMENTS]
    }
  }
  if (cName === 'artificer') {
    return {
      count: 1,
      type: 'artisan',
      label: "Artisan's Tool (Choose 1)",
      options: STANDARD_ARTISAN_TOOLS
    }
  }
  return { count: 0, type: '', label: '', options: [] }
})

const bgToolConfig = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return { count: 0, label: '', options: [] }
  const details = parseBackgroundDetails(bg)
  const text = (details?.toolsText || '').toLowerCase()
  const name = (bg.name || '').toLowerCase()

  let count = 0
  let label = 'Tool / Instrument Choice'
  let options = ALL_TOOLS

  function expandToolOption(t) {
    if (!t) return []
    const raw = String(t).trim().toLowerCase()
    if (raw === 'anyartisanstool' || raw.includes('artisan')) return STANDARD_ARTISAN_TOOLS
    if (raw === 'anymusicalinstrument' || raw.includes('musical instrument')) return STANDARD_MUSICAL_INSTRUMENTS
    if (raw === 'anygamingset' || raw.includes('gaming set')) return STANDARD_GAMING_SETS
    if (raw === 'anytool' || raw === 'any') return ALL_TOOLS
    return [t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')]
  }

  // Check structured toolProficiencies
  if (Array.isArray(bg.toolProficiencies) && bg.toolProficiencies.length > 0) {
    for (const tp of bg.toolProficiencies) {
      if (!tp || typeof tp !== 'object') continue
      if (tp.anyMusicalInstrument) {
        count = Number(tp.anyMusicalInstrument) || 1
        label = `Musical Instrument (Choose ${count})`
        options = STANDARD_MUSICAL_INSTRUMENTS
        break
      } else if (tp.anyArtisansTool) {
        count = Number(tp.anyArtisansTool) || 1
        label = `Artisan's Tool (Choose ${count})`
        options = STANDARD_ARTISAN_TOOLS
        break
      } else if (tp.anyGamingSet) {
        count = Number(tp.anyGamingSet) || 1
        label = `Gaming Set (Choose ${count})`
        options = STANDARD_GAMING_SETS
        break
      } else if (tp.anyTool || tp.any) {
        count = Number(tp.anyTool || tp.any) || 1
        label = `Tool Proficiency (Choose ${count})`
        options = ALL_TOOLS
        break
      } else if (tp.choose) {
        count = Number(tp.choose.count) || 1
        label = `Tool Proficiency (Choose ${count})`
        if (Array.isArray(tp.choose.from)) {
          const expanded = []
          for (const item of tp.choose.from) {
            expanded.push(...expandToolOption(item))
          }
          options = Array.from(new Set(expanded))
        }
        break
      }
    }
  }

  // Fallbacks if not detected from structured data
  if (count === 0) {
    if (text.includes('musical instrument') || name.includes('entertainer')) {
      count = 1
      label = 'Musical Instrument (Background Choice)'
      options = STANDARD_MUSICAL_INSTRUMENTS
    } else if (text.includes('artisan') || name.includes('artisan') || name.includes('folk hero')) {
      count = 1
      label = "Artisan's Tool (Background Choice)"
      options = STANDARD_ARTISAN_TOOLS
    } else if (text.includes('gaming set')) {
      count = 1
      label = 'Gaming Set (Background Choice)'
      options = STANDARD_GAMING_SETS
    } else if (name === 'custom background' || name.includes('custom')) {
      count = 2
      label = 'Tool / Instrument (Custom Background - Choose 2)'
      options = ALL_TOOLS
    }
  }

  return { count, label, options }
})



// --- Equipment & Starting Wealth System ---
const equipmentChoiceMode = ref('package')
const customStartingGold = ref(50)
const chosenBgEquipmentChoices = reactive({})
const chosenClassEquipmentChoices = reactive({})

const ITEM_WEIGHT_MAP = {
  greataxe: 7, greatsword: 6, flail: 2, scimitar: 3, shortsword: 2,
  longsword: 3, longbow: 2, 'light crossbow': 5, 'heavy crossbow': 18,
  'hand crossbow': 3, dagger: 1, handaxe: 2, javelin: 2, mace: 4,
  warhammer: 2, quarterstaff: 4, spear: 3, dart: 0.25, rapier: 2,
  halberd: 6, glaive: 6, pike: 18, trident: 4, morningstar: 4,
  'war pick': 2, whip: 3, club: 2, greatclub: 10, 'light hammer': 2,
  sickle: 2, sling: 0, shortbow: 2,
  'chain mail': 55, 'leather armor': 10, 'studded leather armor': 13,
  'scale mail': 45, 'plate armor': 65, breastplate: 20, 'half plate': 40,
  'hide armor': 12, 'padded armor': 8, 'ring mail': 40, 'splint armor': 60,
  shield: 6, 'wooden shield': 6, robe: 4,
  'clothes, common': 3, 'clothes, costume': 4, 'clothes, fine': 6, "clothes, traveler's": 4,
  "explorer's pack": 59, "dungeoneer's pack": 61.5, "priest's pack": 25,
  "scholar's pack": 11, "burglar's pack": 47.5, "diplomat's pack": 36, "entertainer's pack": 38,
  pouch: 1, backpack: 5, quiver: 1, spellbook: 3, 'component pouch': 2,
  'holy symbol': 1, 'arcane focus': 1, 'druidic focus': 1, "thieves' tools": 1,
  'herbalism kit': 3, 'arrows (20)': 1, 'crossbow bolts (20)': 1.5,
  bedroll: 7, 'mess kit': 1, tinderbox: 1, torch: 1, torches: 1,
  'rations (1 day)': 2, rations: 2, waterskin: 5, 'hempen rope (50 feet)': 10,
  'hempen rope': 10, crowbar: 5, hammer: 3, pitons: 0.25, piton: 0.25,
  'ball bearings (bag of 1,000)': 2, 'string (10 feet)': 0, bell: 0,
  candle: 0, candles: 0, 'hooded lantern': 2, 'oil (flask)': 1,
  blanket: 3, 'alms box': 1, censer: 1, vestments: 4, 'book of lore': 5,
  'ink (1 ounce bottle)': 0, 'ink pen': 0, 'parchment (sheet)': 0,
  'little bag of sand': 1, 'small knife': 0.5, chest: 25,
  'map/scroll case': 1, lamp: 1, 'paper (sheet)': 0, 'perfume (vial)': 0,
  'sealing wax': 0, soap: 0, 'disguise kit': 3, 'wooden stakes': 1,
  'holy water (flask)': 1, manacles: 6, 'steel mirror': 0.5
}

const EQUIPMENT_PACK_CONTENTS = {
  "explorer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bedroll', weight: '7', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Mess Kit', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "dungeoneer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Pitons', weight: '0.25', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "burglar's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ball Bearings (bag of 1,000)', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'String (10 feet)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bell', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Pitons', weight: '0.25', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Hooded Lantern', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "priest's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Blanket', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Alms Box', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Censer', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Vestments', weight: '4', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false }
  ],
  "scholar's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Book of Lore', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink (1 ounce bottle)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink Pen', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Parchment (sheet)', weight: '0', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Little Bag of Sand', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Small Knife', weight: '0.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  "diplomat's pack": [
    { name: 'Chest', weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Map/Scroll Case', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Clothes, Fine', weight: '6', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink (1 ounce bottle)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink Pen', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Lamp', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Paper (sheet)', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Perfume (vial)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Sealing Wax', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Soap', weight: '0', amount: 1, status: 'inventory', is_armor: false }
  ],
  "entertainer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bedroll', weight: '7', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Clothes, Costume', weight: '4', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Disguise Kit', weight: '3', amount: 1, status: 'inventory', is_armor: false }
  ],
  "monster hunter's pack": [
    { name: 'Chest', weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Wooden Stakes', weight: '1', amount: 3, status: 'inventory', is_armor: false },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Holy Water (flask)', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Manacles', weight: '6', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Steel Mirror', weight: '0.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 3, status: 'inventory', is_armor: false }
  ]
}

const unpackEquipmentItem = (item) => {
  if (!item || !item.name) return []
  const lowerName = item.name.toLowerCase().trim()
  for (const [packName, contents] of Object.entries(EQUIPMENT_PACK_CONTENTS)) {
    if (lowerName === packName || lowerName.includes(packName)) {
      return contents.map(c => ({ ...c }))
    }
  }
  return [item]
}

const consolidateItems = (itemList) => {
  const result = []
  const map = new Map()
  for (const it of itemList) {
    const key = `${it.name.toLowerCase().trim()}_${it.status}_${it.is_armor}`
    if (map.has(key)) {
      const existing = map.get(key)
      existing.amount = (Number(existing.amount) || 1) + (Number(it.amount) || 1)
    } else {
      const copy = { ...it, amount: Number(it.amount) || 1 }
      map.set(key, copy)
      result.push(copy)
    }
  }
  return result
}

const lookupItemWeight = (name) => {
  if (!name) return '1'
  const clean = name.toLowerCase().replace(/\s*\(\d+\)/, '').trim()
  if (ITEM_WEIGHT_MAP[clean] !== undefined) return String(ITEM_WEIGHT_MAP[clean])
  for (const [k, v] of Object.entries(ITEM_WEIGHT_MAP)) {
    if (clean.includes(k)) return String(v)
  }
  return '1'
}

const isLikelyArmor = (name) => {
  if (!name) return false
  const lower = name.toLowerCase()
  return lower.includes('armor') || lower.includes('mail') || lower.includes('shield') || lower.includes('breastplate')
}

const isLikelyWeapon = (name) => {
  if (!name) return false
  const lower = name.toLowerCase()
  return [
    'sword', 'axe', 'bow', 'dagger', 'mace', 'crossbow', 'spear', 'javelin',
    'staff', 'hammer', 'flail', 'scimitar', 'rapier', 'dart', 'halberd',
    'glaive', 'pike', 'trident', 'whip', 'club', 'weapon'
  ].some(w => lower.includes(w))
}

const resolveEquipmentType = (type, qty = 1) => {
  const prefix = qty > 1 ? `${qty}x ` : ''
  switch (type) {
    case 'weaponMartial':
      return qty > 1 ? '2 Martial Weapons (Longswords)' : 'Martial Weapon (Longsword)'
    case 'weaponMartialMelee':
      return qty > 1 ? '2 Martial Melee Weapons (Greataxes)' : 'Martial Melee Weapon (Greataxe)'
    case 'weaponSimple':
      return qty > 1 ? '2 Simple Weapons (Handaxes)' : 'Simple Weapon (Shortbow)'
    case 'weaponSimpleMelee':
      return qty > 1 ? '2 Simple Melee Weapons (Clubs)' : 'Simple Melee Weapon (Club)'
    case 'focusSpellcastingArcane':
      return 'Arcane Focus (Wand)'
    case 'focusSpellcastingHoly':
      return 'Holy Symbol'
    case 'focusSpellcastingDruid':
    case 'focusSpellcastingDruidic':
      return 'Druidic Focus'
    case 'instrumentMusical':
      return 'Musical Instrument (Lute)'
    case 'toolArtisan':
      return "Artisan's Tools"
    default:
      return `${prefix}${type}`
  }
}

const parseClassEquipmentList = (rawList) => {
  const items = []
  let gold = 0
  for (const entry of (rawList || [])) {
    if (typeof entry === 'string') {
      const clean = clean5eToolsMarkup(entry).split('|')[0].trim()
      const gpMatch = clean.match(/^(\d+)\s*gp$/i)
      if (gpMatch) {
        gold += parseInt(gpMatch[1], 10)
        continue
      }
      if (clean) {
        const name = clean.replace(/\b\w/g, l => l.toUpperCase())
        const isArmor = isLikelyArmor(name)
        const isWeapon = isLikelyWeapon(name)
        items.push({
          name,
          weight: lookupItemWeight(name),
          amount: 1,
          status: (isArmor || isWeapon) ? 'equipped' : 'inventory',
          is_armor: isArmor
        })
      }
    } else if (typeof entry === 'object' && entry) {
      if (entry.value != null || entry.containsValue != null) {
        gold += Math.floor((entry.value || entry.containsValue) / 100)
      } else {
        let name = ''
        let qty = Number(entry.quantity) || 1
        if (entry.equipmentType) {
          name = resolveEquipmentType(entry.equipmentType, qty)
        } else if (entry.item) {
          const clean = clean5eToolsMarkup(entry.displayName || entry.item).split('|')[0].trim()
          const gpMatch = clean.match(/^(\d+)\s*gp$/i)
          if (gpMatch) {
            gold += parseInt(gpMatch[1], 10) * qty
            continue
          }
          name = clean.replace(/\b\w/g, l => l.toUpperCase())
        } else if (entry.special) {
          const clean = clean5eToolsMarkup(entry.special).replace(/\b\w/g, l => l.toUpperCase()).trim()
          const gpMatch = clean.match(/^(\d+)\s*gp$/i)
          if (gpMatch) {
            gold += parseInt(gpMatch[1], 10) * qty
            continue
          }
          name = clean
        }
        if (name) {
          const isArmor = isLikelyArmor(name)
          const isWeapon = isLikelyWeapon(name)
          items.push({
            name,
            weight: lookupItemWeight(name),
            amount: qty,
            status: (isArmor || isWeapon) ? 'equipped' : 'inventory',
            is_armor: isArmor
          })
        }
      }
    }
  }
  return { items, gold }
}

const classEquipmentChoices = computed(() => {
  let startingEq = characterClass.value?.class?.startingEquipment
  if (!startingEq) return []
  if (typeof startingEq === 'string') {
    try { startingEq = JSON.parse(startingEq) } catch (e) { return [] }
  }
  const defaultData = startingEq.defaultData
  if (!Array.isArray(defaultData)) return []

  const choices = []
  defaultData.forEach((rowObj, rowIdx) => {
    if (!rowObj || typeof rowObj !== 'object') return
    const keys = Object.keys(rowObj).filter(k => k !== '_')
    if (keys.length === 0) return

    keys.sort((x, y) => x.localeCompare(y))

    const options = keys.map((key) => {
      const parsed = parseClassEquipmentList(rowObj[key])
      const itemDesc = parsed.items.map(it => (it.amount > 1 ? `${it.amount}x ` : '') + it.name).join(', ')
      let description = ''
      if (itemDesc && parsed.gold > 0) {
        description = `${itemDesc} + ${parsed.gold} GP`
      } else if (itemDesc) {
        description = itemDesc
      } else if (parsed.gold > 0) {
        description = `${parsed.gold} GP (Starting Gold)`
      } else {
        description = 'Standard Kit'
      }

      return {
        key: key.toLowerCase(),
        rawKey: key,
        title: description,
        description,
        items: parsed.items,
        gold: parsed.gold
      }
    })

    const choiceNumber = choices.length + 1
    let label = `Equipment Choice #${choiceNumber}`
    if (startingEq.default && Array.isArray(startingEq.default) && startingEq.default[rowIdx]) {
      const cleanDesc = clean5eToolsMarkup(startingEq.default[rowIdx])
      if (cleanDesc && cleanDesc.length < 80) {
        label = cleanDesc
      }
    } else if (defaultData.length === 1) {
      label = 'Class Equipment Package'
    }

    choices.push({
      id: `class_eq_choice_${rowIdx}`,
      rowIdx,
      label,
      options,
      defaultKey: options[0]?.key || 'a'
    })
  })

  return choices
})

const fixedClassItems = computed(() => {
  let startingEq = characterClass.value?.class?.startingEquipment
  if (!startingEq) return []
  if (typeof startingEq === 'string') {
    try { startingEq = JSON.parse(startingEq) } catch (e) { return [] }
  }
  if (!Array.isArray(startingEq.defaultData)) return []
  const fixed = []
  startingEq.defaultData.forEach((rowObj) => {
    if (rowObj && rowObj._) {
      const parsed = parseClassEquipmentList(rowObj._)
      if (parsed.items.length) {
        fixed.push(...parsed.items)
      }
    }
  })
  return fixed
})

watch(classEquipmentChoices, (choices) => {
  for (const ch of choices) {
    if (!chosenClassEquipmentChoices[ch.id]) {
      chosenClassEquipmentChoices[ch.id] = ch.defaultKey || 'a'
    }
  }
}, { immediate: true })

const bgEquipmentChoices = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return []
  const choices = []

  if (Array.isArray(bg.startingEquipment)) {
    bg.startingEquipment.forEach((eqObj, idx) => {
      if (!eqObj) return
      const hasA = Boolean(eqObj.a || eqObj.A)
      const hasB = Boolean(eqObj.b || eqObj.B)
      if (hasA && hasB) {
        const parseList = (listRaw) => {
          const items = []
          let gold = 0
          for (const it of (listRaw || [])) {
            if (typeof it === 'string') {
              const clean = clean5eToolsMarkup(it).split('|')[0].trim()
              if (clean) items.push(clean)
            } else if (typeof it === 'object' && it) {
              if (it.item) {
                const clean = clean5eToolsMarkup(it.displayName || it.item).split('|')[0].trim()
                if (clean) items.push(clean)
              } else if (it.special) {
                const qty = it.quantity ? `${it.quantity} ` : ''
                items.push(`${qty}${it.special}`.trim())
              }
              if (it.value != null) gold = Math.floor(it.value / 100)
              else if (it.containsValue != null) gold = Math.floor(it.containsValue / 100)
            }
          }
          return { items, gold }
        }

        const optA = parseList(eqObj.a || eqObj.A)
        const optB = parseList(eqObj.b || eqObj.B)

        const formatOptLabel = (opt) => {
          const parts = []
          if (opt.items.length) parts.push(opt.items.join(', '))
          if (opt.gold) parts.push(`${opt.gold} GP`)
          return parts.join(' + ') || 'Default'
        }

        choices.push({
          id: `eq_choice_${idx}`,
          label: `Background Equipment Choice #${idx + 1}`,
          optionA: { key: 'a', label: formatOptLabel(optA), items: optA.items, gold: optA.gold },
          optionB: { key: 'b', label: formatOptLabel(optB), items: optB.items, gold: optB.gold }
        })
      }
    })
  }

  const details = parseBackgroundDetails(bg)
  const eqText = details?.equipmentText || ''
  const orMatch = eqText.match(/a\s+([a-zA-Z\s]+?)\s+or\s+([a-zA-Z\s]+?)(?:,|\s+stuffed|\s+and|\.|$)/i)
  if (choices.length === 0 && orMatch) {
    const item1 = orMatch[1].trim()
    const item2 = orMatch[2].trim()
    if (item1.length > 2 && item2.length > 2 && !item1.toLowerCase().includes('clothes')) {
      choices.push({
        id: 'eq_choice_text_or',
        label: 'Gear Choice',
        optionA: { key: 'a', label: item1, items: [item1], gold: 0 },
        optionB: { key: 'b', label: item2, items: [item2], gold: 0 }
      })
    }
  }

  return choices
})

watch(bgEquipmentChoices, (choices) => {
  for (const ch of choices) {
    if (!chosenBgEquipmentChoices[ch.id]) {
      chosenBgEquipmentChoices[ch.id] = 'a'
    }
  }
}, { immediate: true })

const defaultStartingGold = computed(() => {
  const cName = (characterClass.value?.class?.name || classSelected.value || '').toLowerCase()
  if (selectedEdition.value === '2024') return 50
  return CLASS_STARTING_GOLD[cName] || 100
})

const resetStartingGold = () => {
  customStartingGold.value = defaultStartingGold.value
  delete errors.equipmentGold
}

watch([() => characterClass.value?.class?.name, selectedEdition], () => {
  if (isEditMode.value) return
  customStartingGold.value = defaultStartingGold.value
}, { immediate: true })

watch(equipmentChoiceMode, (newVal) => {
  if (isEditMode.value) return
  if (newVal === 'gold') {
    resetStartingGold()
  } else if (newVal === 'package') {
    if (userEquipmentList.value.length === 0) {
      syncDefaultEquipment(true)
    }
  }
})

const computedPackageEquipment = computed(() => {
  const cName = (characterClass.value?.class?.name || classSelected.value || '').toLowerCase()
  const rawList = []

  if (classEquipmentChoices.value.length > 0 || fixedClassItems.value.length > 0) {
    for (const ch of classEquipmentChoices.value) {
      const chosenKey = chosenClassEquipmentChoices[ch.id] || ch.defaultKey
      const opt = ch.options.find(o => o.key === chosenKey) || ch.options[0]
      if (opt?.items?.length) {
        rawList.push(...opt.items.map(it => ({ ...it })))
      }
    }
    if (fixedClassItems.value.length > 0) {
      rawList.push(...fixedClassItems.value.map(it => ({ ...it })))
    }
  } else {
    const baseItems = CLASS_DEFAULT_EQUIPMENT[cName] || [
      { name: 'Dagger', weight: '1', amount: 1, status: 'equipped', is_armor: false },
      { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false }
    ]
    rawList.push(...baseItems.map(it => ({ ...it })))
  }

  for (const t of chosenClassTools.value.filter(Boolean)) {
    rawList.push({ name: t, weight: '2', amount: 1, status: 'inventory', is_armor: false })
  }
  for (const t of chosenBgTools.value.filter(Boolean)) {
    rawList.push({ name: t, weight: '2', amount: 1, status: 'inventory', is_armor: false })
  }

  const bg = selectedBackgroundObj.value
  if (bg) {
    const bgDetails = parseBackgroundDetails(bg)
    if (bgDetails?.bgStartingItems?.length) {
      for (const itName of bgDetails.bgStartingItems) {
        rawList.push({ name: itName, weight: lookupItemWeight(itName), amount: 1, status: 'inventory', is_armor: false })
      }
    }
  }

  rawList.push({ name: 'Clothes, Common', weight: '3', amount: 1, status: 'inventory', is_armor: false })
  rawList.push({ name: 'Pouch', weight: '1', amount: 1, status: 'inventory', is_armor: false })

  const unpackedList = []
  for (const item of rawList) {
    unpackedList.push(...unpackEquipmentItem(item))
  }

  return consolidateItems(unpackedList)
})

// User Custom Equipment State & Compendium Picker
const userEquipmentList = ref([])

const syncDefaultEquipment = (force = false) => {
  if (force || userEquipmentList.value.length === 0) {
    userEquipmentList.value = computedPackageEquipment.value.map(it => ({ ...it }))
  }
}

watch(computedPackageEquipment, () => {
  if (!isEditMode.value && userEquipmentList.value.length === 0) {
    syncDefaultEquipment(true)
  }
}, { immediate: true })

const toggleWizardItemStatus = (idx) => {
  const item = userEquipmentList.value[idx]
  if (item) {
    item.status = item.status === 'equipped' ? 'inventory' : 'equipped'
  }
}

const changeWizardItemAmount = (idx, delta) => {
  const item = userEquipmentList.value[idx]
  if (item) {
    const cur = Number(item.amount) || 1
    item.amount = Math.max(1, cur + delta)
  }
}

const removeWizardItem = (idx) => {
  userEquipmentList.value.splice(idx, 1)
}

const isWizardCompendiumOpen = ref(false)
const wizardCompendiumSearch = ref('')
const wizardCompendiumCategory = ref('all')
const wizardCompendiumLoading = ref(false)
const wizardCompendiumLoadingMore = ref(false)
const wizardCompendiumResults = ref([])
const wizardCompendiumOffset = ref(0)
const wizardCompendiumHasMore = ref(false)
const WIZARD_PAGE_LIMIT = 40

const searchWizardCompendium = async (isLoadMore = false) => {
  if (isLoadMore) {
    if (wizardCompendiumLoading.value || wizardCompendiumLoadingMore.value || !wizardCompendiumHasMore.value) return
    wizardCompendiumLoadingMore.value = true
  } else {
    wizardCompendiumLoading.value = true
    wizardCompendiumOffset.value = 0
    wizardCompendiumResults.value = []
  }

  try {
    const params = new URLSearchParams()
    params.set('edition', selectedEdition.value)
    if (wizardCompendiumSearch.value.trim()) params.set('search', wizardCompendiumSearch.value.trim())
    if (wizardCompendiumCategory.value !== 'all') params.set('type', wizardCompendiumCategory.value)
    params.set('limit', String(WIZARD_PAGE_LIMIT))
    params.set('offset', String(wizardCompendiumOffset.value))

    const res = await axios.get(`${API_URL}/compendium/items?${params.toString()}`)
    const newItems = Array.isArray(res.data?.data) ? res.data.data : []
    wizardCompendiumHasMore.value = newItems.length === WIZARD_PAGE_LIMIT

    if (isLoadMore) {
      wizardCompendiumResults.value.push(...newItems)
    } else {
      wizardCompendiumResults.value = newItems
    }
    wizardCompendiumOffset.value += newItems.length
  } catch (err) {
    console.error('Failed to search wizard items', err)
    if (!isLoadMore) {
      wizardCompendiumResults.value = []
      wizardCompendiumHasMore.value = false
    }
  } finally {
    wizardCompendiumLoading.value = false
    wizardCompendiumLoadingMore.value = false
  }
}

const onWizardCompendiumScroll = (e) => {
  const el = e.target
  if (!el || wizardCompendiumLoading.value || wizardCompendiumLoadingMore.value || !wizardCompendiumHasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    searchWizardCompendium(true)
  }
}

const openWizardCompendium = () => {
  isWizardCompendiumOpen.value = true
  if (wizardCompendiumResults.value.length === 0) {
    searchWizardCompendium()
  }
}

const addWizardItemFromCompendium = (it) => {
  const isArmor = it.type === 'armor' || (it.name || '').toLowerCase().includes('armor') || (it.name || '').toLowerCase().includes('shield')
  const baseItem = {
    name: it.name,
    weight: String(it.weight || 0),
    amount: 1,
    status: 'inventory',
    is_armor: Boolean(isArmor),
    ac: it.ac || 0,
    dexMod: !!it.dexMod
  }
  const unpacked = unpackEquipmentItem(baseItem)
  for (const item of unpacked) {
    const existing = userEquipmentList.value.find(
      x => x.name.toLowerCase().trim() === item.name.toLowerCase().trim() && x.status === item.status
    )
    if (existing) {
      existing.amount = (Number(existing.amount) || 1) + (Number(item.amount) || 1)
    } else {
      userEquipmentList.value.push(item)
    }
  }
}

const computedTotalWeight = computed(() => {
  return userEquipmentList.value.reduce((acc, it) => {
    const wt = parseFloat(it.weight) || 0
    const amt = Number(it.amount) || 1
    return acc + (wt * amt)
  }, 0)
})

const formStrScore = computed(() => Number(strength.value) || 10)
const computedCarryCapacity = computed(() => formStrScore.value * 15)
const formEncumberedThreshold = computed(() => formStrScore.value * 5)
const formHeavilyEncumberedThreshold = computed(() => formStrScore.value * 10)

const formWeightPercent = computed(() => {
  const cap = computedCarryCapacity.value || 1
  return Math.min(100, Math.max(0, (computedTotalWeight.value / cap) * 100))
})

const formWeightStatus = computed(() => {
  const wt = computedTotalWeight.value
  const max = computedCarryCapacity.value
  const heavy = formHeavilyEncumberedThreshold.value
  const enc = formEncumberedThreshold.value

  if (wt > max) return 'over'
  if (wt > heavy) return 'heavy'
  if (wt > enc) return 'encumbered'
  return 'safe'
})

const formWeightStatusLabel = computed(() => {
  switch (formWeightStatus.value) {
    case 'over':
      return 'Over Capacity'
    case 'heavy':
      return 'Heavily Encumbered'
    case 'encumbered':
      return 'Encumbered'
    case 'safe':
    default:
      return 'Normal'
  }
})

const formWeightBarColor = computed(() => {
  switch (formWeightStatus.value) {
    case 'over':
      return 'bg-red-800'
    case 'heavy':
      return 'bg-amber-800'
    case 'encumbered':
      return 'bg-gray-700'
    case 'safe':
    default:
      return 'bg-gray-600'
  }
})

const formWeightStatusTextColor = computed(() => {
  switch (formWeightStatus.value) {
    case 'over':
      return 'text-red-700'
    case 'heavy':
      return 'text-amber-700'
    case 'encumbered':
      return 'text-gray-800'
    case 'safe':
    default:
      return 'text-gray-600'
  }
})

const savedTreasure = reactive({ pp: 0, gp: 50, ep: 0, sp: 0, cp: 0 })

const backgroundStartingGold = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return selectedEdition.value === '2024' ? 16 : 15
  const bgDetails = parseBackgroundDetails(bg)
  return bgDetails?.bgPackageGold !== undefined ? bgDetails.bgPackageGold : (selectedEdition.value === '2024' ? 16 : 15)
})

const classStartingGold = computed(() => {
  let gold = 0
  for (const ch of classEquipmentChoices.value) {
    const chosenKey = chosenClassEquipmentChoices[ch.id] || ch.defaultKey
    const opt = ch.options.find(o => o.key === chosenKey) || ch.options[0]
    if (opt?.gold) {
      gold += opt.gold
    }
  }

  let startingEq = characterClass.value?.class?.startingEquipment
  if (startingEq) {
    if (typeof startingEq === 'string') {
      try { startingEq = JSON.parse(startingEq) } catch (e) { startingEq = null }
    }
    if (Array.isArray(startingEq?.defaultData)) {
      startingEq.defaultData.forEach((rowObj) => {
        if (rowObj && rowObj._) {
          const parsed = parseClassEquipmentList(rowObj._)
          if (parsed.gold) {
            gold += parsed.gold
          }
        }
      })
    }
  }

  return gold
})

const computedTreasures = computed(() => {
  if (isEditMode.value) {
    return {
      gp: Number(customStartingGold.value != null ? customStartingGold.value : savedTreasure.gp),
      pp: savedTreasure.pp || 0,
      ep: savedTreasure.ep || 0,
      sp: savedTreasure.sp || 0,
      cp: savedTreasure.cp || 0
    }
  }
  if (equipmentChoiceMode.value === 'gold') {
    return {
      gp: Math.max(0, Math.floor(Number(customStartingGold.value) || 0)),
      pp: 0,
      ep: 0,
      sp: 0,
      cp: 0
    }
  }

  return {
    gp: backgroundStartingGold.value + classStartingGold.value,
    pp: 0,
    ep: 0,
    sp: 0,
    cp: 0
  }
})

// --- Skill Proficiencies & Expertise System ---
const chosenBgSkills = ref([])

const bgSkillConfig = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return { count: 0, label: '', options: [] }
  const bgName = (bg.name || '').toLowerCase()

  const fixed = []
  if (Array.isArray(bg.skillProficiencies)) {
    for (const sp of bg.skillProficiencies) {
      for (const [k, v] of Object.entries(sp)) {
        if (v === true && k !== 'any' && k !== 'choose') {
          fixed.push(k.toLowerCase().replace(/[\s-]/g, '_'))
        }
      }
    }
  }

  let count = 0
  let options = ALL_SKILLS.map(s => s.key)

  if (Array.isArray(bg.skillProficiencies)) {
    for (const sp of bg.skillProficiencies) {
      if (sp.any) {
        count = Number(sp.any) || 2
      } else if (sp.choose) {
        count = Number(sp.choose.count) || 1
        if (Array.isArray(sp.choose.from)) {
          options = sp.choose.from.map(k => k.toLowerCase().replace(/[\s-]/g, '_'))
        }
      }
    }
  }

  if (count === 0 && (bgName === 'custom background' || bgName.includes('custom'))) {
    count = 2
  }

  options = options.filter(k => !fixed.includes(k))

  return {
    count,
    label: count > 0 ? `Skill Proficiencies (Background Choice - Pick ${count})` : '',
    options
  }
})

const raceSkillProficiencies = computed(() => {
  const skills = []
  const parseSp = (spList) => {
    if (!Array.isArray(spList)) return
    for (const sp of spList) {
      for (const [k, v] of Object.entries(sp)) {
        if (v === true && k !== 'any' && k !== 'choose') {
          const key = k.toLowerCase().replace(/[\s-]/g, '_')
          if (!skills.includes(key)) skills.push(key)
        }
      }
    }
  }
  parseSp(characterRace.value?.skillProficiencies)
  parseSp(characterSubRace.value?.skillProficiencies)
  return skills
})

const bgSkillProficiencies = computed(() => {
  const bg = selectedBackgroundObj.value
  if (!bg) return []
  const skills = []
  if (Array.isArray(bg.skillProficiencies)) {
    for (const sp of bg.skillProficiencies) {
      for (const [k, v] of Object.entries(sp)) {
        if (v === true && k !== 'any' && k !== 'choose') {
          skills.push(k.toLowerCase().replace(/[\s-]/g, '_'))
        }
      }
    }
  }
  if (skills.length === 0 && (!bg.skillProficiencies || bg.skillProficiencies.length === 0)) {
    const details = parseBackgroundDetails(bg)
    for (const sk of (details?.skills || [])) {
      const key = sk.toLowerCase().replace(/[\s-]/g, '_')
      if (!skills.includes(key)) skills.push(key)
    }
  }
  for (const sk of chosenBgSkills.value.filter(Boolean)) {
    if (!skills.includes(sk)) skills.push(sk)
  }
  return [...new Set(skills)]
})

const priorGrantedSkills = computed(() => {
  return [...new Set([...raceSkillProficiencies.value, ...bgSkillProficiencies.value])]
})

const classSkillConfig = computed(() => {
  const cl = characterClass.value?.class
  const cName = (cl?.name || classSelected.value || '').toLowerCase()
  let count = 2
  let from = []

  const spSkills = cl?.startingProficiencies?.skills
  if (Array.isArray(spSkills) && spSkills.length > 0) {
    const item = spSkills[0]
    if (item.choose) {
      count = item.choose.count || 2
      from = (item.choose.from || []).map(s => s.toLowerCase().replace(/[\s-]/g, '_'))
    } else if (item.any) {
      count = item.any
      from = ALL_SKILLS.map(s => s.key)
    }
  }

  if (from.length === 0) {
    for (const [key, val] of Object.entries(CLASS_SKILL_FALLBACKS)) {
      if (cName.includes(key)) {
        count = val.count
        from = val.from
        break
      }
    }
  }

  if (from.length === 0) {
    from = ALL_SKILLS.map(s => s.key)
  }

  return { count, from }
})

const chosenClassSkills = ref([])

const availableClassSkills = computed(() => {
  const prior = priorGrantedSkills.value
  return classSkillConfig.value.from.filter(k => !prior.includes(k))
})

const toggleClassSkill = (skillKey) => {
  const idx = chosenClassSkills.value.indexOf(skillKey)
  if (idx >= 0) {
    chosenClassSkills.value.splice(idx, 1)
  } else {
    if (chosenClassSkills.value.length < classSkillConfig.value.count) {
      chosenClassSkills.value.push(skillKey)
    }
  }
  const needed = Math.min(classSkillConfig.value.count, availableClassSkills.value.length)
  if (chosenClassSkills.value.length >= needed) {
    delete errors.classSkills
  }
}

const allProficientSkills = computed(() => {
  const mcSkills = multiclasses.value
    .filter(mc => isMcPrereqMet(mc))
    .flatMap(mc => mc.chosenSkills || [])
  return [...new Set([...priorGrantedSkills.value, ...chosenClassSkills.value, ...mcSkills])]
})

const expertiseConfig = computed(() => {
  const cName = (classSelected.value || characterClass.value?.class?.name || '').toLowerCase()
  const lvl = Number(classLevel.value) || 1
  let count = 0

  if (cName.includes('rogue')) {
    if (lvl >= 6) count = 4
    else if (lvl >= 1) count = 2
  } else if (cName.includes('bard')) {
    if (lvl >= 10) count = 4
    else if (lvl >= 3) count = 2
  } else if (cName.includes('ranger') && selectedEdition.value === '2024') {
    if (lvl >= 1) count = 1
  }

  return {
    eligible: count > 0,
    count
  }
})

const chosenExpertiseSkills = ref([])

watch(allProficientSkills, (newProfs) => {
  chosenExpertiseSkills.value = chosenExpertiseSkills.value.filter(s => newProfs.includes(s))
})

const toggleExpertiseSkill = (skillKey) => {
  if (!allProficientSkills.value.includes(skillKey)) return
  const idx = chosenExpertiseSkills.value.indexOf(skillKey)
  if (idx >= 0) {
    chosenExpertiseSkills.value.splice(idx, 1)
  } else {
    if (chosenExpertiseSkills.value.length < expertiseConfig.value.count) {
      chosenExpertiseSkills.value.push(skillKey)
    }
  }
  const expNeeded = Math.min(expertiseConfig.value.count, allProficientSkills.value.length)
  if (chosenExpertiseSkills.value.length >= expNeeded) {
    delete errors.expertises
  }
}

const onUpdateClassTool = (payload, maybeVal) => {
  const idx = typeof payload === 'object' && payload !== null ? payload.index : payload
  const val = typeof payload === 'object' && payload !== null ? payload.value : maybeVal
  chosenClassTools.value[idx] = val
  if (chosenClassTools.value.filter(Boolean).length >= classToolConfig.value.count) {
    delete errors.classTools
  }
}

const allProficienciesList = computed(() => {
  const result = []
  const bg = selectedBackgroundObj.value
  if (bg) {
    const bgDetails = parseBackgroundDetails(bg)
    if (bgDetails?.toolsText) {
      result.push(...bgDetails.toolsText.split(',').map(s => clean5eToolsMarkup(s).trim()).filter(Boolean))
    }
  }
  if (chosenBgTools.value.length > 0) {
    result.push(...chosenBgTools.value.map(clean5eToolsMarkup).filter(Boolean))
  }
  if (chosenClassTools.value.length > 0) {
    result.push(...chosenClassTools.value.map(clean5eToolsMarkup).filter(Boolean))
  }
  const cl = characterClass.value?.class
  if (cl?.startingProficiencies) {
    const sp = cl.startingProficiencies
    if (Array.isArray(sp.armor)) {
      for (const a of sp.armor) {
        if (typeof a === 'string') {
          const clean = clean5eToolsMarkup(a)
          result.push(`${clean.charAt(0).toUpperCase() + clean.slice(1)} Armor`)
        }
      }
    }
    if (Array.isArray(sp.weapons)) {
      for (const w of sp.weapons) {
        if (typeof w === 'string') {
          const clean = clean5eToolsMarkup(w)
          const lower = clean.toLowerCase()
          if (lower === 'simple' || lower === 'martial') {
            result.push(`${clean.charAt(0).toUpperCase() + clean.slice(1)} Weapons`)
          } else {
            const stripped = clean.replace(/\s+weapons$/i, '')
            result.push(stripped.charAt(0).toUpperCase() + stripped.slice(1))
          }
        }
      }
    }
    if (Array.isArray(sp.tools)) {
      for (const t of sp.tools) {
        if (typeof t === 'string' && !t.toLowerCase().includes('choice')) {
          result.push(clean5eToolsMarkup(t))
        }
      }
    }
  }
  return [...new Set(result.map(clean5eToolsMarkup).filter(Boolean))]
})

const getSkillLabel = (skillKey) => {
  const sk = ALL_SKILLS.find(s => s.key === skillKey)
  return sk ? `${sk.label} (${sk.ability})` : skillKey
}

const totalScores = computed(() => {
  const res = {}
  for (const k of ABILITY_KEYS) {
    res[k] = (Number(baseScores[k]) || 0) + (asiBonuses.value[k] || 0)
  }
  return res
})

const abilityModifiers = computed(() => {
  const res = {}
  for (const k of ABILITY_KEYS) {
    const total = totalScores.value[k]
    const mod = Math.floor((total - 10) / 2)
    res[k] = mod >= 0 ? `+${mod}` : `${mod}`
  }
  return res
})

const recheckAbilitiesErrors = () => {
  if (!errors.abilities) return
  if (!strength.value || !dexterity.value || !constitution.value || !intelligence.value || !wisdom.value || !charisma.value) {
    errors.abilities = 'Please fill all ability scores'
    return
  }
  let unmetMc = null
  if (multiclasses.value.length > 0) {
    for (let i = 0; i < multiclasses.value.length; i++) {
      const mc = multiclasses.value[i]
      const st = getMcPrereqStatus(mc)
      if (st.scoresAssigned && !st.met) {
        unmetMc = mc
        break
      }
    }
  }
  if (unmetMc) {
    errors.abilities = `Multiclassing prerequisite not met for ${(unmetMc.classSelected || '').toUpperCase()}: requires ${formatPrerequisitesText(unmetMc.classSelected, unmetMc.characterClass?.class)}`
  } else {
    delete errors.abilities
  }
}

watch(totalScores, (totals) => {
  strength.value = totals.strength
  dexterity.value = totals.dexterity
  constitution.value = totals.constitution
  intelligence.value = totals.intelligence
  wisdom.value = totals.wisdom
  charisma.value = totals.charisma

  recheckAbilitiesErrors()

  if (errors.pointbuy && scoreMethod.value === 'pointbuy' && pointBuyRemaining.value >= 0) {
    delete errors.pointbuy
  }
  if (errors.asi2024 && selectedEdition.value === '2024') {
    if (asi2024Mode.value !== 'plus2_plus1' || asi2024Plus2.value !== asi2024Plus1.value) {
      delete errors.asi2024
    }
  }
}, { immediate: true })

watch(() => multiclasses.value.map(mc => mc.classSelected), () => {
  recheckAbilitiesErrors()
})

const activeSteps = computed(() => {
  return selectedEdition.value === '2024'
    ? [
        { id: 'background', label: 'Background' },
        { id: 'species', label: 'Species' },
        { id: 'class', label: 'Class' },
        { id: 'abilities', label: 'Abilities' },
        { id: 'equipment', label: 'Equipment' }
      ]
    : [
        { id: 'race', label: 'Race' },
        { id: 'class', label: 'Class' },
        { id: 'background', label: 'Background' },
        { id: 'abilities', label: 'Abilities' },
        { id: 'equipment', label: 'Equipment' }
      ]
})

const currentStepIndex = computed(() => {
  const idx = activeSteps.value.findIndex(s => s.id === currentTab.value)
  return idx >= 0 ? idx : 0
})

const isFirstStep = computed(() => currentStepIndex.value === 0)
const isLastStep = computed(() => currentStepIndex.value === activeSteps.value.length - 1)

const alignments = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
  'Unaligned'
]

const strip5eTags = (text) => {
  if (typeof text !== 'string') return ''
  return text
    .replace(/\{@(?:item|spell|feat|skill|sense|action|condition|hazard|creature|race|class|background|book|table|dice|chance|filter)\s+([^}|]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\{@(?:b|i|bold|italic|note)\s+([^}]+)\}/gi, '$1')
    .replace(/\{@\w+\s+([^}]+)\}/gi, '$1')
    .replace(/\{@\w+\}/gi, '')
    .trim()
}

const parseBackgroundDetails = (bg) => {
  if (!bg) return null

  const safeEntries = Array.isArray(bg.entries)
    ? bg.entries
    : (typeof bg.entries === 'string' ? JSON.parse(bg.entries || '[]') : [])

  let featName = ''
  if (bg.feats && bg.feats.length > 0) {
    const f = bg.feats[0]
    const raw = typeof f === 'string' ? f : Object.keys(f)[0]
    const base = raw.split('|')[0].split(';')[0].trim()
    featName = base.replace(/\b\w/g, l => l.toUpperCase())
  }

  let listSkills = ''
  let listTools = ''
  let listLanguages = ''
  let listEquipment = ''
  let listAbility = ''
  let listFeat = ''

  const list = safeEntries.find(e => e && e.type === 'list')
  if (list && Array.isArray(list.items)) {
    for (const it of list.items) {
      const name = (it.name || '').toLowerCase()
      const entry = strip5eTags(it.entry || '')
      if (name.includes('skill')) listSkills = entry
      else if (name.includes('tool')) listTools = entry
      else if (name.includes('language')) listLanguages = entry
      else if (name.includes('equipment')) listEquipment = entry
      else if (name.includes('ability')) listAbility = entry
      else if (name.includes('feat')) listFeat = entry
    }
  }

  if (!featName && listFeat) featName = listFeat

  let abilityText = listAbility
  if (!abilityText && bg.ability && bg.ability.length > 0) {
    const fromAbils = bg.ability[0]?.choose?.weighted?.from || []
    if (fromAbils.length > 0) {
      abilityText = fromAbils.map(a => a.toUpperCase()).join(' / ')
    }
  }

  let featureName = ''
  let featureEntries = []
  const featEntry = safeEntries.find(e => e && (e.data?.isFeature || (typeof e.name === 'string' && /^feature:/i.test(e.name))))
  if (featEntry) {
    featureName = clean5eToolsMarkup((featEntry.name || '').replace(/^feature:\s*/i, 'Feature: '))
    if (Array.isArray(featEntry.entries)) {
      featureEntries = featEntry.entries
        .map(e => typeof e === 'string' ? e : (typeof e?.entry === 'string' ? e.entry : ''))
        .filter(Boolean)
    }
  }

  let skills = []
  if (listSkills) {
    skills = listSkills.split(/,\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean)
  } else if (bg.skillProficiencies && bg.skillProficiencies.length > 0) {
    const s = bg.skillProficiencies[0]
    skills = Object.keys(s).map(k => k.charAt(0).toUpperCase() + k.slice(1))
  }

  let toolsText = listTools
  if (!toolsText && Array.isArray(bg.toolProficiencies) && bg.toolProficiencies.length > 0) {
    const parts = []
    for (const tp of bg.toolProficiencies) {
      if (!tp || typeof tp !== 'object') continue
      if (tp.anyArtisansTool) {
        parts.push("One type of artisan's tools")
      } else if (tp.anyMusicalInstrument) {
        parts.push("One musical instrument")
      } else if (tp.anyGamingSet) {
        parts.push("One gaming set")
      } else if (tp.choose?.from) {
        const fromList = tp.choose.from.map(f => {
          const fl = f.toLowerCase()
          if (fl === 'anyartisanstool' || fl.includes('artisan')) return "artisan's tools"
          if (fl === 'anymusicalinstrument' || fl.includes('musical instrument')) return "musical instrument"
          if (fl === 'anygamingset' || fl.includes('gaming set')) return "gaming set"
          return f.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        })
        parts.push(`One of: ${fromList.join(', ')}`)
      } else {
        Object.keys(tp).forEach(k => {
          if (tp[k] === true) {
            parts.push(k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
          }
        })
      }
    }
    toolsText = parts.join(', ')
  }

  let languagesText = listLanguages
  if (!languagesText && bg.languageProficiencies && bg.languageProficiencies.length > 0) {
    const lp = bg.languageProficiencies[0]
    if (lp.anyStandard) languagesText = `${lp.anyStandard} of your choice`
  }

  let bgStartingItems = []
  let bgPackageGold = 0
  let foundGoldInStartingEquipment = false
  if (Array.isArray(bg.startingEquipment) && bg.startingEquipment.length > 0) {
    for (let eqIdx = 0; eqIdx < bg.startingEquipment.length; eqIdx++) {
      const eqObj = bg.startingEquipment[eqIdx]
      if (!eqObj) continue
      const choiceId = `eq_choice_${eqIdx}`
      const chosenKey = chosenBgEquipmentChoices[choiceId] || 'a'

      let listRaw = []
      if ((eqObj.a || eqObj.A) && (eqObj.b || eqObj.B)) {
        listRaw = chosenKey === 'b' ? (eqObj.b || eqObj.B) : (eqObj.a || eqObj.A)
      } else {
        listRaw = eqObj._ || eqObj.a || eqObj.A || []
      }

      for (const it of (listRaw || [])) {
        if (typeof it === 'string') {
          const clean = clean5eToolsMarkup(it).split('|')[0].trim()
          const gpMatch = clean.match(/^(\d+)\s*gp$/i)
          if (gpMatch) {
            bgPackageGold += parseInt(gpMatch[1], 10)
            foundGoldInStartingEquipment = true
            continue
          }
          if (clean) bgStartingItems.push(clean)
        } else if (typeof it === 'object' && it) {
          if (it.value != null || it.containsValue != null) {
            bgPackageGold += Math.floor((it.value || it.containsValue) / 100)
            foundGoldInStartingEquipment = true
          } else {
            let itemName = ''
            if (it.item) {
              const clean = clean5eToolsMarkup(it.displayName || it.item).split('|')[0].trim()
              const gpMatch = clean.match(/^(\d+)\s*gp$/i)
              if (gpMatch) {
                bgPackageGold += parseInt(gpMatch[1], 10) * (Number(it.quantity) || 1)
                foundGoldInStartingEquipment = true
                continue
              }
              itemName = clean
            } else if (it.special) {
              const clean = clean5eToolsMarkup(it.special).trim()
              const gpMatch = clean.match(/^(\d+)\s*gp$/i)
              if (gpMatch) {
                bgPackageGold += parseInt(gpMatch[1], 10) * (Number(it.quantity) || 1)
                foundGoldInStartingEquipment = true
                continue
              }
              const qty = it.quantity ? `${it.quantity} ` : ''
              itemName = `${qty}${clean}`.trim()
            }
            if (itemName) bgStartingItems.push(itemName)
          }
        }
      }
    }
  }

  if (!foundGoldInStartingEquipment) {
    const textGpMatch = (listEquipment || '').match(/(\d+)\s*gp/i)
    if (textGpMatch) {
      bgPackageGold = parseInt(textGpMatch[1], 10)
    } else {
      bgPackageGold = selectedEdition.value === '2024' ? 16 : 15
    }
  }

  const orChoiceKey = chosenBgEquipmentChoices['eq_choice_text_or']
  if (orChoiceKey === 'b') {
    const orChoice = bgEquipmentChoices.value.find(c => c.id === 'eq_choice_text_or')
    if (orChoice?.optionB?.items) bgStartingItems.push(...orChoice.optionB.items)
  } else if (orChoiceKey === 'a') {
    const orChoice = bgEquipmentChoices.value.find(c => c.id === 'eq_choice_text_or')
    if (orChoice?.optionA?.items) bgStartingItems.push(...orChoice.optionA.items)
  }

  return {
    featName,
    abilityText,
    featureName,
    featureEntries,
    skills,
    skillsText: listSkills || skills.join(', '),
    toolsText,
    languagesText,
    equipmentText: listEquipment,
    bgStartingItems,
    bgPackageGold
  }
}

const onBackgroundChange = () => {
  characterBackground.value = selectedBackgroundObj.value?.name || ''
  bgChosenLanguages.value = []
  chosenBgTools.value = []
  chosenBgSkills.value = []
  delete errors.bgTools
  delete errors.bgLanguages
  delete errors.bgSkills
  if (selectedBackgroundObj.value?.name) {
    delete errors.characterBackground
  }
  syncDefaultEquipment(true)
}

const fetchCompendiumData = async () => {
  try {
    const raceRes = await axios.get(`${API_URL}/race?edition=${selectedEdition.value}`)
    race.value = raceRes.data.data

    const classRes = await axios.get(`${API_URL}/class?edition=${selectedEdition.value}`)
    allClass.value = classRes.data.data

    const bgRes = await axios.get(`${API_URL}/compendium/backgrounds?edition=${selectedEdition.value}`)
    backgrounds.value = bgRes.data?.data || []

    const featRes = await axios.get(`${API_URL}/compendium/feats?edition=${selectedEdition.value}`)
    availableFeats.value = featRes.data?.data || []
  } catch (err) {
    console.error('Failed to load compendium data', err)
  }
}

const loadCharacterForEdit = async (data) => {
  if (!data) return
  const ed = data.edition || '2024'
  selectedEdition.value = ed
  characterStore.edition = ed

  const defaultSource = ed === '2024' ? 'XPHB' : 'PHB'
  const sourcesToEnable = new Set([defaultSource])
  if (data.race?.source) sourcesToEnable.add(data.race.source.toUpperCase())
  if (data.sub_race?.source) sourcesToEnable.add(data.sub_race.source.toUpperCase())
  const cObj = Array.isArray(data.class) ? data.class[0] : data.class
  if (cObj?.source) sourcesToEnable.add(cObj.source.toUpperCase())
  const scObj = Array.isArray(data.sub_class) ? data.sub_class[0] : data.sub_class
  if (scObj?.source) sourcesToEnable.add(scObj.source.toUpperCase())
  if (Array.isArray(data.feat)) {
    for (const f of data.feat) {
      if (f?.source) sourcesToEnable.add(f.source.toUpperCase())
    }
  }
  selectedSources.value = [...sourcesToEnable]

  characterName.value = data.name || ''
  alignment.value = data.alignment || ''
  classLevel.value = Number(data.level || 1)
  characterBackground.value = data.background || ''

  // Equipment
  const eqList = data.equipment || data.equipments || []
  if (Array.isArray(eqList) && eqList.length > 0) {
    userEquipmentList.value = JSON.parse(JSON.stringify(eqList))
    equipmentChoiceMode.value = 'package'
  }

  // Currency
  const tr = data.treasure || {}
  savedTreasure.pp = Number(tr.pp || 0)
  savedTreasure.gp = Number(tr.gp != null ? tr.gp : 50)
  savedTreasure.ep = Number(tr.ep || 0)
  savedTreasure.sp = Number(tr.sp || 0)
  savedTreasure.cp = Number(tr.cp || 0)
  customStartingGold.value = savedTreasure.gp

  // Fetch compendium lists
  await fetchCompendiumData()

  // Match background
  if (data.background) {
    const bgMatch = backgrounds.value.find(b => b.name?.toLowerCase() === data.background.toLowerCase())
    if (bgMatch) {
      selectedBackgroundObj.value = bgMatch
    }
  }

  const savedLanguages = (data.language || []).map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean)
  const savedProfs = (data.proficiency || []).map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean)
  const spRow = data.skill_proficiency || {}
  const profSkillKeys = Object.keys(spRow).filter(k => spRow[k] === true)

  // Populate background choices
  if (bgLangConfig.value.choiceCount > 0) {
    const candidateBgLangs = savedLanguages.filter(l =>
      !bgLangConfig.value.fixed.some(f => f.toLowerCase() === l.toLowerCase())
    )
    bgChosenLanguages.value = candidateBgLangs.slice(0, bgLangConfig.value.choiceCount)
  }

  if (bgSkillConfig.value.count > 0) {
    const matchedBgSkills = (bgSkillConfig.value.options || []).filter(sk => profSkillKeys.includes(sk))
    chosenBgSkills.value = matchedBgSkills.slice(0, bgSkillConfig.value.count)
  }

  if (bgToolConfig.value.count > 0) {
    const matchedBgTools = (bgToolConfig.value.options || []).filter(opt =>
      savedProfs.some(sp => sp.toLowerCase() === opt.toLowerCase())
    )
    chosenBgTools.value = matchedBgTools.slice(0, bgToolConfig.value.count)
  }

  // Match race
  if (data.race?.name) {
    const rList = Array.isArray(race.value) ? race.value : Object.values(race.value || {})
    const rMatch = rList.find(r => r.name?.toLowerCase() === data.race.name.toLowerCase())
    if (rMatch) {
      characterRace.value = rMatch
      try {
        const res = await axios.get(`${API_URL}/sub-race/${rMatch.name}/${rMatch.source}?edition=${selectedEdition.value}`)
        subRace.value = Array.isArray(res.data?.data) ? res.data.data : []
      } catch (err) {
        console.error(err)
        subRace.value = []
      }

      if (data.sub_race?.name) {
        const srMatch = subRace.value.find(sr => sr.name?.toLowerCase() === data.sub_race.name.toLowerCase())
        if (srMatch) {
          const s = (srMatch.source || defaultSource).toUpperCase()
          if (!selectedSources.value.includes(s)) {
            selectedSources.value.push(s)
          }
          characterSubRace.value = srMatch
        }
      }

      if (raceLangConfig.value.choiceCount > 0) {
        const alreadyClaimedLangs = [
          ...bgLangConfig.value.fixed,
          ...bgChosenLanguages.value,
          ...raceLangConfig.value.fixed
        ]
        const remainingLangs = savedLanguages.filter(l =>
          !alreadyClaimedLangs.some(c => c.toLowerCase() === l.toLowerCase())
        )
        raceChosenLanguages.value = remainingLangs.slice(0, raceLangConfig.value.choiceCount)
      }

      if (raceChoiceConfig.value && raceChoiceConfig.value.count > 0) {
        const absData = data.ability_score || {}
        const sortedFrom = [...raceChoiceConfig.value.from].sort((a, b) => (Number(absData[b] || 10)) - (Number(absData[a] || 10)))
        raceChooseStats.value = sortedFrom.slice(0, raceChoiceConfig.value.count)
      }
    }
  }

  // Match class
  if (cObj?.name) {
    const cName = cObj.name.toLowerCase()
    classSelected.value = cName
    try {
      const response = await axios.get(`${API_URL}/class/${cName}?edition=${selectedEdition.value}`)
      if (response.data?.data?.class?.length) {
        characterClass.value.class = response.data.data.class[0]
        characterClass.value.classFeature = response.data.data.classFeature || []
        const directSubclasses = response.data.data.subclass || response.data.data.subClass || []
        if (directSubclasses.length > 0) {
          subClass.value = directSubclasses
          characterStore.subClassLists = directSubclasses
        }
        const c = response.data.data.class[0]
        if (c?.name && c?.source) {
          const scRes = await axios.get(`${API_URL}/sub-class/${c.name.toLowerCase()}/${c.source.toLowerCase()}?edition=${selectedEdition.value}`)
          const scList = scRes.data?.data?.subClass || scRes.data?.data?.subclass || []
          if (scList.length > 0) {
            subClass.value = scList
            characterStore.subClassLists = scList
          }
        }
      }
    } catch (err) {
      console.error('Failed to load class for edit', err)
    }

    // Match subclass
    if (scObj?.name) {
      const scName = scObj.name.toLowerCase()
      const matchSc = availableSubClasses.value.find(s => s.name?.toLowerCase() === scName)
      if (matchSc) {
        const s = (matchSc.source || defaultSource).toUpperCase()
        if (!selectedSources.value.includes(s)) {
          selectedSources.value.push(s)
        }
        await onSubClassSelect(`${matchSc.name}|${matchSc.source}`)
      }
    }

    // Class skills
    const prior = priorGrantedSkills.value
    const availableForClass = (classSkillConfig.value.from || []).filter(k => !prior.includes(k))
    const matchedClassSkills = availableForClass.filter(k => spRow[k] === true)
    chosenClassSkills.value = matchedClassSkills.slice(0, classSkillConfig.value.count)

    // Expertises
    const seRow = data.skill_expertise || {}
    const expSkillKeys = Object.keys(seRow).filter(k => seRow[k] === true)
    if (expertiseConfig.value.eligible) {
      chosenExpertiseSkills.value = expSkillKeys.slice(0, expertiseConfig.value.count)
    }

    // Class Tools
    if (classToolConfig.value.count > 0) {
      const matchedClassTools = (classToolConfig.value.options || []).filter(opt =>
        savedProfs.some(sp => sp.toLowerCase() === opt.toLowerCase()) &&
        !chosenBgTools.value.some(bt => bt.toLowerCase() === opt.toLowerCase())
      )
      chosenClassTools.value = matchedClassTools.slice(0, classToolConfig.value.count)
    }

    // Spells
    const spList = data.spells || data.character_spells || []
    if (Array.isArray(spList) && spList.length > 0) {
      const featSps = spList.filter(s => s.sourceFeat || s.is_feat_spell)
      const classSps = spList.filter(s => !s.sourceFeat && !s.is_feat_spell)
      if (featSps.length > 0) {
        featChosenSpells.value = JSON.parse(JSON.stringify(featSps))
        chosenSpells.value = JSON.parse(JSON.stringify(classSps))
      } else if (!isSpellcasterClass.value && spList.length > 0) {
        featChosenSpells.value = JSON.parse(JSON.stringify(spList))
        chosenSpells.value = []
      } else {
        chosenSpells.value = JSON.parse(JSON.stringify(spList))
        featChosenSpells.value = []
      }
    } else {
      chosenSpells.value = []
      featChosenSpells.value = []
    }
  }

  // Handle Multiclass hydration
  const rawClasses = Array.isArray(data.class) ? data.class : (data.class ? [data.class] : [])
  const rawSubClasses = Array.isArray(data.sub_class) ? data.sub_class : (data.sub_class ? [data.sub_class] : [])

  multiclasses.value = []
  if (rawClasses.length > 1) {
    for (let i = 1; i < rawClasses.length; i++) {
      const secClass = rawClasses[i]
      const secSub = rawSubClasses[i]
      const mcItem = {
        id: 'mc_' + Date.now() + '_' + i,
        classSelected: (secClass.name || '').toLowerCase(),
        classLevel: Number(secClass.level) || 1,
        characterClass: { class: null, classFeature: [] },
        subClassLists: [],
        selectedSubClassKey: '',
        selectedSubClassItem: null,
        asiTierChoices: {},
        chosenSpells: [],
        chosenSkills: [],
        classSubTab: 'features',
        isCollapsed: false
      }
      multiclasses.value.push(mcItem)
      if (mcItem.classSelected) {
        await onMcClassChange(mcItem)
        if (secSub?.name) {
          const matchSc = (mcItem.subClassLists || []).find(s => s.name?.toLowerCase() === secSub.name?.toLowerCase())
          if (matchSc) {
            await onMcSubclassSelect(mcItem, `${matchSc.name}|${matchSc.source || ''}`)
          }
        }
        const mcCfg = getMcSkillConfig(mcItem)
        if (mcCfg.count > 0) {
          const taken = new Set([...priorGrantedSkills.value, ...chosenClassSkills.value])
          const mcMatched = mcCfg.from.filter(k => spRow[k] === true && !taken.has(k))
          mcItem.chosenSkills = mcMatched.slice(0, mcCfg.count)
        }
      }
    }
  }

  // Feats & ASI Tiers
  const savedFeats = (data.feat || []).map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean)
  const nonBgFeats = [...savedFeats]
  const bgDetails = parseBackgroundDetails(selectedBackgroundObj.value) || {}
  if (bgDetails.featName) {
    const bgFeatIdx = nonBgFeats.findIndex(f => f.toLowerCase() === bgDetails.featName.toLowerCase())
    if (bgFeatIdx >= 0) {
      nonBgFeats.splice(bgFeatIdx, 1)
    }
  }

  let featIdx = 0
  for (const item of allUnlockedAsiList.value) {
    if (featIdx < nonBgFeats.length) {
      const fName = nonBgFeats[featIdx++]
      item.choice.type = 'feat'
      item.choice.featName = fName
    } else {
      item.choice.type = ''
      item.choice.plus2Stat = ''
      item.choice.plus1StatA = ''
      item.choice.plus1StatB = ''
      item.choice.featName = ''
    }
  }

  // 2024 ASI from Background
  if (ed === '2024') {
    const absData = data.ability_score || {}
    const eligible = [...bgEligibleAbilities.value]
    if (eligible.length >= 2) {
      eligible.sort((a, b) => (Number(absData[b] || 10)) - (Number(absData[a] || 10)))
      asi2024Plus2.value = eligible[0]
      asi2024Plus1.value = eligible[1]
    }
  }

  // Ability Scores
  const abs = data.ability_score || {}
  scoreMethod.value = 'manual'
  for (const k of ABILITY_KEYS) {
    const savedVal = Number(abs[k] != null ? abs[k] : 10)
    const bonus = asiBonuses.value[k] || 0
    baseScores[k] = Math.max(1, savedVal - bonus)
  }
}

const changeEdition = async (newEdition) => {
  if (!isFirstStep.value) return
  if (selectedEdition.value === newEdition) return
  selectedEdition.value = newEdition
  characterStore.edition = newEdition
  selectedSources.value = newEdition === '2024' ? ['XPHB'] : ['PHB']
  characterRace.value = {}
  characterSubRace.value = {}
  classSelected.value = ''
  characterClass.value = {}
  characterSubClass.value = {}
  chosenSpells.value = []
  featChosenSpells.value = []
  classSubTab.value = 'features'
  delete errors.classSpells
  characterStore.characterSubClass = {}
  characterStore.isSubClassSelected = false
  characterStore.subClassLevelGained = 0
  subRace.value = []
  subClass.value = []
  characterStore.subClassLists = []
  multiclasses.value = []
  Object.keys(asiTierChoices).forEach(k => delete asiTierChoices[k])
  selectedSubClassKey.value = ''
  selectedSubClassItem.value = null
  chosenClassSkills.value = []
  chosenExpertiseSkills.value = []
  raceChosenLanguages.value = []
  bgChosenLanguages.value = []
  selectedBackgroundObj.value = null
  characterBackground.value = ''
  alignment.value = ''
  userEquipmentList.value = []
  Object.keys(chosenClassEquipmentChoices).forEach(k => delete chosenClassEquipmentChoices[k])
  Object.keys(chosenBgEquipmentChoices).forEach(k => delete chosenBgEquipmentChoices[k])
  Object.keys(errors).forEach(k => delete errors[k])
  currentTab.value = newEdition === '2024' ? 'background' : 'race'
  await fetchCompendiumData()
}

onMounted(() => {
  if (props.characterToEdit) {
    loadCharacterForEdit(props.characterToEdit)
  } else {
    fetchCompendiumData()
  }
  nextTick(() => {
    attachClickHandlers()
  })
})

watch(() => props.characterToEdit, (val) => {
  if (val) {
    loadCharacterForEdit(val)
  }
})

onUpdated(() => {
  nextTick(() => {
    attachClickHandlers()
  })
})

onBeforeUpdate(() => {
  removeClickHandlers()
})

watch(currentTab, () => {
  removeClickHandlers()
  nextTick(() => {
    attachClickHandlers()
  })
})

// Error clearance watchers
watch(characterName, (val) => {
  if (val && val.trim()) delete errors.characterName
})

watch(characterRace, (val) => {
  if (val && val.name) {
    delete errors.characterRace
    if (!isSubraceRequired.value) {
      delete errors.characterSubRace
    }
  }
})

watch(characterSubRace, (val) => {
  if (val && val.name) {
    delete errors.characterSubRace
  } else if (!isSubraceRequired.value) {
    delete errors.characterSubRace
  }
})

watch(selectedSources, (newSources) => {
  if (characterSubRace.value && characterSubRace.value.name) {
    const s = (characterSubRace.value.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    if (!newSources.includes(s)) {
      characterSubRace.value = {}
    }
  }
  if (characterRace.value && characterRace.value.name) {
    const s = (characterRace.value.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
    if (!newSources.includes(s)) {
      characterRace.value = {}
      characterSubRace.value = {}
      subRace.value = []
    }
  }
  if (classSelected.value && !filteredClasses.value[classSelected.value]) {
    classSelected.value = ''
    characterClass.value = {}
    characterSubClass.value = {}
    subClass.value = []
  }
}, { deep: true })

watch(raceChosenLanguages, (val) => {
  if (val.filter(Boolean).length >= raceLangConfig.value.choiceCount) {
    delete errors.raceLanguages
  }
}, { deep: true })

watch(classSelected, (val) => {
  if (val) delete errors.characterClass
})

watch(selectedSubClassKey, (val) => {
  if (val) delete errors.subclass
})

watch(classLevel, (lvl) => {
  if (selectedEdition.value === '2024' && lvl < 3) {
    characterStore.characterSubClass = {}
    characterStore.isSubClassSelected = false
    characterStore.subClassLevelGained = 0
    selectedSubClassKey.value = ''
    delete errors.subclass
  } else if (!isSubclassUnlocked.value) {
    delete errors.subclass
  }
})

watch(bgChosenLanguages, (val) => {
  if (val.filter(Boolean).length >= bgLangConfig.value.choiceCount) {
    delete errors.bgLanguages
  }
}, { deep: true })

watch(alignment, (val) => {
  if (val) delete errors.alignment
})

watch(selectedBackgroundObj, (val) => {
  if (val && val.name) delete errors.characterBackground
})

watch(chosenBgSkills, (val) => {
  if (val.filter(Boolean).length >= bgSkillConfig.value.count) {
    delete errors.bgSkills
  }
}, { deep: true })

watch(chosenBgTools, (val) => {
  if (val.filter(Boolean).length >= bgToolConfig.value.count) {
    delete errors.bgTools
  }
}, { deep: true })

watch(customStartingGold, (val) => {
  if (val !== null && val !== undefined && Number(val) >= 0) {
    delete errors.equipmentGold
  }
})

watch([asi2024Plus2, asi2024Plus1, asi2024Mode], () => {
  if (selectedEdition.value !== '2024' || asi2024Mode.value !== 'plus2_plus1' || asi2024Plus2.value !== asi2024Plus1.value) {
    delete errors.asi2024
  }
})

watch(pointBuyRemaining, (val) => {
  if (val >= 0) delete errors.pointbuy
})

watch(() => characterStore.characterSubClass, (val) => {
  characterSubClass.value = val
})

const getDynamicErrorFieldOrder = () => {
  const order = [
    'characterName',
    'characterBackground',
    'bgSkills',
    'bgLanguages',
    'bgTools',
    'characterRace',
    'characterSubRace',
    'raceLanguages',
    'characterClass',
    'subclass',
    'classSkills',
    'expertises',
    'classTools'
  ]

  multiclasses.value.forEach((_, idx) => {
    order.push(`class_mc_${idx}`)
    order.push(`skills_mc_${idx}`)
    order.push(`subclass_mc_${idx}`)
    order.push(`classSpells_mc_${idx}`)
  })

  order.push(
    'classSpells',
    'pointbuy',
    'asi2024',
    'abilities',
    'asiTiers'
  )

  allUnlockedAsiList.value.forEach(item => {
    order.push(item.errorKey)
  })

  order.push('alignment', 'equipmentGold')
  return order
}

const scrollToFirstError = () => {
  nextTick(() => {
    const hasAsiError = Object.keys(errors).some(k => k.startsWith('asiTier_'))
    if (errors.subclass || errors.classSkills || errors.expertises || errors.classTools || hasAsiError) {
      classSubTab.value = 'features'
    } else if (errors.classSpells) {
      classSubTab.value = 'spells'
    }

    multiclasses.value.forEach((mc, idx) => {
      const hasMcError = Object.keys(errors).some(k => k.includes(`mc_${idx}`))
      if (hasMcError) {
        mc.isCollapsed = false
        if (errors['classSpells_mc_' + idx]) {
          mc.classSubTab = 'spells'
        } else {
          mc.classSubTab = 'features'
        }
      }
    })

    setTimeout(() => {
      const activeOrder = getDynamicErrorFieldOrder()
      let firstKey = activeOrder.find(key => errors[key])
      if (!firstKey) {
        firstKey = Object.keys(errors).find(key => errors[key])
      }
      if (!firstKey) return

      const el = document.querySelector(`[data-error-field="${firstKey}"]`) ||
                 document.getElementById(firstKey) ||
                 document.querySelector('.border-red-500, .ring-red-500, .border-red-400')

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })

        el.classList.remove('error-pulse-highlight')
        void el.offsetWidth
        el.classList.add('error-pulse-highlight')
        setTimeout(() => {
          el.classList.remove('error-pulse-highlight')
        }, 1600)

        const focusable = el.matches('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
          ? el
          : el.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
        if (focusable && typeof focusable.focus === 'function') {
          focusable.focus({ preventScroll: true })
        }
      }
    }, 75)
  })
}

const validateStep = (stepId, shouldScroll = true) => {
  let isValid = true

  const validateAllAsiTiers = () => {
    let valid = true
    for (const item of allUnlockedAsiList.value) {
      const ch = item.choice
      if (!ch || !ch.type) {
        errors[item.errorKey] = `Please choose Ability Increase or Feat for ${item.className} Level ${item.tier}`
        errors.asiTiers = errors[item.errorKey]
        valid = false
        break
      } else if (ch.type === 'feat' && !ch.featName) {
        errors[item.errorKey] = `Please select a Feat for ${item.className} Level ${item.tier}`
        errors.asiTiers = errors[item.errorKey]
        valid = false
        break
      } else if (ch.type === 'asi') {
        if (ch.asiMode === '+2' && !ch.plus2Stat) {
          errors[item.errorKey] = `Please select an ability to increase (+2) for ${item.className} Level ${item.tier}`
          errors.asiTiers = errors[item.errorKey]
          valid = false
          break
        } else if (ch.asiMode === '+1_+1') {
          if (!ch.plus1StatA || !ch.plus1StatB) {
            errors[item.errorKey] = `Please select two abilities to increase (+1/+1) for ${item.className} Level ${item.tier}`
            errors.asiTiers = errors[item.errorKey]
            valid = false
            break
          } else if (ch.plus1StatA === ch.plus1StatB) {
            errors[item.errorKey] = `Please select two different abilities for ${item.className} Level ${item.tier} (+1/+1)`
            errors.asiTiers = errors[item.errorKey]
            valid = false
            break
          }
        }
      }
      delete errors[item.errorKey]
    }
    if (valid && !Object.keys(errors).some(k => k.startsWith('asiTier_'))) {
      delete errors.asiTiers
    }
    return valid
  }

  if (!characterName.value.trim()) {
    errors.characterName = 'Please enter character name'
    isValid = false
  } else {
    delete errors.characterName
  }

  if (stepId === 'race' || stepId === 'species') {
    if (!characterRace.value || !characterRace.value.name) {
      errors.characterRace = selectedEdition.value === '2024' ? 'Please select a species' : 'Please select a race'
      isValid = false
    } else {
      delete errors.characterRace
    }

    if (isSubraceRequired.value && (!characterSubRace.value || !characterSubRace.value.name)) {
      errors.characterSubRace = selectedEdition.value === '2024' ? 'Please select a lineage / subrace' : 'Please select a subrace'
      isValid = false
    } else {
      delete errors.characterSubRace
    }

    if (raceLangConfig.value.choiceCount > 0 && raceChosenLanguages.value.filter(Boolean).length < raceLangConfig.value.choiceCount) {
      errors.raceLanguages = `Please choose ${raceLangConfig.value.choiceCount} language(s) from your ${selectedEdition.value === '2024' ? 'species' : 'race'}`
      isValid = false
    } else {
      delete errors.raceLanguages
    }
  } else if (stepId === 'class') {
    if (!characterClass.value || !characterClass.value.class || !classSelected.value) {
      errors.characterClass = 'Please select a character class'
      isValid = false
    } else {
      delete errors.characterClass
    }

    // Subclass requirement if unlocked
    if (isSubclassUnlocked.value && !selectedSubClassKey.value) {
      errors.subclass = `Please select a subclass (Required at Level ${subclassUnlockLevel.value}+)`
      isValid = false
    } else {
      delete errors.subclass
    }

    // Multiclass requirements
    multiclasses.value.forEach((mc, idx) => {
      const classErrKey = 'class_mc_' + idx
      if (!mc.classSelected) {
        errors[classErrKey] = `Please select a class for Secondary Class ${idx + 1}, or remove it.`
        isValid = false
      } else {
        delete errors[classErrKey]
      }

      const subErrKey = 'subclass_mc_' + idx
      if (mc.classSelected) {
        const mcSubUnlock = getSubclassUnlockLevel(mc.classSelected, selectedEdition.value)
        const mcAvailable = getMcAvailableSubClasses(mc)
        if (isMcPrereqMet(mc) && Number(mc.classLevel) >= mcSubUnlock && mcAvailable.length > 0 && !mc.selectedSubClassKey) {
          errors[subErrKey] = `Please select a subclass for ${mc.classSelected.charAt(0).toUpperCase() + mc.classSelected.slice(1)}`
          isValid = false
        } else {
          delete errors[subErrKey]
        }

        // Validate multiclass skill choice if required
        const skillCfg = getMcSkillConfig(mc)
        const availSkills = getMcAvailableSkills(mc)
        const neededSkills = Math.min(skillCfg.count, availSkills.length)
        const skillsErrKey = 'skills_mc_' + idx
        if (isMcPrereqMet(mc) && neededSkills > 0 && (mc.chosenSkills || []).length < neededSkills) {
          errors[skillsErrKey] = `Please choose ${neededSkills} skill proficiency for ${mc.classSelected.charAt(0).toUpperCase() + mc.classSelected.slice(1)} (Selected: ${(mc.chosenSkills || []).length})`
          isValid = false
        } else {
          delete errors[skillsErrKey]
        }
      }
    })

    const needed = Math.min(classSkillConfig.value.count, availableClassSkills.value.length)
    if (chosenClassSkills.value.length < needed) {
      errors.classSkills = `Please choose ${needed} class skill proficiencies (Currently selected: ${chosenClassSkills.value.length})`
      isValid = false
    } else {
      delete errors.classSkills
    }

    if (expertiseConfig.value.eligible) {
      const expNeeded = Math.min(expertiseConfig.value.count, allProficientSkills.value.length)
      if (chosenExpertiseSkills.value.length < expNeeded) {
        errors.expertises = `Please choose ${expNeeded} expertise skill${expNeeded > 1 ? 's' : ''}`
        isValid = false
      } else {
        delete errors.expertises
      }
    }

    if (classToolConfig.value.count > 0 && chosenClassTools.value.filter(Boolean).length < classToolConfig.value.count) {
      errors.classTools = `Please choose ${classToolConfig.value.count} tool/instrument option(s)`
      isValid = false
    } else {
      delete errors.classTools
    }

    if (isSpellcasterClass.value) {
      delete errors.classSpells
    }

    // Check ASI / Feat tier choices
    if (!validateAllAsiTiers()) {
      isValid = false
    }
  } else if (stepId === 'background') {
    if (!characterBackground.value || !selectedBackgroundObj.value?.name) {
      errors.characterBackground = 'Please select a background'
      isValid = false
    } else {
      delete errors.characterBackground
    }

    if (bgSkillConfig.value.count > 0 && chosenBgSkills.value.filter(Boolean).length < bgSkillConfig.value.count) {
      errors.bgSkills = `Please choose ${bgSkillConfig.value.count} skill(s) from your background`
      isValid = false
    } else {
      delete errors.bgSkills
    }

    if (bgLangConfig.value.choiceCount > 0 && bgChosenLanguages.value.filter(Boolean).length < bgLangConfig.value.choiceCount) {
      errors.bgLanguages = `Please choose ${bgLangConfig.value.choiceCount} language(s) from your background`
      isValid = false
    } else {
      delete errors.bgLanguages
    }

    if (bgToolConfig.value.count > 0 && chosenBgTools.value.filter(Boolean).length < bgToolConfig.value.count) {
      errors.bgTools = `Please choose ${bgToolConfig.value.count} tool/instrument from your background`
      isValid = false
    } else {
      delete errors.bgTools
    }
  } else if (stepId === 'abilities') {
    if (!strength.value || !dexterity.value || !constitution.value || !intelligence.value || !wisdom.value || !charisma.value) {
      errors.abilities = 'Please fill all ability scores'
      isValid = false
    } else {
      delete errors.abilities
    }

    if (scoreMethod.value === 'pointbuy' && pointBuyRemaining.value < 0) {
      errors.pointbuy = 'Point buy budget exceeded (max 27 points)'
      isValid = false
    } else {
      delete errors.pointbuy
    }

    if (selectedEdition.value === '2024' && asi2024Mode.value === 'plus2_plus1' && asi2024Plus2.value === asi2024Plus1.value) {
      errors.asi2024 = 'Please select two different abilities for +2 and +1 ASI'
      isValid = false
    } else {
      delete errors.asi2024
    }

    // Check ASI / Feat tier choices
    if (!validateAllAsiTiers()) {
      isValid = false
    }

    // Check multiclass ability score prerequisites
    if (multiclasses.value.length > 0) {
      for (let i = 0; i < multiclasses.value.length; i++) {
        const mc = multiclasses.value[i]
        const st = getMcPrereqStatus(mc)
        if (st.scoresAssigned && !st.met) {
          errors.abilities = `Multiclassing prerequisite not met for ${(mc.classSelected || '').toUpperCase()}: requires ${formatPrerequisitesText(mc.classSelected, mc.characterClass?.class)}`
          isValid = false
          break
        }
      }
    }

    if (!alignment.value) {
      errors.alignment = 'Please select an alignment'
      isValid = false
    } else {
      delete errors.alignment
    }
  } else if (stepId === 'equipment') {
    if (equipmentChoiceMode.value === 'gold') {
      if (customStartingGold.value === null || customStartingGold.value === undefined || Number(customStartingGold.value) < 0) {
        errors.equipmentGold = 'Starting gold must be 0 or greater'
        isValid = false
      } else {
        delete errors.equipmentGold
      }
    } else {
      delete errors.equipmentGold
    }
  }

  if (!isValid && shouldScroll) {
    scrollToFirstError()
  }

  return isValid
}

const canGoToStep = (targetIdx) => {
  if (targetIdx <= currentStepIndex.value) return true
  for (let i = 0; i < targetIdx; i++) {
    const stepId = activeSteps.value[i].id
    if (!validateStep(stepId, false)) return false
  }
  return true
}

const goToStep = (tabId) => {
  const targetIdx = activeSteps.value.findIndex(s => s.id === tabId)
  if (targetIdx === -1 || targetIdx === currentStepIndex.value) return
  if (targetIdx > currentStepIndex.value) {
    for (let i = 0; i < targetIdx; i++) {
      const stepId = activeSteps.value[i].id
      if (!validateStep(stepId, false)) {
        currentTab.value = stepId
        scrollToFirstError()
        return
      }
    }
  }
  currentTab.value = tabId
}

const nextStep = () => {
  const currentStepId = activeSteps.value[currentStepIndex.value].id
  if (!validateStep(currentStepId, true)) return
  if (currentStepIndex.value < activeSteps.value.length - 1) {
    currentTab.value = activeSteps.value[currentStepIndex.value + 1].id
  }
}

const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentTab.value = activeSteps.value[currentStepIndex.value - 1].id
  }
}

const searchSubRace = async (raceObj) => {
  characterSubRace.value = {}
  delete errors.characterSubRace
  subRace.value = []
  raceChosenLanguages.value = []
  if (!raceObj || !raceObj.name || !raceObj.source) {
    return
  }
  await axios.get(`${API_URL}/sub-race/${raceObj.name}/${raceObj.source}?edition=${selectedEdition.value}`)
    .then((response) => {
      subRace.value = Array.isArray(response.data.data) ? response.data.data : []
      if ((raceObj.name || '').toLowerCase() === 'human') {
        const std = subRace.value.find(s => (s.name || '').toLowerCase() === 'standard')
        if (std) characterSubRace.value = std
      }
    })
    .catch((error) => {
      console.log(error)
      subRace.value = []
    })
}

const searchClass = async (cSelect) => {
  characterSubClass.value = {}
  characterClass.value = {}
  subClass.value = []
  selectedSubClassKey.value = ''
  selectedSubClassItem.value = null
  chosenClassSkills.value = []
  chosenExpertiseSkills.value = []
  chosenClassTools.value = []
  chosenSpells.value = []
  classSubTab.value = 'features'
  characterStore.characterSubClass = {}
  characterStore.isSubClassSelected = false
  characterStore.subClassLevelGained = 0
  Object.keys(chosenClassEquipmentChoices).forEach(k => delete chosenClassEquipmentChoices[k])
  if (!isEditMode.value) {
    userEquipmentList.value = []
  }
  delete errors.characterClass
  delete errors.subclass
  delete errors.classTools
  delete errors.classSpells

  if (!cSelect) return
  await axios.get(`${API_URL}/class/${cSelect}?edition=${selectedEdition.value}`)
    .then((response) => {
      if (response.data?.data?.class?.length) {
        characterClass.value.class = response.data.data.class[0]
        characterClass.value.classFeature = response.data.data.classFeature || []
        const directSubclasses = response.data.data.subclass || response.data.data.subClass || []
        if (directSubclasses.length > 0) {
          subClass.value = directSubclasses
          characterStore.subClassLists = directSubclasses
        }
        searchSubClass(response.data.data)
      }
    })
    .catch((error) => {
      console.log(error)
    })
}

const searchSubClass = async (classData) => {
  const c = classData?.class?.[0]
  if (!c?.name || !c?.source) return
  await axios.get(`${API_URL}/sub-class/${c.name.toLowerCase()}/${c.source.toLowerCase()}?edition=${selectedEdition.value}`)
    .then((response) => {
      const scList = response.data?.data?.subClass || response.data?.data?.subclass || []
      if (scList.length > 0) {
        subClass.value = scList
        characterStore.subClassLists = scList
      }
    })
    .catch((error) => {
      console.log(error)
    })
}

const attachClickHandlers = () => {
  const elements = document.getElementsByClassName('clickable')
  for (let i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', handleAnnotationClick)
  }
}

const removeClickHandlers = () => {
  const elements = document.getElementsByClassName('clickable')
  for (let i = 0; i < elements.length; i++) {
    elements[i].removeEventListener('click', handleAnnotationClick)
  }
}

const handleAnnotationClick = (event) => {
  console.log(event.target.innerText)
}

const isSubmitting = ref(false)

const submitForm = async () => {
  if (!characterName.value.trim()) {
    errors.characterName = 'Please enter character name'
    scrollToFirstError()
    return
  }

  // Validate all steps
  for (const step of activeSteps.value) {
    if (!validateStep(step.id, false)) {
      currentTab.value = step.id
      scrollToFirstError()
      return
    }
  }

  isSubmitting.value = true

  try {
    const bgDetails = parseBackgroundDetails(selectedBackgroundObj.value) || {}

    const skillObj = {}
    for (const sk of ALL_SKILLS) {
      skillObj[sk.key] = allProficientSkills.value.includes(sk.key)
    }

    const expertiseObj = {}
    for (const sk of ALL_SKILLS) {
      expertiseObj[sk.key] = chosenExpertiseSkills.value.includes(sk.key)
    }

    const allChosenFeats = []
    if (bgDetails.featName) allChosenFeats.push(bgDetails.featName)
    for (const item of allUnlockedAsiList.value) {
      const ch = item.choice
      if (ch && ch.type === 'feat' && ch.featName) {
        allChosenFeats.push(ch.featName)
      }
    }

    const classesPayload = [
      {
        name: characterClass.value.class?.name || classSelected.value,
        level: Number(classLevel.value),
        class: characterClass.value,
        sub_class: selectedSubClassItem.value || characterStore.characterSubClass || null,
        spells: [
          ...(chosenSpells.value || []),
          ...(featChosenSpells.value || [])
        ]
      }
    ]

    for (const mc of multiclasses.value) {
      if (mc.classSelected) {
        classesPayload.push({
          name: mc.characterClass?.class?.name || mc.classSelected,
          level: Number(mc.classLevel) || 1,
          class: mc.characterClass,
          sub_class: mc.selectedSubClassItem || null,
          spells: mc.chosenSpells || []
        })
      }
    }

    const allSpells = [
      ...(chosenSpells.value || []),
      ...multiclasses.value.flatMap(mc => mc.chosenSpells || []),
      ...(featChosenSpells.value || [])
    ]

    const payload = {
      edition: selectedEdition.value,
      name: characterName.value,
      background: characterBackground.value,
      alignment: alignment.value,
      level: totalCharacterLevel.value,
      proficiency_bonus: computedProficiencyBonus.value,
      race: characterRace.value,
      sub_race: characterSubRace.value,
      class: characterClass.value,
      sub_class: characterStore.characterSubClass,
      classes: classesPayload,
      strength: strength.value,
      dexterity: dexterity.value,
      constitution: constitution.value,
      intelligence: intelligence.value,
      wisdom: wisdom.value,
      charisma: charisma.value,
      ability_score: {
        strength: strength.value,
        dexterity: dexterity.value,
        constitution: constitution.value,
        intelligence: intelligence.value,
        wisdom: wisdom.value,
        charisma: charisma.value
      },
      skill_proficiencies: skillObj,
      skills: skillObj,
      skill_expertises: expertiseObj,
      expertises: expertiseObj,
      languages: allLanguagesList.value,
      proficiencies: allProficienciesList.value,
      feats: allChosenFeats,
      feat: allChosenFeats[0] || null,
      feature: bgDetails.featureName || null,
      spells: allSpells,
      equipment: userEquipmentList.value || [],
      treasures: computedTreasures.value,
      treasure: computedTreasures.value
    }

    if (isEditMode.value) {
      await axios.put(`${API_URL}/character/${props.characterToEdit.id}`, payload)
      const fullRes = await axios.get(`${API_URL}/character/${props.characterToEdit.id}`)
      if (fullRes.data?.data) {
        emit('created', fullRes.data.data)
      } else {
        emit('back')
      }
    } else {
      const res = await axios.post(`${API_URL}/character`, payload)
      const newId = res.data?.data?.id
      if (newId) {
        const fullRes = await axios.get(`${API_URL}/character/${newId}`)
        if (fullRes.data?.data) {
          emit('created', fullRes.data.data)
        }
      } else {
        emit('back')
      }
    }
  } catch (err) {
    alert(err.response?.data?.message || err.message || 'Failed to submit character')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div ref="scrollRef" class="max-w-2xl mx-2 sm:mx-auto mb-20 my-4 p-3.5 sm:p-6 bg-white rounded border border-gray-200 shadow-sm">
    <!-- Header: Back & Ruleset Edition Selector -->
    <div class="mb-5 pb-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <button
          type="button"
          @click="emit('back')"
          class="text-xs bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 font-medium transition cursor-pointer mb-2 sm:mb-0 flex items-center justify-center"
          title="Back to Character List"
          aria-label="Back to Character List"
        >
          <IconArrowLeft class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-gray-700">Ruleset:</span>
        <div class="flex gap-1 bg-gray-200 p-1 rounded">
          <button
            type="button"
            :disabled="!isFirstStep"
            @click="changeEdition('2024')"
            :class="[
              selectedEdition === '2024' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-700 hover:text-black',
              !isFirstStep ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            class="px-3 py-1 text-xs rounded font-medium transition"
          >
            2024 One D&D
          </button>
          <button
            type="button"
            :disabled="!isFirstStep"
            @click="changeEdition('2014')"
            :class="[
              selectedEdition === '2014' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-700 hover:text-black',
              !isFirstStep ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            class="px-3 py-1 text-xs rounded font-medium transition"
          >
            2014 Classic
          </button>
        </div>
      </div>
    </div>

    <!-- Source Books Toolbar (Disabled outside first step) -->
    <div class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs" :class="!isFirstStep ? 'bg-gray-100/70 border-gray-200' : ''">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5 font-semibold text-gray-700">
          <span>Sources:</span>
        </div>
        <span v-if="isFirstStep" class="text-[10px] text-gray-500">Core/SRD default</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="src in currentSourceOptions"
          :key="src.code"
          type="button"
          :disabled="!isFirstStep"
          @click="toggleSource(src.code)"
          :class="[
            !isFirstStep ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
            (selectedSources || []).includes(src.code) ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold shadow-xs' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
          ]"
          class="px-2 py-0.5 rounded border text-[11px] transition"
        >
          <span class="font-bold">{{ src.code }}</span>
          <span class="hidden sm:inline text-[10px] ml-1 opacity-75">({{ src.label.split('(')[0].trim() }})</span>
        </button>
      </div>
    </div>

    <!-- Character Name Input with In-line Error -->
    <div class="mb-4" data-error-field="characterName">
      <label for="characterName" class="block text-xs font-semibold text-gray-700">Character Name:</label>
      <input
        type="text"
        id="characterName"
        v-model="characterName"
        :class="errors.characterName ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
        class="mt-1 p-2 border rounded w-full text-xs bg-white"
        placeholder="Enter character name"
      />
      <p v-if="errors.characterName" class="mt-1 text-xs text-red-600 font-medium">
        {{ errors.characterName }}
      </p>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center justify-between border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar gap-1 sm:gap-2 pb-0.5">
      <button
        v-for="tab in activeSteps"
        :key="tab.id"
        type="button"
        @click="goToStep(tab.id)"
        :class="[
          currentTab === tab.id
            ? 'border-gray-900 text-gray-900 font-bold'
            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 font-medium',
          'flex-1 text-center py-2.5 px-1 sm:px-3 border-b-2 text-xs sm:text-sm transition cursor-pointer whitespace-nowrap'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB 1: Background (2024 first, 2014 third) -->
    <div v-if="currentTab === 'background'">
      <h2 class="text-base font-bold text-gray-900 mb-3">
        {{ selectedEdition === '2024' ? 'Background & Origin (2024)' : 'Background (2014)' }}
      </h2>

      <div class="mb-4" data-error-field="characterBackground">
        <label for="characterBackground" class="block text-xs font-semibold text-gray-700 mb-1">Choose Background:</label>
        <select
          id="characterBackground"
          v-model="selectedBackgroundObj"
          @change="onBackgroundChange"
          :class="errors.characterBackground ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
          class="p-2 border rounded w-full bg-white text-xs"
        >
          <option :value="null">Choose background</option>
          <option v-for="b in filteredBackgrounds" :key="b.id || b.name" :value="b">
            {{ b.name }} ({{ b.source }})
          </option>
        </select>
        <p v-if="errors.characterBackground" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.characterBackground }}
        </p>
      </div>

      <!-- Background Details Card -->
      <div v-if="selectedBackgroundObj" class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-800 space-y-2.5">
        <div class="flex items-center justify-between font-semibold text-gray-900 border-b border-gray-200 pb-1.5">
          <span>{{ selectedBackgroundObj.name }} ({{ selectedBackgroundObj.source }})</span>
          <span class="text-[10px] font-normal text-gray-500 border border-gray-200 bg-white px-1.5 py-0.5 rounded">
            {{ selectedEdition === '2024' ? 'One D&D 2024' : 'Classic 2014' }}
          </span>
        </div>

        <!-- Ability Score Increase Info (2024 only) -->
        <div v-if="selectedEdition === '2024' && parseBackgroundDetails(selectedBackgroundObj)?.abilityText">
          <span class="font-medium text-gray-700">Ability Score Increase:</span>
          <p class="text-gray-900 mt-0.5">+2/+1 or +1/+1/+1 to {{ parseBackgroundDetails(selectedBackgroundObj).abilityText }}</p>
        </div>

        <!-- Origin Feat (if any) -->
        <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.featName">
          <span class="font-medium text-gray-700">Feat:</span>
          <p class="text-gray-900 font-medium mt-0.5">{{ parseBackgroundDetails(selectedBackgroundObj).featName }}</p>
        </div>

        <!-- Background Feature (2014) -->
        <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.featureName" class="border-t border-gray-200 pt-2">
          <div class="font-semibold text-gray-900 mb-1">
            {{ parseBackgroundDetails(selectedBackgroundObj).featureName }}
          </div>
          <div
            v-for="(p, i) in parseBackgroundDetails(selectedBackgroundObj).featureEntries"
            :key="i"
            class="text-gray-600 leading-relaxed mt-1"
            v-html="renderAnnotatedText(p)"
          ></div>
        </div>

        <!-- Proficiencies & Gear Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-200 pt-2">
          <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.skillsText">
            <span class="font-medium text-gray-700">Skill Proficiencies:</span>
            <p class="text-gray-900 mt-0.5">{{ parseBackgroundDetails(selectedBackgroundObj).skillsText }}</p>
          </div>

          <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.toolsText">
            <span class="font-medium text-gray-700">Tool Proficiencies:</span>
            <p class="text-gray-900 mt-0.5">{{ parseBackgroundDetails(selectedBackgroundObj).toolsText }}</p>
          </div>

          <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.languagesText">
            <span class="font-medium text-gray-700">Languages:</span>
            <p class="text-gray-900 mt-0.5">{{ parseBackgroundDetails(selectedBackgroundObj).languagesText }}</p>
          </div>

          <div v-if="parseBackgroundDetails(selectedBackgroundObj)?.equipmentText" class="sm:col-span-2">
            <span class="font-medium text-gray-700">Starting Equipment:</span>
            <p class="text-gray-900 mt-0.5 leading-relaxed">{{ parseBackgroundDetails(selectedBackgroundObj).equipmentText }}</p>
          </div>
        </div>
      </div>

      <!-- Background Skill Choices -->
      <div v-if="bgSkillConfig.count > 0" data-error-field="bgSkills" class="mb-4 p-3 bg-gray-50 border rounded text-xs" :class="errors.bgSkills ? 'border-red-400' : 'border-gray-200'">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-medium text-gray-800">{{ bgSkillConfig.label }}:</span>
          <span
            class="text-xs font-mono font-medium"
            :class="chosenBgSkills.filter(Boolean).length === bgSkillConfig.count ? 'text-green-700' : 'text-gray-600'"
          >
            {{ chosenBgSkills.filter(Boolean).length }} / {{ bgSkillConfig.count }}
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="idx in bgSkillConfig.count" :key="idx">
            <select
              v-model="chosenBgSkills[idx - 1]"
              :class="errors.bgSkills ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-1.5 border rounded w-full bg-white text-xs"
            >
              <option value="">Select Skill #{{ idx }}</option>
              <option
                v-for="skKey in bgSkillConfig.options"
                :key="skKey"
                :value="skKey"
                :disabled="chosenBgSkills.includes(skKey) && chosenBgSkills[idx - 1] !== skKey"
              >
                {{ getSkillLabel(skKey) }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="errors.bgSkills" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.bgSkills }}
        </p>
      </div>

      <!-- Background Language Choices -->
      <div v-if="bgLangConfig.choiceCount > 0" data-error-field="bgLanguages" class="mb-4 p-3 bg-gray-50 border rounded text-xs" :class="errors.bgLanguages ? 'border-red-400' : 'border-gray-200'">
        <div class="font-medium text-gray-800 mb-1.5">
          Choose {{ bgLangConfig.choiceCount }} Language{{ bgLangConfig.choiceCount > 1 ? 's' : '' }} (Background):
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="idx in bgLangConfig.choiceCount" :key="idx">
            <select
              v-model="bgChosenLanguages[idx - 1]"
              :class="errors.bgLanguages && !bgChosenLanguages[idx - 1] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-1.5 border rounded w-full bg-white text-xs"
            >
              <option value="">Select Language #{{ idx }}</option>
              <option
                v-for="l in STANDARD_LANGUAGES"
                :key="l"
                :value="l"
                :disabled="bgLangConfig.fixed.includes(l) || (bgChosenLanguages.includes(l) && bgChosenLanguages[idx - 1] !== l)"
              >
                {{ l }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="errors.bgLanguages" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.bgLanguages }}
        </p>
      </div>

      <!-- Background Tool / Instrument Choices -->
      <div v-if="bgToolConfig.count > 0" data-error-field="bgTools" class="mb-4 p-3 bg-gray-50 border rounded text-xs" :class="errors.bgTools ? 'border-red-400' : 'border-gray-200'">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-medium text-gray-800">{{ bgToolConfig.label }}:</span>
          <span
            class="text-xs font-mono font-medium"
            :class="chosenBgTools.filter(Boolean).length === bgToolConfig.count ? 'text-green-700' : 'text-gray-600'"
          >
            {{ chosenBgTools.filter(Boolean).length }} / {{ bgToolConfig.count }}
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="idx in bgToolConfig.count" :key="idx">
            <select
              v-model="chosenBgTools[idx - 1]"
              :class="errors.bgTools ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-1.5 border rounded w-full bg-white text-xs"
            >
              <option value="">Select Option #{{ idx }}</option>
              <option
                v-for="opt in bgToolConfig.options"
                :key="opt"
                :value="opt"
                :disabled="chosenBgTools.includes(opt) && chosenBgTools[idx - 1] !== opt"
              >
                {{ opt }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="errors.bgTools" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.bgTools }}
        </p>
      </div>

      <!-- Origin Feat Spell Notification -->
      <div v-if="detectedFeatSpellSources.some(s => s.sourceType === 'background')" class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between gap-2">
        <div>
          <span class="font-bold text-gray-900 block">Origin Feat Grants Spells</span>
          <span class="text-gray-600 text-[11px]">
            Your background feat grants spells! Configure and choose them in the Class tab.
          </span>
        </div>
        <button
          type="button"
          @click="currentTab = 'class'; classSubTab = 'featSpells'"
          class="px-2.5 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded font-bold text-xs cursor-pointer shrink-0 transition"
        >
          Pick Feat Spells ({{ featChosenSpells.length }}) &rarr;
        </button>
      </div>
    </div>

    <!-- TAB 2: Race / Species -->
    <div v-else-if="currentTab === 'race' || currentTab === 'species'">
      <h2 class="text-base font-bold text-gray-900 mb-3">{{ selectedEdition === '2024' ? 'Species' : 'Race' }}</h2>
      <div class="mb-4" data-error-field="characterRace">
        <label for="characterRace" class="block text-xs font-semibold text-gray-700 mb-1">
          {{ selectedEdition === '2024' ? 'Character Species:' : 'Character Race:' }}
        </label>
        <select
          id="characterRace"
          @change="searchSubRace(characterRace)"
          v-model="characterRace"
          :class="errors.characterRace ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
          class="p-2 border rounded w-full text-xs bg-white"
        >
          <option :value="{}">Choose {{ selectedEdition === '2024' ? 'species' : 'race' }}</option>
          <option v-for="r in filteredRaces" :key="r.id || r.name" :value="r">
            {{ r.name }} ({{ r.source }})
          </option>
        </select>
        <p v-if="errors.characterRace" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.characterRace }}
        </p>
      </div>

      <RaceSubRaceDetail :selected="characterRace" v-model:abilityChoices="raceChooseStats" />

      <div v-if="Object.keys(characterRace || {}).length !== 0 && filteredSubRaces.length !== 0" class="my-4" data-error-field="characterSubRace">
        <label for="characterSubRace" class="block text-xs font-semibold text-gray-700 mb-1">
          {{ selectedEdition === '2024' ? 'Lineage / Subrace:' : 'Sub Race / Lineage:' }}
          <span v-if="isSubraceRequired" class="text-red-500">*</span>
          <span v-else class="text-gray-400 font-normal ml-1">(Optional)</span>
        </label>
        <select
          id="characterSubRace"
          v-model="characterSubRace"
          :class="errors.characterSubRace ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
          class="p-2 border rounded w-full text-xs bg-white"
        >
          <option :value="{}">
            {{ isSubraceRequired ? `Choose ${selectedEdition === '2024' ? 'lineage' : 'sub race'}` : 'None / Standard' }}
          </option>
          <option v-for="r in filteredSubRaces" :key="r.id || (r.name + '-' + r.source)" :value="r">
            {{ r.name }} ({{ r.source }})
          </option>
        </select>
        <p v-if="errors.characterSubRace" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.characterSubRace }}
        </p>
      </div>
      <RaceSubRaceDetail :selected="characterSubRace" v-model:abilityChoices="raceChooseStats" />

      <!-- Race Language Choices -->
      <div v-if="raceLangConfig.choiceCount > 0" data-error-field="raceLanguages" class="my-4 p-3 bg-gray-50 border rounded text-xs" :class="errors.raceLanguages ? 'border-red-400' : 'border-gray-200'">
        <div class="font-medium text-gray-800 mb-1.5">
          Choose {{ raceLangConfig.choiceCount }} Language{{ raceLangConfig.choiceCount > 1 ? 's' : '' }} ({{ selectedEdition === '2024' ? 'Species' : 'Race' }}):
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="idx in raceLangConfig.choiceCount" :key="idx">
            <select
              v-model="raceChosenLanguages[idx - 1]"
              :class="errors.raceLanguages && !raceChosenLanguages[idx - 1] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-1.5 border rounded w-full bg-white text-xs"
            >
              <option value="">Select Language #{{ idx }}</option>
              <option
                v-for="l in STANDARD_LANGUAGES"
                :key="l"
                :value="l"
                :disabled="raceLangConfig.fixed.includes(l) || (raceChosenLanguages.includes(l) && raceChosenLanguages[idx - 1] !== l)"
              >
                {{ l }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="errors.raceLanguages" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.raceLanguages }}
        </p>
      </div>
    </div>

    <!-- TAB 3: Class & Subclass -->
    <div v-else-if="currentTab === 'class'">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-base font-bold text-gray-900">Class & Subclass</h2>
          <p class="text-xs text-gray-500">
            Total Character Level: <span class="font-bold text-gray-800">{{ totalCharacterLevel }} / 20</span>
          </p>
        </div>
        <button
          v-if="totalCharacterLevel < 20 && Object.keys(availableClassesForMulticlass).length > 0"
          type="button"
          @click="addMulticlass"
          class="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded transition cursor-pointer flex items-center gap-1"
        >
          <span>+ Add Class</span>
        </button>
      </div>

      <!-- Primary Class Card -->
      <div class="p-3 bg-white border border-gray-200 rounded mb-4">
        <div class="text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-2">
          Primary Class
        </div>
        <div class="grid grid-cols-4 gap-2 mb-3">
          <div class="col-span-3" data-error-field="characterClass">
            <label for="characterClass" class="block text-xs font-semibold text-gray-700 mb-1">Class:</label>
            <select
              id="characterClass"
              @change="searchClass(classSelected)"
              v-model="classSelected"
              :class="errors.characterClass ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-2 border rounded w-full text-xs bg-white"
            >
              <option value="">Choose class</option>
              <option v-for="(c, n) in filteredClasses" :key="n" :value="n">
                {{ n.charAt(0).toUpperCase() + n.slice(1) }}
              </option>
            </select>
            <p v-if="errors.characterClass" class="mt-1 text-xs text-red-600 font-medium">
              {{ errors.characterClass }}
            </p>
          </div>

          <div class="col-span-1">
            <label for="characterClassLevel" class="block text-xs font-semibold text-gray-700 mb-1">Level:</label>
            <select v-model="classLevel" class="p-2 border border-gray-300 rounded w-full text-xs bg-white" id="characterClassLevel">
              <option v-for="n in maxPrimaryClassLevel" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Sub-tabs for Class Features vs Spells vs Feat Spells -->
        <div v-if="isSpellcasterClass || detectedFeatSpellSources.length > 0" class="flex border-b border-gray-200 mb-3">
          <button
            type="button"
            @click="classSubTab = 'features'"
            :class="classSubTab === 'features' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
            class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t"
          >
            Class Features
          </button>
          <button
            v-if="isSpellcasterClass"
            type="button"
            @click="classSubTab = 'spells'"
            :class="classSubTab === 'spells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
            class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
          >
            <span>Spells & Magic</span>
            <span
              v-if="chosenSpells.length > 0"
              class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200"
            >
              {{ chosenSpells.length }}
            </span>
          </button>
          <button
            v-if="detectedFeatSpellSources.length > 0"
            type="button"
            @click="classSubTab = 'featSpells'"
            :class="classSubTab === 'featSpells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
            class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
          >
            <span>Feat Spells</span>
            <span
              v-if="featChosenSpells.length > 0"
              class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200"
            >
              {{ featChosenSpells.length }}
            </span>
          </button>
        </div>

        <!-- Features view -->
        <div v-show="classSubTab === 'features' || (!isSpellcasterClass && classSubTab !== 'featSpells')">
          <ClassSubClassDetail
            :selected="characterClass"
            :classLevel="Number(classLevel)"
            :availableSubClasses="availableSubClasses"
            :selectedSubClassKey="selectedSubClassKey"
            :subclassError="errors.subclass"
            :subclassUnlockLevel="subclassUnlockLevel"
            :subClassFeatures="characterSubClass?.subClassFeature || characterStore.characterSubClass?.subClassFeature || []"
            :classSkillConfig="classSkillConfig"
            :availableClassSkills="availableClassSkills"
            :chosenClassSkills="chosenClassSkills"
            :priorGrantedSkills="priorGrantedSkills"
            :skillError="errors.classSkills"
            :getSkillLabel="getSkillLabel"
            :expertiseConfig="expertiseConfig"
            :allProficientSkills="allProficientSkills"
            :chosenExpertiseSkills="chosenExpertiseSkills"
            :expertiseError="errors.expertises"
            :classToolConfig="classToolConfig"
            :chosenClassTools="chosenClassTools"
            :toolError="errors.classTools"
            :asiTierChoices="asiTierChoices"
            :unlockedAsiTiers="unlockedAsiTiers"
            :filteredFeats="filteredFeats"
            :asiTierErrors="errors"
            :errorPrefix="''"
            :edition="selectedEdition"
            :abilityScores="currentAbilityScoresMap"
            @selectSubclass="onSubClassSelect"
            @toggleClassSkill="toggleClassSkill"
            @toggleExpertiseSkill="toggleExpertiseSkill"
            @updateClassTool="onUpdateClassTool"
          />
        </div>

        <!-- Spells view -->
        <div v-if="isSpellcasterClass && classSubTab === 'spells'" data-error-field="classSpells">
          <ClassSpellsPicker
            :edition="selectedEdition"
            :className="characterClass.class?.name || classSelected"
            :subclassName="selectedSubClassItem?.name || characterStore.characterSubClass?.name || ''"
            :classLevel="Number(classLevel)"
            :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
            :proficiencyBonus="computedProficiencyBonus"
            :error="errors.classSpells"
            v-model="chosenSpells"
            @close="classSubTab = 'features'"
          />
        </div>

        <!-- Feat Spells view -->
        <div v-if="detectedFeatSpellSources.length > 0 && classSubTab === 'featSpells'">
          <FeatSpellsPicker
            :edition="selectedEdition"
            :featSources="detectedFeatSpellSources"
            :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
            :proficiencyBonus="computedProficiencyBonus"
            v-model="featChosenSpells"
            @close="classSubTab = 'features'"
          />
        </div>
      </div>

      <!-- Secondary Multiclass Collapsible Cards -->
      <div
        v-for="(mc, mcIdx) in multiclasses"
        :key="mc.id"
        :id="mc.id"
        class="border rounded mb-4 overflow-hidden bg-white shadow-xs transition"
        :class="errors['class_mc_' + mcIdx] ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'"
        :data-error-field="'class_mc_' + mcIdx"
      >
        <!-- Collapsible Header -->
        <div
          @click="mc.isCollapsed = !mc.isCollapsed"
          class="flex items-center justify-between p-3 bg-gray-50/90 hover:bg-gray-100/80 cursor-pointer select-none transition border-b border-gray-200"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-3.5 h-3.5 text-gray-500 transition-transform duration-200"
              :class="{ '-rotate-90': mc.isCollapsed }"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-900">
              Class {{ mcIdx + 2 }}: {{ mc.characterClass?.class?.name || (mc.classSelected ? (mc.classSelected.charAt(0).toUpperCase() + mc.classSelected.slice(1)) : 'Secondary Class') }}
            </span>
            <span v-if="mc.classSelected" class="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-gray-100 text-gray-700 border border-gray-200">
              Level {{ mc.classLevel }}
            </span>
          </div>

          <button
            type="button"
            @click.stop="removeMulticlass(mcIdx)"
            class="text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer px-2 py-1 rounded hover:bg-red-50 transition"
          >
            Remove Class
          </button>
        </div>

        <!-- Collapsible Content -->
        <div v-show="!mc.isCollapsed" class="p-3">
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div class="col-span-3">
              <label class="block text-xs font-semibold text-gray-700 mb-1">Class:</label>
              <select
                @change="onMcClassChange(mc)"
                v-model="mc.classSelected"
                :class="errors['class_mc_' + mcIdx] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
                class="p-2 border rounded w-full text-xs bg-white"
              >
                <option value="">Choose secondary class</option>
                <option
                  v-for="(c, n) in filteredClasses"
                  :key="n"
                  :value="n"
                  :disabled="n.toLowerCase() === (classSelected || '').toLowerCase() || multiclasses.some((other, oIdx) => oIdx !== mcIdx && other.classSelected?.toLowerCase() === n.toLowerCase())"
                >
                  {{ n.charAt(0).toUpperCase() + n.slice(1) }}
                </option>
              </select>
              <p v-if="errors['class_mc_' + mcIdx]" class="mt-1 text-xs text-red-600 font-medium">
                {{ errors['class_mc_' + mcIdx] }}
              </p>
            </div>

            <div class="col-span-1">
              <label class="block text-xs font-semibold text-gray-700 mb-1">Level:</label>
              <select v-model="mc.classLevel" class="p-2 border border-gray-300 rounded w-full text-xs bg-white">
                <option v-for="n in getMaxLevelForMc(mcIdx)" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <!-- Prompt when no class selected yet -->
          <div v-if="!mc.classSelected" class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-center text-xs text-gray-500">
            Choose a secondary class above to configure its progression, features, and archetypes.
          </div>

          <!-- When class is selected -->
          <template v-else>
            <!-- Multiclass Prerequisites & Proficiencies Rules Card -->
            <div class="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                  Multiclassing Rules ({{ (mc.classSelected || '').toUpperCase() }})
                </span>
                <span
                  v-if="getMcPrereqStatus(mc).scoresAssigned"
                  :class="getMcPrereqStatus(mc).met
                    ? 'text-emerald-700 font-semibold'
                    : 'text-red-600 font-semibold'"
                  class="text-[11px]"
                >
                  {{ getMcPrereqStatus(mc).met ? 'Prerequisite Met' : 'Prerequisite Not Met' }}
                </span>
                <span
                  v-else
                  class="text-[11px] text-gray-500 font-normal"
                >
                  Min 13 Required
                </span>
              </div>

              <!-- Prerequisites Breakdown -->
              <div class="space-y-1 text-gray-700 pt-1 border-t border-gray-200">
                <div class="flex items-start justify-between gap-2">
                  <span>
                    <span class="font-semibold text-gray-800">Prerequisite ({{ (mc.classSelected || '').toUpperCase() }}):</span>
                    Min 13 {{ formatPrerequisitesText(mc.classSelected, mc.characterClass?.class) }}
                  </span>
                  <span
                    v-if="getMcPrereqStatus(mc).scoresAssigned"
                    :class="getMcPrereqStatus(mc).met ? 'text-emerald-700' : 'text-rose-600'"
                    class="font-mono text-[11px] font-semibold shrink-0"
                  >
                    {{ getMcPrereqStatus(mc).details }}
                  </span>
                </div>
              </div>

              <!-- Multiclass Proficiencies Gained Breakdown -->
              <div class="pt-2 border-t border-gray-200 space-y-1 text-gray-700">
                <div class="font-semibold text-gray-800 text-[11px] uppercase tracking-wider">
                  Proficiencies Gained:
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div><b>Armor:</b> {{ getMcProficiencies(mc).armor.length ? getMcProficiencies(mc).armor.join(', ') : 'None' }}</div>
                  <div><b>Weapons:</b> {{ getMcProficiencies(mc).weapons.length ? getMcProficiencies(mc).weapons.join(', ') : 'None' }}</div>
                  <div><b>Tools:</b> {{ getMcProficiencies(mc).tools.length ? getMcProficiencies(mc).tools.join(', ') : 'None' }}</div>
                  <div><b>Starting Equipment:</b> {{ getMcProficiencies(mc).equipment?.length ? getMcProficiencies(mc).equipment.join(', ') : 'None' }}</div>
                </div>
              </div>

              <!-- Interactive Multiclass Skill Choice (e.g. Rogue, Ranger, Bard) -->
              <div
                v-if="isMcPrereqMet(mc) && getMcSkillConfig(mc).count > 0"
                :data-error-field="'skills_mc_' + mcIdx"
                class="pt-2 border-t border-gray-200 space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-gray-800 text-[11px]">
                    Choose {{ getMcSkillConfig(mc).count }} Skill Proficiency:
                  </span>
                  <span class="text-[11px] text-gray-500 font-mono">
                    {{ (mc.chosenSkills || []).length }} / {{ Math.min(getMcSkillConfig(mc).count, getMcAvailableSkills(mc).length) }} selected
                  </span>
                </div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="skKey in getMcSkillConfig(mc).from"
                    :key="skKey"
                    type="button"
                    :disabled="isSkillPriorGranted(skKey, mc)"
                    @click="toggleMcSkill(mc, skKey, mcIdx)"
                    :class="[
                      isSkillPriorGranted(skKey, mc)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        : (mc.chosenSkills || []).includes(skKey)
                          ? 'border-gray-800 bg-gray-100 text-gray-900 font-semibold ring-1 ring-gray-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                      'px-2 py-1 border rounded text-xs transition cursor-pointer'
                    ]"
                  >
                    {{ getSkillLabel(skKey) }}
                    <span v-if="isSkillPriorGranted(skKey, mc)" class="text-[9px] text-gray-400 ml-1">
                      (already granted)
                    </span>
                  </button>
                </div>
                <p v-if="errors['skills_mc_' + mcIdx]" class="text-xs text-red-600 font-medium">
                  {{ errors['skills_mc_' + mcIdx] }}
                </p>
              </div>
            </div>

            <!-- If multiclass prerequisites are met: show feature collapses & spells -->
            <template v-if="isMcPrereqMet(mc)">
              <!-- Sub-tabs for Features vs Spells (if secondary class is Spellcaster) -->
              <div v-if="isMcSpellcaster(mc)" class="flex border-b border-gray-200 mb-3">
                <button
                  type="button"
                  @click="mc.classSubTab = 'features'"
                  :class="mc.classSubTab === 'features' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-white' : 'text-gray-500 hover:text-gray-700 font-medium'"
                  class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t"
                >
                  Features
                </button>
                <button
                  type="button"
                  @click="mc.classSubTab = 'spells'"
                  :class="mc.classSubTab === 'spells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-white' : 'text-gray-500 hover:text-gray-700 font-medium'"
                  class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
                >
                  <span>Spells</span>
                  <span v-if="mc.chosenSpells?.length > 0" class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200">
                    {{ mc.chosenSpells.length }}
                  </span>
                </button>
              </div>

              <!-- Features view -->
              <div v-show="!isMcSpellcaster(mc) || mc.classSubTab === 'features'">
                <ClassSubClassDetail
                  v-if="mc.characterClass?.class"
                  :selected="mc.characterClass"
                  :classLevel="Number(mc.classLevel)"
                  :availableSubClasses="getMcAvailableSubClasses(mc)"
                  :selectedSubClassKey="mc.selectedSubClassKey"
                  :subclassError="errors['subclass_mc_' + mcIdx]"
                  :subclassUnlockLevel="getSubclassUnlockLevel(mc.classSelected || mc.characterClass?.class?.name, selectedEdition)"
                  :subClassFeatures="mc.selectedSubClassItem?.subClassFeature || []"
                  :classSkillConfig="{ count: 0, from: [] }"
                  :availableClassSkills="[]"
                  :chosenClassSkills="[]"
                  :priorGrantedSkills="allProficientSkills"
                  :skillError="''"
                  :getSkillLabel="getSkillLabel"
                  :expertiseConfig="{ eligible: false, count: 0 }"
                  :allProficientSkills="allProficientSkills"
                  :chosenExpertiseSkills="[]"
                  :expertiseError="''"
                  :classToolConfig="{ count: 0, from: [] }"
                  :chosenClassTools="[]"
                  :toolError="''"
                  :asiTierChoices="mc.asiTierChoices"
                  :unlockedAsiTiers="getUnlockedAsiTiersForClass(mc.classSelected || mc.characterClass?.class?.name, mc.classLevel)"
                  :filteredFeats="filteredFeats"
                  :asiTierErrors="errors"
                  :errorPrefix="'mc_' + mcIdx"
                  :edition="selectedEdition"
                  :abilityScores="currentAbilityScoresMap"
                  @selectSubclass="(key) => onMcSubclassSelect(mc, key, mcIdx)"
                  @toggleClassSkill="() => {}"
                  @toggleExpertiseSkill="() => {}"
                  @updateClassTool="() => {}"
                />
              </div>

              <!-- Spells view -->
              <div v-if="isMcSpellcaster(mc) && mc.classSubTab === 'spells'">
                <ClassSpellsPicker
                  :edition="selectedEdition"
                  :className="mc.characterClass.class?.name || mc.classSelected"
                  :subclassName="mc.selectedSubClassItem?.name || ''"
                  :classLevel="Number(mc.classLevel)"
                  :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
                  :proficiencyBonus="computedProficiencyBonus"
                  :error="''"
                  v-model="mc.chosenSpells"
                  @close="mc.classSubTab = 'features'"
                />
              </div>
            </template>

            <!-- Locked State When Prerequisites Not Met -->
            <div
              v-else
              class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-center text-xs text-gray-600 space-y-1"
            >
              <div class="font-semibold text-gray-800">
                Prerequisites Not Met
              </div>
              <p class="text-[11px] text-gray-500 leading-relaxed max-w-md mx-auto">
                Features, subclass options, and spells remain locked until ability score prerequisites are satisfied in the Ability Scores step.
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- TAB 4: Abilities & Feats -->
    <div v-else-if="currentTab === 'abilities'">
      <h2 class="text-base font-bold text-gray-900 mb-3">Ability Scores</h2>

      <!-- Class Primary Stats Recommendation -->
      <div v-if="allClassRecommendations.length" class="mb-3 text-xs text-gray-600 space-y-1">
        <div v-for="cr in allClassRecommendations" :key="cr.name">
          Recommended for <span class="capitalize">{{ cr.name.toLowerCase() }}</span>:
          <span class="font-medium text-gray-800">{{ cr.stats.join(', ') }}</span>
        </div>
      </div>

      <!-- Generation Method Selector -->
      <div class="mb-4">
        <label class="block text-xs font-semibold text-gray-700 mb-1">Score Generation Method:</label>
        <div class="flex gap-1 bg-gray-100 p-1 rounded">
          <button
            type="button"
            @click="setScoreMethod('standard')"
            :class="scoreMethod === 'standard' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
            class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
          >
            Standard Array
          </button>
          <button
            type="button"
            @click="setScoreMethod('pointbuy')"
            :class="scoreMethod === 'pointbuy' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
            class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
          >
            Point Buy (27)
          </button>
          <button
            type="button"
            @click="setScoreMethod('manual')"
            :class="scoreMethod === 'manual' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
            class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
          >
            Manual / Roll
          </button>
        </div>
      </div>

      <!-- Method Sub-banner -->
      <div v-if="scoreMethod === 'standard'" class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        Standard array (15, 14, 13, 12, 10, 8). Values are automatically swapped when assigned.
      </div>

      <div v-else-if="scoreMethod === 'pointbuy'" data-error-field="pointbuy" class="mb-4 p-2.5 bg-gray-50 border rounded text-xs flex justify-between items-center" :class="errors.pointbuy ? 'border-red-400' : 'border-gray-200'">
        <span class="font-medium" :class="pointBuyRemaining < 0 ? 'text-red-600' : 'text-gray-700'">
          Points: {{ pointBuyRemaining }} / 27
        </span>
        <button
          type="button"
          @click="resetPointBuy"
          class="text-xs text-gray-500 underline hover:text-gray-800 cursor-pointer"
        >
          Reset to 8
        </button>
      </div>

      <div v-else-if="scoreMethod === 'manual'" class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs flex justify-between items-center">
        <span class="text-gray-600">Enter numbers directly or roll 4d6 (drop lowest).</span>
        <button
          type="button"
          @click="rollAllStats"
          class="px-2.5 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black transition cursor-pointer"
        >
          Roll All
        </button>
      </div>

      <p v-if="errors.pointbuy" class="mb-3 text-xs text-red-600 font-medium">
        {{ errors.pointbuy }}
      </p>

      <!-- ASI Bonus Section (Background in 2024; Race in 2014) -->
      <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
        <!-- 2024 ASI Section -->
        <div v-if="selectedEdition === '2024'" data-error-field="asi2024">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-gray-800">
              Background ASI: {{ characterBackground || 'None Selected' }}
            </span>
            <div class="flex gap-1">
              <button
                type="button"
                @click="asi2024Mode = 'plus2_plus1'"
                :class="asi2024Mode === 'plus2_plus1' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-xs cursor-pointer"
              >
                +2 / +1
              </button>
              <button
                type="button"
                @click="asi2024Mode = 'plus1_three'"
                :class="asi2024Mode === 'plus1_three' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-xs cursor-pointer"
              >
                +1 / +1 / +1
              </button>
            </div>
          </div>

          <div v-if="asi2024Mode === 'plus2_plus1'" class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label class="block text-gray-600 mb-1">+2 Ability:</label>
              <select v-model="asi2024Plus2" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option v-for="ab in bgEligibleAbilities" :key="ab" :value="ab">
                  {{ KEY_TO_LABEL[ab] }} (+2)
                </option>
              </select>
            </div>
            <div>
              <label class="block text-gray-600 mb-1">+1 Ability:</label>
              <select v-model="asi2024Plus1" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option v-for="ab in bgEligibleAbilities.filter(k => k !== asi2024Plus2)" :key="ab" :value="ab">
                  {{ KEY_TO_LABEL[ab] }} (+1)
                </option>
              </select>
            </div>
          </div>

          <div v-else class="text-gray-600 mt-1">
            +1 to: {{ bgEligibleAbilities.slice(0, 3).map(k => KEY_TO_LABEL[k]).join(', ') }}
          </div>

          <p v-if="errors.asi2024" class="mt-1 text-xs text-red-600 font-medium">
            {{ errors.asi2024 }}
          </p>
        </div>

        <!-- 2014 ASI Section -->
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-gray-800">
              Racial ASI: {{ characterRace.name || 'None' }}
              <span v-if="characterSubRace.name">({{ characterSubRace.name }})</span>
            </span>
            <div class="flex gap-1">
              <button
                type="button"
                @click="asi2014Mode = 'racial'"
                :class="asi2014Mode === 'racial' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-xs cursor-pointer"
              >
                Racial
              </button>
              <button
                type="button"
                @click="asi2014Mode = 'custom'"
                :class="asi2014Mode === 'custom' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-xs cursor-pointer"
              >
                Custom (+2/+1)
              </button>
            </div>
          </div>

          <div v-if="asi2014Mode === 'custom'" class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label class="block text-gray-600 mb-1">+2 Custom:</label>
              <select v-model="asi2014CustomPlus2" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+2)
                </option>
              </select>
            </div>
            <div>
              <label class="block text-gray-600 mb-1">+1 Custom:</label>
              <select v-model="asi2014CustomPlus1" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option v-for="k in ABILITY_KEYS.filter(a => a !== asi2014CustomPlus2)" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+1)
                </option>
              </select>
            </div>
          </div>

          <div v-else class="text-gray-600">
            <span>{{ Object.entries(asiBonuses).filter(([_, v]) => v > 0).map(([k, v]) => `${KEY_TO_LABEL[k]} +${v}`).join(', ') || 'No racial bonus detected' }}</span>

            <div v-if="raceChoiceConfig" class="grid grid-cols-2 gap-2 mt-2">
              <div v-for="idx in raceChoiceConfig.count" :key="idx">
                <select v-model="raceChooseStats[idx - 1]" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                  <option
                    v-for="opt in raceChoiceConfig.from"
                    :key="opt"
                    :value="opt"
                    :disabled="raceChooseStats.filter((val, i) => i !== idx - 1).includes(opt)"
                  >
                    {{ KEY_TO_LABEL[opt] }} (+1)
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 6 Ability Score Cards Grid -->
      <div
        data-error-field="abilities"
        class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 p-1 rounded"
        :class="errors.abilities ? 'border border-red-500 rounded p-2' : ''"
      >
        <div
          v-for="stat in ABILITY_KEYS"
          :key="stat"
          class="p-3 border border-gray-200 rounded bg-white flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold uppercase text-gray-800">{{ KEY_TO_SHORT[stat] }}</span>
              <span v-if="isPrimaryStat(stat)" class="text-[10px] text-gray-500 font-medium">Primary</span>
            </div>

            <div class="flex items-baseline justify-between mb-1">
              <span class="text-xl font-bold text-gray-900">{{ totalScores[stat] }}</span>
              <span class="text-xs font-semibold text-gray-600">{{ abilityModifiers[stat] }}</span>
            </div>

            <div class="text-[11px] text-gray-500 mb-2">
              Base {{ baseScores[stat] }} <span v-if="asiBonuses[stat]">(+{{ asiBonuses[stat] }})</span>
            </div>
          </div>

          <!-- Method Controls -->
          <div class="pt-2 border-t border-gray-100">
            <!-- Standard Array Selector -->
            <div v-if="scoreMethod === 'standard'">
              <select
                :value="baseScores[stat]"
                @change="onStandardArraySelect(stat, $event.target.value)"
                class="w-full p-1 text-xs border border-gray-300 rounded bg-white text-gray-800"
              >
                <option v-for="val in STANDARD_ARRAY" :key="val" :value="val">
                  {{ val }}
                </option>
              </select>
            </div>

            <!-- Point Buy Controls -->
            <div v-else-if="scoreMethod === 'pointbuy'" class="flex items-center justify-between gap-1">
              <button
                type="button"
                @click="decrementPointBuy(stat)"
                :disabled="!canDecrementPointBuy(stat)"
                class="w-7 h-7 border rounded text-xs font-bold disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <span class="text-xs font-medium">{{ baseScores[stat] }}</span>
              <button
                type="button"
                @click="incrementPointBuy(stat)"
                :disabled="!canIncrementPointBuy(stat)"
                class="w-7 h-7 border rounded text-xs font-bold disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>

            <!-- Manual / Roll Controls -->
            <div v-else-if="scoreMethod === 'manual'" class="flex gap-1">
              <input
                type="number"
                min="3"
                max="20"
                v-model.number="baseScores[stat]"
                class="p-1 border border-gray-300 rounded w-full text-xs text-center"
              />
              <button
                type="button"
                @click="rollSingleStat(stat)"
                class="px-2 border rounded text-xs text-gray-600 hover:text-black cursor-pointer"
                title="Roll 4d6 drop lowest"
              >
                Roll
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="errors.abilities" class="mt-1 mb-4 text-xs text-red-600 font-medium">
        {{ errors.abilities }}
      </p>

      <!-- Level 4, 6, 8, etc. ASI / Feat Improvement Choices -->
      <div v-if="allUnlockedAsiList.length > 0" data-error-field="asiTiers" class="mb-5 p-3.5 bg-gray-50 border rounded text-xs space-y-3" :class="errors.asiTiers ? 'border-red-400' : 'border-gray-200'">
        <div class="font-semibold text-gray-900 border-b border-gray-200 pb-1.5 flex justify-between items-center">
          <span>Level Improvements (ASI or Feat)</span>
          <span class="text-[10px] text-gray-500 font-normal">{{ allUnlockedAsiList.length }} improvement{{ allUnlockedAsiList.length > 1 ? 's' : '' }} eligible</span>
        </div>

        <div v-for="item in allUnlockedAsiList" :key="item.errorKey" :data-error-field="item.errorKey" class="p-2.5 bg-white border border-gray-200 rounded space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-gray-800">{{ item.className }} &mdash; Level {{ item.tier }}</span>
            <div class="flex gap-1 bg-gray-100 p-0.5 rounded">
              <button
                type="button"
                @click="item.choice.type = 'asi'"
                :class="item.choice.type === 'asi' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
              >
                Ability Increase
              </button>
              <button
                type="button"
                @click="item.choice.type = 'feat'"
                :class="item.choice.type === 'feat' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500'"
                class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
              >
                Feat
              </button>
            </div>
          </div>

          <!-- ASI Sub-options -->
          <div v-if="item.choice.type === 'asi'" class="space-y-2 pt-1">
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="+2" v-model="item.choice.asiMode" class="text-gray-900 focus:ring-0" />
                <span>+2 to one ability</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="+1_+1" v-model="item.choice.asiMode" class="text-gray-900 focus:ring-0" />
                <span>+1 to two abilities</span>
              </label>
            </div>

            <div v-if="item.choice.asiMode === '+2'">
              <select v-model="item.choice.plus2Stat" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option value="">Select Ability (+2)...</option>
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+2)
                </option>
              </select>
            </div>

            <div v-else class="grid grid-cols-2 gap-2">
              <select v-model="item.choice.plus1StatA" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option value="">Select Ability A (+1)...</option>
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+1)
                </option>
              </select>
              <select v-model="item.choice.plus1StatB" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option value="">Select Ability B (+1)...</option>
                <option v-for="k in ABILITY_KEYS.filter(a => a !== item.choice.plus1StatA)" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+1)
                </option>
              </select>
            </div>
          </div>

          <!-- Feat Sub-options -->
          <div v-else-if="item.choice.type === 'feat'" class="space-y-2 pt-1">
            <div>
              <label class="block text-gray-600 text-[11px] mb-1">Choose Feat:</label>
              <select v-model="item.choice.featName" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option value="">Select a feat...</option>
                <option v-for="f in filteredFeats" :key="f.name + '|' + (f.source || '')" :value="f.name">
                  {{ f.name }} ({{ f.source || 'PHB' }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-gray-600 text-[11px] mb-1">Feat Ability Increase (+1 if applicable):</label>
              <select v-model="item.choice.featAbility" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option value="">None (+0)</option>
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  +1 {{ KEY_TO_LABEL[k] }}
                </option>
              </select>
            </div>
          </div>

          <!-- Unselected prompt -->
          <div v-else class="text-[11px] text-gray-500 italic pt-1">
            Choose Ability Increase or Feat above.
          </div>

          <p v-if="errors[item.errorKey]" class="mt-1 text-xs text-red-600 font-medium">
            {{ errors[item.errorKey] }}
          </p>
        </div>

        <p v-if="errors.asiTiers" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.asiTiers }}
        </p>
      </div>

      <!-- Alignment (Abilities step for both editions) -->
      <div class="mb-4 pt-3 border-t border-gray-200" data-error-field="alignment">
        <label for="alignment" class="block text-xs font-semibold text-gray-700 mb-1">Character Alignment:</label>
        <select
          id="alignment"
          v-model="alignment"
          :class="errors.alignment ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
          class="p-2 border rounded w-full bg-white text-xs"
        >
          <option value="">Choose alignment</option>
          <option v-for="al in alignments" :key="al" :value="al">{{ al }}</option>
        </select>
        <p v-if="errors.alignment" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.alignment }}
        </p>
      </div>
    </div>

    <!-- TAB 5: Equipment & Wealth -->
    <div v-else-if="currentTab === 'equipment'">
      <h2 class="text-base font-bold text-gray-900 mb-3">Equipment & Starting Wealth</h2>

      <!-- Selected Background Info Banner -->
      <div v-if="selectedBackgroundObj" class="mb-4 p-3.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-900 text-sm">Background: {{ selectedBackgroundObj.name }}</span>
            <span class="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-200 text-gray-700">
              {{ selectedEdition === '2024' ? '2024 Rules' : '2014 Rules' }}
            </span>
          </div>
          <span class="text-[11px] text-gray-500 font-mono">
            {{ (parseBackgroundDetails(selectedBackgroundObj)?.bgStartingItems || []).length }} background items
          </span>
        </div>

        <div v-if="parseBackgroundDetails(selectedBackgroundObj).equipmentText" class="text-gray-700 leading-relaxed pt-1.5 border-t border-gray-200">
          <span class="font-semibold text-gray-800">Background Equipment: </span>
          <span v-html="renderAnnotatedText(parseBackgroundDetails(selectedBackgroundObj).equipmentText)"></span>
        </div>
      </div>
      <div v-else class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
        No background selected yet. Starting equipment will default to class starter kit. You can select a background in the Background tab.
      </div>



      <!-- Mode Selector -->
      <div class="mb-4">
        <label class="block text-xs font-semibold text-gray-700 mb-1.5">Starting Equipment Option:</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label
            :class="[
              equipmentChoiceMode === 'package' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
              'p-3 border rounded cursor-pointer transition text-xs block'
            ]"
          >
            <input
              type="radio"
              value="package"
              v-model="equipmentChoiceMode"
              class="hidden"
            />
            <div class="font-bold text-gray-900 mb-0.5">Starter Equipment Package</div>
            <p class="text-[11px] text-gray-600 leading-relaxed">
              {{ selectedEdition === '2024'
                ? `Standard starter gear from ${characterClass?.class?.name || 'Class'} & ${selectedBackgroundObj?.name || 'Background'}, plus ${computedTreasures.gp} GP pouch currency.`
                : `Class starting gear + ${selectedBackgroundObj?.name || 'Background'} equipment kit, plus ${computedTreasures.gp} GP starting pouch.`
              }}
            </p>
          </label>

          <label
            :class="[
              equipmentChoiceMode === 'gold' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
              'p-3 border rounded cursor-pointer transition text-xs block'
            ]"
          >
            <input
              type="radio"
              value="gold"
              v-model="equipmentChoiceMode"
              class="hidden"
            />
            <div class="font-bold text-gray-900 mb-0.5">Starting Gold Only ({{ defaultStartingGold }} GP)</div>
            <p class="text-[11px] text-gray-600 leading-relaxed">
              {{ selectedEdition === '2024'
                ? 'Official 2024 rule: forego background equipment package and start with 50 GP to purchase items freely.'
                : `Classic rule: forego class and background gear. Receive ${defaultStartingGold} GP (class starting wealth) to purchase items freely.`
              }}
            </p>
          </label>
        </div>
      </div>

      <!-- Package View Details -->
      <div v-if="equipmentChoiceMode === 'package'" class="space-y-3 mb-4">
        <!-- Starting Wealth Pouch -->
        <div class="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-gray-800">Starting Currency (Pouch):</span>
            <span class="font-bold text-amber-700 font-mono text-sm">{{ computedTreasures.gp }} GP</span>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-600">
            <span>Background ({{ selectedBackgroundObj?.name || 'Background' }}): <strong class="text-gray-800 font-mono">{{ backgroundStartingGold }} GP</strong></span>
            <span>+</span>
            <span>Class ({{ characterClass?.class?.name || 'Class' }}): <strong class="text-gray-800 font-mono">{{ classStartingGold }} GP</strong></span>
            <span>=</span>
            <span>Total: <strong class="text-amber-700 font-mono">{{ computedTreasures.gp }} GP</strong></span>
          </div>
        </div>

        <!-- Class Starting Equipment Alternative Choices -->
        <div v-if="classEquipmentChoices.length > 0" class="p-3 bg-white border border-gray-200 rounded text-xs space-y-2.5">
          <div class="font-semibold text-gray-800 border-b border-gray-100 pb-1 flex items-center justify-between">
            <span>Primary Class Starting Equipment ({{ characterClass?.class?.name || 'Class 1' }})</span>
            <span class="text-[10px] text-gray-500 font-normal">Select starter gear options</span>
          </div>
          <div v-for="ch in classEquipmentChoices" :key="ch.id" class="space-y-1.5">
            <div class="text-[11px] text-gray-600 font-medium">{{ ch.label }}:</div>
            <div :class="['grid gap-2', ch.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2']">
              <label
                v-for="opt in ch.options"
                :key="opt.key"
                :class="[
                  chosenClassEquipmentChoices[ch.id] === opt.key ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                  'p-2.5 border rounded cursor-pointer transition text-xs block'
                ]"
              >
                <input
                  type="radio"
                  :name="ch.id"
                  :value="opt.key"
                  v-model="chosenClassEquipmentChoices[ch.id]"
                  @change="syncDefaultEquipment(true)"
                  class="hidden"
                />
                <span class="font-medium text-gray-900 block leading-snug">{{ opt.description }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Fixed Class Items Chips -->
        <div v-if="fixedClassItems.length > 0" class="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
          <div class="font-semibold text-gray-700 mb-1">
            Standard gear included with {{ characterClass?.class?.name }}:
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(fItem, fIdx) in fixedClassItems"
              :key="fIdx"
              class="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded text-[11px]"
            >
              {{ fItem.amount > 1 ? `${fItem.amount}x ` : '' }}{{ fItem.name }}
            </span>
          </div>
        </div>

        <!-- Background Starting Equipment Alternative Choices -->
        <div v-if="bgEquipmentChoices.length > 0" class="p-3 bg-white border border-gray-200 rounded text-xs space-y-2.5">
          <div class="font-semibold text-gray-800 border-b border-gray-100 pb-1 flex items-center justify-between">
            <span>Background Equipment Choices</span>
            <span class="text-[10px] text-gray-500 font-normal">Select starter gear</span>
          </div>
          <div v-for="ch in bgEquipmentChoices" :key="ch.id" class="space-y-1.5">
            <div class="text-[11px] text-gray-600 font-medium">{{ ch.label }}:</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                :class="[
                  chosenBgEquipmentChoices[ch.id] === 'a' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                  'p-2.5 border rounded cursor-pointer transition text-xs block'
                ]"
              >
                <input
                  type="radio"
                  :name="ch.id"
                  value="a"
                  v-model="chosenBgEquipmentChoices[ch.id]"
                  @change="syncDefaultEquipment(true)"
                  class="hidden"
                />
                <span class="font-medium text-gray-900 block leading-snug">{{ ch.optionA.label }}</span>
              </label>

              <label
                :class="[
                  chosenBgEquipmentChoices[ch.id] === 'b' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                  'p-2.5 border rounded cursor-pointer transition text-xs block'
                ]"
              >
                <input
                  type="radio"
                  :name="ch.id"
                  value="b"
                  v-model="chosenBgEquipmentChoices[ch.id]"
                  @change="syncDefaultEquipment(true)"
                  class="hidden"
                />
                <span class="font-medium text-gray-900 block leading-snug">{{ ch.optionB.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Background Items Chips -->
        <div
          v-if="selectedBackgroundObj && (parseBackgroundDetails(selectedBackgroundObj)?.bgStartingItems || []).length > 0"
          class="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs"
        >
          <div class="font-semibold text-gray-900 mb-1">
            Items from {{ selectedBackgroundObj.name }}:
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(itName, itIdx) in parseBackgroundDetails(selectedBackgroundObj).bgStartingItems"
              :key="itIdx"
              class="px-2 py-0.5 bg-white border border-gray-200 text-gray-800 rounded text-[11px]"
            >
              {{ itName }}
            </span>
          </div>
        </div>
      </div>

      <!-- Gold View Details -->
      <div v-else data-error-field="equipmentGold" class="space-y-3 p-3.5 bg-gray-50 border rounded text-xs mb-4" :class="errors.equipmentGold ? 'border-red-400' : 'border-gray-200'">
        <div>
          <label class="block font-semibold text-gray-800 mb-1">Starting Gold Pieces (GP):</label>
          <div class="flex items-center gap-2">
            <input
              id="customStartingGold"
              type="number"
              min="0"
              v-model.number="customStartingGold"
              :class="errors.equipmentGold ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
              class="p-2 border rounded w-32 bg-white text-xs font-mono font-bold"
            />
            <span class="text-xs font-bold text-gray-700">GP</span>
            <button
              type="button"
              @click="resetStartingGold"
              class="px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 cursor-pointer text-xs"
            >
              Reset to Default ({{ defaultStartingGold }} GP)
            </button>
          </div>
          <p v-if="errors.equipmentGold" class="mt-1 text-xs text-red-600 font-medium">
            {{ errors.equipmentGold }}
          </p>
          <p class="text-[11px] text-gray-500 mt-2 leading-relaxed">
            Standard rule: {{ selectedEdition === '2024' ? '2024 rules grant a flat 50 GP starting wealth option.' : `Classic 2014 rule gives an average of ${defaultStartingGold} GP for ${characterClass?.class?.name || 'your class'}.` }}
            Use "+ Add from Compendium" below to select equipment for your inventory.
          </p>
        </div>
      </div>

      <!-- Weight / Encumbrance Bar Widget -->
      <div class="p-3 bg-gray-50 border border-gray-200 space-y-2 mb-4">
        <div class="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>Weight / Carrying Capacity</span>
          <span class="text-[11px] font-normal text-gray-500">{{ Math.round((computedTotalWeight / (computedCarryCapacity || 1)) * 100) }}%</span>
        </div>

        <div class="relative w-full bg-gray-200 h-6 overflow-hidden border border-gray-300">
          <div
            class="h-full transition-all duration-300"
            :class="formWeightBarColor"
            :style="{ width: `${formWeightPercent}%` }"
          ></div>
          <div
            class="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none tracking-tight"
            :class="formWeightPercent > 55 ? 'text-white drop-shadow-xs' : 'text-gray-900'"
          >
            {{ computedTotalWeight.toFixed(1) }} / {{ computedCarryCapacity }} lbs
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px]">
          <span class="text-gray-500">
            Status: <span class="font-bold" :class="formWeightStatusTextColor">{{ formWeightStatusLabel }}</span>
          </span>
          <span class="text-gray-500">
            Max: <strong class="text-gray-800">{{ computedCarryCapacity }} lbs</strong>
          </span>
        </div>
      </div>

      <!-- Inventory Items Table (Shared for both Package and Gold) -->
      <div class="border border-gray-200 rounded overflow-hidden">
        <div class="bg-gray-50 px-3 py-2 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span class="text-xs font-semibold text-gray-800">Inventory Items ({{ userEquipmentList.length }})</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              @click="openWizardCompendium"
              class="bg-gray-900 hover:bg-black text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
            >
              + Add from Compendium
            </button>
            <button
              v-if="equipmentChoiceMode === 'package'"
              type="button"
              @click="syncDefaultEquipment(true)"
              class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] px-2 py-1 rounded transition cursor-pointer"
              title="Reset to default class and background starter package"
            >
              Reset Default
            </button>
            <button
              v-else
              type="button"
              @click="userEquipmentList = []"
              class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] px-2 py-1 rounded transition cursor-pointer"
              title="Clear all inventory items"
            >
              Clear All
            </button>
          </div>
        </div>

        <div v-if="userEquipmentList.length === 0" class="p-6 text-center text-gray-400 italic text-xs">
          No equipment in inventory. Click "+ Add from Compendium" to add items.
        </div>

        <div v-else class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          <div
            v-for="(item, idx) in userEquipmentList"
            :key="idx"
            class="px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs hover:bg-gray-50/70 gap-2"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
              <span class="font-medium text-gray-900 truncate">{{ item.name }}</span>
              <span v-if="item.is_armor" class="text-[10px] px-1 py-0.2 bg-gray-100 text-gray-800 border border-gray-200 rounded shrink-0">Armor</span>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <!-- Status Toggle -->
              <button
                type="button"
                @click="toggleWizardItemStatus(idx)"
                :class="item.status === 'equipped' ? 'bg-gray-900 text-white border-gray-900 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
                class="px-2 py-0.5 text-[10px] rounded border transition cursor-pointer capitalize"
                title="Toggle Equipped / Inventory"
              >
                {{ item.status === 'equipped' ? 'Equipped' : 'Inventory' }}
              </button>

              <!-- Amount +/- -->
              <div class="inline-flex items-center gap-1">
                <button
                  type="button"
                  @click="changeWizardItemAmount(idx, -1)"
                  class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                >-</button>
                <span class="w-5 text-center text-[11px] font-semibold">{{ item.amount || 1 }}</span>
                <button
                  type="button"
                  @click="changeWizardItemAmount(idx, 1)"
                  class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                >+</button>
              </div>

              <!-- Weight -->
              <span class="text-[11px] text-gray-500 font-mono w-14 text-right">
                {{ item.weight || '0' }} lb
              </span>

              <!-- Delete -->
              <button
                type="button"
                @click="removeWizardItem(idx)"
                class="text-gray-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
                title="Remove Item"
              >
                <IconX class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wizard Compendium Item Picker Modal -->
    <div
      v-if="isWizardCompendiumOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 text-xs space-y-3 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Add Item from Compendium</h3>
          <button
            type="button"
            @click="isWizardCompendiumOpen = false"
            class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
          >
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="wizardCompendiumSearch"
            @keyup.enter="searchWizardCompendium(false)"
            placeholder="Search weapon, armor, pack, gear..."
            class="w-full sm:flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
          <div class="flex gap-2 w-full sm:w-auto">
            <select
              v-model="wizardCompendiumCategory"
              @change="searchWizardCompendium(false)"
              class="flex-1 min-w-[120px] p-2 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="all">All Types</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor & Shield</option>
            </select>
            <button
              type="button"
              @click="searchWizardCompendium(false)"
              class="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded text-xs font-medium cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </div>

        <div
          @scroll="onWizardCompendiumScroll"
          class="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[220px]"
        >
          <div v-if="wizardCompendiumLoading" class="py-10 text-center text-gray-400">
            Searching items...
          </div>
          <div v-else-if="wizardCompendiumResults.length === 0" class="py-10 text-center text-gray-400 italic">
            No items found. Try another search query.
          </div>
          <template v-else>
            <div
              v-for="it in wizardCompendiumResults"
              :key="it.id || it.name"
              class="py-2 px-1 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ it.name }}</div>
                <div class="text-[10px] text-gray-500">
                  <span class="capitalize">{{ it.type || 'Item' }}</span>
                  <span v-if="it.weight"> &bull; {{ it.weight }} lb</span>
                  <span v-if="it.ac"> &bull; AC {{ it.ac }}</span>
                  <span v-if="it.dmg1"> &bull; {{ it.dmg1 }} {{ it.dmgType }}</span>
                </div>
              </div>
              <button
                type="button"
                @click="addWizardItemFromCompendium(it)"
                class="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-400 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
              >
                Add
              </button>
            </div>

            <div v-if="wizardCompendiumHasMore" class="p-2 text-center border-t border-gray-100">
              <button
                type="button"
                :disabled="wizardCompendiumLoadingMore"
                @click="searchWizardCompendium(true)"
                class="text-xs text-gray-800 hover:text-black font-medium py-1 px-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
              >
                {{ wizardCompendiumLoadingMore ? 'Loading more...' : 'Load more items' }}
              </button>
            </div>
          </template>
        </div>

        <div class="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            @click="isWizardCompendiumOpen = false"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sticky Bottom Navigation -->
  <div class="sticky-buttons">
    <div class="button-container">
      <div v-if="!isFirstStep">
        <button
          type="button"
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded cursor-pointer transition text-xs font-medium"
          @click="prevStep"
        >
          Previous
        </button>
      </div>
      <div v-else>
        <button
          type="button"
          class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 p-2 rounded cursor-pointer transition text-xs font-medium flex items-center justify-center"
          @click="emit('back')"
          title="Back to Character List"
          aria-label="Back to Character List"
        >
          <IconArrowLeft class="w-4 h-4" />
        </button>
      </div>
    </div>
    <div class="button-container">
      <div v-if="!isLastStep">
        <button
          type="button"
          class="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded cursor-pointer transition text-xs font-medium"
          @click="nextStep"
        >
          Next
        </button>
      </div>
      <div v-else>
        <button
          type="button"
          :disabled="isSubmitting"
          class="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded cursor-pointer disabled:opacity-50 transition text-xs font-semibold shadow-xs"
          @click="submitForm"
        >
          {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Submit & View Sheet') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.sticky-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #ffffff;
  padding: 10px 16px;
  box-shadow: 0px -2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  z-index: 40;
  border-top: 1px solid #e5e7eb;
}

.button-container {
  display: flex;
  align-items: center;
}

@keyframes errorPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
    transform: scale(1.01);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    transform: scale(1);
  }
}

.error-pulse-highlight {
  animation: errorPulse 0.75s ease-in-out 2;
  border-color: #ef4444 !important;
  outline: 2px solid #ef4444 !important;
  outline-offset: 2px;
}
</style>
