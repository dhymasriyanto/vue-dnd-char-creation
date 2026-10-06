<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { renderAnnotatedText } from '../utils/textRenderer'
import { IconSearch, IconX, IconChevronDown, IconChevronUp, IconCheck, IconPlus, IconSparkles } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL

const props = defineProps({
  edition: {
    type: String,
    default: '2024'
  },
  featSources: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  abilityScores: {
    type: Object,
    default: () => ({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 })
  },
  proficiencyBonus: {
    type: Number,
    default: 2
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const selectedFeatIdx = ref(0)
const searchQuery = ref('')
const selectedLevelFilter = ref('all') // 'all' | '0' | '1'
const selectedSchoolFilter = ref('')
const selectedClassFilter = ref('')

const expandedSpellIds = ref({})
const allCompendiumSpells = ref([])
const isFetchingSpells = ref(false)

const currentFeatSource = computed(() => {
  if (!props.featSources.length) return null
  return props.featSources[selectedFeatIdx.value] || props.featSources[0]
})

const SCHOOL_MAP = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation'
}

const getSchoolLabel = (code) => {
  if (!code) return 'Universal'
  const up = String(code).trim().toUpperCase()
  return SCHOOL_MAP[up] || code
}

// Spells chosen for the currently active feat
const chosenForCurrentFeat = computed(() => {
  const featName = currentFeatSource.value?.featName
  if (!featName) return []
  return (props.modelValue || []).filter(s => s.sourceFeat === featName)
})

const chosenCantrips = computed(() => {
  return chosenForCurrentFeat.value.filter(s => Number(s.level) === 0 || s.is_cantrip)
})

const chosenLeveled = computed(() => {
  return chosenForCurrentFeat.value.filter(s => Number(s.level) > 0 && !s.is_cantrip)
})

const maxCantrips = computed(() => {
  return currentFeatSource.value?.config?.cantrips || 0
})

const maxLeveled = computed(() => {
  return currentFeatSource.value?.config?.spells || 0
})

const isCantripLimitReached = computed(() => {
  if (maxCantrips.value <= 0) return true
  return chosenCantrips.value.length >= maxCantrips.value
})

const isLeveledLimitReached = computed(() => {
  if (maxLeveled.value <= 0) return true
  return chosenLeveled.value.length >= maxLeveled.value
})

// Fetch compendium spells for selection
const fetchCompendiumSpells = async () => {
  isFetchingSpells.value = true
  try {
    const params = new URLSearchParams()
    params.set('edition', props.edition || '2024')
    params.set('maxLevel', '2') // Feats grant cantrips, 1st level, and occasionally 2nd (e.g. Misty Step)
    const res = await axios.get(`${API_URL}/compendium/spells?${params.toString()}`)
    allCompendiumSpells.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.warn('Failed to fetch compendium spells for feats:', err.message)
  } finally {
    isFetchingSpells.value = false
  }
}

onMounted(() => {
  fetchCompendiumSpells()
  autoAddFixedSpells()
})

watch(() => props.edition, () => {
  fetchCompendiumSpells()
})

// Auto-add fixed spells for feats (e.g. Misty Step for Fey Touched, Invisibility for Shadow Touched)
const autoAddFixedSpells = () => {
  props.featSources.forEach(src => {
    const fixed = src.config?.fixed
    if (Array.isArray(fixed)) {
      fixed.forEach(fName => {
        const already = (props.modelValue || []).some(
          s => s.sourceFeat === src.featName && s.name.toLowerCase() === fName.toLowerCase()
        )
        if (!already) {
          const match = allCompendiumSpells.value.find(s => s.name.toLowerCase() === fName.toLowerCase())
          if (match) {
            addSpellToModel(match, src)
          }
        }
      })
    }
  })
}

watch(() => allCompendiumSpells.value, () => {
  autoAddFixedSpells()
})

// Filtering compendium spells
const filteredCompendiumSpells = computed(() => {
  const feat = currentFeatSource.value
  if (!feat) return []
  const conf = feat.config || {}

  let list = allCompendiumSpells.value

  // Restrict by allowed school if feat requires (e.g. Fey Touched -> Divination/Enchantment, Shadow Touched -> Illusion/Necromancy)
  if (Array.isArray(conf.schools) && conf.schools.length > 0) {
    const upperAllowed = conf.schools.map(s => s.toUpperCase())
    list = list.filter(sp => {
      const code = (sp.school || '').toUpperCase()
      return upperAllowed.includes(code) || upperAllowed.some(a => (SCHOOL_MAP[a] || '').toUpperCase() === code)
    })
  }

  // Restrict by class if feat specifies (e.g. Artificer Initiate)
  if (conf.className) {
    const targetCls = conf.className.toLowerCase()
    list = list.filter(sp => {
      const clsList = Array.isArray(sp.classes?.fromClassList) ? sp.classes.fromClassList : []
      return clsList.some(c => (c.name || c || '').toLowerCase() === targetCls)
    })
  }

  // User-selected class filter (e.g. for Magic Initiate where user wants Cleric or Wizard)
  if (selectedClassFilter.value) {
    const targetCls = selectedClassFilter.value.toLowerCase()
    list = list.filter(sp => {
      const clsList = Array.isArray(sp.classes?.fromClassList) ? sp.classes.fromClassList : []
      return clsList.some(c => (c.name || c || '').toLowerCase() === targetCls)
    })
  }

  // Ritual only filter (for Ritual Caster)
  if (conf.isRitual) {
    list = list.filter(sp => sp.ritual || sp.meta?.ritual)
  }

  // Level restriction from config
  const maxLvl = conf.maxLevel !== undefined ? conf.maxLevel : 1
  list = list.filter(sp => Number(sp.level || 0) <= maxLvl)

  // User selected level filter
  if (selectedLevelFilter.value === '0') {
    list = list.filter(sp => Number(sp.level || 0) === 0)
  } else if (selectedLevelFilter.value === '1') {
    list = list.filter(sp => Number(sp.level || 0) === 1)
  }

  // User selected school filter
  if (selectedSchoolFilter.value) {
    const target = selectedSchoolFilter.value.toUpperCase()
    list = list.filter(sp => (sp.school || '').toUpperCase() === target || (SCHOOL_MAP[target] || '').toUpperCase() === (sp.school || '').toUpperCase())
  }

  // Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(sp => (sp.name || '').toLowerCase().includes(q))
  }

  return list
})

const isSpellAlreadyChosen = (spell) => {
  const featName = currentFeatSource.value?.featName
  return (props.modelValue || []).some(
    s => s.sourceFeat === featName && s.name.toLowerCase() === (spell.name || '').toLowerCase()
  )
}

const canAddSpell = (spell) => {
  if (isSpellAlreadyChosen(spell)) return false
  const isCantrip = Number(spell.level || 0) === 0
  if (isCantrip) {
    return !isCantripLimitReached.value
  }
  return !isLeveledLimitReached.value
}

const addSpellToModel = (spell, featSource = null) => {
  const feat = featSource || currentFeatSource.value
  if (!feat) return
  const isCantrip = Number(spell.level || 0) === 0

  const parseSafe = (val, fb = []) => {
    if (!val) return fb
    if (typeof val === 'object') return val
    try { return JSON.parse(val) } catch { return fb }
  }

  const payload = {
    id: spell.id || spell.name,
    name: spell.name,
    level: Number(spell.level || 0),
    school: spell.school || '',
    casting_time: Array.isArray(spell.time)
      ? `${spell.time[0]?.number || 1} ${spell.time[0]?.unit || 'action'}`
      : (spell.casting_time || '1 action'),
    range: typeof spell.range === 'string' ? spell.range : (spell.range?.type || 'Self'),
    duration: typeof spell.duration === 'string' ? spell.duration : 'Instantaneous',
    components: typeof spell.components === 'string' ? spell.components : 'V, S',
    concentration: Boolean(spell.concentration || (Array.isArray(spell.duration) && spell.duration[0]?.concentration)),
    ritual: Boolean(spell.ritual || spell.meta?.ritual),
    is_prepared: true,
    is_cantrip: isCantrip,
    source: spell.source || (props.edition === '2024' ? 'XPHB' : 'PHB'),
    entries: parseSafe(spell.entries, []),
    entriesHigherLevel: parseSafe(spell.entriesHigherLevel || spell.higher_levels, []),
    savingThrow: Array.isArray(spell.savingThrow) ? spell.savingThrow : (spell.save_ability ? [spell.save_ability] : []),
    spellAttack: Array.isArray(spell.spellAttack) ? spell.spellAttack : (spell.spell_attack ? [spell.spell_attack] : []),
    damageInflict: Array.isArray(spell.damageInflict) ? spell.damageInflict : (spell.damage_type ? [spell.damage_type] : []),
    damageDice: parseSafe(spell.damage_dice || spell.scalingLevelDice, null),
    sourceFeat: feat.featName,
    is_feat_spell: true
  }

  const updated = [...(props.modelValue || []), payload]
  emit('update:modelValue', updated)
}

const removeSpellFromModel = (spell) => {
  const featName = currentFeatSource.value?.featName
  const updated = (props.modelValue || []).filter(
    s => !(s.sourceFeat === featName && s.name.toLowerCase() === spell.name.toLowerCase())
  )
  emit('update:modelValue', updated)
}

const toggleSpellExpand = (spellName) => {
  expandedSpellIds.value[spellName] = !expandedSpellIds.value[spellName]
}

const formatSpellEntryText = (entry) => {
  if (entry == null) return ''
  if (typeof entry === 'string') return entry
  if (typeof entry === 'object') {
    if (entry.name && entry.entries) {
      return `<strong>${entry.name}.</strong> ` + (Array.isArray(entry.entries) ? entry.entries.map(formatSpellEntryText).join(' ') : entry.entries)
    }
    if (Array.isArray(entry.entries)) {
      return entry.entries.map(formatSpellEntryText).join(' ')
    }
  }
  return String(entry)
}
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- Feat Tabs (if multiple spell-granting feats) -->
    <div v-if="featSources.length > 1" class="flex gap-1.5 border-b border-gray-200 pb-1 overflow-x-auto">
      <button
        v-for="(fSrc, fIdx) in featSources"
        :key="fSrc.featName + fIdx"
        type="button"
        @click="selectedFeatIdx = fIdx"
        :class="selectedFeatIdx === fIdx ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5"
      >
        <IconSparkles class="w-3.5 h-3.5" />
        <span>{{ fSrc.featName }}</span>
      </button>
    </div>

    <!-- Active Feat Info & Configuration -->
    <div v-if="currentFeatSource" class="bg-gray-50 border border-gray-200 rounded p-3.5 space-y-2.5">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <IconSparkles class="w-4 h-4 text-gray-700 shrink-0" />
              <span>{{ currentFeatSource.featName }}</span>
            </h3>
            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 font-semibold rounded text-[10px]">
              {{ currentFeatSource.sourceLabel }}
            </span>
          </div>
          <p class="text-gray-600 text-[11px] mt-0.5">
            {{ currentFeatSource.config?.desc || 'Select spells granted by this feat.' }}
          </p>
        </div>

        <!-- Quota Progress Badges -->
        <div class="flex items-center gap-2 shrink-0">
          <div v-if="maxCantrips > 0" class="px-2 py-1 bg-white border border-gray-200 rounded text-center">
            <span class="text-[9px] text-gray-500 uppercase block font-semibold">Cantrips</span>
            <span class="font-bold text-xs font-mono" :class="chosenCantrips.length === maxCantrips ? 'text-gray-900 font-bold' : 'text-gray-700 font-bold'">
              {{ chosenCantrips.length }} / {{ maxCantrips }}
            </span>
          </div>

          <div v-if="maxLeveled > 0" class="px-2 py-1 bg-white border border-gray-200 rounded text-center">
            <span class="text-[9px] text-gray-500 uppercase block font-semibold">1st-Level</span>
            <span class="font-bold text-xs font-mono" :class="chosenLeveled.length === maxLeveled ? 'text-gray-900 font-bold' : 'text-gray-700 font-bold'">
              {{ chosenLeveled.length }} / {{ maxLeveled }}
            </span>
          </div>
        </div>
      </div>

      <!-- Fixed Spells (if any) -->
      <div v-if="currentFeatSource.config?.fixed?.length" class="pt-2 border-t border-gray-200">
        <span class="text-[10px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
          Automatically Granted Spells:
        </span>
        <div class="flex flex-wrap gap-1.5">
          <div
            v-for="fixedName in currentFeatSource.config.fixed"
            :key="fixedName"
            class="px-2 py-1 bg-white border border-gray-200 rounded flex items-center gap-1.5 text-xs font-medium text-gray-800 shadow-2xs"
          >
            <span>{{ fixedName }}</span>
            <span class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
              <IconCheck class="w-3 h-3" />
              <span>Granted</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Current Chosen Spells for this Feat -->
      <div v-if="chosenForCurrentFeat.length > 0" class="pt-2 border-t border-gray-200">
        <span class="text-[10px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
          Selected Feat Spells ({{ chosenForCurrentFeat.length }}):
        </span>
        <div class="flex flex-wrap gap-1.5">
          <div
            v-for="sp in chosenForCurrentFeat"
            :key="sp.name"
            class="px-2.5 py-1 bg-white border border-gray-200 rounded flex items-center gap-2 shadow-2xs"
          >
            <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
            <span class="text-[10px] bg-gray-100 text-gray-600 px-1 rounded font-mono">
              {{ Number(sp.level) === 0 ? 'Cantrip' : 'Level ' + sp.level }}
            </span>
            <button
              type="button"
              @click="removeSpellFromModel(sp)"
              class="text-gray-400 hover:text-red-600 transition p-0.5 cursor-pointer"
              title="Remove spell"
            >
              <IconX class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Spell Selection Compendium Browser -->
    <div class="space-y-3 bg-white border border-gray-200 rounded p-3.5">
      <div class="flex items-center justify-between pb-1 border-b border-gray-200">
        <h4 class="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <span>Available Compendium Spells</span>
          <span v-if="isFetchingSpells" class="text-gray-500 lowercase font-normal animate-pulse text-[10px]">Loading...</span>
        </h4>
      </div>

      <!-- Filter Controls -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <!-- Search Input -->
        <div class="sm:col-span-2 relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search spell by name..."
            class="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white focus:outline-hidden focus:border-gray-500"
          />
          <IconSearch class="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2.5 pointer-events-none" />
        </div>

        <!-- Level Filter Buttons -->
        <div class="inline-flex rounded border border-gray-200 overflow-hidden text-[11px]">
          <button
            type="button"
            @click="selectedLevelFilter = 'all'"
            :class="selectedLevelFilter === 'all' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
            class="px-2 py-1 flex-1 cursor-pointer"
          >
            All
          </button>
          <button
            type="button"
            @click="selectedLevelFilter = '0'"
            :class="selectedLevelFilter === '0' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
            class="px-2 py-1 flex-1 cursor-pointer border-l border-r border-gray-200"
          >
            Cantrips
          </button>
          <button
            type="button"
            @click="selectedLevelFilter = '1'"
            :class="selectedLevelFilter === '1' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
            class="px-2 py-1 flex-1 cursor-pointer"
          >
            Level 1
          </button>
        </div>

        <!-- Class Filter Dropdown (useful for Magic Initiate) -->
        <div>
          <select
            v-model="selectedClassFilter"
            class="w-full py-1.5 px-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 focus:bg-white focus:outline-hidden focus:border-gray-900"
          >
            <option value="">All Spell Lists</option>
            <option value="Cleric">Cleric</option>
            <option value="Druid">Druid</option>
            <option value="Wizard">Wizard</option>
            <option value="Bard">Bard</option>
            <option value="Sorcerer">Sorcerer</option>
            <option value="Warlock">Warlock</option>
            <option value="Paladin">Paladin</option>
            <option value="Ranger">Ranger</option>
            <option value="Artificer">Artificer</option>
          </select>
        </div>
      </div>

      <!-- Spells List -->
      <div v-if="filteredCompendiumSpells.length > 0" class="max-h-96 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100">
        <div
          v-for="spell in filteredCompendiumSpells"
          :key="spell.id || spell.name"
          class="pt-1.5 first:pt-0"
        >
          <div class="p-2 bg-gray-50 hover:bg-gray-100/80 rounded border border-gray-200/80 transition flex items-center justify-between gap-2">
            <div
              @click="toggleSpellExpand(spell.name)"
              class="flex-1 min-w-0 cursor-pointer select-none"
            >
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs truncate">{{ spell.name }}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded font-mono bg-gray-100 text-gray-700 border border-gray-200">
                  {{ Number(spell.level) === 0 ? 'Cantrip' : 'Level ' + spell.level }}
                </span>
                <span v-if="spell.school" class="text-[10px] text-gray-500">
                  {{ getSchoolLabel(spell.school) }}
                </span>
                <span v-if="spell.source" class="text-[9px] text-gray-400 font-mono">
                  {{ spell.source }}
                </span>
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5 truncate">
                Range: {{ typeof spell.range === 'string' ? spell.range : (spell.range?.type || 'Self') }} • Cast: {{ Array.isArray(spell.time) ? `${spell.time[0]?.number || 1} ${spell.time[0]?.unit || 'action'}` : (spell.casting_time || '1 action') }}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-1.5 shrink-0">
              <template v-if="isSpellAlreadyChosen(spell)">
                <button
                  type="button"
                  @click="removeSpellFromModel(spell)"
                  class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer flex items-center gap-1 group"
                  title="Click to remove"
                >
                  <IconCheck class="w-3 h-3 group-hover:hidden" />
                  <IconX class="w-3 h-3 hidden group-hover:inline" />
                  <span class="group-hover:hidden">Added</span>
                  <span class="hidden group-hover:inline">Remove</span>
                </button>
              </template>

              <template v-else>
                <button
                  type="button"
                  @click="addSpellToModel(spell)"
                  :disabled="!canAddSpell(spell)"
                  :class="canAddSpell(spell) ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
                  class="px-2.5 py-1 rounded font-semibold text-[10px] transition flex items-center gap-1 shadow-2xs"
                  :title="!canAddSpell(spell) ? 'Spell limit reached for this feat' : 'Add spell to feat'"
                >
                  <IconPlus class="w-3 h-3" />
                  <span>Add</span>
                </button>
              </template>

              <button
                type="button"
                @click="toggleSpellExpand(spell.name)"
                class="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                title="Toggle details"
              >
                <IconChevronUp v-if="expandedSpellIds[spell.name]" class="w-3.5 h-3.5" />
                <IconChevronDown v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Expanded rules description -->
          <div
            v-if="expandedSpellIds[spell.name]"
            class="p-2.5 mt-1 bg-white border border-gray-200 rounded text-gray-700 space-y-1.5 text-[11px] leading-relaxed"
          >
            <div v-if="spell.entries && spell.entries.length" class="space-y-1">
              <div
                v-for="(ent, eIdx) in (Array.isArray(spell.entries) ? spell.entries : [spell.entries])"
                :key="eIdx"
                v-html="renderAnnotatedText(formatSpellEntryText(ent))"
              ></div>
            </div>
            <p v-else class="text-gray-400 italic">No rules text available.</p>
          </div>
        </div>
      </div>

      <div v-else class="p-6 text-center text-gray-400 italic bg-gray-50 border border-gray-100 rounded">
        No compendium spells match the current filter.
      </div>
    </div>
  </div>
</template>
