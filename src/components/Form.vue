<script setup>
import { useFormSkills } from '../composables/form/useFormSkills'
import { useFormHydration } from '../composables/form/useFormHydration'
import { useFormValidation } from '../composables/form/useFormValidation'
import { useFormSubmit } from '../composables/form/useFormSubmit'
import axios from 'axios'
import RaceSubRaceDetail from './RaceSubRaceDetail.vue'
import ClassSubClassDetail from './ClassSubClassDetail.vue'
import ClassSpellsPicker from './ClassSpellsPicker.vue'
import FeatSpellsPicker from './FeatSpellsPicker.vue'
import FormTraitTableModal from './form/FormTraitTableModal.vue'
import FormItemCompendiumModal from './CompendiumItemPickerModal.vue'
import FormCharacteristicsStep from './form/steps/FormCharacteristicsStep.vue'
import FormBackgroundStep from './form/steps/FormBackgroundStep.vue'
import FormRaceStep from './form/steps/FormRaceStep.vue'
import FormClassStep from './form/steps/FormClassStep.vue'
import FormAbilitiesStep from './form/steps/FormAbilitiesStep.vue'
import FormEquipmentStep from './form/steps/FormEquipmentStep.vue'
import FormHeader from './form/FormHeader.vue'
import FormStepNavigation from './form/FormStepNavigation.vue'
import FormStickyFooter from './form/FormStickyFooter.vue'
import { useFormEquipment } from '../composables/form/useFormEquipment'
import { useFormMulticlass, getUnlockedAsiTiersForClass } from '../composables/form/useFormMulticlass'
import { computed, nextTick, onBeforeUpdate, onMounted, onUpdated, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCharacterStore } from '../stores/character'
import { useConfig } from '../config'
import { renderAnnotatedText, clean5eToolsMarkup } from '../utils/textRenderer'
import {
  IconArrowLeft,
  IconLock,
  IconX,
  IconCamera,
  IconDice,
  IconPlus,
  IconTrash,
  IconCheck,
  IconPhoto
} from '@tabler/icons-vue'
import { compressImage } from '../utils/imageCompressor'
import { parseBackgroundDetails as parseBgDetails } from '../utils/backgroundParser'
import {
  extractBackgroundCharacteristicsTables,
  rollFromTable,
  LIFESTYLES,
  DND_SIZES
} from '../utils/characteristicsHelper'
import {
  formatPrerequisitesText,
  getMulticlassProficiencies,
  checkMulticlassPrerequisites
} from '../utils/multiclassRules'
import {
  SOURCE_OPTIONS_2024,
  SOURCE_OPTIONS_2014,
  CLASS_SOURCES,
  ABILITY_KEYS,
  SHORT_TO_KEY,
  KEY_TO_SHORT,
  KEY_TO_LABEL,
  ALL_SKILLS,
  STANDARD_LANGUAGES,
  CLASS_SKILL_FALLBACKS,
  CLASS_PRIMARY_ABILITIES,
  STANDARD_ARRAY,
  POINT_BUY_COST,
  SPELL_GRANTING_FEATS_CONFIG,
  STANDARD_MUSICAL_INSTRUMENTS,
  STANDARD_ARTISAN_TOOLS,
  STANDARD_GAMING_SETS,
  STANDARD_OTHER_TOOLS,
  ALL_TOOLS
} from '../constants/formConstants'
import {
  CLASS_STARTING_GOLD,
  CLASS_DEFAULT_EQUIPMENT,
  ITEM_WEIGHT_MAP,
  EQUIPMENT_PACK_CONTENTS
} from '../constants/equipmentConstants'

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
const currentTab = ref('class')
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

// Image Upload State
const imageUrl = ref('')
const isUploadingImage = ref(false)
const imageUploadError = ref('')
const avatarFileInputRef = ref(null)

const displayImageUrl = computed(() => {
  if (!imageUrl.value) return ''
  if (imageUrl.value.startsWith('http') || imageUrl.value.startsWith('data:')) {
    return imageUrl.value
  }
  return `${API_URL}${imageUrl.value}`
})

const handleAvatarSelected = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return
  imageUploadError.value = ''
  try {
    isUploadingImage.value = true
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Image size exceeds 2 MB limit')
    }
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('image', compressed.blob, compressed.name)
    const res = await axios.post(`${API_URL}/character/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data?.data?.url) {
      imageUrl.value = res.data.data.url
    }
  } catch (err) {
    console.error('Image upload failed:', err)
    imageUploadError.value = err.message || 'Failed to upload image'
  } finally {
    isUploadingImage.value = false
    if (event.target) event.target.value = ''
  }
}

// Characteristics State
const characteristics = reactive({
  gender: '',
  eyes: '',
  size: '',
  height: '',
  faith: '',
  hair: '',
  skin: '',
  age: '',
  weight: '',
  lifestyle: 'Modest',
  appearance: '',
  personalityTraits: [],
  ideals: [],
  bonds: [],
  flaws: [],
  notes: {
    organizations: '',
    allies: '',
    enemies: '',
    backstory: '',
    other: ''
  }
})

const bgCharacteristicTables = computed(() => {
  return extractBackgroundCharacteristicsTables(selectedBackgroundObj.value)
})

// Trait Table Selection & Rolling Modal State
const traitTableModal = reactive({
  isOpen: false,
  type: '', // 'personalityTraits' | 'ideals' | 'bonds' | 'flaws'
  title: '',
  options: []
})

const openTraitTableModal = (type) => {
  traitTableModal.type = type
  let title = ''
  let options = []
  if (type === 'personalityTraits') {
    title = 'Personality Traits'
    options = bgCharacteristicTables.value.personalityTraits
  } else if (type === 'ideals') {
    title = 'Ideals'
    options = bgCharacteristicTables.value.ideals
  } else if (type === 'bonds') {
    title = 'Bonds'
    options = bgCharacteristicTables.value.bonds
  } else if (type === 'flaws') {
    title = 'Flaws'
    options = bgCharacteristicTables.value.flaws
  }
  traitTableModal.title = title
  traitTableModal.options = options || []
  traitTableModal.isOpen = true
}

const closeTraitTableModal = () => {
  traitTableModal.isOpen = false
}

const selectTraitFromModal = (text) => {
  if (!text) return
  if (!Array.isArray(characteristics[traitTableModal.type])) {
    characteristics[traitTableModal.type] = []
  }
  characteristics[traitTableModal.type].push(text)
  closeTraitTableModal()
}

const rollTraitFromModal = () => {
  const rolled = rollFromTable(traitTableModal.options)
  if (rolled) {
    selectTraitFromModal(rolled)
  }
}

const rollPersonalityTrait = () => {
  const rolled = rollFromTable(bgCharacteristicTables.value.personalityTraits)
  if (rolled) characteristics.personalityTraits.push(rolled)
}

const rollIdeal = () => {
  const rolled = rollFromTable(bgCharacteristicTables.value.ideals)
  if (rolled) characteristics.ideals.push(rolled)
}

const rollBond = () => {
  const rolled = rollFromTable(bgCharacteristicTables.value.bonds)
  if (rolled) characteristics.bonds.push(rolled)
}

const rollFlaw = () => {
  const rolled = rollFromTable(bgCharacteristicTables.value.flaws)
  if (rolled) characteristics.flaws.push(rolled)
}

// Auto-fill size from race if empty
watch(() => characterRace.value, (newRace) => {
  if (newRace && !characteristics.size) {
    const s = Array.isArray(newRace.size) ? newRace.size[0] : (newRace.size || '')
    if (s === 'M' || s === 'Medium') characteristics.size = 'Medium'
    else if (s === 'S' || s === 'Small') characteristics.size = 'Small'
    else if (s) characteristics.size = s
  }
})

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

const setSourcesSelectAll = () => {
  if (!isFirstStep.value) return
  selectedSources.value = currentSourceOptions.value.map(s => s.code)
}

const setSourcesCoreOnly = () => {
  if (!isFirstStep.value) return
  if (selectedEdition.value === '2024') {
    selectedSources.value = ['XPHB', 'XDMG']
  } else {
    selectedSources.value = ['PHB', 'DMG', 'MM']
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

const selectedSubClassKey = ref('')
const selectedSubClassItem = ref(null)

// Multiclass State & Constraints
const {
  multiclasses,
  totalCharacterLevel,
  maxPrimaryClassLevel,
  getMaxLevelForMc,
  availableClassesForMulticlass,
  addMulticlass,
  removeMulticlass,
  onMcClassChange,
  onMcSubclassSelect,
  getSubclassUnlockLevel,
  getMcAvailableSubClasses,
  getMcProficiencies,
  getMcSkillConfig,
  getMcAvailableSkills,
  isSkillPriorGranted,
  toggleMcSkill,
  currentAbilityScoresMap,
  getMcPrereqStatus,
  isMcPrereqMet,
  isSpellcasterClass,
  isMcSpellcaster,
  allUnlockedAsiList
} = useFormMulticlass({
  classLevel,
  classSelected,
  filteredClasses,
  selectedEdition,
  selectedSources,
  API_URL,
  errors,
  recheckAbilitiesErrors: () => recheckAbilitiesErrors(),
  getPriorAndClassSkills: () => [...(priorGrantedSkills?.value || []), ...(chosenClassSkills?.value || [])],
  characterClass,
  selectedSubClassItem,
  characterStore,
  unlockedAsiTiers,
  asiTierChoices,
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma
})

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

const classSubTab = ref('features') // 'features' | 'spells' | 'featSpells'
const chosenSpells = ref([])
const featChosenSpells = ref([])

const getEstimatedClassCantrips = (className, subclassName, level) => {
  const c = (className || '').toLowerCase()
  const sc = (subclassName || '').toLowerCase()
  const lvl = Number(level) || 1
  if (sc.includes('arcane trickster')) return lvl >= 10 ? 4 : 3
  if (sc.includes('eldritch knight')) return lvl >= 10 ? 3 : 2
  if (c === 'sorcerer') return lvl >= 10 ? 6 : (lvl >= 4 ? 5 : 4)
  if (c === 'wizard' || c === 'cleric') return lvl >= 10 ? 5 : (lvl >= 4 ? 4 : 3)
  if (c === 'druid' || c === 'bard' || c === 'warlock') return lvl >= 10 ? 4 : (lvl >= 4 ? 3 : 2)
  if (c === 'artificer') return lvl >= 14 ? 4 : (lvl >= 10 ? 3 : 2)
  return 0
}

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
      selectedSubClassItem.value = {
        ...sc,
        subClassFeature: res.data.data.subClassFeature || []
      }
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
const savedTreasure = reactive({ pp: 0, gp: 50, ep: 0, sp: 0, cp: 0 })

const {
  equipmentChoiceMode,
  customStartingGold,
  chosenBgEquipmentChoices,
  chosenClassEquipmentChoices,
  unpackEquipmentItem,
  consolidateItems,
  lookupItemWeight,
  isLikelyArmor,
  isLikelyWeapon,
  resolveEquipmentType,
  parseClassEquipmentList,
  classEquipmentChoices,
  fixedClassItems,
  bgEquipmentChoices,
  defaultStartingGold,
  resetStartingGold,
  computedPackageEquipment,
  userEquipmentList,
  syncDefaultEquipment,
  toggleWizardItemStatus,
  changeWizardItemAmount,
  removeWizardItem,
  isWizardCompendiumOpen,
  openWizardCompendium,
  addWizardItemFromCompendium,
  computedTotalWeight,
  formStrScore,
  computedCarryCapacity,
  formEncumberedThreshold,
  formHeavilyEncumberedThreshold,
  formWeightPercent,
  formWeightStatus,
  formWeightStatusLabel,
  formWeightBarColor,
  formWeightStatusTextColor,
  backgroundStartingGold,
  classStartingGold,
  computedTreasures
} = useFormEquipment({
  characterClass,
  classSelected,
  selectedBackgroundObj,
  selectedEdition,
  isEditMode,
  strength,
  errors,
  chosenClassTools,
  chosenBgTools,
  parseBackgroundDetails: parseBgDetails,
  savedTreasure
})

// --- Skill Proficiencies & Expertise System ---
// Skills & Expertises Management
const {
  chosenBgSkills,
  bgSkillConfig,
  raceSkillProficiencies,
  bgSkillProficiencies,
  priorGrantedSkills,
  classSkillConfig,
  chosenClassSkills,
  availableClassSkills,
  toggleClassSkill,
  allProficientSkills,
  expertiseConfig,
  chosenExpertiseSkills,
  toggleExpertiseSkill,
  getSkillLabel
} = useFormSkills({
  selectedBackgroundObj,
  characterRace,
  characterClass,
  characterSubClass,
  characterStore,
  ALL_SKILLS,
  errors
})
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
        { id: 'class', label: 'Class' },
        { id: 'species', label: 'Species' },
        { id: 'background', label: 'Background' },
        { id: 'characteristics', label: 'Characteristics' },
        { id: 'abilities', label: 'Abilities' },
        { id: 'equipment', label: 'Equipment' }
      ]
    : [
        { id: 'class', label: 'Class' },
        { id: 'race', label: 'Race' },
        { id: 'background', label: 'Background' },
        { id: 'characteristics', label: 'Characteristics' },
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

function parseBackgroundDetails(bg) {
  return parseBgDetails(bg, {
    chosenBgEquipmentChoices: chosenBgEquipmentChoices.value,
    selectedEdition: selectedEdition.value,
    bgEquipmentChoices: bgEquipmentChoices.value
  })
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

// Character Edit Mode Hydration
const { loadCharacterForEdit } = useFormHydration({
  API_URL,
  selectedEdition,
  characterStore,
  currentTab,
  selectedSources,
  characterName,
  alignment,
  classLevel,
  characterBackground,
  imageUrl,
  characteristics,
  userEquipmentList,
  equipmentChoiceMode,
  savedTreasure,
  customStartingGold,
  fetchCompendiumData,
  availableFeats,
  backgrounds,
  selectedBackgroundObj,
  bgLangConfig,
  bgChosenLanguages,
  bgSkillConfig,
  chosenBgSkills,
  bgToolConfig,
  chosenBgTools,
  race,
  characterRace,
  subRace,
  characterSubRace,
  raceLangConfig,
  raceChosenLanguages,
  raceChoiceConfig,
  raceChooseStats,
  classSelected,
  characterClass,
  subClass,
  availableSubClasses,
  onSubClassSelect,
  priorGrantedSkills,
  classSkillConfig,
  chosenClassSkills,
  expertiseConfig,
  chosenExpertiseSkills,
  classToolConfig,
  chosenClassTools,
  detectedFeatSpellSources,
  isSpellcasterClass,
  getEstimatedClassCantrips,
  featChosenSpells,
  chosenSpells,
  selectedSubClassItem,
  multiclasses,
  onMcClassChange,
  onMcSubclassSelect,
  getMcSkillConfig,
  parseBackgroundDetails,
  allUnlockedAsiList,
  asiTierChoices,
  bgEligibleAbilities,
  asi2024Plus2,
  asi2024Plus1,
  scoreMethod,
  baseScores,
  asiBonuses,
  ABILITY_KEYS
})
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
  currentTab.value = 'class'
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

// Step Validation & Error Navigation
const {
  getDynamicErrorFieldOrder,
  scrollToFirstError,
  validateStep,
  canGoToStep,
  goToStep,
  nextStep,
  prevStep
} = useFormValidation({
  errors,
  activeSteps,
  currentTab,
  currentStepIndex,
  characterName,
  characterRace,
  characterSubRace,
  isSubraceRequired,
  selectedSources,
  selectedEdition,
  raceChosenLanguages,
  raceLangConfig,
  classSelected,
  selectedSubClassKey,
  classLevel,
  isSubclassUnlocked,
  characterStore,
  bgChosenLanguages,
  bgLangConfig,
  alignment,
  selectedBackgroundObj,
  chosenBgSkills,
  bgSkillConfig,
  chosenBgTools,
  bgToolConfig,
  customStartingGold,
  asi2024Plus2,
  asi2024Plus1,
  asi2024Mode,
  pointBuyRemaining,
  characterSubClass,
  multiclasses,
  allUnlockedAsiList,
  classSubTab,
  filteredClasses,
  characterClass,
  subRace,
  subClass,
  scoreMethod,
  baseScores,
  chosenClassSkills,
  classSkillConfig,
  chosenExpertiseSkills,
  expertiseConfig,
  allProficientSkills,
  chosenClassTools,
  classToolConfig,
  chosenSpells,
  featChosenSpells,
  equipmentChoiceMode,
  recheckAbilitiesErrors: () => recheckAbilitiesErrors()
})
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

// Character Submission Handler
const { isSubmitting, submitForm } = useFormSubmit({
  API_URL,
  props,
  emit,
  characterName,
  activeSteps,
  currentTab,
  validateStep,
  scrollToFirstError,
  errors,
  selectedBackgroundObj,
  parseBackgroundDetails,
  ALL_SKILLS,
  allProficientSkills,
  chosenExpertiseSkills,
  allUnlockedAsiList,
  characterClass,
  classSelected,
  classLevel,
  selectedSubClassItem,
  characterSubClass,
  characterStore,
  chosenSpells,
  multiclasses,
  featChosenSpells,
  selectedEdition,
  imageUrl,
  alignment,
  characteristics,
  characterBackground,
  totalCharacterLevel,
  computedProficiencyBonus,
  characterRace,
  characterSubRace,
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma,
  allLanguagesList,
  allProficienciesList,
  userEquipmentList,
  computedTreasures,
  isEditMode
})
</script>

<template>
  <div ref="scrollRef" class="max-w-2xl mx-2 sm:mx-auto mb-20 sm:mb-24 my-4 p-3.5 sm:p-6 bg-white rounded border border-gray-200 shadow-sm">
    <!-- Form Header (Ruleset, Sources, Avatar, Character Name) -->
    <FormHeader
      :is-first-step="isFirstStep"
      :selected-edition="selectedEdition"
      :current-source-options="currentSourceOptions"
      :selected-sources="selectedSources"
      :display-image-url="displayImageUrl"
      :image-url="imageUrl"
      :is-uploading-image="isUploadingImage"
      :image-upload-error="imageUploadError"
      v-model:character-name="characterName"
      :errors="errors"
      @back="emit('back')"
      @change-edition="changeEdition"
      @toggle-source="toggleSource"
      @set-sources-core-only="setSourcesCoreOnly"
      @set-sources-select-all="setSourcesSelectAll"
      @avatar-selected="handleAvatarSelected"
      @remove-image="imageUrl = ''"
    />

    <!-- Tab Navigation Stepper -->
    <FormStepNavigation
      :active-steps="activeSteps"
      :current-tab="currentTab"
      @go-to-step="goToStep"
    />

    <!-- TAB 1: Background (2024 first, 2014 third) -->
    <FormBackgroundStep
      v-if="currentTab === 'background'"
      :selected-edition="selectedEdition"
      v-model:character-background="selectedBackgroundObj"
      :filtered-backgrounds="filteredBackgrounds"
      :selected-background-obj="selectedBackgroundObj"
      :errors="errors"
      :bg-skill-config="bgSkillConfig"
      :chosen-bg-skills="chosenBgSkills"
      :bg-lang-config="bgLangConfig"
      :bg-chosen-languages="bgChosenLanguages"
      :standard-languages="STANDARD_LANGUAGES"
      :bg-tool-config="bgToolConfig"
      :chosen-bg-tools="chosenBgTools"
      :detected-feat-spell-sources="detectedFeatSpellSources"
      :feat-chosen-spells="featChosenSpells"
      :parse-background-details="parseBackgroundDetails"
      :get-skill-label="getSkillLabel"
      @background-change="onBackgroundChange"
      @go-to-feat-spells="currentTab = 'class'; classSubTab = 'featSpells'"
    />

    <!-- TAB: Characteristics & Details -->
    <FormCharacteristicsStep
      v-else-if="currentTab === 'characteristics'"
      :characteristics="characteristics"
      v-model:alignment="alignment"
      :alignments="alignments"
      @open-trait-modal="openTraitTableModal"
    />

    <!-- TAB 2: Race / Species -->
    <FormRaceStep
      v-else-if="currentTab === 'race' || currentTab === 'species'"
      :selected-edition="selectedEdition"
      v-model:character-race="characterRace"
      v-model:character-sub-race="characterSubRace"
      :filtered-races="filteredRaces"
      :filtered-sub-races="filteredSubRaces"
      :is-subrace-required="isSubraceRequired"
      v-model:race-choose-stats="raceChooseStats"
      :race-lang-config="raceLangConfig"
      :race-chosen-languages="raceChosenLanguages"
      :standard-languages="STANDARD_LANGUAGES"
      :errors="errors"
      @search-sub-race="searchSubRace"
    />

    <!-- TAB 3: Class & Subclass -->
    <FormClassStep
      v-else-if="currentTab === 'class'"
      :total-character-level="totalCharacterLevel"
      :available-classes-for-multiclass="availableClassesForMulticlass"
      v-model:class-selected="classSelected"
      :filtered-classes="filteredClasses"
      v-model:class-level="classLevel"
      :max-primary-class-level="maxPrimaryClassLevel"
      :is-spellcaster-class="isSpellcasterClass"
      :detected-feat-spell-sources="detectedFeatSpellSources"
      v-model:class-sub-tab="classSubTab"
      v-model:chosen-spells="chosenSpells"
      v-model:feat-chosen-spells="featChosenSpells"
      :character-class="characterClass"
      :available-sub-classes="availableSubClasses"
      :selected-sub-class-key="selectedSubClassKey"
      :subclass-unlock-level="subclassUnlockLevel"
      :sub-class-features="characterSubClass?.subClassFeature || characterStore.characterSubClass?.subClassFeature || []"
      :class-skill-config="classSkillConfig"
      :available-class-skills="availableClassSkills"
      :chosen-class-skills="chosenClassSkills"
      :prior-granted-skills="priorGrantedSkills"
      :get-skill-label="getSkillLabel"
      :expertise-config="expertiseConfig"
      :all-proficient-skills="allProficientSkills"
      :chosen-expertise-skills="chosenExpertiseSkills"
      :class-tool-config="classToolConfig"
      :chosen-class-tools="chosenClassTools"
      :asi-tier-choices="asiTierChoices"
      :unlocked-asi-tiers="unlockedAsiTiers"
      :filtered-feats="filteredFeats"
      :selected-edition="selectedEdition"
      :current-ability-scores-map="currentAbilityScoresMap"
      :selected-sub-class-item="selectedSubClassItem"
      :strength="strength"
      :dexterity="dexterity"
      :constitution="constitution"
      :intelligence="intelligence"
      :wisdom="wisdom"
      :charisma="charisma"
      :computed-proficiency-bonus="computedProficiencyBonus"
      :multiclasses="multiclasses"
      :errors="errors"
      :add-multiclass="addMulticlass"
      :search-class="searchClass"
      :on-sub-class-select="onSubClassSelect"
      :toggle-class-skill="toggleClassSkill"
      :toggle-expertise-skill="toggleExpertiseSkill"
      :on-update-class-tool="onUpdateClassTool"
      :remove-multiclass="removeMulticlass"
      :get-max-level-for-mc="getMaxLevelForMc"
      :on-mc-class-change="onMcClassChange"
      :get-mc-prereq-status="getMcPrereqStatus"
      :format-prerequisites-text="formatPrerequisitesText"
      :get-mc-proficiencies="getMcProficiencies"
      :is-mc-prereq-met="isMcPrereqMet"
      :get-mc-skill-config="getMcSkillConfig"
      :get-mc-available-skills="getMcAvailableSkills"
      :is-skill-prior-granted="isSkillPriorGranted"
      :toggle-mc-skill="toggleMcSkill"
      :is-mc-spellcaster="isMcSpellcaster"
      :get-mc-available-sub-classes="getMcAvailableSubClasses"
      :get-subclass-unlock-level="getSubclassUnlockLevel"
      :get-unlocked-asi-tiers-for-class="getUnlockedAsiTiersForClass"
      :on-mc-subclass-select="onMcSubclassSelect"
    />

    <!-- TAB 4: Abilities & Feats -->
    <FormAbilitiesStep
      v-else-if="currentTab === 'abilities'"
      :all-class-recommendations="allClassRecommendations"
      :score-method="scoreMethod"
      :point-buy-remaining="pointBuyRemaining"
      :errors="errors"
      :selected-edition="selectedEdition"
      :character-background="characterBackground"
      :bg-eligible-abilities="bgEligibleAbilities"
      v-model:asi2024-mode="asi2024Mode"
      v-model:asi2024-plus2="asi2024Plus2"
      v-model:asi2024-plus1="asi2024Plus1"
      :character-race="characterRace"
      :character-sub-race="characterSubRace"
      v-model:asi2014-mode="asi2014Mode"
      v-model:asi2014-custom-plus2="asi2014CustomPlus2"
      v-model:asi2014-custom-plus1="asi2014CustomPlus1"
      :asi-bonuses="asiBonuses"
      :race-choice-config="raceChoiceConfig"
      :race-choose-stats="raceChooseStats"
      :base-scores="baseScores"
      :total-scores="totalScores"
      :ability-modifiers="abilityModifiers"
      :all-unlocked-asi-list="allUnlockedAsiList"
      :filtered-feats="filteredFeats"
      :set-score-method="setScoreMethod"
      :reset-point-buy="resetPointBuy"
      :roll-all-stats="rollAllStats"
      :roll-single-stat="rollSingleStat"
      :on-standard-array-select="onStandardArraySelect"
      :can-decrement-point-buy="canDecrementPointBuy"
      :can-increment-point-buy="canIncrementPointBuy"
      :decrement-point-buy="decrementPointBuy"
      :increment-point-buy="incrementPointBuy"
      :is-primary-stat="isPrimaryStat"
    />

    <!-- TAB 5: Equipment & Wealth -->
    <FormEquipmentStep
      v-else-if="currentTab === 'equipment'"
      :selected-background-obj="selectedBackgroundObj"
      :selected-edition="selectedEdition"
      :character-class="characterClass"
      v-model:equipment-choice-mode="equipmentChoiceMode"
      :computed-treasures="computedTreasures"
      :default-starting-gold="defaultStartingGold"
      :background-starting-gold="backgroundStartingGold"
      :class-starting-gold="classStartingGold"
      :class-equipment-choices="classEquipmentChoices"
      :chosen-class-equipment-choices="chosenClassEquipmentChoices"
      :fixed-class-items="fixedClassItems"
      :bg-equipment-choices="bgEquipmentChoices"
      :chosen-bg-equipment-choices="chosenBgEquipmentChoices"
      v-model:custom-starting-gold="customStartingGold"
      :errors="errors"
      :computed-total-weight="computedTotalWeight"
      :computed-carry-capacity="computedCarryCapacity"
      :form-weight-percent="formWeightPercent"
      :form-weight-bar-color="formWeightBarColor"
      :form-weight-status-text-color="formWeightStatusTextColor"
      :form-weight-status-label="formWeightStatusLabel"
      :user-equipment-list="userEquipmentList"
      :parse-background-details="parseBackgroundDetails"
      :render-annotated-text="renderAnnotatedText"
      @sync-default-equipment="syncDefaultEquipment"
      @reset-starting-gold="resetStartingGold"
      @open-wizard-compendium="openWizardCompendium"
      @clear-user-equipment="userEquipmentList = []"
      @toggle-wizard-item-status="toggleWizardItemStatus"
      @change-wizard-item-amount="({ idx, delta }) => changeWizardItemAmount(idx, delta)"
      @remove-wizard-item="removeWizardItem"
    />

    <!-- Trait Table Selection & Roll Modal -->
    <FormTraitTableModal
      :is-open="traitTableModal.isOpen"
      :title="traitTableModal.title"
      :options="traitTableModal.options"
      :background-name="selectedBackgroundObj?.name || ''"
      @close="closeTraitTableModal"
      @select="selectTraitFromModal"
      @roll="rollTraitFromModal"
    />

    <!-- Wizard Compendium Item Picker Modal -->
    <FormItemCompendiumModal
      :is-open="isWizardCompendiumOpen"
      :edition="selectedEdition"
      :api-url="API_URL"
      @close="isWizardCompendiumOpen = false"
      @add-item="addWizardItemFromCompendium"
    />
  </div>

  <!-- Sticky Bottom Navigation -->
  <FormStickyFooter
    :is-first-step="isFirstStep"
    :is-last-step="isLastStep"
    :is-submitting="isSubmitting"
    :is-edit-mode="isEditMode"
    @prev="prevStep"
    @next="nextStep"
    @back="emit('back')"
    @submit="submitForm"
  />
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
  align-items: center;
  z-index: 10;
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
