<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useCharacterStore } from '../stores/character'
import { renderAnnotatedText } from '../utils/textRenderer'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const characterStore = useCharacterStore()

const props = defineProps({
  edition: {
    type: String,
    default: '2024'
  },
  className: {
    type: String,
    required: true
  },
  subclassName: {
    type: String,
    default: ''
  },
  classLevel: {
    type: Number,
    default: 1
  },
  abilityScores: {
    type: Object,
    default: () => ({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 })
  },
  proficiencyBonus: {
    type: Number,
    default: 2
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'close'])

const SCHOOL_NAMES = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation'
}

const getSchoolName = (code) => {
  if (!code) return 'Universal'
  const up = String(code).trim().toUpperCase()
  return SCHOOL_NAMES[up] || code
}

const schoolOptions = computed(() => [
  { value: 'all', label: 'All Schools' },
  ...Object.entries(SCHOOL_NAMES).map(([code, name]) => ({ value: code, label: name }))
])

const levelOptions = computed(() => [
  { value: 'all', label: 'All Levels' },
  { value: '0', label: 'Cantrips (Level 0)' },
  ...Array.from({ length: Number(props.maxSpellLevel) || 9 }, (_, i) => ({ value: String(i + 1), label: `Level ${i + 1}` }))
])

// Determine Spellcasting Ability
const spellcastingAbilityKey = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()

  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) return 'intelligence'
  if (c === 'wizard' || c === 'artificer') return 'intelligence'
  if (c === 'cleric' || c === 'druid' || c === 'ranger') return 'wisdom'
  if (c === 'bard' || c === 'sorcerer' || c === 'warlock' || c === 'paladin') return 'charisma'
  return 'intelligence'
})

const abilityScoreVal = computed(() => {
  const k = spellcastingAbilityKey.value
  return Number(props.abilityScores[k]) || 10
})

const abilityModifier = computed(() => {
  return Math.floor((abilityScoreVal.value - 10) / 2)
})

const spellSaveDc = computed(() => {
  return 8 + props.proficiencyBonus + abilityModifier.value
})

const spellAttackBonus = computed(() => {
  return props.proficiencyBonus + abilityModifier.value
})

// Query Class for API lookup
const queryClassName = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) return 'Wizard'
  return props.className
})

// Max Spell Level calculation
const maxSpellLevel = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  const lvl = Number(props.classLevel) || 1

  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) {
    if (lvl < 3) return 0
    if (lvl <= 6) return 1
    if (lvl <= 12) return 2
    if (lvl <= 18) return 3
    return 4
  }

  const fullCasters = ['wizard', 'cleric', 'druid', 'sorcerer', 'bard']
  if (fullCasters.includes(c)) {
    return Math.min(9, Math.ceil(lvl / 2))
  }

  if (c === 'warlock') {
    return Math.min(5, Math.ceil(lvl / 2))
  }

  if (c === 'paladin' || c === 'ranger') {
    if (props.edition === '2014' && lvl < 2) return 0
    if (lvl <= 4) return 1
    if (lvl <= 8) return 2
    if (lvl <= 12) return 3
    if (lvl <= 16) return 4
    return 5
  }

  if (c === 'artificer') {
    if (lvl <= 4) return 1
    if (lvl <= 8) return 2
    if (lvl <= 12) return 3
    if (lvl <= 16) return 4
    return 5
  }

  return 1
})

// Spell slots by level
const spellSlots = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  const lvl = Number(props.classLevel) || 1

  if (c === 'warlock') {
    const pactSlots = lvl === 1 ? 1 : (lvl >= 17 ? 4 : (lvl >= 11 ? 3 : 2))
    const pactLvl = Math.min(5, Math.ceil(lvl / 2))
    return [{ level: pactLvl, slots: pactSlots, isPact: true }]
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

  const thirdCasterTable = [
    [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
    [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3],
    [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1]
  ]

  let slotsArr = []
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) {
    slotsArr = thirdCasterTable[lvl - 1] || []
  } else if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard'].includes(c)) {
    slotsArr = fullCasterTable[lvl - 1] || []
  } else if (['paladin', 'ranger', 'artificer'].includes(c)) {
    if (props.edition === '2014' && (c === 'paladin' || c === 'ranger') && lvl === 1) {
      slotsArr = []
    } else {
      slotsArr = halfCasterTable[lvl - 1] || []
    }
  }

  return slotsArr.map((qty, idx) => ({ level: idx + 1, slots: qty }))
})

// Cantrips allowance
const maxCantrips = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  const lvl = Number(props.classLevel) || 1

  if (sc.includes('arcane trickster')) {
    return lvl >= 10 ? 4 : 3
  }
  if (sc.includes('eldritch knight')) {
    return lvl >= 10 ? 3 : 2
  }

  if (c === 'sorcerer') return lvl >= 10 ? 6 : (lvl >= 4 ? 5 : 4)
  if (c === 'wizard' || c === 'cleric') return lvl >= 10 ? 5 : (lvl >= 4 ? 4 : 3)
  if (c === 'druid' || c === 'bard' || c === 'warlock') return lvl >= 10 ? 4 : (lvl >= 4 ? 3 : 2)
  if (c === 'artificer') return lvl >= 14 ? 4 : (lvl >= 10 ? 3 : 2)
  return 0
})

// Prepared / Known allowance
const maxPreparedSpells = computed(() => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  const lvl = Number(props.classLevel) || 1
  const mod = abilityModifier.value

  if (sc.includes('arcane trickster') || sc.includes('eldritch knight')) {
    if (lvl < 3) return 0
    if (lvl <= 3) return 3
    if (lvl <= 6) return 4
    if (lvl <= 7) return 5
    if (lvl <= 9) return 6
    if (lvl <= 12) return 7
    return 8
  }

  if (c === 'wizard') {
    // 2024 prepared: L1=4, L2=5, L3=6, L4=7, L5=9
    if (props.edition === '2024') {
      const pTable = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
      return pTable[lvl - 1] || 4
    }
    return Math.max(1, mod + lvl)
  }

  if (c === 'cleric' || c === 'druid') {
    if (props.edition === '2024') {
      const pTable = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
      return pTable[lvl - 1] || 4
    }
    return Math.max(1, mod + lvl)
  }

  if (c === 'bard') {
    const bTable = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
    return bTable[lvl - 1] || 4
  }

  if (c === 'sorcerer') {
    if (props.edition === '2024') {
      const sTable = [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
      return sTable[lvl - 1] || 2
    }
    const sTable14 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15]
    return sTable14[lvl - 1] || 2
  }

  if (c === 'warlock') {
    const wTable = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
    return wTable[lvl - 1] || 2
  }

  if (c === 'paladin') {
    if (props.edition === '2024') {
      const pTable = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]
      return pTable[lvl - 1] || 2
    }
    if (lvl < 2) return 0
    return Math.max(1, mod + Math.floor(lvl / 2))
  }

  if (c === 'ranger') {
    if (props.edition === '2024') {
      const rTable = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]
      return rTable[lvl - 1] || 2
    }
    if (lvl < 2) return 0
    const rTable14 = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
    return rTable14[lvl - 1] || 2
  }

  if (c === 'artificer') {
    return Math.max(1, mod + Math.floor(lvl / 2))
  }

  return 2
})

// Loading & Available Spells
const isLoading = ref(false)
const allSpells = ref([])
const searchQuery = ref('')
const selectedSchool = ref('all')
const levelFilter = ref('all') // 'all' | '0' | '1' | ...
const expandedSpellIds = ref({})

const toggleSpellExpand = (id) => {
  expandedSpellIds.value[id] = !expandedSpellIds.value[id]
}

const fetchSpells = async () => {
  if (!queryClassName.value) return
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('edition', props.edition)
    params.set('className', queryClassName.value)
    params.set('maxLevel', String(Math.max(1, maxSpellLevel.value)))
    if (characterStore.selectedSources && characterStore.selectedSources.length) {
      params.set('sources', characterStore.selectedSources.join(','))
    }

    const res = await axios.get(`${API_URL}/compendium/spells?${params.toString()}`)
    allSpells.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.error('Failed to load spells', err)
    allSpells.value = []
  } finally {
    isLoading.value = false
  }
}

watch(() => [props.edition, queryClassName.value, maxSpellLevel.value, characterStore.selectedSources?.slice()], () => {
  fetchSpells()
}, { immediate: true })

// Filtering spells
const filteredSpells = computed(() => {
  let list = allSpells.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(s => (s.name || '').toLowerCase().includes(q))
  }

  if (selectedSchool.value !== 'all') {
    list = list.filter(s => {
      const code = (s.school || '').toUpperCase()
      const fullName = (getSchoolName(code) || '').toLowerCase()
      return code === selectedSchool.value || fullName === selectedSchool.value.toLowerCase()
    })
  }

  if (levelFilter.value !== 'all') {
    const lvlNum = Number(levelFilter.value)
    list = list.filter(s => Number(s.level) === lvlNum)
  }

  return list
})

// Groups
const cantripSpells = computed(() => {
  return filteredSpells.value.filter(s => Number(s.level) === 0)
})

const leveledSpells = computed(() => {
  return filteredSpells.value.filter(s => Number(s.level) > 0)
})

// Current selections
const chosenSpells = computed({
  get: () => props.modelValue || [],
  set: (val) => {
    emit('update:modelValue', val)
    emit('change', val)
  }
})

const isSpellSelected = (spell) => {
  const sName = (spell.name || '').trim().toLowerCase()
  return chosenSpells.value.some(s => (s.name || s || '').trim().toLowerCase() === sName)
}

const chosenCantrips = computed(() => {
  return chosenSpells.value.filter(s => Number(s.level) === 0 || s.is_cantrip)
})

const chosenLeveled = computed(() => {
  return chosenSpells.value.filter(s => Number(s.level) > 0 && !s.is_cantrip)
})

const parseJsonSafe = (val, fallback = []) => {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}

const formatCastingTime = (spell) => {
  if (!spell) return '1 action'
  if (spell.casting_time && typeof spell.casting_time === 'string') {
    return spell.casting_time
  }
  if (Array.isArray(spell.time) && spell.time[0]) {
    const t = spell.time[0]
    const unit = String(t.unit || 'action').trim()
    if (/^\d/.test(unit)) return unit
    return `${t.number || 1} ${unit}`
  }
  return '1 action'
}

const formatSpellPayload = (spell) => {
  const isCantrip = Number(spell.level || 0) === 0
  const castingTime = formatCastingTime(spell)
  const rangeStr = typeof spell.range === 'string'
    ? spell.range
    : (spell.range?.type || (spell.range?.distance ? `${spell.range.distance.amount || ''} ${spell.range.distance.type || ''}`.trim() : 'Self'))
  const durationStr = typeof spell.duration === 'string'
    ? spell.duration
    : (Array.isArray(spell.duration) ? (spell.duration[0]?.type || 'Instantaneous') : 'Instantaneous')
  const compStr = typeof spell.components === 'string'
    ? spell.components
    : (spell.components ? (typeof spell.components === 'object' ? Object.keys(spell.components).join(', ').toUpperCase() : String(spell.components)) : '')

  return {
    id: spell.id,
    name: spell.name,
    level: Number(spell.level || 0),
    school: spell.school,
    casting_time: castingTime,
    range: rangeStr,
    duration: durationStr,
    components: compStr,
    concentration: Boolean(spell.concentration || (Array.isArray(spell.duration) && spell.duration[0]?.concentration)),
    ritual: Boolean(spell.ritual || spell.meta?.ritual),
    is_prepared: true,
    is_cantrip: isCantrip,
    source: spell.source,
    entries: parseJsonSafe(spell.entries, []),
    entriesHigherLevel: parseJsonSafe(spell.entriesHigherLevel || spell.higher_levels, []),
    savingThrow: Array.isArray(spell.savingThrow) ? spell.savingThrow : (spell.save_ability ? [spell.save_ability] : []),
    spellAttack: Array.isArray(spell.spellAttack) ? spell.spellAttack : (spell.spell_attack ? [spell.spell_attack] : []),
    damageInflict: Array.isArray(spell.damageInflict) ? spell.damageInflict : (spell.damage_type ? spell.damage_type.split(',').map(s => s.trim()) : []),
    damageDice: parseJsonSafe(spell.damage_dice || spell.scalingLevelDice, null)
  }
}

const getSpellEntries = (spell) => {
  if (!spell) return []
  return parseJsonSafe(spell.entries, [])
}

const toggleSpell = (spell) => {
  const current = [...chosenSpells.value]
  const sName = (spell.name || '').trim().toLowerCase()
  const idx = current.findIndex(s => (s.name || s || '').trim().toLowerCase() === sName)

  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    // Check limits
    const isCantrip = Number(spell.level) === 0
    if (isCantrip && maxCantrips.value > 0 && chosenCantrips.value.length >= maxCantrips.value) {
      // Reached limit
      return
    }
    if (!isCantrip && maxPreparedSpells.value > 0 && chosenLeveled.value.length >= maxPreparedSpells.value) {
      // Reached limit
      return
    }

    current.push(formatSpellPayload(spell))
  }

  chosenSpells.value = current
}

// Recommended Presets per class
const RECOMMENDED_PRESETS = {
  wizard: {
    cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation', 'Ray of Frost', 'Light'],
    leveled: ['Magic Missile', 'Shield', 'Mage Armor', 'Detect Magic', 'Sleep', 'Burning Hands', 'Thunderwave', 'Find Familiar']
  },
  cleric: {
    cantrips: ['Sacred Flame', 'Guidance', 'Thaumaturgy', 'Toll the Dead', 'Light'],
    leveled: ['Bless', 'Cure Wounds', 'Healing Word', 'Guiding Bolt', 'Sanctuary', 'Shield of Faith']
  },
  druid: {
    cantrips: ['Druidcraft', 'Produce Flame', 'Thorn Whip', 'Shillelagh'],
    leveled: ['Entangle', 'Goodberry', 'Healing Word', 'Thunderwave', 'Faerie Fire']
  },
  sorcerer: {
    cantrips: ['Fire Bolt', 'Ray of Frost', 'Shocking Grasp', 'Prestidigitation', 'Mage Hand'],
    leveled: ['Magic Missile', 'Shield', 'Burning Hands', 'Chromatic Orb', 'Chaos Bolt']
  },
  bard: {
    cantrips: ['Vicious Mockery', 'Minor Illusion', 'Prestidigitation', 'Mage Hand'],
    leveled: ['Dissonant Whispers', 'Healing Word', 'Charm Person', 'Thunderwave', 'Faerie Fire']
  },
  warlock: {
    cantrips: ['Eldritch Blast', 'Mage Hand', 'Minor Illusion', 'Prestidigitation'],
    leveled: ['Hex', 'Armor of Agathys', 'Hellish Rebuke', 'Witch Bolt']
  },
  paladin: {
    cantrips: [],
    leveled: ['Bless', 'Heroism', 'Cure Wounds', 'Thunderous Smite', 'Searing Smite', 'Shield of Faith']
  },
  ranger: {
    cantrips: [],
    leveled: ["Hunter's Mark", 'Cure Wounds', 'Ensnaring Strike', 'Hail of Thorns', 'Fog Cloud']
  },
  artificer: {
    cantrips: ['Mending', 'Fire Bolt', 'Guidance'],
    leveled: ['Cure Wounds', 'Shield', 'Faerie Fire', 'Absorb Elements', 'Catapult']
  },
  'eldritch knight': {
    cantrips: ['Booming Blade', 'Fire Bolt', 'Mage Hand'],
    leveled: ['Shield', 'Magic Missile', 'Absorb Elements', 'Burning Hands']
  },
  'arcane trickster': {
    cantrips: ['Mage Hand', 'Minor Illusion', 'Booming Blade'],
    leveled: ['Disguise Self', 'Silent Image', 'Shield', 'Charm Person']
  }
}

const autoSelectRecommended = () => {
  const c = (props.className || '').toLowerCase()
  const sc = (props.subclassName || '').toLowerCase()
  const presetKey = sc.includes('eldritch knight') ? 'eldritch knight' : (sc.includes('arcane trickster') ? 'arcane trickster' : c)
  const preset = RECOMMENDED_PRESETS[presetKey] || RECOMMENDED_PRESETS.wizard

  const result = []

  // Auto pick cantrips
  let pickedCantripsCount = 0
  for (const cName of preset.cantrips) {
    if (pickedCantripsCount >= maxCantrips.value) break
    const found = allSpells.value.find(s => Number(s.level) === 0 && (s.name || '').toLowerCase() === cName.toLowerCase())
    if (found && !result.some(r => r.name.toLowerCase() === found.name.toLowerCase())) {
      result.push(formatSpellPayload(found))
      pickedCantripsCount++
    }
  }

  // Auto pick leveled spells
  let pickedLeveledCount = 0
  for (const spName of preset.leveled) {
    if (pickedLeveledCount >= maxPreparedSpells.value) break
    const found = allSpells.value.find(s => Number(s.level) === 1 && (s.name || '').toLowerCase() === spName.toLowerCase())
    if (found && !result.some(r => r.name.toLowerCase() === found.name.toLowerCase())) {
      result.push(formatSpellPayload(found))
      pickedLeveledCount++
    }
  }

  chosenSpells.value = result
}

const clearAllSpells = () => {
  chosenSpells.value = []
}

const onKeyDown = (e) => {
  if (e.key === 'Escape') {
    emit('close')
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
  <div class="space-y-4">
    <!-- Caster Overview Banner -->
    <div class="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-2.5">
      <div class="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div class="min-w-0">
          <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px] truncate block">
            {{ className }} Spellcasting
          </span>
          <span v-if="subclassName" class="text-gray-500 text-[10px] font-medium block truncate">
            {{ subclassName }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            @click="autoSelectRecommended"
            class="px-2 py-1 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
          >
            <span class="sm:hidden">Auto-select</span>
            <span class="hidden sm:inline">Auto-select Recommended</span>
          </button>
          <button
            type="button"
            v-if="chosenSpells.length > 0"
            @click="clearAllSpells"
            class="px-2 py-1 bg-white border border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-600 rounded text-[11px] transition cursor-pointer whitespace-nowrap"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Combat Magic Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div class="bg-white border border-gray-200 rounded p-2">
          <div class="text-[10px] text-gray-500 uppercase font-semibold">Spellcasting Ability</div>
          <div class="text-sm font-bold text-gray-900 uppercase">
            {{ spellcastingAbilityKey.slice(0, 3) }} ({{ abilityModifier >= 0 ? '+' : '' }}{{ abilityModifier }})
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded p-2">
          <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Save DC</div>
          <div class="text-sm font-bold text-gray-900 font-mono">{{ spellSaveDc }}</div>
        </div>

        <div class="bg-white border border-gray-200 rounded p-2">
          <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Attack Bonus</div>
          <div class="text-sm font-bold text-gray-900 font-mono">{{ spellAttackBonus >= 0 ? '+' : '' }}{{ spellAttackBonus }}</div>
        </div>

        <div class="bg-white border border-gray-200 rounded p-2">
          <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Slots</div>
          <div class="text-xs font-semibold text-gray-800">
            <span v-if="spellSlots.length === 0" class="text-gray-400 font-normal">None at Level {{ classLevel }}</span>
            <span v-else class="flex flex-wrap items-center justify-center gap-1">
              <span v-for="sl in spellSlots" :key="sl.level" class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[10px]">
                {{ sl.isPact ? `Pact Lv ${sl.level}: ${sl.slots}` : `Lv ${sl.level}: ${sl.slots}` }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Selection Quota Trackers -->
      <div v-if="maxCantrips > 0 || maxPreparedSpells > 0" class="flex items-center justify-between gap-2 pt-1 text-xs border-t border-gray-200/80">
        <div v-if="maxCantrips > 0" class="flex items-center gap-1.5">
          <span class="text-gray-500 font-medium">Cantrips:</span>
          <span class="font-mono font-semibold text-gray-900">
            {{ chosenCantrips.length }} / {{ maxCantrips }}
          </span>
        </div>

        <div v-if="maxPreparedSpells > 0" class="flex items-center gap-1.5">
          <span class="text-gray-500 font-medium">Prepared Spells:</span>
          <span class="font-mono font-semibold text-gray-900">
            {{ chosenLeveled.length }} / {{ maxPreparedSpells }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error indicator -->
    <p v-if="error" class="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded p-2">
      {{ error }}
    </p>

    <!-- Filter & Search Controls -->
    <div class="flex flex-col sm:flex-row gap-2 text-xs relative z-30">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search spells (e.g. Fire Bolt, Shield)..."
          class="w-full p-2 border border-gray-300 rounded bg-white text-xs focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <div class="grid grid-cols-2 sm:flex gap-2">
        <v-select
          v-model="selectedSchool"
          :options="schoolOptions"
          :reduce="opt => opt.value"
          label="label"
          :clearable="false"
          class="min-w-0 sm:min-w-[130px]"
        />

        <v-select
          v-model="levelFilter"
          :options="levelOptions"
          :reduce="opt => opt.value"
          label="label"
          :clearable="false"
          class="min-w-0 sm:min-w-[130px]"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8 text-gray-500 text-xs">
      Loading {{ edition }} compendium spells...
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredSpells.length === 0" class="text-center py-8 bg-gray-50 border border-gray-200 rounded text-gray-500 text-xs">
      No spells match the current filter.
    </div>

    <!-- Spells Listing -->
    <div v-else class="space-y-4">
      <!-- 1. Cantrips (Level 0) -->
      <div v-if="cantripSpells.length > 0 && (levelFilter === 'all' || levelFilter === '0')" class="space-y-1.5">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <div class="flex items-center gap-1.5 min-w-0">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Cantrips</h4>
            <span class="text-[10px] text-gray-500 font-normal hidden sm:inline">(Basic at-will spells)</span>
          </div>
          <span
            v-if="maxCantrips > 0"
            class="text-[11px] font-mono font-medium text-gray-600 shrink-0"
          >
            {{ chosenCantrips.length }} / {{ maxCantrips }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="spell in cantripSpells"
            :key="spell.id || spell.name"
            class="border rounded p-2 transition bg-white text-xs select-none"
            :class="[
              isSpellSelected(spell) ? 'border-gray-800 bg-gray-100 ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="flex items-start justify-between gap-1.5">
              <label class="flex items-start gap-2 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="isSpellSelected(spell)"
                  :disabled="!isSpellSelected(spell) && maxCantrips > 0 && chosenCantrips.length >= maxCantrips"
                  @change="toggleSpell(spell)"
                  class="mt-0.5 rounded text-gray-900 accent-gray-900 focus:ring-0 cursor-pointer"
                />
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                    <span>{{ spell.name }}</span>
                    <span class="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-normal">
                      {{ getSchoolName(spell.school) }}
                    </span>
                    <span v-if="spell.concentration || spell.duration?.[0]?.concentration" class="text-[9px] px-1 py-0.2 bg-gray-200 text-gray-800 rounded font-mono font-bold" title="Concentration">
                      C
                    </span>
                  </div>
                  <div class="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5 font-mono">
                    <span>{{ formatCastingTime(spell) }}</span>
                    <span>•</span>
                    <span>{{ typeof spell.range === 'string' ? spell.range : (spell.range?.type || 'Self') }}</span>
                  </div>
                </div>
              </label>

              <button
                type="button"
                @click="toggleSpellExpand('sp_' + (spell.id || spell.name))"
                class="text-gray-400 hover:text-gray-600 px-1 py-0.5 text-xs transition cursor-pointer"
                title="Toggle details"
              >
                <IconChevronUp v-if="expandedSpellIds['sp_' + (spell.id || spell.name)]" class="w-3.5 h-3.5" />
                <IconChevronDown v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Expandable entries preview -->
            <div
              v-if="expandedSpellIds['sp_' + (spell.id || spell.name)]"
              class="mt-2 pt-2 border-t border-gray-200 text-[11px] text-gray-700 space-y-1 leading-relaxed"
            >
              <div v-for="(entry, eIdx) in getSpellEntries(spell)" :key="eIdx">
                <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Leveled Spells (Level 1+) -->
      <div v-if="leveledSpells.length > 0 && (levelFilter === 'all' || levelFilter !== '0')" class="space-y-1.5 pt-2">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <div class="flex items-center gap-1.5 min-w-0">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Leveled Spells</h4>
            <span class="text-[10px] text-gray-500 font-normal hidden sm:inline">(Level 1+)</span>
          </div>
          <span
            v-if="maxPreparedSpells > 0"
            class="text-[11px] font-mono font-medium text-gray-600 shrink-0"
          >
            {{ chosenLeveled.length }} / {{ maxPreparedSpells }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="spell in leveledSpells"
            :key="spell.id || spell.name"
            class="border rounded p-2 transition bg-white text-xs select-none"
            :class="[
              isSpellSelected(spell) ? 'border-gray-800 bg-gray-100 ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="flex items-start justify-between gap-1.5">
              <label class="flex items-start gap-2 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="isSpellSelected(spell)"
                  :disabled="!isSpellSelected(spell) && maxPreparedSpells > 0 && chosenLeveled.length >= maxPreparedSpells"
                  @change="toggleSpell(spell)"
                  class="mt-0.5 rounded text-gray-900 accent-gray-900 focus:ring-0 cursor-pointer"
                />
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                    <span>{{ spell.name }}</span>
                    <span class="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold">
                      Lv {{ spell.level }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-normal">
                      {{ getSchoolName(spell.school) }}
                    </span>
                    <span v-if="spell.concentration || spell.duration?.[0]?.concentration" class="text-[9px] px-1 py-0.2 bg-gray-200 text-gray-800 rounded font-mono font-bold" title="Concentration">
                      C
                    </span>
                    <span v-if="spell.ritual || spell.meta?.ritual" class="text-[9px] px-1 py-0.2 bg-gray-200 text-gray-800 rounded font-mono font-bold" title="Ritual">
                      R
                    </span>
                  </div>
                  <div class="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5 font-mono">
                    <span>{{ formatCastingTime(spell) }}</span>
                    <span>•</span>
                    <span>{{ typeof spell.range === 'string' ? spell.range : (spell.range?.type || 'Self') }}</span>
                  </div>
                </div>
              </label>

              <button
                type="button"
                @click="toggleSpellExpand('sp_' + (spell.id || spell.name))"
                class="text-gray-400 hover:text-gray-600 px-1 py-0.5 text-xs transition cursor-pointer"
                title="Toggle details"
              >
                <IconChevronUp v-if="expandedSpellIds['sp_' + (spell.id || spell.name)]" class="w-3.5 h-3.5" />
                <IconChevronDown v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Expandable entries preview -->
            <div
              v-if="expandedSpellIds['sp_' + (spell.id || spell.name)]"
              class="mt-2 pt-2 border-t border-gray-200 text-[11px] text-gray-700 space-y-1 leading-relaxed"
            >
              <div v-for="(entry, eIdx) in getSpellEntries(spell)" :key="eIdx">
                <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
