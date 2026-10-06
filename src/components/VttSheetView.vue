<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { renderAnnotatedText, renderTableCell, clean5eToolsMarkup } from '../utils/textRenderer'
import { useConfig } from '../config'

const API_URL = useConfig().API_URL

const props = defineProps({
  character: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['back', 'create', 'edit'])

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
  return Number(char.value.ability_score?.strength || 10)
})
const carryCapacity = computed(() => strScore.value * 15)

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
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + mod
  const isNat20 = d20 === 20
  const isNat1 = d20 === 1

  const result = {
    label,
    d20,
    mod,
    total,
    isNat20,
    isNat1,
    formula: formula || (mod >= 0 ? `1d20+${mod}` : `1d20${mod}`),
    breakdown: `d20 (${d20}) ${mod >= 0 ? '+' : ''}${mod}`,
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

const activeTab = ref('skills') // 'skills' | 'features' | 'equipment' | 'history'

// Features expand/collapse state
const expandedFeatures = ref({})
const toggleFeature = (id) => {
  expandedFeatures.value[id] = !expandedFeatures.value[id]
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
const toggleSlotUse = (lvl, slotIdx) => {
  const key = `${lvl}_${slotIdx}`
  expendedSlots.value[key] = !expendedSlots.value[key]
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
  const count = Math.max(1, Number(diceMultiplier.value) || 1)
  const mod = Number(diceMod.value) || 0
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

watch(() => activeTab.value, (newTab) => {
  if (newTab === 'spells') {
    charSpells.value.forEach(sp => {
      fetchSpellDetailsIfNeeded(sp)
    })
  }
})

watch(() => charSpells.value, (list) => {
  if (activeTab.value === 'spells' && Array.isArray(list)) {
    list.forEach(sp => fetchSpellDetailsIfNeeded(sp))
  }
}, { immediate: true })
</script>

<template>
  <div class="max-w-4xl mx-2 sm:mx-auto my-4 sm:my-6 p-3.5 sm:p-6 bg-white text-gray-800 rounded border border-gray-200 shadow-sm font-sans pb-24">
    
    <!-- Top Header Bar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-200 gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ char.name || 'Hero' }}</h1>
          <span
            class="text-[10px] px-2 py-0.5 rounded font-semibold border"
            :class="char.edition === '2024' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-amber-50 border-amber-200 text-amber-700'"
          >
            {{ char.edition === '2024' ? '2024 One D&D' : '2014 5e' }}
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Level {{ char.level || 1 }} 
          <span class="text-gray-900 font-semibold">{{ classSummary }}</span>
          • <span>{{ char.race?.name || 'Unknown Species' }}</span>
          • <span>{{ char.background || 'No Background' }}</span>
          • <span>{{ char.alignment || 'Neutral' }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="emit('back')"
          class="text-xs bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded border border-gray-300 font-medium transition cursor-pointer"
        >
          Character List
        </button>
        <button
          type="button"
          @click="emit('edit', char.id)"
          class="text-xs bg-white hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-200 hover:border-indigo-300 font-medium transition cursor-pointer"
        >
          Edit Character
        </button>
        <button
          type="button"
          @click="emit('create')"
          class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-medium transition cursor-pointer"
        >
          Create Character
        </button>
      </div>
    </div>

    <!-- Core Combat Vitals Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2.5 my-4">
      <!-- AC -->
      <div class="bg-gray-50 p-2.5 rounded border border-gray-200 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-semibold">Armor Class</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ currentArmorClass }}</div>
      </div>

      <!-- Initiative -->
      <button
        type="button"
        @click="rollDice('Initiative', vtt.combat?.initiative || 0)"
        class="bg-gray-50 hover:bg-gray-100 p-2.5 rounded border border-gray-200 text-center transition cursor-pointer group"
      >
        <div class="text-[10px] text-gray-500 uppercase font-semibold group-hover:text-indigo-600">Initiative</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">
          {{ (vtt.combat?.initiative || 0) >= 0 ? '+' : '' }}{{ vtt.combat?.initiative || 0 }}
        </div>
      </button>

      <!-- Speed -->
      <div class="bg-gray-50 p-2.5 rounded border border-gray-200 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-semibold">Speed</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ char.speed || 30 }} <span class="text-xs font-normal text-gray-500">ft</span></div>
      </div>

      <!-- Proficiency Bonus -->
      <div class="bg-gray-50 p-2.5 rounded border border-gray-200 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-semibold">Prof. Bonus</div>
        <div class="text-xl font-bold text-indigo-600 mt-0.5">+{{ vtt.proficiency_bonus || char.proficiency_bonus || 2 }}</div>
      </div>

      <!-- Hit Dice -->
      <div class="bg-gray-50 p-2.5 rounded border border-gray-200 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-semibold">Hit Dice</div>
        <div class="text-lg font-bold text-gray-900 mt-0.5">{{ char.hit_dice || '1d8' }}</div>
      </div>

      <!-- Passive Perception -->
      <div class="bg-gray-50 p-2.5 rounded border border-gray-200 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-semibold">Passive Perc.</div>
        <div class="text-xl font-bold text-gray-900 mt-0.5">{{ vtt.senses?.passive_perception || 10 }}</div>
      </div>
    </div>

    <!-- Hit Points Interactive Widget -->
    <div class="bg-gray-50 rounded p-3.5 border border-gray-200 mb-5">
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-600">Hit Points</span>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-2xl font-bold" :class="currentHp <= (maxHp/3) ? 'text-red-600' : 'text-gray-900'">
              {{ currentHp }}
            </span>
            <span class="text-gray-500 text-xs">/ {{ maxHp }} Max</span>
            <span v-if="tempHp > 0" class="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded font-mono">+{{ tempHp }} Temp</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="number"
            min="1"
            v-model="hpInput"
            class="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-center text-xs font-semibold"
          />
          <button
            type="button"
            @click="applyDamage"
            class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded font-medium transition cursor-pointer"
          >
            Damage
          </button>
          <button
            type="button"
            @click="applyHeal"
            class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded font-medium transition cursor-pointer"
          >
            Heal
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
          class="text-xl font-bold text-gray-900 hover:text-indigo-600 transition cursor-pointer my-0.5"
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
          :class="vtt.saving_throws?.[name]?.proficient ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
        >
          Save {{ vtt.saving_throws?.[name]?.modifier_string || stat.modifier_string }}
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="flex gap-2 border-b border-gray-200 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
      <button
        type="button"
        @click="activeTab = 'skills'"
        :class="activeTab === 'skills' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap"
      >
        Skills & Checks (18)
      </button>
      <button
        type="button"
        @click="activeTab = 'features'"
        :class="activeTab === 'features' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap"
      >
        Features & Traits
      </button>
      <button
        type="button"
        @click="activeTab = 'equipment'"
        :class="activeTab === 'equipment' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap"
      >
        Equipment & Wealth ({{ liveEquipment.length }})
      </button>
      <button
        type="button"
        v-if="charSpells.length > 0 || isCaster"
        @click="activeTab = 'spells'"
        :class="activeTab === 'spells' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap"
      >
        Spells ({{ charSpells.length }})
      </button>
      <button
        type="button"
        v-if="rollHistory.length"
        @click="activeTab = 'history'"
        :class="activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap"
      >
        Roll History ({{ rollHistory.length }})
      </button>
    </div>

    <!-- TAB 1: Skills -->
    <div v-if="activeTab === 'skills'" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div
        v-for="(sk, sName) in vtt.skills"
        :key="sName"
        class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="sk.expertise ? 'bg-amber-500 ring-1 ring-amber-400' : (sk.proficient ? 'bg-indigo-600' : 'bg-gray-300')"
            :title="sk.expertise ? 'Expertise' : (sk.proficient ? 'Proficient' : 'Not Proficient')"
          ></span>
          <span class="capitalize font-medium text-gray-800">{{ sName.replace(/_/g, ' ') }}</span>
          <span class="text-[10px] text-gray-400 uppercase">({{ sk.ability.slice(0, 3) }})</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-gray-500 font-mono text-[11px]">Passive {{ sk.passive }}</span>
          <button
            type="button"
            @click="rollDice(`${sName.replace(/_/g, ' ').toUpperCase()} Check`, sk.total)"
            class="px-2 py-0.5 rounded bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 text-gray-800 font-mono font-bold transition cursor-pointer text-xs"
          >
            {{ sk.modifier_string }}
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: Features & Traits (Full Explanations) -->
    <div v-else-if="activeTab === 'features'" class="space-y-4 text-xs">
      <div class="flex items-center justify-between pb-1 border-b border-gray-100">
        <span class="text-gray-500 text-[11px]">Click any feature to expand or collapse rules explanation.</span>
        <button
          type="button"
          @click="expandAllFeatures(allFeatureKeys)"
          class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
        >
          Toggle All
        </button>
      </div>

      <!-- Class Features -->
      <div v-if="char.class_feature?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Class Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="cf in char.class_feature"
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
                <span v-if="isOptionalFeature(cf)" class="text-[11px] font-medium text-amber-600">
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
              <template v-if="cf.entries && cf.entries.length">
                <div v-for="(entry, eIdx) in cf.entries" :key="eIdx">
                  <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
                  <div v-else-if="entry.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                    <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                      <caption v-if="entry.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                        {{ entry.caption }}
                      </caption>
                      <thead class="bg-gray-50">
                        <tr>
                          <th
                            v-for="(h, hIdx) in (entry.colLabels || [])"
                            :key="hIdx"
                            class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                            v-html="renderTableCell(h)"
                          ></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="(r, rIdx) in (entry.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                          <td
                            v-for="(c, cIdx) in r"
                            :key="cIdx"
                            class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                            v-html="renderTableCell(c)"
                          ></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else-if="typeof entry === 'object' && entry.name" class="mt-1">
                    <span class="font-bold text-gray-800">{{ entry.name }}: </span>
                    <span v-if="entry.entries">{{ entry.entries.map(renderAnnotatedText).join(' ') }}</span>
                  </div>
                </div>
              </template>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Subclass Features -->
      <div v-if="char.sub_class_feature?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Subclass Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="scf in char.sub_class_feature"
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
                <span class="text-[11px] font-medium text-indigo-600">
                  Subclass Feature
                </span>
                <span v-if="isOptionalFeature(scf)" class="text-[11px] font-medium text-amber-600">
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
              <template v-if="scf.entries && scf.entries.length">
                <div v-for="(entry, eIdx) in scf.entries" :key="eIdx">
                  <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
                  <div v-else-if="entry.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                    <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                      <caption v-if="entry.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                        {{ entry.caption }}
                      </caption>
                      <thead class="bg-gray-50">
                        <tr>
                          <th
                            v-for="(h, hIdx) in (entry.colLabels || [])"
                            :key="hIdx"
                            class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                            v-html="renderTableCell(h)"
                          ></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="(r, rIdx) in (entry.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                          <td
                            v-for="(c, cIdx) in r"
                            :key="cIdx"
                            class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                            v-html="renderTableCell(c)"
                          ></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else-if="typeof entry === 'object' && entry.name" class="mt-1">
                    <span class="font-bold text-gray-800">{{ entry.name }}: </span>
                    <span v-if="entry.entries">{{ entry.entries.map(renderAnnotatedText).join(' ') }}</span>
                  </div>
                </div>
              </template>
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
              <template v-if="tr.entries && tr.entries.length">
                <div v-for="(entry, eIdx) in tr.entries" :key="eIdx">
                  <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
                  <div v-else-if="entry.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                    <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                      <caption v-if="entry.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                        {{ entry.caption }}
                      </caption>
                      <thead class="bg-gray-50">
                        <tr>
                          <th
                            v-for="(h, hIdx) in (entry.colLabels || [])"
                            :key="hIdx"
                            class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                            v-html="renderTableCell(h)"
                          ></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="(r, rIdx) in (entry.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                          <td
                            v-for="(c, cIdx) in r"
                            :key="cIdx"
                            class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                            v-html="renderTableCell(c)"
                          ></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else-if="typeof entry === 'object' && entry.name" class="mt-1">
                    <span class="font-bold text-gray-800">{{ entry.name }}: </span>
                    <span v-if="entry.entries">{{ entry.entries.map(renderAnnotatedText).join(' ') }}</span>
                  </div>
                </div>
              </template>
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
              <template v-if="feat.entries && feat.entries.length">
                <div v-for="(entry, eIdx) in feat.entries" :key="eIdx">
                  <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
                  <div v-else-if="typeof entry === 'object' && entry.name" class="mt-1">
                    <span class="font-bold text-gray-800">{{ entry.name }}: </span>
                    <span v-if="entry.entries">{{ entry.entries.map(renderAnnotatedText).join(' ') }}</span>
                  </div>
                </div>
              </template>
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
              class="flex items-center justify-between p-2.5 bg-indigo-50/50 hover:bg-indigo-50 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ ft.name }}</span>
                <span class="text-[10px] bg-indigo-100 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-medium">
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
              <template v-if="ft.entries && ft.entries.length">
                <div v-for="(entry, eIdx) in ft.entries" :key="eIdx">
                  <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
                  <div v-else-if="entry.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                    <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                      <caption v-if="entry.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                        {{ entry.caption }}
                      </caption>
                      <thead class="bg-gray-50">
                        <tr>
                          <th
                            v-for="(h, hIdx) in (entry.colLabels || [])"
                            :key="hIdx"
                            class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                            v-html="renderTableCell(h)"
                          ></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="(r, rIdx) in (entry.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                          <td
                            v-for="(c, cIdx) in r"
                            :key="cIdx"
                            class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                            v-html="renderTableCell(c)"
                          ></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else-if="typeof entry === 'object' && entry.name" class="mt-1">
                    <span class="font-bold text-gray-800">{{ entry.name }}: </span>
                    <span v-if="entry.entries">{{ entry.entries.map(renderAnnotatedText).join(' ') }}</span>
                  </div>
                </div>
              </template>
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
          <div class="bg-white p-2 border border-amber-300 rounded bg-amber-50/20">
            <span class="text-[10px] text-amber-700 font-semibold uppercase block mb-1">GP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('gp', -1)"
                class="w-5 h-5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.gp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-amber-300 rounded py-0.5 text-amber-900"
              />
              <button
                type="button"
                @click="adjustCurrency('gp', 1)"
                class="w-5 h-5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs font-bold leading-none cursor-pointer"
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
          <div class="bg-white p-2 border border-orange-200 rounded">
            <span class="text-[10px] text-orange-700 font-semibold uppercase block mb-1">CP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('cp', -1)"
                class="w-5 h-5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.cp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-orange-200 rounded py-0.5 text-orange-900"
              />
              <button
                type="button"
                @click="adjustCurrency('cp', 1)"
                class="w-5 h-5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Encumbrance Bar -->
      <div class="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-[11px]">
        <div>
          <span class="font-semibold text-gray-700">Total Weight Carried: </span>
          <span class="font-bold text-gray-900">{{ totalWeight.toFixed(1) }} lbs</span>
        </div>
        <div>
          <span class="text-gray-500">Max Carrying Capacity: </span>
          <span class="font-bold text-gray-800">{{ carryCapacity }} lbs</span>
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
            class="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
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
                  <span v-if="eq.is_armor" class="ml-1.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-mono">
                    Armor
                  </span>
                </td>
                <td class="py-2 px-3 text-center">
                  <button
                    type="button"
                    @click="toggleEquipStatus(eIdx)"
                    :class="eq.status === 'equipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
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
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="compendiumSearch"
            @keyup.enter="searchCompendiumItems"
            placeholder="Search weapon, armor, potion..."
            class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-indigo-500"
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
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
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
                class="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
              >
                Add
              </button>
            </div>

            <div v-if="compendiumHasMore" class="p-2 text-center border-t border-gray-100">
              <button
                type="button"
                :disabled="compendiumLoadingMore"
                @click="searchCompendiumItems(true)"
                class="text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 px-3 border border-indigo-200 rounded hover:bg-indigo-50 cursor-pointer"
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

    <!-- TAB: Spells & Spellcasting -->
    <div v-else-if="activeTab === 'spells'" class="space-y-4 text-xs">
      <!-- Caster Stat Box -->
      <div class="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-2.5">
        <div class="flex items-center justify-between border-b border-gray-200 pb-2">
          <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Spellcasting Overview
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
            <div class="text-sm font-bold text-indigo-700 font-mono">{{ charSpellSaveDc }}</div>
          </div>

          <div class="bg-white border border-gray-200 rounded p-2">
            <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Attack Bonus</div>
            <button
              type="button"
              @click="rollDice('Spell Attack Roll', charSpellAttackBonus)"
              class="text-sm font-bold text-indigo-700 hover:text-indigo-900 transition font-mono cursor-pointer underline decoration-dotted"
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

        <!-- Spell Slot Trackers -->
        <div v-if="sheetSpellSlots.length > 0" class="pt-2 border-t border-gray-200 space-y-1.5">
          <div class="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
            Spell Slot Trackers (Click circle to expend/regain):
          </div>
          <div class="flex flex-wrap gap-2.5">
            <div
              v-for="sl in sheetSpellSlots"
              :key="sl.level"
              class="bg-white border border-gray-200 rounded px-2.5 py-1.5 flex items-center gap-2"
            >
              <span class="font-bold text-[11px] text-gray-800 font-mono">
                {{ sl.isPact ? `Pact Lv ${sl.level}:` : `Lv ${sl.level}:` }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  v-for="sIdx in sl.total"
                  :key="sIdx"
                  type="button"
                  @click="toggleSlotUse(sl.level, sIdx)"
                  class="w-4 h-4 rounded-full border transition cursor-pointer flex items-center justify-center text-[9px]"
                  :class="expendedSlots[`${sl.level}_${sIdx}`] ? 'bg-gray-300 border-gray-400 text-gray-600 line-through' : 'bg-indigo-600 border-indigo-700 text-white'"
                  :title="expendedSlots[`${sl.level}_${sIdx}`] ? 'Slot expended (click to regain)' : 'Slot available (click to expend)'"
                >
                  <span v-if="expendedSlots[`${sl.level}_${sIdx}`]">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Spells empty state -->
      <div v-if="charSpells.length === 0" class="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-xs">
        No spells selected for this character.
      </div>

      <!-- Cantrips (Level 0) -->
      <div v-if="sheetCantrips.length > 0" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
          Cantrips (Level 0) • {{ sheetCantrips.length }}
        </h3>
        <div class="space-y-1.5">
          <div
            v-for="sp in sheetCantrips"
            :key="sp.id || sp.name"
            class="border border-gray-200 rounded bg-white overflow-hidden shadow-xs"
          >
            <div class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                <span v-if="sp.school" class="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                  {{ sp.school }}
                </span>
                <span v-if="sp.concentration" class="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium" title="Concentration">
                  Concentration
                </span>
                <span v-if="sp.ritual" class="text-[9px] px-1.5 py-0.2 bg-sky-50 text-sky-800 border border-sky-200 rounded font-medium" title="Ritual">
                  Ritual
                </span>
                <span class="text-[11px] text-gray-500 font-mono hidden sm:inline">
                  {{ sp.casting_time || '1 action' }} • {{ sp.range || 'Self' }}
                </span>
              </div>

              <!-- Spell Action Controls -->
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                  <button
                    type="button"
                    @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                    class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Spell Attack"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </button>
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                  <span
                    class="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded text-[10px] font-semibold"
                    title="Target Saving Throw"
                  >
                    DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                  </span>
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).isHeal">
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Heal`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula, extractSpellMechanics(sp, char.level, charCasterMod).addModToDice ? charCasterMod : 0)"
                    class="px-2 py-0.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Healing"
                  >
                    Heal ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }}{{ extractSpellMechanics(sp, char.level, charCasterMod).addModToDice ? (charCasterMod >= 0 ? '+' + charCasterMod : charCasterMod) : '' }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
                  <button
                    type="button"
                    @click="rollFormula(`${sp.name} Effect`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Roll ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else>
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                    Utility
                  </span>
                  <button
                    type="button"
                    @click="logSpellCast(sp.name)"
                    class="px-2 py-0.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded text-[10px] font-medium transition cursor-pointer"
                    title="Cast Spell (log effect)"
                  >
                    Cast
                  </button>
                </template>

                <button
                  type="button"
                  @click="toggleSpellCard(sp)"
                  class="text-gray-400 hover:text-gray-700 font-bold px-1.5 cursor-pointer font-mono"
                  :title="expandedFeatures['sp_' + (sp.id || sp.name)] ? 'Collapse' : 'Expand'"
                >
                  {{ expandedFeatures['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>
            </div>

            <!-- Complete Details & Body Description -->
            <div
              v-show="expandedFeatures['sp_' + (sp.id || sp.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 text-xs space-y-2 leading-relaxed bg-white"
            >
              <!-- Specs Row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1.5 px-2 bg-gray-50 border border-gray-200 rounded text-[11px] font-mono">
                <div><span class="text-gray-500">Casting Time:</span> {{ sp.casting_time || '1 action' }}</div>
                <div><span class="text-gray-500">Range:</span> {{ sp.range || 'Self' }}</div>
                <div><span class="text-gray-500">Duration:</span> {{ sp.duration || 'Instantaneous' }}</div>
                <div class="truncate"><span class="text-gray-500">Components:</span> {{ sp.components || 'V, S' }}</div>
              </div>

              <!-- Loading Indicator -->
              <div v-if="isFetchingSpell[(sp.name || '').trim().toLowerCase()]" class="text-gray-400 italic py-1">
                Loading spell details...
              </div>

              <!-- Full Description Entries -->
              <div
                v-if="getFullSpell(sp).entries && getFullSpell(sp).entries.length"
                class="space-y-1 leading-relaxed text-gray-700"
                v-html="getFullSpell(sp).entries.map(renderSpellEntryHtml).join('')"
              ></div>
              <div v-else-if="!isFetchingSpell[(sp.name || '').trim().toLowerCase()]" class="text-gray-400 italic">
                No description available.
              </div>

              <!-- Cantrip Upgrade / Higher Levels -->
              <div
                v-if="getFullSpell(sp).entriesHigherLevel && getFullSpell(sp).entriesHigherLevel.length"
                class="mt-2 pt-2 border-t border-gray-100 space-y-1.5"
              >
                <div
                  v-for="(hl, hlIdx) in getFullSpell(sp).entriesHigherLevel"
                  :key="hlIdx"
                  class="bg-indigo-50/40 p-2 rounded border border-indigo-100"
                >
                  <div class="font-bold text-gray-900 mb-0.5 text-[11px]">{{ hl.name || 'Upgrade' }}</div>
                  <div class="text-[11px] text-gray-700 leading-relaxed" v-html="(hl.entries || []).map(renderSpellEntryHtml).join('')"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Leveled Spells -->
      <div v-if="sheetLeveledSpells.length > 0" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
          Leveled Spells • {{ sheetLeveledSpells.length }}
        </h3>
        <div class="space-y-1.5">
          <div
            v-for="sp in sheetLeveledSpells"
            :key="sp.id || sp.name"
            class="border border-gray-200 rounded bg-white overflow-hidden shadow-xs"
          >
            <div class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                <span class="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded font-semibold">
                  Lv {{ sp.level }}
                </span>
                <span v-if="sp.school" class="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                  {{ sp.school }}
                </span>
                <span v-if="sp.concentration" class="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium" title="Concentration">
                  Concentration
                </span>
                <span v-if="sp.ritual" class="text-[9px] px-1.5 py-0.2 bg-sky-50 text-sky-800 border border-sky-200 rounded font-medium" title="Ritual">
                  Ritual
                </span>
                <span class="text-[11px] text-gray-500 font-mono hidden sm:inline">
                  {{ sp.casting_time || '1 action' }} • {{ sp.range || 'Self' }}
                </span>
              </div>

              <!-- Spell Action Controls -->
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                  <button
                    type="button"
                    @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                    class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Spell Attack"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </button>
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                  <span
                    class="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded text-[10px] font-semibold"
                    title="Target Saving Throw"
                  >
                    DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                  </span>
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).isHeal">
                  <button
                    v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="rollFormula(`${sp.name} Heal`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula, extractSpellMechanics(sp, char.level, charCasterMod).addModToDice ? charCasterMod : 0)"
                    class="px-2 py-0.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Healing"
                  >
                    Heal ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }}{{ extractSpellMechanics(sp, char.level, charCasterMod).addModToDice ? (charCasterMod >= 0 ? '+' + charCasterMod : charCasterMod) : '' }})
                  </button>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
                  <button
                    type="button"
                    @click="rollFormula(`${sp.name} Effect`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Roll ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                </template>

                <template v-else>
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                    Utility
                  </span>
                  <button
                    type="button"
                    @click="logSpellCast(sp.name)"
                    class="px-2 py-0.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded text-[10px] font-medium transition cursor-pointer"
                    title="Cast Spell (log effect)"
                  >
                    Cast
                  </button>
                </template>

                <button
                  type="button"
                  @click="toggleSpellCard(sp)"
                  class="text-gray-400 hover:text-gray-700 font-bold px-1.5 cursor-pointer font-mono"
                  :title="expandedFeatures['sp_' + (sp.id || sp.name)] ? 'Collapse' : 'Expand'"
                >
                  {{ expandedFeatures['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>
            </div>

            <!-- Complete Details & Body Description -->
            <div
              v-show="expandedFeatures['sp_' + (sp.id || sp.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 text-xs space-y-2 leading-relaxed bg-white"
            >
              <!-- Specs Row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1.5 px-2 bg-gray-50 border border-gray-200 rounded text-[11px] font-mono">
                <div><span class="text-gray-500">Casting Time:</span> {{ sp.casting_time || '1 action' }}</div>
                <div><span class="text-gray-500">Range:</span> {{ sp.range || 'Self' }}</div>
                <div><span class="text-gray-500">Duration:</span> {{ sp.duration || 'Instantaneous' }}</div>
                <div class="truncate"><span class="text-gray-500">Components:</span> {{ sp.components || 'V, S' }}</div>
              </div>

              <!-- Loading Indicator -->
              <div v-if="isFetchingSpell[(sp.name || '').trim().toLowerCase()]" class="text-gray-400 italic py-1">
                Loading spell details...
              </div>

              <!-- Full Description Entries -->
              <div
                v-if="getFullSpell(sp).entries && getFullSpell(sp).entries.length"
                class="space-y-1 leading-relaxed text-gray-700"
                v-html="getFullSpell(sp).entries.map(renderSpellEntryHtml).join('')"
              ></div>
              <div v-else-if="!isFetchingSpell[(sp.name || '').trim().toLowerCase()]" class="text-gray-400 italic">
                No description available.
              </div>

              <!-- At Higher Levels -->
              <div
                v-if="getFullSpell(sp).entriesHigherLevel && getFullSpell(sp).entriesHigherLevel.length"
                class="mt-2 pt-2 border-t border-gray-100 space-y-1.5"
              >
                <div
                  v-for="(hl, hlIdx) in getFullSpell(sp).entriesHigherLevel"
                  :key="hlIdx"
                  class="bg-indigo-50/40 p-2 rounded border border-indigo-100"
                >
                  <div class="font-bold text-gray-900 mb-0.5 text-[11px]">{{ hl.name || 'At Higher Levels' }}</div>
                  <div class="text-[11px] text-gray-700 leading-relaxed" v-html="(hl.entries || []).map(renderSpellEntryHtml).join('')"></div>
                </div>
              </div>
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
            :class="h.isNat20 ? 'text-amber-600' : (h.isNat1 ? 'text-red-600' : 'text-indigo-600')"
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
                :class="diceRollMode === 'normal' ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
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
              class="py-2 px-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded font-mono font-bold text-xs text-center transition cursor-pointer"
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
        class="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-95 border-2 border-white"
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
