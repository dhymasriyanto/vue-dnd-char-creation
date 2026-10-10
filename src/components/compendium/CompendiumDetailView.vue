<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useConfig } from '../../config'
import { IconTrash } from '@tabler/icons-vue'
import {
  renderAnnotatedText,
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
  getItemArmorDetails
} from '../../utils/textRenderer'
import {
  formatMonsterSize,
  formatMonsterType,
  formatMonsterAlignment,
  formatMonsterAc,
  formatMonsterHp,
  formatMonsterSpeed,
  abMod,
  formatMonsterSaves,
  formatMonsterSkills,
  getMonsterXp,
  formatMonsterDefenses,
  formatMonsterSenses
} from '../../utils/monsterFormatter'
import {
  getOrdinal,
  formatSkillChoices,
  formatClassEquipment,
  formatItemType,
  formatItemProperties,
  formatRaceSize,
  formatRaceTraits,
  formatClassProf,
  formatMonsterLanguages,
  isItemCategory,
  getItemBadge,
  formatRaceSpeed,
  formatPrimaryAbility
} from '../../utils/compendiumFormatters'

const props = defineProps({
  selectedItem: {
    type: Object,
    default: null
  },
  currentEdition: {
    type: String,
    default: '2024'
  },
  selectedSources: {
    type: Object,
    default: () => new Set()
  }
})

const emit = defineEmits(['delete-homebrew'])

const API_URL = useConfig().API_URL

const formatEntries = (entries) => format5eEntries(entries)

// Class view states
const classViewTab = ref('features')
const classTableData = ref(null)
const isLoadingClassTable = ref(false)
const classTableCache = new Map()

const selectedSubclass = ref(null)
const subclassDetail = ref(null)
const isLoadingSubclass = ref(false)
const subclassCache = new Map()

const inspectingClassFeature = ref(null)

const filteredSubclasses = computed(() => {
  if (!props.selectedItem?.subclasses) return []
  const upperSet = new Set(Array.from(props.selectedSources || []).map(s => String(s).toUpperCase()))
  return props.selectedItem.subclasses.filter(sc => {
    if (!sc.source) return true
    return upperSet.has(sc.source.toUpperCase())
  })
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
  const cacheKey = sc.id || `${sc.name}_${sc.source}_${sc.edition || props.currentEdition}`
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
        class_name: props.selectedItem?.name,
        edition: sc.edition || props.currentEdition
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

watch(() => props.selectedItem, (newItem) => {
  selectedSubclass.value = null
  subclassDetail.value = null
  inspectingClassFeature.value = null
  if (newItem && (newItem._category === 'classes' || newItem.hitDice)) {
    fetchClassTableForCompendium(newItem.name, newItem.edition || props.currentEdition)
  }
}, { immediate: true })
</script>

<template>
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
            @click="emit('delete-homebrew', selectedItem)"
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
</template>
