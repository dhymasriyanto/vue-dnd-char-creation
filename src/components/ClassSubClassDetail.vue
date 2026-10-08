<script setup>
import CollapsedComponent from './CollapsedComponent.vue'
import { useCharacterStore } from '../stores/character'
import { computed } from 'vue'
import { renderAnnotatedText, clean5eToolsMarkup } from '../utils/textRenderer'
import { unpackFeatureList } from '../utils/featureUnpacker'
import { IconStarFilled } from '@tabler/icons-vue'

const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
const KEY_TO_LABEL = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
}

const props = defineProps({
  selected: {
    type: Object,
    required: true
  },
  classLevel: {
    type: Number,
    required: true
  },
  availableSubClasses: {
    type: Array,
    default: () => []
  },
  selectedSubClassKey: {
    type: String,
    default: ''
  },
  subclassError: {
    type: String,
    default: ''
  },
  subclassUnlockLevel: {
    type: Number,
    default: 3
  },
  subClassUnlockLevel: {
    type: Number,
    default: 3
  },
  edition: {
    type: String,
    default: '2024'
  },
  abilityScores: {
    type: Object,
    default: () => ({})
  },
  subClassFeatures: {
    type: Array,
    default: null
  },
  // Skill Proficiencies
  classSkillConfig: {
    type: Object,
    default: () => ({ count: 0, from: [] })
  },
  availableClassSkills: {
    type: Array,
    default: () => []
  },
  chosenClassSkills: {
    type: Array,
    default: () => []
  },
  priorGrantedSkills: {
    type: Array,
    default: () => []
  },
  skillError: {
    type: String,
    default: ''
  },
  getSkillLabel: {
    type: Function,
    default: (s) => s
  },
  // Expertise
  expertiseConfig: {
    type: Object,
    default: () => ({ eligible: false, count: 0 })
  },
  allProficientSkills: {
    type: Array,
    default: () => []
  },
  chosenExpertiseSkills: {
    type: Array,
    default: () => []
  },
  expertiseError: {
    type: String,
    default: ''
  },
  // Tools / Musical Instruments
  classToolConfig: {
    type: Object,
    default: () => ({ count: 0, label: '', options: [] })
  },
  chosenClassTools: {
    type: Array,
    default: () => []
  },
  toolError: {
    type: String,
    default: ''
  },
  // ASI & Feats
  asiTierChoices: {
    type: Object,
    default: () => ({})
  },
  unlockedAsiTiers: {
    type: Array,
    default: () => []
  },
  filteredFeats: {
    type: Array,
    default: () => []
  },
  asiTierErrors: {
    type: Object,
    default: () => ({})
  },
  errorPrefix: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'selectSubclass',
  'toggleClassSkill',
  'toggleExpertiseSkill',
  'updateClassTool'
])

const characterStore = useCharacterStore()

const ensureAsiTier = (level) => {
  const lvl = Number(level) || 4
  if (!props.asiTierChoices[lvl]) {
    props.asiTierChoices[lvl] = {
      type: '',
      asiMode: '+2',
      plus2Stat: '',
      plus1StatA: '',
      plus1StatB: '',
      featName: '',
      featAbility: ''
    }
  }
  return props.asiTierChoices[lvl]
}

const getAsiError = (level) => {
  const lvl = level || 4
  const key = props.errorPrefix ? `asiTier_${props.errorPrefix}_${lvl}` : `asiTier_${lvl}`
  return props.asiTierErrors?.[key] || ''
}

const getAsiFieldKey = (level) => {
  const lvl = level || 4
  return props.errorPrefix ? `asiTier_${props.errorPrefix}_${lvl}` : `asiTier_${lvl}`
}

const getSelectedFeatObj = (featName) => {
  if (!featName) return null
  return props.filteredFeats.find(f => f.name?.toLowerCase() === featName.toLowerCase()) || null
}

const isAsiFeatureItem = (feat) => {
  if (!feat) return false
  const name = (feat.name || '').toLowerCase()
  return name.includes('ability score improvement') || name === 'feat' || name === 'ability score increase'
}

const startingArmorWeapons = computed(() => {
  const result = []
  const sp = props.selected?.class?.startingProficiencies
  if (!sp) return result
  if (Array.isArray(sp.armor)) {
    for (const a of sp.armor) {
      if (typeof a === 'string') result.push(`${a.charAt(0).toUpperCase() + a.slice(1)} Armor`)
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
          result.push(clean.charAt(0).toUpperCase() + clean.slice(1))
        }
      }
    }
  }
  return result
})

const effectiveSubclassUnlockLevel = computed(() => {
  return Number(props.subclassUnlockLevel ?? props.subClassUnlockLevel ?? 3)
})

const standardSubclassNames = [
  'subclass',
  'sacred oath',
  'primal path',
  'bard college',
  'divine domain',
  'druid circle',
  'martial archetype',
  'monastic tradition',
  'ranger archetype',
  'roguish archetype',
  'sorcerous origin',
  'otherworldly patron',
  'arcane tradition',
  'artificer specialist'
]

const isSubclassSlotCandidate = (feat) => {
  if (!feat || feat._fromSubclass) return false
  if (Number(feat.level || 1) !== effectiveSubclassUnlockLevel.value) return false
  if (feat.isSyntheticSubclassSlot || feat.isSubclassFeature || feat.gainSubclassFeature || feat.subclassFeature) {
    return true
  }
  const n = (feat.name || '').trim().toLowerCase()
  if (n.includes('breaking') || n.includes('spell') || n.includes('channel divinity')) return false
  return standardSubclassNames.some(sn => n === sn || n.endsWith(sn) || n.includes('subclass'))
}

const firstExpertiseLevel = computed(() => {
  const feats = props.selected?.classFeature || []
  const expFeats = feats.filter(f => (f.name || '').toLowerCase().includes('expertise'))
  if (expFeats.length > 0) {
    return Math.min(...expFeats.map(f => Number(f.level) || 1))
  }
  return 1
})

const isExpertiseFeatureItem = (feat) => {
  if (!feat || !props.expertiseConfig?.eligible) return false
  if (feat.isSyntheticExpertiseSlot) return true
  const name = (feat.name || '').toLowerCase()
  return name.includes('expertise') && Number(feat.level || 1) === firstExpertiseLevel.value
}

const combinedFeatures = computed(() => {
  const activeSources = (characterStore.selectedSources && characterStore.selectedSources.length > 0)
    ? characterStore.selectedSources.map(s => String(s).toUpperCase())
    : (characterStore.edition === '2024' ? ['XPHB'] : ['PHB'])

  const classFeatures = (props.selected?.classFeature || [])
    .filter(f => !f.source || activeSources.includes(String(f.source).toUpperCase()))
    .map(f => ({ ...f, _fromClass: true }))

  const scList = props.subClassFeatures !== null
    ? props.subClassFeatures
    : (characterStore.characterSubClass?.subClassFeature || [])
  const subClassFeatures = scList
    .filter(f => !f.source || activeSources.includes(String(f.source).toUpperCase()))
    .map(f => ({ ...f, _fromSubclass: true }))

  const allFeatures = []

  // 1. Injected Core Proficiencies & Skills at level 1 (only for primary class)
  if (props.selected?.class?.name && !props.errorPrefix) {
    allFeatures.push({
      name: 'Core Proficiencies & Skills',
      level: 1,
      isProficiencyFeature: true,
      _fromClass: true,
      entries: [
        `Review armor and weapon training, and choose skills and musical instruments or tools granted by the ${props.selected.class.name} class.`
      ]
    })
  }

  // 2. Class and Subclass features
  allFeatures.push(...classFeatures, ...subClassFeatures)

  // 3. Subclass Slot if not already present
  const hasSubSlot = allFeatures.some(f => isSubclassSlotCandidate(f))
  if (!hasSubSlot && props.classLevel >= effectiveSubclassUnlockLevel.value) {
    allFeatures.push({
      name: `${props.selected?.class?.name || 'Class'} Subclass`,
      level: effectiveSubclassUnlockLevel.value,
      isSyntheticSubclassSlot: true,
      _fromClass: true,
      entries: [
        'Choose a subclass archetype to customize your class path and specialize your abilities.'
      ]
    })
  }

  // 4. Expertise slot if class is eligible but feature missing from data
  if (props.expertiseConfig?.eligible && !allFeatures.some(f => (f.name || '').toLowerCase().includes('expertise'))) {
    allFeatures.push({
      name: 'Expertise',
      level: 1,
      isSyntheticExpertiseSlot: true,
      _fromClass: true,
      entries: [
        'Choose skill proficiencies in which you gain expertise, doubling your proficiency bonus for ability checks made with them.'
      ]
    })
  }

  const uniqueFeatures = unpackFeatureList(allFeatures)

  // ponytail: filter out fluff parent container cards matching subclass name when specific features exist at that level
  const scNames = new Set()
  if (props.selectedSubClassKey) {
    scNames.add(props.selectedSubClassKey.split('|')[0].trim().toLowerCase())
  }
  const curSc = characterStore.characterSubClass
  if (curSc) {
    if (curSc.name) scNames.add(curSc.name.trim().toLowerCase())
    if (curSc.short_name || curSc.shortName) scNames.add((curSc.short_name || curSc.shortName).trim().toLowerCase())
  }
  if (Array.isArray(props.availableSubClasses)) {
    for (const sc of props.availableSubClasses) {
      if (typeof sc === 'string') {
        scNames.add(sc.split('|')[0].trim().toLowerCase())
      } else if (sc && typeof sc === 'object') {
        if (sc.name) scNames.add(sc.name.trim().toLowerCase())
        if (sc.short_name || sc.shortName) scNames.add((sc.short_name || sc.shortName).trim().toLowerCase())
      }
    }
  }

  const hasOtherAtLevel = (fName, fLevel) => {
    return uniqueFeatures.some(other => {
      const oName = (other.name || '').trim().toLowerCase()
      return oName !== fName && Number(other.level) === Number(fLevel) && !scNames.has(oName) && !isSubclassSlotCandidate(other)
    })
  }

  const filtered = uniqueFeatures.filter(f => {
    const name = (f.name || '').trim().toLowerCase()
    if (scNames.has(name) && hasOtherAtLevel(name, f.level)) {
      return false
    }
    return true
  })

  return filtered.sort((a, b) => (Number(a.level) || 1) - (Number(b.level) || 1))
})

const subclassSlotKey = computed(() => {
  const feats = combinedFeatures.value || []
  const candidates = feats.filter(f => isSubclassSlotCandidate(f))
  if (candidates.length > 0) {
    const syn = candidates.find(f => f.isSyntheticSubclassSlot)
    if (syn) return syn.id || syn.name
    const sub = candidates.find(f => (f.name || '').toLowerCase().includes('subclass'))
    if (sub) return sub.id || sub.name
    return candidates[0].id || candidates[0].name
  }

  const loose = feats.filter(f => {
    if (!f || f._fromSubclass) return false
    if (Number(f.level || 1) !== effectiveSubclassUnlockLevel.value) return false
    const n = (f.name || '').trim().toLowerCase()
    if (n.includes('breaking') || n.includes('spell') || n.includes('channel divinity')) return false
    return /(archetype|domain|circle|college|path|tradition|oath|patron|origin)/i.test(n)
  })
  if (loose.length > 0) {
    return loose[0].id || loose[0].name
  }
  return null
})

const isSubclassFeatureItem = (feat) => {
  if (!feat || feat._fromSubclass) return false
  const key = feat.id || feat.name
  return Boolean(subclassSlotKey.value && key === subclassSlotKey.value)
}
</script>

<template>
  <div v-if="selected && selected.class && selected.class.name" class="mt-4 pt-3 border-t border-gray-200">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider">
        {{ selected.class.name }} Features & Proficiencies
      </h3>
      <span class="text-[11px] text-gray-500 font-mono">Level {{ classLevel }}</span>
    </div>

    <div v-for="(classFeature, idx) in combinedFeatures" :key="classFeature.id || classFeature.name + idx">
      <CollapsedComponent
        v-if="classLevel >= (classFeature.level || 1)"
        :data="classFeature"
        :classData="selected.class?.classFeatures"
        :classLevel="classLevel"
        :isSubclassFeature="isSubclassFeatureItem(classFeature)"
        :subclassUnlockLevel="effectiveSubclassUnlockLevel"
        :availableSubClasses="availableSubClasses"
        :selectedSubClassKey="selectedSubClassKey"
        :subclassError="subclassError"
        :hasError="Boolean(
          (classFeature.isProficiencyFeature && (skillError || toolError)) ||
          (isExpertiseFeatureItem(classFeature) && expertiseError) ||
          (isSubclassFeatureItem(classFeature) && Boolean(subclassError)) ||
          (isAsiFeatureItem(classFeature) && Boolean(getAsiError(classFeature.level)))
        )"
        :errorPrefix="errorPrefix"
        @selectSubclass="key => emit('selectSubclass', key)"
      >
        <!-- 1. Embedded Core Proficiencies & Skills Inside Level 1 Proficiencies -->
        <div v-if="classFeature.isProficiencyFeature" class="mt-3 pt-3 border-t border-gray-200 space-y-3">
          <!-- Armor & Weapons Summary -->
          <div v-if="startingArmorWeapons.length" class="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div class="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Armor & Weapon Proficiencies
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="item in startingArmorWeapons"
                :key="item"
                class="bg-white border border-gray-200 text-gray-800 px-2 py-0.5 rounded text-[11px] font-medium"
              >
                {{ item }}
              </span>
            </div>
          </div>

          <!-- Prior Background Skills -->
          <div v-if="priorGrantedSkills.length" class="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <span class="text-gray-600 font-medium">Already granted by background: </span>
            <span
              v-for="sk in priorGrantedSkills"
              :key="sk"
              class="inline-block bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[11px] mr-1 font-medium"
            >
              {{ getSkillLabel(sk) }}
            </span>
          </div>

          <!-- Class Skill Selection -->
          <div v-if="classSkillConfig.count > 0" data-error-field="classSkills" class="space-y-1.5">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-gray-800">
                  Class Skill Proficiencies (Choose {{ classSkillConfig.count }}):
                </span>
                <p class="text-[11px] text-gray-500">
                  Skills granted by your {{ selected?.class?.name || 'class' }} training.
                </p>
              </div>
              <span
                class="text-xs font-mono font-medium"
                :class="chosenClassSkills.length === classSkillConfig.count ? 'text-green-700' : 'text-gray-600'"
              >
                {{ chosenClassSkills.length }} / {{ classSkillConfig.count }}
              </span>
            </div>

            <div
              class="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 rounded"
              :class="skillError ? 'border border-red-500 rounded p-1.5' : ''"
            >
              <label
                v-for="skillKey in availableClassSkills"
                :key="skillKey"
                :class="[
                  chosenClassSkills.includes(skillKey) ? 'bg-gray-100 border-gray-400 font-medium text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
                  'flex items-center gap-2 p-2 border rounded cursor-pointer text-xs transition'
                ]"
              >
                <input
                  type="checkbox"
                  :value="skillKey"
                  :checked="chosenClassSkills.includes(skillKey)"
                  :disabled="!chosenClassSkills.includes(skillKey) && chosenClassSkills.length >= classSkillConfig.count"
                  @change="emit('toggleClassSkill', skillKey)"
                  class="rounded text-gray-900 accent-gray-900 focus:ring-0 cursor-pointer"
                />
                <span>{{ getSkillLabel(skillKey) }}</span>
              </label>
            </div>
            <p v-if="skillError" class="text-xs text-red-600 font-medium">
              {{ skillError }}
            </p>
          </div>

          <!-- Class Tool / Musical Instrument Selection -->
          <div v-if="classToolConfig.count > 0" data-error-field="classTools" class="space-y-1.5 pt-2 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-gray-800">
                  {{ classToolConfig.label }}:
                </span>
                <p class="text-[11px] text-gray-500">
                  Specialized tool or instrument training from your class.
                </p>
              </div>
              <span
                class="text-xs font-mono font-medium"
                :class="chosenClassTools.filter(Boolean).length === classToolConfig.count ? 'text-green-700' : 'text-gray-600'"
              >
                {{ chosenClassTools.filter(Boolean).length }} / {{ classToolConfig.count }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="slotIdx in classToolConfig.count" :key="'tool-' + slotIdx">
                <v-select
                  :model-value="chosenClassTools[slotIdx - 1] || null"
                  :options="classToolConfig.options"
                  :selectable="opt => !chosenClassTools.includes(opt) || chosenClassTools[slotIdx - 1] === opt"
                  :placeholder="`Select Option #${slotIdx}...`"
                  @update:model-value="val => emit('updateClassTool', { index: slotIdx - 1, value: val || '' })"
                  :class="{ 'has-error': toolError && !chosenClassTools[slotIdx - 1] }"
                />
              </div>
            </div>
            <p v-if="toolError" class="text-xs text-red-600 font-medium">
              {{ toolError }}
            </p>
          </div>
        </div>

        <!-- 2. Embedded Expertise Selection Inside Expertise Feature -->
        <div v-if="isExpertiseFeatureItem(classFeature)" data-error-field="expertises" class="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-gray-800">
                Expertise (Choose {{ expertiseConfig.count }}):
              </span>
              <p class="text-[11px] text-gray-500">
                Select from proficient skills to double your proficiency bonus on checks.
              </p>
            </div>
            <span
              class="text-xs font-mono font-medium"
              :class="chosenExpertiseSkills.length === expertiseConfig.count ? 'text-green-700' : 'text-gray-600'"
            >
              {{ chosenExpertiseSkills.length }} / {{ expertiseConfig.count }}
            </span>
          </div>

          <div v-if="allProficientSkills.length === 0" class="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
            Select your class skill proficiencies above in Core Proficiencies first.
          </div>

          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 gap-2"
            :class="expertiseError ? 'border border-red-500 rounded p-1.5' : ''"
          >
            <label
              v-for="skillKey in allProficientSkills"
              :key="skillKey"
              :class="[
                chosenExpertiseSkills.includes(skillKey) ? 'bg-gray-100 border-gray-400 font-medium text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
                'flex items-center gap-2 p-2 border rounded cursor-pointer text-xs transition'
              ]"
            >
              <input
                type="checkbox"
                :value="skillKey"
                :checked="chosenExpertiseSkills.includes(skillKey)"
                :disabled="!chosenExpertiseSkills.includes(skillKey) && chosenExpertiseSkills.length >= expertiseConfig.count"
                @change="emit('toggleExpertiseSkill', skillKey)"
                class="rounded text-gray-900 accent-gray-900 focus:ring-0 cursor-pointer"
              />
              <span>{{ getSkillLabel(skillKey) }}</span>
              <IconStarFilled
                v-if="chosenExpertiseSkills.includes(skillKey)"
                class="w-3.5 h-3.5 text-gray-800 ml-auto shrink-0"
              />
            </label>
          </div>
          <p v-if="expertiseError" class="text-xs text-red-600 font-medium">
            {{ expertiseError }}
          </p>
        </div>

        <!-- 3. Embedded ASI / Feat Choice Inside Ability Score Improvement Collapse -->
        <div
          v-if="isAsiFeatureItem(classFeature)"
          :data-error-field="getAsiFieldKey(classFeature.level)"
          class="mt-3 pt-3 border-t border-gray-200 space-y-3"
        >
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-xs font-semibold text-gray-700">
              Choose either Ability Increase or Feat:
            </span>
            <!-- Mode Toggle: ASI vs Feat -->
            <div class="flex gap-1 bg-gray-100 p-0.5 rounded">
              <button
                type="button"
                @click="ensureAsiTier(classFeature.level || 4).type = 'asi'"
                :class="ensureAsiTier(classFeature.level || 4).type === 'asi' ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500 hover:text-gray-900'"
                class="px-2.5 py-1 rounded text-[11px] transition cursor-pointer"
              >
                Ability Increase
              </button>
              <button
                type="button"
                @click="ensureAsiTier(classFeature.level || 4).type = 'feat'"
                :class="ensureAsiTier(classFeature.level || 4).type === 'feat' ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500 hover:text-gray-900'"
                class="px-2.5 py-1 rounded text-[11px] transition cursor-pointer"
              >
                Feat
              </button>
            </div>
          </div>

          <!-- When ASI is selected -->
          <div v-if="ensureAsiTier(classFeature.level || 4).type === 'asi'" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2.5">
            <div class="flex items-center gap-4 text-xs">
              <label class="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                <input
                  type="radio"
                  value="+2"
                  v-model="ensureAsiTier(classFeature.level || 4).asiMode"
                  class="text-gray-800 focus:ring-0"
                />
                <span>+2 to one ability</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                <input
                  type="radio"
                  value="+1_+1"
                  v-model="ensureAsiTier(classFeature.level || 4).asiMode"
                  class="text-gray-800 focus:ring-0"
                />
                <span>+1 to two abilities</span>
              </label>
            </div>

            <!-- +2 Dropdown -->
            <div v-if="ensureAsiTier(classFeature.level || 4).asiMode === '+2'">
              <select
                v-model="ensureAsiTier(classFeature.level || 4).plus2Stat"
                class="p-2 border border-gray-300 rounded w-full bg-white text-xs"
              >
                <option value="">Select Ability (+2)...</option>
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  {{ KEY_TO_LABEL[k] }} (+2)
                </option>
              </select>
            </div>

            <!-- +1 / +1 Dropdowns -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-1">First Ability (+1):</label>
                <select
                  v-model="ensureAsiTier(classFeature.level || 4).plus1StatA"
                  class="p-2 border border-gray-300 rounded w-full bg-white text-xs"
                >
                  <option value="">Select Ability A (+1)...</option>
                  <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                    {{ KEY_TO_LABEL[k] }} (+1)
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-1">Second Ability (+1):</label>
                <select
                  v-model="ensureAsiTier(classFeature.level || 4).plus1StatB"
                  class="p-2 border border-gray-300 rounded w-full bg-white text-xs"
                >
                  <option value="">Select Ability B (+1)...</option>
                  <option
                    v-for="k in ABILITY_KEYS.filter(a => a !== ensureAsiTier(classFeature.level || 4).plus1StatA)"
                    :key="k"
                    :value="k"
                  >
                    {{ KEY_TO_LABEL[k] }} (+1)
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- When Feat is selected -->
          <div v-else-if="ensureAsiTier(classFeature.level || 4).type === 'feat'" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2.5">
            <div>
              <label class="block font-semibold text-gray-800 text-xs mb-1">Select Feat:</label>
              <v-select
                v-model="ensureAsiTier(classFeature.level || 4).featName"
                :options="filteredFeats"
                :reduce="f => f.name"
                :get-option-label="f => `${f.name} (${f.source || 'PHB'})`"
                :get-option-key="f => f.name + '|' + (f.source || '')"
                placeholder="Select a feat..."
                :class="{ 'has-error': getAsiError(classFeature.level) }"
              />
            </div>

            <!-- Preview of selected Feat description -->
            <div
              v-if="getSelectedFeatObj(ensureAsiTier(classFeature.level || 4).featName)"
              class="p-2.5 bg-white border border-gray-200 rounded text-xs text-gray-700 space-y-1.5"
            >
              <div class="font-bold text-gray-900 flex items-center justify-between">
                <span>{{ getSelectedFeatObj(ensureAsiTier(classFeature.level || 4).featName).name }}</span>
                <span class="text-[10px] font-mono text-gray-500">{{ getSelectedFeatObj(ensureAsiTier(classFeature.level || 4).featName).source }}</span>
              </div>
              <div
                v-for="(entry, eIdx) in (getSelectedFeatObj(ensureAsiTier(classFeature.level || 4).featName).entries || [])"
                :key="eIdx"
                class="leading-relaxed"
              >
                <p v-if="typeof entry === 'string'" v-html="renderAnnotatedText(entry)"></p>
              </div>
            </div>

            <!-- Feat Ability Boost -->
            <div>
              <label class="block text-gray-700 text-xs mb-1 font-medium">Feat Ability Increase (+1 if applicable):</label>
              <select
                v-model="ensureAsiTier(classFeature.level || 4).featAbility"
                class="p-2 border border-gray-300 rounded w-full bg-white text-xs"
              >
                <option value="">None (+0)</option>
                <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                  +1 {{ KEY_TO_LABEL[k] }}
                </option>
              </select>
            </div>
          </div>

          <p
            v-if="getAsiError(classFeature.level)"
            class="text-xs text-red-600 font-medium"
          >
            {{ getAsiError(classFeature.level) }}
          </p>
        </div>
      </CollapsedComponent>
    </div>
  </div>
</template>

<style scoped>
</style>
