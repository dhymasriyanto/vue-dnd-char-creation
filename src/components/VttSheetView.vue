<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { renderAnnotatedText, renderTableCell, clean5eToolsMarkup, format5eEntries } from '../utils/textRenderer'
import { useConfig } from '../config'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { IconArrowLeft, IconX, IconExternalLink, IconBook, IconUsers, IconEdit, IconBolt, IconHandStop, IconSword, IconStarFilled } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const { openCompendium } = useCompendiumNav()

const props = defineProps({
  character: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['back', 'create', 'edit'])

const openCompendiumWindow = () => {
  window.open(`${window.location.origin}${window.location.pathname}?compendium=1`, '_blank')
}

const vtt = computed(() => props.character?.vtt || {})
const char = computed(() => props.character || {})

const classSummary = computed(() => {
  const classes = Array.isArray(char.value.class) ? char.value.class : (char.value.class ? [char.value.class] : [])
  if (classes.length === 0) return 'Adventurer'
  const subClasses = Array.isArray(char.value.sub_class) ? char.value.sub_class : (char.value.sub_class ? [char.value.sub_class] : [])

  return classes.map((c, idx) => {
    const sc = subClasses[idx]?.name || ''
    const scStr = sc ? ` (${sc})` : ''
    const lvl = classes.length > 1 && c.level ? ` ${c.level}` : ''
    return `${c.name || 'Class'}${lvl}${scStr}`
  }).join(' / ')
})

// HP Tracker interactive state
const currentHp = ref(Number(char.value.hp || char.value.max_hp || 10))
const maxHp = ref(Number(char.value.max_hp || 10))
const tempHp = ref(Number(char.value.temp_hp || 0))
const hpInput = ref(1)

const applyDamage = () => {
  const amount = Number(hpInput.value) || 0
  if (amount <= 0) return
  if (tempHp.value > 0) {
    if (tempHp.value >= amount) {
      tempHp.value -= amount
      return
    } else {
      const remaining = amount - tempHp.value
      tempHp.value = 0
      currentHp.value = Math.max(0, currentHp.value - remaining)
      return
    }
  }
  currentHp.value = Math.max(0, currentHp.value - amount)
}

const applyHeal = () => {
  const amount = Number(hpInput.value) || 0
  if (amount <= 0) return
  currentHp.value = Math.min(maxHp.value, currentHp.value + amount)
}

// Interactive Wealth / Currency state
const treasure = computed(() => char.value.treasure || {})
const currency = ref({
  cp: Number(treasure.value.cp || 0),
  sp: Number(treasure.value.sp || 0),
  ep: Number(treasure.value.ep || 0),
  gp: Number(treasure.value.gp || 0),
  pp: Number(treasure.value.pp || 0)
})

watch(() => char.value.treasure, (newTr) => {
  if (newTr) {
    currency.value = {
      cp: Number(newTr.cp || 0),
      sp: Number(newTr.sp || 0),
      ep: Number(newTr.ep || 0),
      gp: Number(newTr.gp || 0),
      pp: Number(newTr.pp || 0)
    }
  }
}, { deep: true })

const isSavingCurrency = ref(false)
const currencySavedToast = ref(false)

const saveCurrency = async () => {
  if (!char.value?.id) return
  isSavingCurrency.value = true
  try {
    await axios.put(`${API_URL}/character/${char.value.id}`, {
      currency: currency.value
    })
    currencySavedToast.value = true
    setTimeout(() => { currencySavedToast.value = false }, 2000)
  } catch (err) {
    console.error('Failed to save currency', err)
  } finally {
    isSavingCurrency.value = false
  }
}

const adjustCurrency = (coin, delta) => {
  currency.value[coin] = Math.max(0, (Number(currency.value[coin]) || 0) + delta)
  saveCurrency()
}

// Interactive Equipment & Inventory
const liveEquipment = ref([])

const initEquipment = () => {
  const eq = char.value.equipment || char.value.equipments || []
  liveEquipment.value = Array.isArray(eq) ? JSON.parse(JSON.stringify(eq)) : []
}

initEquipment()
watch(() => [char.value.equipment, char.value.equipments], () => {
  initEquipment()
}, { deep: true })

const dexMod = computed(() => {
  const dVal = char.value.ability_score?.dexterity
  if (dVal != null) return Math.floor((Number(dVal) - 10) / 2)
  return Number(vtt.value?.abilities?.dexterity?.modifier || 0)
})

const calculateLiveAc = (eqList) => {
  let baseArmorAc = null
  let hasShield = false
  const dMod = dexMod.value

  for (const eq of eqList) {
    if (eq.status !== 'equipped') continue
    const nameLower = (eq.name || '').toLowerCase()
    if (nameLower.includes('shield')) {
      hasShield = true
    } else if (eq.is_armor || eq.item_type === 'armor') {
      if (nameLower.includes('padded') || nameLower.includes('leather') || nameLower.includes('studded')) {
        const base = nameLower.includes('studded') ? 12 : 11
        baseArmorAc = base + dMod
      } else if (nameLower.includes('hide') || nameLower.includes('chain shirt') || nameLower.includes('scale mail') || nameLower.includes('breastplate') || nameLower.includes('half plate')) {
        let base = 14
        if (nameLower.includes('hide')) base = 12
        else if (nameLower.includes('chain shirt')) base = 13
        else if (nameLower.includes('scale mail') || nameLower.includes('breastplate')) base = 14
        else if (nameLower.includes('half plate')) base = 15
        baseArmorAc = base + Math.min(2, Math.max(0, dMod))
      } else if (nameLower.includes('ring mail') || nameLower.includes('chain mail') || nameLower.includes('splint') || nameLower.includes('plate')) {
        let base = 16
        if (nameLower.includes('ring mail')) base = 14
        else if (nameLower.includes('chain mail')) base = 16
        else if (nameLower.includes('splint')) base = 17
        else if (nameLower.includes('plate')) base = 18
        baseArmorAc = base
      } else if (eq.ac || eq.base_ac) {
        const base = Number(eq.ac || eq.base_ac)
        baseArmorAc = base > 0 ? (base + (eq.dexMod ? dMod : 0)) : (10 + dMod)
      }
    }
  }

  let finalAc = 10 + dMod
  if (baseArmorAc !== null) {
    finalAc = baseArmorAc
  }
  if (hasShield) {
    finalAc += 2
  }
  return finalAc
}

const currentArmorClass = computed(() => {
  return calculateLiveAc(liveEquipment.value)
})

const isSavingEquipment = ref(false)
const equipmentSavedToast = ref(false)

const saveEquipment = async () => {
  if (!char.value?.id) return
  isSavingEquipment.value = true
  try {
    await axios.put(`${API_URL}/character/${char.value.id}`, {
      equipments: liveEquipment.value,
      ac: currentArmorClass.value
    })
    equipmentSavedToast.value = true
    setTimeout(() => { equipmentSavedToast.value = false }, 2000)
  } catch (err) {
    console.error('Failed to save equipment', err)
  } finally {
    isSavingEquipment.value = false
  }
}

const toggleEquipStatus = (idx) => {
  const item = liveEquipment.value[idx]
  if (!item) return
  item.status = item.status === 'equipped' ? 'inventory' : 'equipped'
  saveEquipment()
}

const changeItemAmount = (idx, delta) => {
  const item = liveEquipment.value[idx]
  if (!item) return
  const cur = Number(item.amount) || 1
  const updated = Math.max(1, cur + delta)
  item.amount = updated
  saveEquipment()
}

const removeItem = (idx) => {
  liveEquipment.value.splice(idx, 1)
  saveEquipment()
}

// Compendium Item Picker Modal
const isCompendiumOpen = ref(false)
const compendiumSearch = ref('')
const compendiumCategory = ref('all')
const compendiumLoading = ref(false)
const compendiumLoadingMore = ref(false)
const compendiumResults = ref([])
const compendiumOffset = ref(0)
const compendiumHasMore = ref(false)
const SHEET_PAGE_LIMIT = 40

const searchCompendiumItems = async (isLoadMore = false) => {
  if (isLoadMore) {
    if (compendiumLoading.value || compendiumLoadingMore.value || !compendiumHasMore.value) return
    compendiumLoadingMore.value = true
  } else {
    compendiumLoading.value = true
    compendiumOffset.value = 0
    compendiumResults.value = []
  }

  try {
    const params = new URLSearchParams()
    params.set('edition', char.value.edition || '2024')
    if (compendiumSearch.value.trim()) params.set('search', compendiumSearch.value.trim())
    if (compendiumCategory.value !== 'all') params.set('type', compendiumCategory.value)
    params.set('limit', String(SHEET_PAGE_LIMIT))
    params.set('offset', String(compendiumOffset.value))

    const res = await axios.get(`${API_URL}/compendium/items?${params.toString()}`)
    const newItems = Array.isArray(res.data?.data) ? res.data.data : []
    compendiumHasMore.value = newItems.length === SHEET_PAGE_LIMIT

    if (isLoadMore) {
      compendiumResults.value.push(...newItems)
    } else {
      compendiumResults.value = newItems
    }
    compendiumOffset.value += newItems.length
  } catch (err) {
    console.error('Failed to search compendium items', err)
    if (!isLoadMore) {
      compendiumResults.value = []
      compendiumHasMore.value = false
    }
  } finally {
    compendiumLoading.value = false
    compendiumLoadingMore.value = false
  }
}

const onCompendiumScroll = (e) => {
  const el = e.target
  if (!el || compendiumLoading.value || compendiumLoadingMore.value || !compendiumHasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    searchCompendiumItems(true)
  }
}

const openCompendiumModal = () => {
  isCompendiumOpen.value = true
  if (compendiumResults.value.length === 0) {
    searchCompendiumItems()
  }
}

const addItemFromCompendium = (it) => {
  const isArmor = it.type === 'armor' || (it.name || '').toLowerCase().includes('armor') || (it.name || '').toLowerCase().includes('shield')
  liveEquipment.value.push({
    name: it.name,
    weight: String(it.weight || 0),
    amount: 1,
    status: 'inventory',
    is_armor: Boolean(isArmor),
    ac: it.ac || 0,
    dexMod: !!it.dexMod
  })
  saveEquipment()
}

const totalWeight = computed(() => {
  return liveEquipment.value.reduce((sum, item) => {
    const w = parseFloat(item.weight) || 0
    const amt = parseInt(item.amount) || 1
    return sum + (w * amt)
  }, 0)
})

const strScore = computed(() => {
  if (vtt.value?.abilities?.str?.score) return Number(vtt.value.abilities.str.score)
  return Number(char.value.ability_score?.strength || 10)
})
const carryCapacity = computed(() => strScore.value * 15)
const encumberedThreshold = computed(() => strScore.value * 5)
const heavilyEncumberedThreshold = computed(() => strScore.value * 10)

const weightPercent = computed(() => {
  const cap = carryCapacity.value || 1
  return Math.min(100, Math.max(0, (totalWeight.value / cap) * 100))
})

const weightStatus = computed(() => {
  const wt = totalWeight.value
  const max = carryCapacity.value
  const heavy = heavilyEncumberedThreshold.value
  const enc = encumberedThreshold.value

  if (wt > max) return 'over'
  if (wt > heavy) return 'heavy'
  if (wt > enc) return 'encumbered'
  return 'safe'
})

const weightStatusLabel = computed(() => {
  switch (weightStatus.value) {
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

const weightBarColor = computed(() => {
  switch (weightStatus.value) {
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

const weightStatusTextColor = computed(() => {
  switch (weightStatus.value) {
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

// Jack of All Trades, Remarkable Athlete, Skills & Initiative Computations
const SKILL_ABILITY_MAP = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
}

const hasJackOfAllTrades = computed(() => {
  const c = char.value
  if (!c) return false
  const cfs = c.class_feature || []
  if (Array.isArray(cfs) && cfs.some(f => (f?.name || '').toLowerCase().includes('jack of all trades'))) {
    return true
  }
  const classes = Array.isArray(c.classes)
    ? c.classes
    : (Array.isArray(c.class) ? c.class : (c.class ? [c.class] : []))

  for (const cl of classes) {
    const name = (typeof cl === 'string' ? cl : (cl?.name || cl?.class_name || '')).toLowerCase()
    const lvl = Number((typeof cl === 'object' && cl?.level) || c.level || 1)
    if (name.includes('bard') && lvl >= 2) return true
  }

  if (typeof c.class === 'string' && c.class.toLowerCase().includes('bard')) {
    const lvl = Number(c.level || 1)
    if (lvl >= 2) return true
  }
  return false
})

const hasRemarkableAthlete = computed(() => {
  const c = char.value
  if (!c) return false
  const scfs = c.sub_class_feature || []
  if (Array.isArray(scfs) && scfs.some(f => (f?.name || '').toLowerCase().includes('remarkable athlete'))) {
    return true
  }
  const subClasses = Array.isArray(c.sub_class)
    ? c.sub_class
    : (Array.isArray(c.sub_classes) ? c.sub_classes : (c.sub_class ? [c.sub_class] : []))
  for (const sc of subClasses) {
    const name = (typeof sc === 'string' ? sc : (sc?.name || sc?.subclass_name || '')).toLowerCase()
    const lvl = Number((typeof sc === 'object' && sc?.level) || c.level || 1)
    if (name.includes('champion') && lvl >= 7) return true
  }
  return false
})

const profBonus = computed(() => {
  if (vtt.value?.proficiency_bonus != null) return Number(vtt.value.proficiency_bonus)
  const lvl = Number(char.value?.level || 1)
  return Math.floor((lvl - 1) / 4) + 2
})

const joatBonus = computed(() => Math.floor(profBonus.value / 2))
const raBonus = computed(() => Math.ceil(profBonus.value / 2))

const computedSkills = computed(() => {
  const pb = profBonus.value
  const joat = hasJackOfAllTrades.value
  const hasRa = hasRemarkableAthlete.value
  const jBonus = joatBonus.value
  const rBonus = raBonus.value

  const sp = char.value?.skill_proficiency || {}
  const se = char.value?.skill_expertise || {}
  const vSkills = vtt.value?.skills || {}

  const result = {}
  for (const [skill, ability] of Object.entries(SKILL_ABILITY_MAP)) {
    const existing = vSkills[skill] || {}
    const isProf = Boolean(sp[skill] || existing.proficient)
    const isExp = Boolean(se[skill] || existing.expertise)
    let isJoat = false
    let isRa = false
    let bonus = 0

    if (isExp) {
      bonus = 2 * pb
    } else if (isProf) {
      bonus = pb
    } else if (joat) {
      bonus = jBonus
      isJoat = true
    } else if (hasRa && (ability === 'strength' || ability === 'dexterity' || ability === 'constitution')) {
      bonus = rBonus
      isRa = true
    }

    let mod = 0
    if (vtt.value?.abilities?.[ability]?.modifier != null) {
      mod = Number(vtt.value.abilities[ability].modifier)
    } else if (char.value?.ability_score?.[ability] != null) {
      mod = Math.floor((Number(char.value.ability_score[ability]) - 10) / 2)
    }

    const total = mod + bonus
    const passive = 10 + total

    result[skill] = {
      ability,
      proficient: isProf,
      expertise: isExp,
      jack_of_all_trades: isJoat || Boolean(existing.jack_of_all_trades),
      remarkable_athlete: isRa || Boolean(existing.remarkable_athlete),
      bonus,
      total,
      passive,
      modifier_string: total >= 0 ? `+${total}` : `${total}`,
      roll_formula: total >= 0 ? `1d20+${total}` : `1d20${total}`
    }
  }
  return result
})

const computedInitiative = computed(() => {
  const dMod = dexMod.value
  const bonus = hasJackOfAllTrades.value ? joatBonus.value : (hasRemarkableAthlete.value ? raBonus.value : 0)
  return dMod + bonus
})

// Dice Rolling Engine
const lastRoll = ref(null)
const rollHistory = ref([])
const isDiceTrayOpen = ref(false)
const diceMultiplier = ref(1)
const diceMod = ref(0)
const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100]
const customModifier = ref(0)
const diceRollMode = ref('normal') // 'normal' | 'adv' | 'dis'

let rollDismissTimer = null

const setRollResult = (result) => {
  lastRoll.value = result
  rollHistory.value.unshift(result)
  if (rollHistory.value.length > 20) rollHistory.value.pop()

  if (rollDismissTimer) clearTimeout(rollDismissTimer)
  rollDismissTimer = setTimeout(() => {
    lastRoll.value = null
  }, 12000)
}

const rollDice = (label, mod = 0, formula = null) => {
  const modNum = Number(mod) || 0
  const isAdv = diceRollMode.value === 'adv'
  const isDis = diceRollMode.value === 'dis'

  let d20 = Math.floor(Math.random() * 20) + 1
  let breakdown = ''
  let formulaStr = formula

  if (isAdv || isDis) {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    d20 = isAdv ? Math.max(r1, r2) : Math.min(r1, r2)
    const modeLabel = isAdv ? 'ADV' : 'DIS'
    breakdown = `[${r1}, ${r2}] -> ${d20} ${modNum >= 0 ? '+' : ''}${modNum}`
    if (!formulaStr) {
      formulaStr = `2d20${isAdv ? 'kh1' : 'kl1'} ${modNum >= 0 ? '+' : ''}${modNum} (${modeLabel})`
    }
  } else {
    breakdown = `d20 (${d20}) ${modNum >= 0 ? '+' : ''}${modNum}`
    if (!formulaStr) {
      formulaStr = modNum >= 0 ? `1d20+${modNum}` : `1d20${modNum}`
    }
  }

  const total = d20 + modNum
  const isNat20 = d20 === 20
  const isNat1 = d20 === 1

  const result = {
    label: (isAdv || isDis) ? `${label} (${isAdv ? 'Adv' : 'Dis'})` : label,
    d20,
    mod: modNum,
    total,
    isNat20,
    isNat1,
    formula: formulaStr,
    breakdown,
    timestamp: new Date().toLocaleTimeString()
  }

  setRollResult(result)
}

const rollAnyDie = (faces) => {
  const mod = Number(customModifier.value) || 0
  const count = 1

  if (faces === 20 && diceRollMode.value !== 'normal') {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    const chosen = diceRollMode.value === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2)
    const isNat20 = chosen === 20
    const isNat1 = chosen === 1
    const total = chosen + mod

    setRollResult({
      label: `d20 with ${diceRollMode.value === 'adv' ? 'Advantage' : 'Disadvantage'}`,
      d20: chosen,
      mod,
      total,
      isNat20,
      isNat1,
      formula: `2d20kh1 ${mod >= 0 ? '+' : ''}${mod}`,
      breakdown: `(${r1}, ${r2}) -> ${chosen} ${mod >= 0 ? '+' : ''}${mod}`,
      timestamp: new Date().toLocaleTimeString()
    })
    isDiceTrayOpen.value = false
    return
  }

  const roll = Math.floor(Math.random() * faces) + 1
  const total = roll + mod
  const isNat20 = faces === 20 && roll === 20
  const isNat1 = faces === 20 && roll === 1

  setRollResult({
    label: `d${faces} Roll`,
    d20: faces === 20 ? roll : null,
    mod,
    total,
    isNat20,
    isNat1,
    formula: `1d${faces} ${mod >= 0 ? '+' : ''}${mod}`,
    breakdown: `d${faces} (${roll}) ${mod >= 0 ? '+' : ''}${mod}`,
    timestamp: new Date().toLocaleTimeString()
  })
  isDiceTrayOpen.value = false
}

const activeTab = ref('actions') // 'actions' | 'spells' | 'skills' | 'features' | 'equipment' | 'background' | 'history'
const actionSubFilter = ref('all') // 'all' | 'attack' | 'action' | 'bonus' | 'reaction' | 'other'

const bgCompendiumData = ref(null)
const isFetchingBg = ref(false)

const fetchBackgroundDetails = async () => {
  const bgName = char.value.background
  if (!bgName || bgCompendiumData.value || isFetchingBg.value) return
  isFetchingBg.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/backgrounds`, {
      params: {
        edition: char.value.edition || '2024',
        search: bgName
      }
    })
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const match = list.find(b => (b.name || '').toLowerCase() === bgName.toLowerCase()) || list[0]
    if (match) {
      bgCompendiumData.value = match
    }
  } catch (err) {
    console.warn('Failed to fetch background compendium data:', err.message)
  } finally {
    isFetchingBg.value = false
  }
}

const formatOriginFeatName = () => {
  if (bgCompendiumData.value?.feats?.length) {
    const f = bgCompendiumData.value.feats[0]
    const raw = typeof f === 'string' ? f : Object.keys(f)[0]
    return raw.split('|')[0].split(';')[0].trim().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (char.value.feat?.length) {
    const f = char.value.feat[0]
    return typeof f === 'string' ? f : (f.name || '')
  }
  return ''
}

const formatBgAbilityScores = () => {
  if (bgCompendiumData.value?.ability?.length) {
    const from = bgCompendiumData.value.ability[0]?.choose?.weighted?.from
    if (Array.isArray(from) && from.length) {
      return from.map(a => a.toUpperCase()).join(' / ')
    }
  }
  return 'Any 3 or +2/+1'
}

const formatBgSkills = () => {
  const list = []
  if (bgCompendiumData.value?.skillProficiencies?.length) {
    for (const sp of bgCompendiumData.value.skillProficiencies) {
      if (typeof sp === 'object') {
        Object.keys(sp).forEach(k => {
          if (k !== 'choose') list.push(k.charAt(0).toUpperCase() + k.slice(1))
        })
      }
    }
  }
  if (!list.length && computedSkills.value) {
    Object.entries(computedSkills.value).forEach(([name, sk]) => {
      if (sk.proficient) list.push(name.charAt(0).toUpperCase() + name.slice(1))
    })
  }
  return Array.from(new Set(list))
}

const formatBgTools = () => {
  if (bgCompendiumData.value?.toolProficiencies?.length) {
    const parts = []
    for (const tp of bgCompendiumData.value.toolProficiencies) {
      if (tp.anyArtisansTool) parts.push("Artisan's Tools")
      else if (tp.anyMusicalInstrument) parts.push('Musical Instrument')
      else if (tp.anyGamingSet) parts.push('Gaming Set')
      else if (typeof tp === 'object') {
        Object.keys(tp).forEach(k => {
          if (k !== 'choose') parts.push(cleanProficiencyName(k))
        })
      }
    }
    if (parts.length) return parts.join(', ')
  }
  const toolProfs = vtt.value.proficiencies?.tools || []
  return toolProfs.map(cleanProficiencyName).join(', ') || 'None'
}

const formatBgLanguages = () => {
  if (bgCompendiumData.value?.languageProficiencies?.length) {
    const parts = []
    for (const lp of bgCompendiumData.value.languageProficiencies) {
      if (typeof lp === 'object') {
        Object.keys(lp).forEach(k => {
          if (k === 'anyStandard' || k === 'any' || k === 'other') parts.push('1 of choice')
          else parts.push(k.charAt(0).toUpperCase() + k.slice(1))
        })
      }
    }
    if (parts.length) return parts.join(', ')
  }
  const langs = vtt.value.proficiencies?.languages || []
  return langs.map(cleanProficiencyName).join(', ') || 'Common'
}

const formatBgEquipmentSummary = () => {
  if (bgCompendiumData.value?.startingEquipment?.length) {
    return 'Official background starting kit & gold package'
  }
  return 'Standard background items'
}

// D&D Beyond Style Attack Table calculation
const attackTableEntries = computed(() => {
  const entries = []

  // 1. Equipped weapons
  for (const w of equippedWeapons.value) {
    const isRanged = w.properties.some(p => p && p.toLowerCase().includes('ranged')) || (w.range && w.range.includes('/'))
    entries.push({
      id: 'wpn_' + w.name,
      type: 'weapon',
      name: w.name,
      subtitle: isRanged ? 'Ranged Weapon' : 'Melee Weapon',
      range: w.range || (isRanged ? 'Ranged' : '5 ft. Reach'),
      toHit: w.toHit,
      toHitLabel: (w.toHit >= 0 ? '+' : '') + w.toHit,
      isDc: false,
      dcText: '',
      damageDice: w.damageDice,
      damageMod: w.statMod,
      damageFormula: w.damageDice,
      damageType: w.damageType,
      damageLabel: `${w.damageDice}${w.statMod >= 0 ? '+' : ''}${w.statMod} ${w.damageType}`,
      notes: w.properties.join(', ') || '—'
    })
  }

  // 2. Unarmed Strike
  const us = unarmedStrikeDetails.value
  entries.push({
    id: 'unarmed_strike',
    type: 'unarmed',
    name: us.name,
    subtitle: 'Melee Attack',
    range: '5 ft. Reach',
    toHit: us.toHit,
    toHitLabel: (us.toHit >= 0 ? '+' : '') + us.toHit,
    isDc: false,
    dcText: '',
    damageDice: us.damageDice,
    damageMod: us.statMod,
    damageFormula: us.damageDice,
    damageType: us.damageType,
    damageLabel: `${us.damageDice}${us.statMod >= 0 ? '+' : ''}${us.statMod} bludgeoning`,
    notes: 'Free hand'
  })

  // 3. Attack Spells & Cantrips (hasAttack or diceFormula)
  for (const sp of charSpells.value) {
    const mechanics = extractSpellMechanics(sp, char.value.level, charCasterMod.value)
    if (mechanics.hasAttack || mechanics.diceFormula) {
      const isCantrip = Number(sp.level) === 0 || sp.is_cantrip
      const subtitle = `${isCantrip ? 'Cantrip' : 'Level ' + sp.level}${sp.school ? ' · ' + sp.school : ''}`
      const range = getSpellRange(sp)
      const notesList = []
      const comp = getSpellComponents(sp)
      if (comp) notesList.push(comp)
      if (sp.concentration) notesList.push('Conc')
      if (sp.ritual) notesList.push('Ritual')

      entries.push({
        id: 'sp_atk_' + (sp.id || sp.name),
        type: 'spell',
        name: sp.name,
        subtitle,
        range: range || 'Self',
        toHit: mechanics.hasAttack ? charSpellAttackBonus.value : null,
        toHitLabel: mechanics.hasAttack ? `${charSpellAttackBonus.value >= 0 ? '+' : ''}${charSpellAttackBonus.value}` : null,
        isDc: Boolean(mechanics.saveAbility),
        dcText: mechanics.saveAbility ? `DC ${charSpellSaveDc.value} ${mechanics.saveAbility.slice(0, 3).toUpperCase()}` : '',
        damageDice: mechanics.diceFormula || '',
        damageMod: mechanics.addModToDice ? charCasterMod.value : 0,
        damageFormula: mechanics.diceFormula || '',
        damageType: sp.damage_type || (mechanics.isHeal ? 'healing' : ''),
        damageLabel: mechanics.diceFormula
          ? (mechanics.addModToDice && charCasterMod.value
              ? `${mechanics.diceFormula}${charCasterMod.value >= 0 ? '+' : ''}${charCasterMod.value}`
              : mechanics.diceFormula)
          : (mechanics.isHeal ? 'Heal' : '—'),
        notes: notesList.join(' • ') || '—'
      })
    }
  }

  return entries
})

// Weapon calculations & Combat Actions
const WEAPON_DEFINITIONS = {
  dagger: { damage: '1d4', type: 'piercing', finesse: true, light: true, thrown: '20/60' },
  dart: { damage: '1d4', type: 'piercing', finesse: true, ranged: true, range: '20/60' },
  shortsword: { damage: '1d6', type: 'piercing', finesse: true, light: true },
  scimitar: { damage: '1d6', type: 'slashing', finesse: true, light: true },
  rapier: { damage: '1d8', type: 'piercing', finesse: true },
  whip: { damage: '1d4', type: 'slashing', finesse: true, reach: true },
  club: { damage: '1d4', type: 'bludgeoning', light: true },
  greatclub: { damage: '1d8', type: 'bludgeoning', twoHanded: true },
  mace: { damage: '1d6', type: 'bludgeoning' },
  quarterstaff: { damage: '1d6', versatile: '1d8', type: 'bludgeoning' },
  spear: { damage: '1d6', versatile: '1d8', type: 'piercing', thrown: '20/60' },
  javelin: { damage: '1d6', type: 'piercing', thrown: '30/120' },
  handaxe: { damage: '1d6', type: 'slashing', light: true, thrown: '20/60' },
  battleaxe: { damage: '1d8', versatile: '1d10', type: 'slashing' },
  flail: { damage: '1d8', type: 'bludgeoning' },
  glaive: { damage: '1d10', type: 'slashing', reach: true, heavy: true, twoHanded: true },
  greataxe: { damage: '1d12', type: 'slashing', heavy: true, twoHanded: true },
  greatsword: { damage: '2d6', type: 'slashing', heavy: true, twoHanded: true },
  halberd: { damage: '1d10', type: 'slashing', reach: true, heavy: true, twoHanded: true },
  lance: { damage: '1d12', type: 'piercing', reach: true },
  longsword: { damage: '1d8', versatile: '1d10', type: 'slashing' },
  maul: { damage: '2d6', type: 'bludgeoning', heavy: true, twoHanded: true },
  morningstar: { damage: '1d8', type: 'piercing' },
  pike: { damage: '1d10', type: 'piercing', reach: true, heavy: true, twoHanded: true },
  trident: { damage: '1d6', versatile: '1d8', type: 'piercing', thrown: '20/60' },
  war_pick: { damage: '1d8', type: 'piercing' },
  warhammer: { damage: '1d8', versatile: '1d10', type: 'bludgeoning' },
  light_crossbow: { damage: '1d8', type: 'piercing', ranged: true, range: '80/320', twoHanded: true },
  shortbow: { damage: '1d6', type: 'piercing', ranged: true, range: '80/320', twoHanded: true },
  sling: { damage: '1d4', type: 'bludgeoning', ranged: true, range: '30/120' },
  blowgun: { damage: '1', type: 'piercing', ranged: true, range: '25/100' },
  hand_crossbow: { damage: '1d6', type: 'piercing', ranged: true, range: '30/120', light: true },
  heavy_crossbow: { damage: '1d10', type: 'piercing', ranged: true, range: '100/400', heavy: true, twoHanded: true },
  longbow: { damage: '1d8', type: 'piercing', ranged: true, range: '150/600', heavy: true, twoHanded: true }
}

const getWeaponDetails = (item) => {
  if (!item) return null
  const key = (item.name || '').toLowerCase().replace(/['’]/g, '').replace(/[\s-]+/g, '_')
  const found = WEAPON_DEFINITIONS[key] || Object.entries(WEAPON_DEFINITIONS).find(([k]) => key.includes(k))?.[1]
  const isArmor = item.is_armor || (item.name || '').toLowerCase().includes('armor') || (item.name || '').toLowerCase().includes('shield')
  if (isArmor) return null

  const strMod = vtt.value.abilities?.str?.modifier || 0
  const dexMod = vtt.value.abilities?.dex?.modifier || 0
  const prof = vtt.value.proficiency_bonus || 2

  let statMod = strMod
  if (found?.ranged) {
    statMod = dexMod
  } else if (found?.finesse) {
    statMod = Math.max(strMod, dexMod)
  }

  const toHit = prof + statMod
  const damageDice = found?.damage || item.damageDice || item.dmg1 || '1d6'
  const damageType = found?.type || item.dmgType || 'slashing'

  return {
    name: item.name,
    toHit,
    damageDice,
    statMod,
    damageType,
    range: found?.range || found?.thrown || (found?.ranged ? 'Ranged' : '5 ft.'),
    properties: [
      found?.finesse ? 'Finesse' : null,
      found?.light ? 'Light' : null,
      found?.twoHanded ? 'Two-Handed' : null,
      found?.versatile ? `Versatile (${found.versatile})` : null,
      found?.reach ? 'Reach' : null,
      found?.thrown ? `Thrown (${found.thrown})` : null
    ].filter(Boolean)
  }
}

const equippedWeapons = computed(() => {
  return liveEquipment.value
    .filter(eq => eq.status === 'equipped')
    .map(eq => getWeaponDetails(eq))
    .filter(Boolean)
})

const unarmedStrikeDetails = computed(() => {
  const strMod = vtt.value.abilities?.str?.modifier || 0
  const prof = vtt.value.proficiency_bonus || 2
  return {
    name: 'Unarmed Strike',
    toHit: prof + strMod,
    damageDice: '1',
    statMod: strMod,
    damageType: 'bludgeoning',
    range: '5 ft.',
    properties: []
  }
})

// Feat details client enrichment
const fetchFeatDetailsIfNeeded = async (ft) => {
  if (!ft || (ft.entries && ft.entries.length > 0)) return
  const rawName = ft.name || ''
  const baseName = rawName.split(/[-;(]/)[0].trim()
  if (!baseName) return
  try {
    const res = await axios.get(`${API_URL}/compendium/feats`, {
      params: {
        search: baseName,
        edition: char.value.edition || '2024'
      }
    })
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const match = list.find(f => (f.name || '').toLowerCase() === baseName.toLowerCase()) || list[0]
    if (match && match.entries) {
      ft.entries = match.entries
    }
  } catch (e) {
    console.warn('Could not auto-fetch feat details:', e.message)
  }
}

// Active character sources & optional features filtering
const activeCharSources = computed(() => {
  const sources = new Set()
  if (char.value.edition === '2024') sources.add('XPHB')
  else sources.add('PHB')
  const classes = Array.isArray(char.value.class) ? char.value.class : (char.value.class ? [char.value.class] : [])
  classes.forEach(c => {
    if (c.source) sources.add(c.source.toUpperCase())
  })
  const subClasses = Array.isArray(char.value.sub_class) ? char.value.sub_class : (char.value.sub_class ? [char.value.sub_class] : [])
  subClasses.forEach(sc => {
    if (sc.source) sources.add(sc.source.toUpperCase())
  })
  if (char.value.race?.source) sources.add(char.value.race.source.toUpperCase())
  return sources
})

const filteredClassFeatures = computed(() => {
  const list = char.value.class_feature || []
  return list.filter(cf => {
    if (!cf.source) return true
    const src = cf.source.toUpperCase()
    if (isOptionalFeature(cf) && !activeCharSources.value.has(src)) return false
    return true
  })
})

const filteredSubClassFeatures = computed(() => {
  const list = char.value.sub_class_feature || []
  return list.filter(scf => {
    if (!scf.source) return true
    const src = scf.source.toUpperCase()
    if (isOptionalFeature(scf) && !activeCharSources.value.has(src)) return false
    return true
  })
})

// Features expand/collapse state
const expandedFeatures = ref({})
const toggleFeature = (id) => {
  expandedFeatures.value[id] = !expandedFeatures.value[id]
  if (expandedFeatures.value[id] && id.startsWith('ft_')) {
    const ft = (char.value.feat || []).find(f => 'ft_' + (f.id || f.name) === id)
    if (ft) fetchFeatDetailsIfNeeded(ft)
  }
}
const expandAllFeatures = (allKeys) => {
  const current = Object.values(expandedFeatures.value).some(Boolean)
  allKeys.forEach(k => {
    expandedFeatures.value[k] = !current
  })
}

const cleanProficiencyName = (raw) => {
  if (typeof raw !== 'string') return ''
  let cleaned = clean5eToolsMarkup(raw)
  cleaned = cleaned.replace(/s\s+Weapons$/i, 's').replace(/\s+Weapons$/i, '')
  if (/^horn$/i.test(cleaned)) return 'Horn (Musical Instrument)'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

const isOptionalFeature = (feat) => {
  if (!feat) return false
  if (feat.isClassFeatureVariant || feat.isOptional || feat.optional) return true
  if (typeof feat.name === 'string' && /\boptional\b/i.test(feat.name)) return true
  const entriesStr = typeof feat.entries === 'string' ? feat.entries : JSON.stringify(feat.entries || [])
  const lower = entriesStr.toLowerCase()
  return (
    lower.includes('optional class feature') ||
    lower.includes('optional feature') ||
    lower.includes('variantrule optional') ||
    lower.includes('{@variantrule optional')
  )
}

// Collect all feature keys for expand all
const allFeatureKeys = computed(() => {
  const keys = []
  ;(char.value.class_feature || []).forEach(f => keys.push('cf_' + (f.id || f.name)))
  ;(char.value.sub_class_feature || []).forEach(f => keys.push('scf_' + (f.id || f.name)))
  ;(char.value.trait || []).forEach(f => keys.push('tr_' + (f.id || f.name)))
  ;(char.value.feature || []).forEach(f => keys.push('bf_' + (f.id || f.name)))
  ;(char.value.feat || []).forEach(f => keys.push('ft_' + (f.id || f.name)))
  return keys
})

// Spells in Sheet
const charSpells = computed(() => {
  const sp = char.value.spells || char.value.character_spells || []
  return Array.isArray(sp) ? sp : []
})

const sheetCantrips = computed(() => {
  return charSpells.value.filter(s => Number(s.level) === 0 || s.is_cantrip)
})

const sheetLeveledSpells = computed(() => {
  return charSpells.value.filter(s => Number(s.level) > 0 && !s.is_cantrip)
})

const charClassName = computed(() => {
  const cObj = Array.isArray(char.value.class) ? char.value.class[0] : char.value.class
  return (cObj?.name || '').toLowerCase()
})

const charSubClassName = computed(() => {
  const scObj = Array.isArray(char.value.sub_class) ? char.value.sub_class[0] : char.value.sub_class
  return (scObj?.name || scObj?.short_name || '').toLowerCase()
})

const isCaster = computed(() => {
  if (charSpells.value.length > 0) return true
  const c = charClassName.value
  const sc = charSubClassName.value
  if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard', 'warlock', 'artificer'].includes(c)) return true
  if (c === 'paladin' || c === 'ranger') {
    return (char.value.edition || '2024') === '2024' || Number(char.value.level || 1) >= 2
  }
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) {
    return Number(char.value.level || 1) >= 3
  }
  return false
})

const charCasterAbility = computed(() => {
  const c = charClassName.value
  const sc = charSubClassName.value
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) return 'intelligence'
  if (c === 'wizard' || c === 'artificer') return 'intelligence'
  if (c === 'cleric' || c === 'druid' || c === 'ranger') return 'wisdom'
  if (c === 'bard' || c === 'sorcerer' || c === 'warlock' || c === 'paladin') return 'charisma'
  return 'intelligence'
})

const charCasterMod = computed(() => {
  const ab = charCasterAbility.value
  const val = Number(char.value.ability_score?.[ab]) || 10
  return Math.floor((val - 10) / 2)
})

const charProfBonus = computed(() => {
  const pb = char.value.proficiency_bonus
  if (pb != null) return Number(pb)
  return Math.floor((Number(char.value.level || 1) - 1) / 4) + 2
})

const charSpellSaveDc = computed(() => 8 + charProfBonus.value + charCasterMod.value)
const charSpellAttackBonus = computed(() => charProfBonus.value + charCasterMod.value)

// Slots calculation for sheet
const sheetSpellSlots = computed(() => {
  const c = charClassName.value
  const lvl = Number(char.value.level) || 1

  if (c === 'warlock') {
    const pactSlots = lvl === 1 ? 1 : (lvl >= 17 ? 4 : (lvl >= 11 ? 3 : 2))
    const pactLvl = Math.min(5, Math.ceil(lvl / 2))
    return [{ level: pactLvl, total: pactSlots, isPact: true }]
  }

  const fullCasterTable = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3],
    [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]

  const halfCasterTable = [
    [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3],
    [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1],
    [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
  ]

  let arr = []
  if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard'].includes(c)) {
    arr = fullCasterTable[lvl - 1] || []
  } else if (['paladin', 'ranger', 'artificer'].includes(c)) {
    if (char.value.edition === '2014' && (c === 'paladin' || c === 'ranger') && lvl === 1) {
      arr = []
    } else {
      arr = halfCasterTable[lvl - 1] || []
    }
  }

  return arr.map((qty, idx) => ({ level: idx + 1, total: qty }))
})

// Expended slots tracker in state
const expendedSlots = ref({})

const isSlotExpended = (lvl, slotIdx) => {
  return Boolean(expendedSlots.value[`${lvl}_${slotIdx}`])
}

const isSlotDisabled = (lvl, slotIdx) => {
  const isExp = isSlotExpended(lvl, slotIdx)
  if (isExp) {
    // When expended (empty), it can ONLY be restored if all slots to its left (< slotIdx) are already active
    for (let i = 1; i < slotIdx; i++) {
      if (isSlotExpended(lvl, i)) return true
    }
    return false
  } else {
    // When active, it can only be spent if all slots to its left (< slotIdx) are already expended
    for (let i = 1; i < slotIdx; i++) {
      if (!isSlotExpended(lvl, i)) return true
    }
    return false
  }
}

const toggleSlot = (lvl, slotIdx) => {
  if (isSlotDisabled(lvl, slotIdx)) return
  const key = `${lvl}_${slotIdx}`
  expendedSlots.value[key] = !expendedSlots.value[key]
}
const toggleSlotUse = toggleSlot

const allSpellLevels = computed(() => {
  return (sheetSpellSlots.value || []).filter(s => s.total > 0).map(s => s.level)
})

const getMaxSlots = (lvl) => {
  const s = (sheetSpellSlots.value || []).find(slot => slot.level === Number(lvl))
  return s ? s.total : 0
}

const getAvailableSlots = (lvl) => {
  const max = getMaxSlots(lvl)
  let count = 0
  for (let i = 1; i <= max; i++) {
    if (!isSlotExpended(lvl, i)) count++
  }
  return count
}

const restoreAllSlots = () => {
  expendedSlots.value = {}
}

const activeSpellsByLevel = computed(() => {
  const levels = new Set()
  sheetLeveledSpells.value.forEach(s => {
    const l = Number(s.level)
    if (l > 0) levels.add(l)
  })
  allSpellLevels.value.forEach(l => levels.add(l))
  return Array.from(levels).sort((a, b) => a - b)
})

const getSpellsAtLevel = (lvl) => {
  return sheetLeveledSpells.value.filter(s => Number(s.level) === Number(lvl))
}

const expandedSpells = ref({})
const toggleSpell = (id) => {
  expandedSpells.value[id] = !expandedSpells.value[id]
  if (expandedSpells.value[id]) {
    const rawKey = id.replace(/^sp_/, '')
    const sp = charSpells.value.find(s => String(s.id || s.name) === rawKey)
    if (sp) fetchSpellDetailsIfNeeded(sp)
  }
}

const getSpellCastingTime = (sp) => {
  const full = getFullSpell(sp)
  if (full.casting_time) return full.casting_time
  if (Array.isArray(full.time) && full.time[0]) {
    const t = full.time[0]
    return `${t.number || 1} ${t.unit}`
  }
  return '1 action'
}

const getSpellRange = (sp) => {
  const full = getFullSpell(sp)
  if (full.range && typeof full.range === 'string') return full.range
  if (full.range?.distance) {
    const d = full.range.distance
    return `${d.amount ? d.amount + ' ' : ''}${d.type || 'feet'}`
  }
  return full.range?.type || 'Self'
}

const getSpellDuration = (sp) => {
  const full = getFullSpell(sp)
  if (full.duration && typeof full.duration === 'string') return full.duration
  if (Array.isArray(full.duration) && full.duration[0]) {
    const d = full.duration[0]
    if (d.type === 'instant') return 'Instantaneous'
    if (d.duration) return `${d.duration.amount} ${d.duration.type}`
    return d.type || 'Instantaneous'
  }
  return 'Instantaneous'
}

const getSpellComponents = (sp) => {
  const full = getFullSpell(sp)
  if (full.components && typeof full.components === 'string') return full.components
  if (full.components && typeof full.components === 'object') {
    const parts = []
    if (full.components.v) parts.push('V')
    if (full.components.s) parts.push('S')
    if (full.components.m) parts.push('M')
    return parts.join(', ') || 'V, S'
  }
  return 'V, S'
}

const getSpellEntries = (sp) => {
  const full = getFullSpell(sp)
  if (Array.isArray(full.entries)) return full.entries
  if (typeof full.entries === 'string') {
    try {
      const parsed = JSON.parse(full.entries)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return [full.entries]
    }
  }
  return []
}

const getSpellHigherLevels = (sp) => {
  const full = getFullSpell(sp)
  const hl = full.entriesHigherLevel || full.higher_levels
  if (Array.isArray(hl)) return hl
  if (typeof hl === 'string') {
    try {
      const parsed = JSON.parse(hl)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return [hl]
    }
  }
  return []
}

const formatSpellEntry = (ent) => {
  if (ent == null) return ''
  if (typeof ent === 'string') return ent
  if (typeof ent === 'object') {
    if (ent.name && ent.entries) {
      return `<strong>${ent.name}.</strong> ` + (Array.isArray(ent.entries) ? ent.entries.map(formatSpellEntry).join(' ') : ent.entries)
    }
    if (ent.type === 'list' && Array.isArray(ent.items)) {
      return '• ' + ent.items.map(it => typeof it === 'string' ? it : (it.entry || '')).join('\n• ')
    }
    if (Array.isArray(ent.entries)) {
      return ent.entries.map(formatSpellEntry).join(' ')
    }
  }
  return String(ent)
}

const castSpell = (sp) => {
  const mechanics = extractSpellMechanics(sp, char.value.level, charCasterMod.value)
  const lvl = Number(sp.level) || 0
  if (lvl > 0 && getMaxSlots(lvl) > 0) {
    const max = getMaxSlots(lvl)
    for (let i = 1; i <= max; i++) {
      if (!expendedSlots.value[`${lvl}_${i}`]) {
        expendedSlots.value[`${lvl}_${i}`] = true
        break
      }
    }
  }
  if (mechanics.hasAttack) {
    rollDice(`${sp.name} Attack`, charSpellAttackBonus.value)
  } else if (mechanics.diceFormula) {
    if (mechanics.isHeal) {
      rollFormula(`${sp.name} Heal`, mechanics.diceFormula, mechanics.addModToDice ? charCasterMod.value : 0)
    } else {
      rollFormula(`${sp.name} Damage`, mechanics.diceFormula)
    }
  } else {
    logSpellCast(sp.name)
  }
}

// Spell Details Resolution & Dynamic Capabilities
const cachedSpellDetails = ref({})
const isFetchingSpell = ref({})

const fetchSpellDetailsIfNeeded = async (spell) => {
  const sName = spell?.name
  if (!sName) return
  const key = sName.trim().toLowerCase()
  if (cachedSpellDetails.value[key] || isFetchingSpell.value[key]) return

  const hasEntries = Array.isArray(spell.entries) && spell.entries.length > 0
  if (hasEntries) return

  isFetchingSpell.value[key] = true
  try {
    const edition = char.value.edition || '2024'
    const res = await axios.get(`${API_URL}/compendium/spells?edition=${edition}&search=${encodeURIComponent(sName)}`)
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const match = list.find(s => (s.name || '').trim().toLowerCase() === key) || list[0]
    if (match) {
      cachedSpellDetails.value[key] = {
        ...match,
        entries: typeof match.entries === 'string' ? JSON.parse(match.entries) : (match.entries || []),
        entriesHigherLevel: typeof match.higher_levels === 'string' ? JSON.parse(match.higher_levels) : (match.higher_levels || match.entriesHigherLevel || [])
      }
    }
  } catch (err) {
    console.error('Failed to fetch spell detail for', sName, err)
  } finally {
    isFetchingSpell.value[key] = false
  }
}

const getFullSpell = (sp) => {
  const key = (sp.name || '').trim().toLowerCase()
  const fetched = cachedSpellDetails.value[key]
  if (fetched) {
    return { ...sp, ...fetched }
  }
  return sp
}

const renderSpellEntryHtml = (entry) => {
  if (entry == null) return ''
  if (typeof entry === 'string') return `<p class="leading-relaxed mb-1">${renderAnnotatedText(entry)}</p>`
  if (typeof entry === 'object') {
    if (entry.name && entry.entries) {
      const sub = entry.entries.map(renderSpellEntryHtml).join('')
      return `<div class="mt-1"><span class="font-bold text-gray-900">${renderAnnotatedText(entry.name)}. </span>${sub}</div>`
    }
    if (entry.type === 'list' && Array.isArray(entry.items)) {
      const items = entry.items.map(it => `<li>${renderAnnotatedText(typeof it === 'string' ? it : (it.entry || ''))}</li>`).join('')
      return `<ul class="list-disc pl-4 space-y-0.5 my-1">${items}</ul>`
    }
    if (entry.type === 'table') {
      const headers = (entry.colLabels || []).map(h => `<th class="p-1.5 font-semibold text-gray-700">${renderAnnotatedText(h)}</th>`).join('')
      const rows = (entry.rows || []).map(r => `<tr>${r.map(c => `<td class="p-1.5 text-gray-600">${renderTableCell(c)}</td>`).join('')}</tr>`).join('')
      const caption = entry.caption ? `<caption class="p-1.5 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">${entry.caption}</caption>` : ''
      return `<div class="my-2 overflow-x-auto w-full border border-gray-200 rounded max-w-full"><table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">${caption}<thead class="bg-gray-50"><tr>${headers}</tr></thead><tbody class="divide-y divide-gray-100 bg-white">${rows}</tbody></table></div>`
    }
    if (entry.entries && Array.isArray(entry.entries)) {
      return entry.entries.map(renderSpellEntryHtml).join('')
    }
  }
  return `<p class="leading-relaxed mb-1">${renderAnnotatedText(String(entry))}</p>`
}

const quickRollDie = (sides) => {
  isDiceTrayOpen.value = false
  const count = Math.max(1, Number(diceMultiplier.value) || 1)
  const mod = Number(diceMod.value) || 0
  const isAdv = sides === 20 && count === 1 && diceRollMode.value === 'adv'
  const isDis = sides === 20 && count === 1 && diceRollMode.value === 'dis'

  if (isAdv || isDis) {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    const chosen = isAdv ? Math.max(r1, r2) : Math.min(r1, r2)
    const total = chosen + mod
    const sign = mod >= 0 ? `+${mod}` : `${mod}`
    const formulaStr = `2d20${isAdv ? 'kh1' : 'kl1'}${mod !== 0 ? sign : ''}`
    const breakdownStr = `[${r1}, ${r2}] -> ${chosen}${mod !== 0 ? ` ${sign}` : ''} = ${total}`
    const isNat20 = chosen === 20
    const isNat1 = chosen === 1
    setRollResult({
      label: `d20 with ${isAdv ? 'Advantage' : 'Disadvantage'}`,
      total,
      d20: chosen,
      mod,
      formula: formulaStr,
      breakdown: breakdownStr,
      isNat20,
      isNat1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    })
    return
  }

  const rolls = []
  let total = 0
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1
    rolls.push(r)
    total += r
  }
  total += mod
  const sign = mod >= 0 ? `+${mod}` : `${mod}`
  const formulaStr = `${count}d${sides}${mod !== 0 ? sign : ''}`
  const breakdownStr = count > 1
    ? `[${rolls.join(', ')}]${mod !== 0 ? ` ${sign}` : ''} = ${total}`
    : `Rolled ${rolls[0]}${mod !== 0 ? ` ${sign}` : ''} = ${total}`

  const isNat20 = sides === 20 && count === 1 && rolls[0] === 20
  const isNat1 = sides === 20 && count === 1 && rolls[0] === 1

  setRollResult({
    label: `${formulaStr} Roll`,
    total,
    formula: formulaStr,
    breakdown: breakdownStr,
    isNat20,
    isNat1,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
}

const extractSpellMechanics = (sp, charLevel = 1, casterMod = 0) => {
  const full = getFullSpell(sp)
  const entries = full.entries || []
  const textBody = Array.isArray(entries)
    ? entries.map(e => {
        if (typeof e === 'string') return e
        if (e && Array.isArray(e.entries)) return e.entries.join(' ')
        return ''
      }).join(' ')
    : (typeof entries === 'string' ? entries : '')

  const hasAttack = (Array.isArray(full.spellAttack) && full.spellAttack.length > 0) ||
    Boolean(full.spell_attack) ||
    /\bmake a (?:melee|ranged) spell attack\b/i.test(textBody)

  let saveAbility = null
  if (Array.isArray(full.savingThrow) && full.savingThrow.length > 0) {
    saveAbility = full.savingThrow[0]
  } else if (full.save_ability) {
    saveAbility = full.save_ability.split(',')[0].trim()
  } else {
    const m = textBody.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i)
    if (m) saveAbility = m[1].toLowerCase()
  }

  const isHeal = /regains?\s+(?:a number of\s+)?(?:hit points|hp)/i.test(textBody) ||
    (Array.isArray(full.miscTags) && full.miscTags.includes('HL'))

  let diceFormula = null
  const diceObj = typeof full.damage_dice === 'string'
    ? (() => { try { return JSON.parse(full.damage_dice) } catch { return null } })()
    : (full.damage_dice || full.scalingLevelDice || null)

  if (diceObj?.scaling) {
    const lvl = Number(charLevel) || 1
    if (lvl >= 17 && diceObj.scaling['17']) diceFormula = diceObj.scaling['17']
    else if (lvl >= 11 && diceObj.scaling['11']) diceFormula = diceObj.scaling['11']
    else if (lvl >= 5 && diceObj.scaling['5']) diceFormula = diceObj.scaling['5']
    else diceFormula = diceObj.scaling['1'] || Object.values(diceObj.scaling)[0]
  }

  if (!diceFormula) {
    const dMatch = textBody.match(/\{@(damage|dice)\s+([^}]+)\}/i)
    if (dMatch) {
      diceFormula = dMatch[2].split('|')[0].trim()
    }
  }

  const addModToDice = isHeal && /plus\s+your\s+spellcasting\s+ability\s+modifier|\+\s*your\s+spellcasting/i.test(textBody)
  const isUtility = !hasAttack && !saveAbility && !isHeal && !diceFormula

  return {
    hasAttack,
    saveAbility,
    isHeal,
    diceFormula,
    addModToDice,
    isUtility
  }
}

const rollFormula = (label, formula, bonusMod = 0) => {
  if (!formula && bonusMod === 0) return

  let total = 0
  const breakdownParts = []

  if (formula) {
    const formulaClean = String(formula).replace(/\s+/g, '')
    const replacedFormula = formulaClean.replace(/(\d*)d(\d+)/gi, (m, countStr, sidesStr) => {
      const count = parseInt(countStr, 10) || 1
      const sides = parseInt(sidesStr, 10) || 6
      const rolls = []
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1)
      }
      const sum = rolls.reduce((a, b) => a + b, 0)
      breakdownParts.push(`${count}d${sides} (${rolls.join(', ')})`)
      return sum
    })

    try {
      const evalSum = Function(`'use strict'; return (${replacedFormula})`)()
      total = Number(evalSum) || 0
    } catch {
      total = 0
    }
  }

  if (bonusMod !== 0) {
    total += bonusMod
    breakdownParts.push(`${bonusMod >= 0 ? '+' : ''}${bonusMod}`)
  }

  const resultFormula = formula
    ? (bonusMod !== 0 ? `${formula} ${bonusMod >= 0 ? '+' : ''}${bonusMod}` : formula)
    : `${bonusMod >= 0 ? '+' : ''}${bonusMod}`

  setRollResult({
    label,
    d20: null,
    mod: bonusMod,
    total,
    isNat20: false,
    isNat1: false,
    formula: resultFormula,
    breakdown: breakdownParts.join(' ') || String(total),
    timestamp: new Date().toLocaleTimeString()
  })
}

const logSpellCast = (spellName) => {
  setRollResult({
    label: `${spellName} Cast`,
    d20: null,
    mod: 0,
    total: 'Active',
    isNat20: false,
    isNat1: false,
    formula: 'Utility / Effect',
    breakdown: 'Cast without roll',
    timestamp: new Date().toLocaleTimeString()
  })
}

const toggleSpellCard = (sp) => {
  const key = 'sp_' + (sp.id || sp.name)
  toggleFeature(key)
  if (expandedFeatures.value[key]) {
    fetchSpellDetailsIfNeeded(sp)
  }
}

const bonusActionSpells = computed(() => {
  return charSpells.value.filter(s => {
    const full = getFullSpell(s)
    const time = full?.time?.[0]
    return time?.unit === 'bonus' || (s.castingTime || '').toLowerCase().includes('bonus')
  })
})

const reactionSpells = computed(() => {
  return charSpells.value.filter(s => {
    const full = getFullSpell(s)
    const time = full?.time?.[0]
    return time?.unit === 'reaction' || (s.castingTime || '').toLowerCase().includes('reaction')
  })
})

watch(() => char.value.feat, (list) => {
  if (Array.isArray(list)) {
    list.forEach(f => fetchFeatDetailsIfNeeded(f))
  }
}, { immediate: true })

watch(() => activeTab.value, (newTab) => {
  if (newTab === 'actions' || newTab === 'spells') {
    charSpells.value.forEach(sp => {
      fetchSpellDetailsIfNeeded(sp)
    })
  }
  if (newTab === 'background') {
    fetchBackgroundDetails()
  }
})

watch(() => char.value.background, () => {
  bgCompendiumData.value = null
  if (activeTab.value === 'background') {
    fetchBackgroundDetails()
  }
})

watch(() => charSpells.value, (list) => {
  if ((activeTab.value === 'actions' || activeTab.value === 'spells') && Array.isArray(list)) {
    list.forEach(sp => fetchSpellDetailsIfNeeded(sp))
  }
}, { immediate: true })
</script>

<template>
  <div class="max-w-4xl mx-2 sm:mx-auto my-4 sm:my-6 p-3.5 sm:p-6 bg-white text-gray-800 rounded border border-gray-200 shadow-sm font-sans pb-24">
    
    <!-- Top Header Bar -->
    <div class="flex flex-row justify-between items-start pb-4 border-b border-gray-200 gap-3">
      <div class="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <!-- Avatar / Initial -->
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-base sm:text-lg overflow-hidden shrink-0 shadow-xs">
          <img v-if="char.image_url" :src="char.image_url" :alt="char.name" class="w-full h-full object-cover" />
          <span v-else>{{ (char.name || 'H').charAt(0).toUpperCase() }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{{ char.name || 'Hero' }}</h1>
            <span
              class="text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-semibold border bg-gray-100 border-gray-200 text-gray-700 whitespace-nowrap"
            >
              {{ char.edition === '2024' ? '2024 One D&D' : '2014 5e' }}
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug">
            Level {{ char.level || 1 }} 
            <span class="text-gray-900 font-semibold">{{ classSummary }}</span>
            • <span>{{ char.race?.name || 'Unknown Species' }}</span>
            • <span>{{ char.background || 'No Background' }}</span>
            • <span>{{ char.alignment || 'Neutral' }}</span>
          </p>
        </div>
      </div>

      <!-- Action Icons: compendium, char list, edit in one row on the right -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-0.5">
        <button
          type="button"
          @click="openCompendiumWindow"
          class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 font-medium transition cursor-pointer flex items-center justify-center shadow-xs"
          title="Compendium"
          aria-label="Compendium"
        >
          <IconBook class="w-4 h-4 text-gray-700" />
        </button>
        <button
          type="button"
          @click="emit('back')"
          class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 font-medium transition cursor-pointer flex items-center justify-center shadow-xs"
          title="Character List"
          aria-label="Character List"
        >
          <IconUsers class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="emit('edit', char.id)"
          class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 font-medium transition cursor-pointer flex items-center justify-center shadow-xs"
          title="Edit Character"
          aria-label="Edit Character"
        >
          <IconEdit class="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </div>

    <!-- Core Combat Vitals Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2.5 my-4">
      <!-- AC -->
      <div class="bg-gray-100/70 p-2.5 rounded border border-gray-300 text-center">
        <div class="text-[10px] text-gray-600 uppercase font-bold">Armor Class</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ currentArmorClass }}</div>
      </div>

      <!-- Initiative -->
      <button
        type="button"
        @click="rollDice('Initiative', computedInitiative)"
        class="bg-gray-100/70 hover:bg-gray-200/80 p-2.5 rounded border border-gray-300 text-center transition cursor-pointer group"
      >
        <div class="text-[10px] text-gray-600 uppercase font-bold group-hover:text-gray-900">Initiative</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">
          {{ computedInitiative >= 0 ? '+' : '' }}{{ computedInitiative }}
        </div>
      </button>

      <!-- Speed -->
      <div class="bg-gray-100/70 p-2.5 rounded border border-gray-300 text-center">
        <div class="text-[10px] text-gray-600 uppercase font-bold">Speed</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ char.speed || 30 }} <span class="text-xs font-normal text-gray-500">ft</span></div>
      </div>

      <!-- Proficiency Bonus -->
      <div class="bg-gray-100/70 p-2.5 rounded border border-gray-300 text-center">
        <div class="text-[10px] text-gray-600 uppercase font-bold">Prof. Bonus</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">+{{ vtt.proficiency_bonus || char.proficiency_bonus || 2 }}</div>
      </div>

      <!-- Hit Dice -->
      <div class="bg-gray-100/70 p-2.5 rounded border border-gray-300 text-center">
        <div class="text-[10px] text-gray-600 uppercase font-bold">Hit Dice</div>
        <div class="text-lg font-bold text-gray-900 mt-0.5">{{ char.hit_dice || '1d8' }}</div>
      </div>

      <!-- Passive Perception -->
      <div class="bg-gray-100/70 p-2.5 rounded border border-gray-300 text-center">
        <div class="text-[10px] text-gray-600 uppercase font-bold">Passive Perc.</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ vtt.senses?.passive_perception || 10 }}</div>
      </div>
    </div>

    <!-- Hit Points Interactive Widget -->
    <div class="bg-gray-100/70 rounded p-3.5 border border-gray-300 mb-5">
      <div class="flex flex-row justify-between items-center gap-3">
        <!-- Left: HP Info -->
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700">Hit Points</span>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-2xl font-bold" :class="currentHp <= (maxHp/3) ? 'text-red-700' : 'text-gray-900'">
              {{ currentHp }}
            </span>
            <span class="text-gray-600 text-xs">/ {{ maxHp }} Max</span>
            <span v-if="tempHp > 0" class="text-[10px] bg-cyan-100 text-cyan-900 border border-cyan-300 px-1.5 py-0.5 rounded font-mono">+{{ tempHp }} Temp</span>
          </div>
        </div>

        <!-- Right: Heal, Input, Damage in row -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            @click="applyHeal"
            class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-2.5 sm:px-3 py-1 rounded font-medium transition cursor-pointer"
          >
            Heal
          </button>
          <input
            type="number"
            min="1"
            v-model="hpInput"
            class="w-14 sm:w-16 bg-white border border-gray-300 rounded px-1.5 py-1 text-center text-xs font-semibold"
          />
          <button
            type="button"
            @click="applyDamage"
            class="bg-rose-700 hover:bg-rose-800 text-white text-xs px-2.5 sm:px-3 py-1 rounded font-medium transition cursor-pointer"
          >
            Damage
          </button>
        </div>
      </div>
    </div>

    <!-- 6 Ability Scores Bar -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
      <div
        v-for="(stat, name) in vtt.abilities"
        :key="name"
        class="bg-white p-2.5 rounded border border-gray-200 text-center flex flex-col justify-between"
      >
        <span class="text-[10px] font-bold uppercase text-gray-500">{{ name.slice(0, 3) }}</span>
        
        <button
          type="button"
          @click="rollDice(`${name.toUpperCase()} Check`, stat.modifier)"
          class="text-xl font-bold text-gray-900 hover:text-gray-700 transition cursor-pointer my-0.5"
          title="Click to roll Ability Check"
        >
          {{ stat.modifier_string }}
        </button>

        <span class="text-[11px] text-gray-500 font-mono">{{ stat.score }}</span>

        <!-- Saving Throw Roll Button -->
        <button
          type="button"
          @click="rollDice(`${name.toUpperCase()} Save`, vtt.saving_throws?.[name]?.total || stat.modifier)"
          class="mt-1 text-[10px] px-1 py-0.5 rounded transition cursor-pointer border"
          :class="vtt.saving_throws?.[name]?.proficient ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
        >
          Save {{ vtt.saving_throws?.[name]?.modifier_string || stat.modifier_string }}
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="flex gap-2 border-b border-gray-200 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
      <button
        type="button"
        @click="activeTab = 'actions'"
        :class="activeTab === 'actions' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ACTIONS
      </button>
      <button
        type="button"
        @click="activeTab = 'spells'"
        :class="activeTab === 'spells' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SPELLS</span>
        <span v-if="charSpells.length" class="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ charSpells.length }}
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'skills'"
        :class="activeTab === 'skills' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SKILLS</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          18
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'features'"
        :class="activeTab === 'features' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        FEATURES
      </button>
      <button
        type="button"
        @click="activeTab = 'equipment'"
        :class="activeTab === 'equipment' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>EQUIPMENT</span>
        <span v-if="liveEquipment.length" class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ liveEquipment.length }}
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'background'"
        :class="activeTab === 'background' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        BACKGROUND
      </button>
      <button
        type="button"
        v-if="rollHistory.length"
        @click="activeTab = 'history'"
        :class="activeTab === 'history' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>HISTORY</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ rollHistory.length }}
        </span>
      </button>
    </div>

    <!-- TAB: Actions (D&D Beyond Style) -->
    <div v-if="activeTab === 'actions'" class="space-y-4 text-xs">
      <!-- Actions Sub-filters Navigation -->
      <!-- Action Sub-Filters -->
      <div class="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold border-b border-gray-100">
        <button
          type="button"
          @click="actionSubFilter = 'all'"
          :class="actionSubFilter === 'all' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ALL
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'attack'"
          :class="actionSubFilter === 'attack' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ATTACK ({{ attackTableEntries.length }})
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'action'"
          :class="actionSubFilter === 'action' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'bonus'"
          :class="actionSubFilter === 'bonus' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          BONUS ACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'reaction'"
          :class="actionSubFilter === 'reaction' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          REACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'other'"
          :class="actionSubFilter === 'other' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          OTHER
        </button>
      </div>

      <!-- Attacks Section (Structured Table) -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'attack'" class="space-y-2">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Attacks & Attack Spells
          </h3>
          <span class="text-[10px] text-gray-500 font-mono">{{ attackTableEntries.length }} Available</span>
        </div>

        <div v-if="attackTableEntries.length > 0" class="overflow-x-auto border border-gray-200 rounded shadow-xs bg-white">
          <table class="w-full text-left text-xs divide-y divide-gray-200">
            <thead class="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th class="py-2 px-3">Attack</th>
                <th class="py-2 px-3">Range</th>
                <th class="py-2 px-3 text-center">Hit / DC</th>
                <th class="py-2 px-3 text-center">Damage</th>
                <th class="py-2 px-3">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="entry in attackTableEntries"
                :key="entry.id"
                class="hover:bg-gray-50/80 transition"
              >
                <!-- ATTACK Column -->
                <td class="py-2.5 px-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-gray-600 bg-gray-100 border border-gray-200"
                      :title="entry.subtitle"
                    >
                      <IconBolt v-if="entry.type === 'spell'" class="w-3.5 h-3.5" />
                      <IconHandStop v-else-if="entry.type === 'unarmed'" class="w-3.5 h-3.5" />
                      <IconSword v-else class="w-3.5 h-3.5" />
                    </span>
                    <div class="min-w-0">
                      <div class="font-bold text-gray-900 truncate">{{ entry.name }}</div>
                      <div class="text-[10px] text-gray-500 truncate">{{ entry.subtitle }}</div>
                    </div>
                  </div>
                </td>

                <!-- RANGE Column -->
                <td class="py-2.5 px-3 whitespace-nowrap text-gray-600 text-[11px] font-mono">
                  {{ entry.range }}
                </td>

                <!-- HIT / DC Column -->
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                  <button
                    v-if="entry.toHit != null"
                    type="button"
                    @click="rollDice(`${entry.name} Attack`, entry.toHit)"
                    class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                    :title="`Roll ${entry.name} Attack (${entry.toHit >= 0 ? '+' : ''}${entry.toHit})`"
                  >
                    {{ entry.toHitLabel }}
                  </button>
                  <span
                    v-else-if="entry.isDc"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded font-bold text-[10px] font-mono whitespace-nowrap"
                    title="Target Saving Throw"
                  >
                    {{ entry.dcText }}
                  </span>
                  <span v-else class="text-gray-400 font-mono text-xs">—</span>
                </td>

                <!-- DAMAGE Column -->
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                  <button
                    v-if="entry.damageDice"
                    type="button"
                    @click="rollFormula(`${entry.name} Damage`, entry.damageFormula, entry.damageMod)"
                    class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                    :title="`Roll Damage: ${entry.damageLabel}`"
                  >
                    {{ entry.damageLabel }}
                  </button>
                  <span v-else class="text-gray-400 font-mono text-xs">—</span>
                </td>

                <!-- NOTES Column -->
                <td class="py-2.5 px-3 text-gray-500 text-[11px]">
                  <span class="line-clamp-1" :title="entry.notes">{{ entry.notes }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 italic">
          No equipped weapons or attack spells available.
        </div>
      </div>

      <!-- Actions in Combat Quick Reference Panel -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'action'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Actions in Combat
          </h3>
          <span class="text-[10px] text-gray-500">Standard 5e / 2024 combat actions</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
          <!-- Attack -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Attack</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make 1 or more weapon or unarmed attacks (Extra Attack applies).</p>
          </div>

          <!-- Dash -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Dash</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Gain extra movement equal to your speed ({{ char.speed || 30 }} ft.) for the turn.</p>
          </div>

          <!-- Disengage -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Disengage</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Your movement does not provoke opportunity attacks for the rest of this turn.</p>
          </div>

          <!-- Dodge -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Dodge</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attacks against you have Disadvantage; you make DEX saves with Advantage.</p>
          </div>

          <!-- Grapple -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Grapple</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use an attack to seize a creature within reach using 1 free hand.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Grapple Check (Athletics)', computedSkills.athletics?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Athletics ({{ (computedSkills.athletics?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.athletics?.total || 0 }})
            </button>
          </div>

          <!-- Help -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Help</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Grant Advantage to an ally's next ability check or attack roll within 5 ft.</p>
          </div>

          <!-- Hide -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Hide</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make a Stealth check to conceal yourself.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Stealth Check (Hide)', computedSkills.stealth?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Stealth ({{ (computedSkills.stealth?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.stealth?.total || 0 }})
            </button>
          </div>

          <!-- Improvise -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Improvise</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attempt any creative action not covered by rules; DM adjudicates outcome.</p>
          </div>

          <!-- Influence -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Influence</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attempt to alter the attitude of a creature through interaction.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button
                type="button"
                @click="rollDice('Persuasion Check (Influence)', computedSkills.persuasion?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Persuasion
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Deception Check (Influence)', computedSkills.deception?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Deception
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Intimidation Check (Influence)', computedSkills.intimidation?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Intimidation
              </button>
            </div>
          </div>

          <!-- Magic -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Magic</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Cast a spell with a casting time of 1 action, or activate a magic item.</p>
            </div>
            <button
              type="button"
              @click="activeTab = 'spells'"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Open Spells Tab ({{ charSpells.length }}) &rarr;
            </button>
          </div>

          <!-- Ready -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Ready</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Prepare an action to execute when a specific trigger occurs, using your Reaction.</p>
          </div>

          <!-- Search -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Search</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Devote attention to finding something hidden.</p>
            </div>
            <div class="flex items-center gap-1.5 text-[10px]">
              <button
                type="button"
                @click="rollDice('Perception Check (Search)', computedSkills.perception?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Perception
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Investigation Check (Search)', computedSkills.investigation?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Investigation
              </button>
            </div>
          </div>

          <!-- Shove -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Shove</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Push a creature 5 ft. away or knock it prone using the Attack action.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Shove Check (Athletics)', computedSkills.athletics?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Athletics ({{ (computedSkills.athletics?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.athletics?.total || 0 }})
            </button>
          </div>

          <!-- Study -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Study</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Dedicate an action to recall lore or analyze a creature with an INT check.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button type="button" @click="rollDice('Arcana Check', computedSkills.arcana?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Arcana</button>
              <span>•</span>
              <button type="button" @click="rollDice('History Check', computedSkills.history?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">History</button>
              <span>•</span>
              <button type="button" @click="rollDice('Nature Check', computedSkills.nature?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Nature</button>
              <span>•</span>
              <button type="button" @click="rollDice('Religion Check', computedSkills.religion?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Religion</button>
            </div>
          </div>

          <!-- Utilize -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Utilize</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use an item, piece of equipment, or object that requires an Action.</p>
          </div>
        </div>
      </div>

      <!-- Bonus Actions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'bonus'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Bonus Actions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- Two-Weapon Off-Hand Attack -->
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Two-Weapon Off-Hand Attack</span>
              <p class="text-[10px] text-gray-500">Attack with second light melee weapon (no ability mod to damage)</p>
            </div>
            <button
              type="button"
              @click="rollDice('Off-Hand Attack', vtt.proficiency_bonus || 2)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Roll Off-Hand
            </button>
          </div>

          <!-- Second Wind (if Fighter) -->
          <div v-if="charClassName.includes('fighter')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Second Wind</span>
              <p class="text-[10px] text-gray-500">Regain 1d10 + {{ char.level || 1 }} HP as a Bonus Action</p>
            </div>
            <button
              type="button"
              @click="rollFormula('Second Wind Healing', '1d10', Number(char.level || 1))"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Heal (1d10+{{ char.level || 1 }})
            </button>
          </div>

          <!-- Bonus Action Spells if any -->
          <div v-for="sp in bonusActionSpells" :key="sp.name" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
              <span class="text-[10px] text-gray-500 ml-1.5">Level {{ sp.level || 'Cantrip' }} • Bonus Action</span>
            </div>
            <button
              type="button"
              @click="castSpell(sp)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Cast Spell
            </button>
          </div>
        </div>
      </div>

      <!-- Reactions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'reaction'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Reactions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- Opportunity Attack -->
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Opportunity Attack</span>
              <p class="text-[10px] text-gray-500">Make 1 melee attack when a hostile creature leaves your reach</p>
            </div>
            <button
              type="button"
              @click="rollDice('Opportunity Attack', equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Strike {{ (equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit) >= 0 ? '+' : '' }}{{ equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit }}
            </button>
          </div>

          <!-- Reaction Spells if any -->
          <div v-for="sp in reactionSpells" :key="sp.name" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
              <span class="text-[10px] text-gray-500 ml-1.5">Reaction Spell</span>
            </div>
            <button
              type="button"
              @click="castSpell(sp)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Cast Spell
            </button>
          </div>
        </div>
      </div>

      <!-- Other Actions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'other'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Other & Interactions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="p-2 bg-gray-50 border border-gray-200 rounded">
            <span class="font-bold text-gray-900 text-xs">Free Object Interaction</span>
            <p class="text-[10px] text-gray-500 mt-0.5">Interact with 1 object or feature of the environment for free on your turn during movement or action.</p>
          </div>
          <div class="p-2 bg-gray-50 border border-gray-200 rounded">
            <span class="font-bold text-gray-900 text-xs">Short Rest & Hit Dice</span>
            <p class="text-[10px] text-gray-500 mt-0.5">Spend 1 or more Hit Dice to regain hit points during a 1-hour rest.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Spells & Spellcasting (Dedicated Spells Tab) -->
    <div v-else-if="activeTab === 'spells'" class="space-y-4 text-xs">
      <div v-if="charSpells.length > 0 || isCaster" class="space-y-4">
        <!-- Caster Stat Box -->
        <div class="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-2.5">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Spellcasting & Slots
            </span>
            <span class="text-[11px] text-gray-500 font-mono">
              Ability: {{ charCasterAbility.toUpperCase() }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spellcasting Modifier</div>
              <div class="text-sm font-bold text-gray-900 font-mono">
                {{ charCasterMod >= 0 ? '+' : '' }}{{ charCasterMod }}
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Save DC</div>
              <div class="text-sm font-bold text-gray-900 font-mono">{{ charSpellSaveDc }}</div>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Attack Bonus</div>
              <button
                type="button"
                @click="rollDice('Spell Attack Roll', charSpellAttackBonus)"
                class="text-sm font-bold text-gray-900 hover:text-black transition font-mono cursor-pointer underline decoration-dotted"
                title="Click to roll spell attack"
              >
                {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
              </button>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Known / Prepared</div>
              <div class="text-sm font-bold text-gray-900 font-mono">{{ charSpells.length }}</div>
            </div>
          </div>

          <!-- Interactive Spell Slots Tracker -->
          <div v-if="allSpellLevels.length > 0" class="pt-2 border-t border-gray-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Spell Slot Tracker</span>
              <button
                type="button"
                @click="restoreAllSlots"
                class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
              >
                Restore All (Long Rest)
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                v-for="lvl in allSpellLevels"
                :key="lvl"
                class="bg-white border border-gray-200 rounded p-2 flex flex-col justify-between"
              >
                <div class="flex justify-between items-center mb-1.5">
                  <span class="font-bold text-gray-800 text-[11px]">Level {{ lvl }}</span>
                  <span class="font-mono text-[10px] text-gray-500">
                    {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="slotIdx in getMaxSlots(lvl)"
                    :key="slotIdx"
                    type="button"
                    :disabled="isSlotDisabled(lvl, slotIdx)"
                    @click="toggleSlot(lvl, slotIdx)"
                    :class="[
                      'w-4 h-4 rounded text-[9px] font-mono font-bold transition flex items-center justify-center',
                      !isSlotExpended(lvl, slotIdx)
                        ? 'bg-gray-800 text-white hover:bg-gray-900'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200',
                      isSlotDisabled(lvl, slotIdx)
                        ? 'opacity-40 cursor-not-allowed hover:bg-inherit'
                        : 'cursor-pointer hover:scale-105 active:scale-95'
                    ]"
                    :title="isSlotDisabled(lvl, slotIdx) ? 'Click previous slot first' : (isSlotExpended(lvl, slotIdx) ? `Restore slot ${slotIdx}` : `Expend slot ${slotIdx}`)"
                  >
                    {{ slotIdx }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cantrips List -->
        <div v-if="sheetCantrips.length > 0" class="space-y-2">
          <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Cantrips (Level 0)</h3>
          <div class="space-y-1.5">
            <div
              v-for="sp in sheetCantrips"
              :key="sp.id || sp.name"
              class="border border-gray-200 rounded bg-white overflow-hidden"
            >
              <div class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                <div
                  @click="toggleSpell('sp_' + (sp.id || sp.name))"
                  class="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                >
                  <span class="font-bold text-gray-900 truncate">{{ sp.name }}</span>
                  <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600">
                    {{ sp.school }}
                  </span>
                  <span v-if="sp.source" class="text-[10px] font-mono text-gray-400">
                    {{ sp.source }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                    <button
                      type="button"
                      @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Spell Attack"
                    >
                      Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                    </button>
                    <button
                      v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                  </template>

                  <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                    <span
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                      title="Target Saving Throw"
                    >
                      DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                    </span>
                    <button
                      v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                  </template>

                  <button
                    type="button"
                    @click="castSpell(sp)"
                    class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Cast Cantrip"
                  >
                    Cast
                  </button>

                  <button
                    type="button"
                    @click="toggleSpell('sp_' + (sp.id || sp.name))"
                    class="font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>
              </div>

              <!-- Spell Expanded Detail -->
              <div
                v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
              >
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                  <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                  <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                  <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                  <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                </div>

                <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                  <div
                    v-for="(ent, eIdx) in getSpellEntries(sp)"
                    :key="eIdx"
                    v-html="renderAnnotatedText(formatSpellEntry(ent))"
                  ></div>
                </div>
                <p v-else class="text-gray-400 italic">No rules text recorded.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Leveled Spells List -->
        <div v-if="sheetLeveledSpells.length > 0" class="space-y-4">
          <div
            v-for="lvl in activeSpellsByLevel"
            :key="lvl"
            class="space-y-2"
          >
            <div class="flex items-center justify-between pb-1 border-b border-gray-200">
              <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                Level {{ lvl }} Spells
              </h3>
              <span class="text-[10px] text-gray-500 font-mono">
                Slots Available: {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
              </span>
            </div>

            <div class="space-y-1.5">
              <div
                v-for="sp in getSpellsAtLevel(lvl)"
                :key="sp.id || sp.name"
                class="border border-gray-200 rounded bg-white overflow-hidden"
              >
                <div class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                  <div
                    @click="toggleSpell('sp_' + (sp.id || sp.name))"
                    class="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                  >
                    <span class="font-bold text-gray-900 truncate">{{ sp.name }}</span>
                    <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600">
                      {{ sp.school }}
                    </span>
                    <span v-if="sp.concentration" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold">
                      Conc
                    </span>
                    <span v-if="sp.ritual" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold">
                      Ritual
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                      <button
                        type="button"
                        @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Spell Attack"
                      >
                        Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                      </button>
                      <button
                        v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                        type="button"
                        @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Damage"
                      >
                        Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                      </button>
                    </template>

                    <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                      <span
                        class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                        title="Target Saving Throw"
                      >
                        DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                      </span>
                      <button
                        v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                        type="button"
                        @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Damage"
                      >
                        Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                      </button>
                    </template>

                    <button
                      type="button"
                      @click="castSpell(sp)"
                      :disabled="getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0"
                      :class="[
                        'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                        (getMaxSlots(lvl) === 0 || getAvailableSlots(lvl) > 0)
                          ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      ]"
                      :title="(getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0) ? 'No spell slots remaining at this level' : 'Cast Spell & Expend Slot'"
                    >
                      Cast
                    </button>

                    <button
                      type="button"
                      @click="toggleSpell('sp_' + (sp.id || sp.name))"
                      class="font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                    >
                      {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                    </button>
                  </div>
                </div>

                <!-- Spell Expanded Detail -->
                <div
                  v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                  class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
                >
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                    <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                    <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                    <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                    <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                  </div>

                  <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                    <div
                      v-for="(ent, eIdx) in getSpellEntries(sp)"
                      :key="eIdx"
                      v-html="renderAnnotatedText(formatSpellEntry(ent))"
                    ></div>
                  </div>
                  <p v-else class="text-gray-400 italic">No rules text recorded.</p>

                  <div v-if="getSpellHigherLevels(sp).length" class="pt-2 border-t border-gray-100">
                    <h5 class="font-bold text-gray-800 text-[11px] mb-1">Using Higher-Level Slots:</h5>
                    <div
                      v-for="(hl, hIdx) in getSpellHigherLevels(sp)"
                      :key="hIdx"
                      v-html="renderAnnotatedText(formatSpellEntry(hl))"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-6 bg-gray-50 border border-gray-200 rounded text-center text-gray-500">
        <p class="font-bold text-gray-700 text-sm mb-1">No Spells Known</p>
        <p class="text-xs">This character does not currently have spells or spell slots recorded.</p>
      </div>
    </div>

    <!-- TAB: Skills -->
    <div v-else-if="activeTab === 'skills'" class="space-y-3 text-xs">
      <!-- Legend -->
      <div class="flex items-center gap-3 sm:gap-4 text-[11px] text-gray-500 pb-2 border-b border-gray-200 flex-wrap">
        <span class="font-semibold text-gray-700">Proficiency:</span>
        <span class="inline-flex items-center gap-1.5">
          <IconStarFilled class="w-3.5 h-3.5 text-gray-900" />
          <span>Expertise</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-gray-800 inline-block"></span>
          <span>Proficient</span>
        </span>
        <span v-if="hasJackOfAllTrades" class="inline-flex items-center gap-1.5" title="Bard: Jack of All Trades (+½ PB rounded down)">
          <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
          <span>Jack of All Trades</span>
        </span>
        <span v-else-if="hasRemarkableAthlete" class="inline-flex items-center gap-1.5" title="Champion: Remarkable Athlete (+½ PB rounded up)">
          <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
          <span>Remarkable Athlete</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"></span>
          <span>Not Proficient</span>
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="(sk, sName) in computedSkills"
          :key="sName"
          class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition"
        >
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 flex items-center justify-center shrink-0">
              <IconStarFilled
                v-if="sk.expertise"
                class="w-3.5 h-3.5 text-gray-900"
                title="Expertise"
              />
              <span
                v-else-if="sk.proficient"
                class="w-2.5 h-2.5 rounded-full bg-gray-800"
                title="Proficient"
              ></span>
              <span
                v-else-if="sk.jack_of_all_trades"
                class="font-mono font-bold text-[11px] text-gray-800"
                title="Jack of All Trades (+½ PB rounded down)"
              >½</span>
              <span
                v-else-if="sk.remarkable_athlete"
                class="font-mono font-bold text-[11px] text-gray-800"
                title="Remarkable Athlete (+½ PB rounded up)"
              >½</span>
              <span
                v-else
                class="w-2.5 h-2.5 rounded-full border border-gray-300"
                title="Not Proficient"
              ></span>
            </span>
            <span class="capitalize font-medium text-gray-800">{{ sName.replace(/_/g, ' ') }}</span>
            <span class="text-[10px] text-gray-400 uppercase">({{ sk.ability.slice(0, 3) }})</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-mono text-[11px]">Passive {{ sk.passive }}</span>
            <button
              type="button"
              @click="rollDice(`${sName.replace(/_/g, ' ').toUpperCase()} Check`, sk.total)"
              class="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-mono font-bold transition cursor-pointer text-xs"
            >
              {{ sk.modifier_string }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Features & Traits (Full Explanations) -->
    <div v-else-if="activeTab === 'features'" class="space-y-4 text-xs">
      <div class="flex items-center justify-end pb-1 border-b border-gray-100">
        <button
          type="button"
          @click="expandAllFeatures(allFeatureKeys)"
          class="text-xs text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
        >
          Toggle All
        </button>
      </div>

      <!-- Class Features -->
      <div v-if="filteredClassFeatures.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Class Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="cf in filteredClassFeatures"
            :key="cf.id || cf.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('cf_' + (cf.id || cf.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-gray-900">{{ cf.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                  Level {{ cf.level }}
                </span>
                <span v-if="isOptionalFeature(cf)" class="text-[11px] font-medium text-gray-600">
                  Optional Feature
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['cf_' + (cf.id || cf.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['cf_' + (cf.id || cf.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="cf.entries && cf.entries.length" v-html="renderAnnotatedText(format5eEntries(cf.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Subclass Features -->
      <div v-if="filteredSubClassFeatures.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Subclass Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="scf in filteredSubClassFeatures"
            :key="scf.id || scf.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('scf_' + (scf.id || scf.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-gray-900">{{ scf.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                  Level {{ scf.level }}
                </span>
                <span class="text-[11px] font-medium text-gray-600">
                  Subclass Feature
                </span>
                <span v-if="isOptionalFeature(scf)" class="text-[11px] font-medium text-gray-600">
                  Optional Feature
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['scf_' + (scf.id || scf.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['scf_' + (scf.id || scf.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="scf.entries && scf.entries.length" v-html="renderAnnotatedText(format5eEntries(scf.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Species / Race Traits -->
      <div v-if="char.trait?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Species & Lineage Traits</h3>
        <div class="space-y-1.5">
          <div
            v-for="tr in char.trait"
            :key="tr.id || tr.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('tr_' + (tr.id || tr.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ tr.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Species Trait</span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['tr_' + (tr.id || tr.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['tr_' + (tr.id || tr.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="tr.entries && tr.entries.length" v-html="renderAnnotatedText(format5eEntries(tr.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Background Features -->
      <div v-if="char.feature?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Background Feature</h3>
        <div class="space-y-1.5">
          <div
            v-for="feat in char.feature"
            :key="feat.id || feat.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('bf_' + (feat.id || feat.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ feat.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Background</span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['bf_' + (feat.id || feat.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['bf_' + (feat.id || feat.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="feat.entries && feat.entries.length" v-html="renderAnnotatedText(format5eEntries(feat.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Feats -->
      <div v-if="char.feat?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Feats</h3>
        <div class="space-y-1.5">
          <div
            v-for="ft in char.feat"
            :key="ft.id || ft.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('ft_' + (ft.id || ft.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ ft.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                  Feat
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['ft_' + (ft.id || ft.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['ft_' + (ft.id || ft.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="ft.entries && ft.entries.length" v-html="renderAnnotatedText(format5eEntries(ft.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Languages -->
      <div v-if="char.language?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Languages Known</h3>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="lang in char.language"
            :key="lang.id || lang.name"
            class="bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded font-medium"
          >
            {{ lang.name }}
          </span>
        </div>
      </div>

      <!-- Proficiencies (Tools, Armor, Weapons) -->
      <div v-if="char.proficiency?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Proficiencies & Training</h3>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="p in char.proficiency"
            :key="p.id || p.name"
            class="bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200"
          >
            {{ cleanProficiencyName(p.name) }}
          </span>
        </div>
      </div>
    </div>

    <!-- TAB 3: Equipment & Wealth -->
    <div v-else-if="activeTab === 'equipment'" class="space-y-4 text-xs">
      <!-- Currency Pouch (Interactive) -->
      <div class="bg-gray-50 p-3.5 rounded border border-gray-200">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Wealth & Currency</h3>
          <span v-if="currencySavedToast" class="text-[10px] text-green-600 font-semibold transition">Saved</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <!-- PP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">PP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('pp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.pp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('pp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- GP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">GP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('gp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.gp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
              />
              <button
                type="button"
                @click="adjustCurrency('gp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- EP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">EP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('ep', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.ep"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('ep', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- SP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">SP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('sp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.sp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('sp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- CP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">CP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('cp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.cp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
              />
              <button
                type="button"
                @click="adjustCurrency('cp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Encumbrance Bar Widget -->
      <div class="p-3 bg-gray-50 border border-gray-200 space-y-2">
        <div class="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>Weight / Carrying Capacity</span>
          <span class="text-[11px] font-normal text-gray-500">{{ Math.round((totalWeight / (carryCapacity || 1)) * 100) }}%</span>
        </div>

        <div class="relative w-full bg-gray-200 h-6 overflow-hidden border border-gray-300">
          <div
            class="h-full transition-all duration-300"
            :class="weightBarColor"
            :style="{ width: `${weightPercent}%` }"
          ></div>
          <div
            class="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none tracking-tight"
            :class="weightPercent > 55 ? 'text-white drop-shadow-xs' : 'text-gray-900'"
          >
            {{ totalWeight.toFixed(1) }} / {{ carryCapacity }} lbs
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px]">
          <span class="text-gray-500">
            Status: <span class="font-bold" :class="weightStatusTextColor">{{ weightStatusLabel }}</span>
          </span>
          <span class="text-gray-500">
            Max: <strong class="text-gray-800">{{ carryCapacity }} lbs</strong>
          </span>
        </div>
      </div>

      <!-- Equipment Table -->
      <div class="bg-white border border-gray-200 rounded overflow-hidden">
        <div class="p-2.5 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 uppercase tracking-wider text-[11px] flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span>Inventory Items</span>
            <span class="text-[10px] text-gray-500 font-normal">({{ liveEquipment.length }} items)</span>
            <span v-if="equipmentSavedToast" class="text-[10px] text-green-600 font-semibold">Saved</span>
          </div>
          <button
            type="button"
            @click="openCompendiumModal"
            class="bg-gray-800 hover:bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
          >
            Add Item
          </button>
        </div>

        <div v-if="liveEquipment.length === 0" class="p-6 text-center text-gray-400 italic">
          No equipment or gear recorded.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/50 text-[11px] text-gray-500 font-medium">
                <th class="py-2 px-3">Item Name</th>
                <th class="py-2 px-3 text-center">Status</th>
                <th class="py-2 px-3 text-center">Qty</th>
                <th class="py-2 px-3 text-right">Weight</th>
                <th class="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(eq, eIdx) in liveEquipment" :key="eIdx" class="hover:bg-gray-50">
                <td class="py-2 px-3 font-medium text-gray-800">
                  <span>{{ eq.name }}</span>
                  <span v-if="eq.is_armor" class="ml-1.5 text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-mono">
                    Armor
                  </span>
                </td>
                <td class="py-2 px-3 text-center">
                  <button
                    type="button"
                    @click="toggleEquipStatus(eIdx)"
                    :class="eq.status === 'equipped' ? 'bg-gray-200 text-gray-800 border-gray-300 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
                    class="px-2 py-0.5 text-[10px] rounded border transition cursor-pointer capitalize"
                  >
                    {{ eq.status === 'equipped' ? 'Equipped' : 'Inventory' }}
                  </button>
                </td>
                <td class="py-2 px-3 text-center font-mono">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      @click="changeItemAmount(eIdx, -1)"
                      class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                    >-</button>
                    <span class="w-6 text-center text-xs font-semibold">{{ eq.amount || 1 }}</span>
                    <button
                      type="button"
                      @click="changeItemAmount(eIdx, 1)"
                      class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                    >+</button>
                  </div>
                </td>
                <td class="py-2 px-3 text-right font-mono text-gray-600">{{ eq.weight || '0' }} lb</td>
                <td class="py-2 px-3 text-right">
                  <button
                    type="button"
                    @click="removeItem(eIdx)"
                    class="text-gray-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer transition"
                    title="Remove Item"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Compendium Item Picker Modal -->
    <div
      v-if="isCompendiumOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 text-xs space-y-3 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Add Item from Compendium</h3>
          <button
            type="button"
            @click="isCompendiumOpen = false"
            class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
          >
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="compendiumSearch"
            @keyup.enter="searchCompendiumItems"
            placeholder="Search weapon, armor, potion..."
            class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-500"
          />
          <div class="flex gap-2">
            <select
              v-model="compendiumCategory"
              @change="searchCompendiumItems"
              class="flex-1 sm:flex-initial p-2 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="all">All Types</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor & Shield</option>
            </select>
            <button
              type="button"
              @click="searchCompendiumItems"
              class="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        <!-- Results List -->
        <div
          @scroll="onCompendiumScroll"
          class="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[220px]"
        >
          <div v-if="compendiumLoading" class="py-10 text-center text-gray-400">
            Searching items...
          </div>
          <div v-else-if="compendiumResults.length === 0" class="py-10 text-center text-gray-400 italic">
            No items found. Try another search query.
          </div>
          <template v-else>
            <div
              v-for="it in compendiumResults"
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
                @click="addItemFromCompendium(it)"
                class="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
              >
                Add
              </button>
            </div>

            <div v-if="compendiumHasMore" class="p-2 text-center border-t border-gray-100">
              <button
                type="button"
                :disabled="compendiumLoadingMore"
                @click="searchCompendiumItems(true)"
                class="text-xs text-gray-700 hover:text-gray-900 font-medium py-1 px-3 border border-gray-300 rounded hover:bg-gray-100 cursor-pointer"
              >
                {{ compendiumLoadingMore ? 'Loading more...' : 'Load more items' }}
              </button>
            </div>
          </template>
        </div>

        <div class="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            @click="isCompendiumOpen = false"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Background -->
    <div v-else-if="activeTab === 'background'" class="space-y-4 text-xs">
      <!-- Background Header -->
      <div class="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-gray-900">{{ char.background || 'Custom Background' }}</h2>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-gray-100 text-gray-700 border border-gray-200">
            {{ char.edition || '2024' }} Edition
          </span>
          <span v-if="bgCompendiumData?.source" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-200 text-gray-700">
            {{ bgCompendiumData.source }}
          </span>
        </div>
      </div>

      <!-- Quick Background Benefits Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        <!-- Origin Feat -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Origin Feat</div>
          <div class="font-bold text-gray-900 text-sm">
            {{ formatOriginFeatName() || 'None' }}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5">Granted at 1st level by background</p>
        </div>

        <!-- Ability Score Increases -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Ability Scores</div>
          <div class="font-bold text-gray-900 text-sm">
            {{ formatBgAbilityScores() || 'Standard' }}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5">Key abilities associated with background</p>
        </div>

        <!-- Skill Proficiencies -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Skill Proficiencies</div>
          <div class="font-semibold text-gray-900 text-xs flex flex-wrap gap-1">
            <span
              v-for="sk in formatBgSkills()"
              :key="sk"
              class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px]"
            >
              {{ sk }}
            </span>
            <span v-if="!formatBgSkills().length" class="text-gray-400">—</span>
          </div>
        </div>

        <!-- Tool Proficiencies -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Tool Proficiencies</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgTools() || 'None' }}
          </div>
        </div>

        <!-- Languages -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Languages</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgLanguages() || 'Standard' }}
          </div>
        </div>

        <!-- Starting Equipment -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Starting Gear Package</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgEquipmentSummary() || 'Standard Background Package' }}
          </div>
        </div>
      </div>

      <!-- Narrative & Background Rules Entries -->
      <div class="p-4 bg-white border border-gray-200 rounded space-y-3">
        <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px] pb-1 border-gray-200 flex items-center justify-between">
          <span>Background Rules & Description</span>
          <span v-if="isFetchingBg" class="text-gray-500 font-normal lowercase animate-pulse">Loading compendium details...</span>
        </h3>

        <!-- Compendium Entries -->
        <div v-if="bgCompendiumData?.entries && bgCompendiumData.entries.length" class="space-y-2 text-gray-700 leading-relaxed text-xs">
          <div v-html="renderAnnotatedText(format5eEntries(bgCompendiumData.entries))"></div>
        </div>
        <div v-else-if="!isFetchingBg" class="text-gray-500 italic">
          No detailed compendium text found for this background.
        </div>

        <!-- Background Features (e.g. 2014) -->
        <div v-if="char.feature && char.feature.length" class="pt-3 border-t border-gray-200 space-y-2">
          <h4 class="font-bold text-gray-900 text-xs">Background Features</h4>
          <div v-for="bf in char.feature" :key="bf.id || bf.name" class="p-2.5 bg-gray-50 rounded border border-gray-200">
            <div class="font-bold text-gray-900 text-xs">{{ bf.name }}</div>
            <div v-if="bf.entries && bf.entries.length" class="mt-1 text-gray-700 text-xs leading-relaxed" v-html="renderAnnotatedText(format5eEntries(bf.entries))"></div>
          </div>
        </div>

        <!-- Roleplay Characteristics -->
        <div v-if="char.alignment || char.traits || char.description" class="pt-3 border-t border-gray-200 space-y-2">
          <h4 class="font-bold text-gray-900 text-xs">Roleplay & Characteristics</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2 bg-gray-50 rounded border border-gray-200">
              <span class="text-gray-500 font-semibold block text-[10px] uppercase">Alignment</span>
              <span class="text-gray-900 font-medium">{{ char.alignment || 'Neutral' }}</span>
            </div>
            <div v-if="char.traits" class="p-2 bg-gray-50 rounded border border-gray-200">
              <span class="text-gray-500 font-semibold block text-[10px] uppercase">Personality</span>
              <span class="text-gray-900">{{ char.traits }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: Roll History -->
    <div v-else-if="activeTab === 'history'" class="space-y-1.5 text-xs">
      <div
        v-for="(h, idx) in rollHistory"
        :key="idx"
        class="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 font-mono"
      >
        <div>
          <span class="text-gray-400 mr-2 text-[11px]">{{ h.timestamp }}</span>
          <span class="text-gray-800 font-semibold">{{ h.label }}</span>
        </div>
        <div>
          <span class="text-gray-500 mr-2 text-[11px]">({{ h.breakdown || h.formula }})</span>
          <span
            class="text-xs font-bold"
            :class="h.isNat20 ? 'text-amber-600' : (h.isNat1 ? 'text-red-600' : 'text-gray-900')"
          >
            {{ h.total }}
          </span>
        </div>
      </div>
    </div>

    <!-- Floating Dice Roller FAB (Bottom-Right) -->
    <div class="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
      <!-- Popover Menu -->
      <transition name="fade">
        <div
          v-if="isDiceTrayOpen"
          class="absolute bottom-14 right-0 w-72 max-w-[calc(100vw-24px)] bg-white border border-gray-200 rounded-xl shadow-2xl p-3.5 text-xs space-y-3 z-50 select-none"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <span class="font-bold text-gray-800 text-[11px] uppercase tracking-wider">Quick Dice Roller</span>
            <button
              type="button"
              @click="isDiceTrayOpen = false"
              class="text-gray-400 hover:text-gray-700 font-bold text-sm cursor-pointer p-0.5 leading-none"
            >
              ×
            </button>
          </div>

          <!-- Roll Advantage/Disadvantage Mode for d20 -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-gray-600 font-medium">d20 Mode:</span>
            <div class="inline-flex rounded border border-gray-200 overflow-hidden text-[10px]">
              <button
                type="button"
                @click="diceRollMode = 'normal'"
                :class="diceRollMode === 'normal' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Normal
              </button>
              <button
                type="button"
                @click="diceRollMode = 'adv'"
                :class="diceRollMode === 'adv' ? 'bg-green-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer border-l border-r border-gray-200"
              >
                Adv
              </button>
              <button
                type="button"
                @click="diceRollMode = 'dis'"
                :class="diceRollMode === 'dis' ? 'bg-red-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Dis
              </button>
            </div>
          </div>

          <!-- Multiplier & Modifier Row -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Quantity</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="diceMultiplier = Math.max(1, diceMultiplier - 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  v-model.number="diceMultiplier"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="diceMultiplier = Math.min(20, diceMultiplier + 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Modifier</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="diceMod--"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  v-model.number="diceMod"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="diceMod++"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>
          </div>

          <!-- Dice Buttons Grid -->
          <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-gray-100">
            <button
              v-for="d in STANDARD_DICE"
              :key="d"
              type="button"
              @click="quickRollDie(d)"
              class="py-2 px-1 bg-gray-50 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 rounded font-mono font-bold text-xs text-center transition cursor-pointer"
            >
              d{{ d }}
            </button>
          </div>
        </div>
      </transition>

      <!-- The FAB Circle Button -->
      <button
        type="button"
        @click="isDiceTrayOpen = !isDiceTrayOpen"
        class="w-12 h-12 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-95 border-2 border-white"
        title="Open Dice Roller"
      >
        <span v-if="!isDiceTrayOpen" class="font-mono text-xs font-bold">d20</span>
        <span v-else class="text-base font-bold leading-none">×</span>
      </button>
    </div>

    <!-- Floating Dice Roll Result Toast (Bottom-Left on Desktop, Centered on Mobile) -->
    <transition name="fade">
      <div
        v-if="lastRoll"
        class="fixed bottom-5 left-4 sm:left-6 z-50 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:bottom-5 max-sm:w-[92vw] sm:w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-3 text-xs"
        :class="lastRoll.isNat20 ? 'ring-2 ring-amber-400' : (lastRoll.isNat1 ? 'ring-2 ring-red-400' : '')"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-bold uppercase">ROLL</span>
            <span class="font-bold text-gray-900 text-xs truncate max-w-[170px]">{{ lastRoll.label }}</span>
          </div>
          <button
            type="button"
            @click="lastRoll = null"
            class="text-gray-400 hover:text-gray-700 text-sm font-bold leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div class="flex items-baseline justify-between mt-2 pt-1.5 border-t border-gray-100">
          <div>
            <div class="text-2xl font-bold text-gray-900 leading-none">{{ lastRoll.total }}</div>
            <div class="text-[11px] text-gray-500 font-mono mt-0.5">{{ lastRoll.breakdown || lastRoll.formula }}</div>
          </div>
          <div>
            <span v-if="lastRoll.isNat20" class="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded uppercase">Natural 20</span>
            <span v-else-if="lastRoll.isNat1" class="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded uppercase">Critical Miss</span>
            <span v-else class="text-[10px] text-gray-400 font-mono">{{ lastRoll.timestamp }}</span>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
