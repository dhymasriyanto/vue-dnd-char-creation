<script setup>
import { renderAnnotatedText } from '../../../utils/textRenderer'

const props = defineProps({
  selectedEdition: {
    type: String,
    default: '2024'
  },
  characterBackground: {
    type: [Object, String],
    default: null
  },
  filteredBackgrounds: {
    type: Array,
    default: () => []
  },
  selectedBackgroundObj: {
    type: Object,
    default: null
  },
  errors: {
    type: Object,
    default: () => ({})
  },
  bgSkillConfig: {
    type: Object,
    default: () => ({ count: 0, label: '', options: [] })
  },
  chosenBgSkills: {
    type: Array,
    default: () => []
  },
  bgLangConfig: {
    type: Object,
    default: () => ({ choiceCount: 0, fixed: [] })
  },
  bgChosenLanguages: {
    type: Array,
    default: () => []
  },
  standardLanguages: {
    type: Array,
    default: () => []
  },
  bgToolConfig: {
    type: Object,
    default: () => ({ count: 0, label: '', options: [] })
  },
  chosenBgTools: {
    type: Array,
    default: () => []
  },
  detectedFeatSpellSources: {
    type: Array,
    default: () => []
  },
  featChosenSpells: {
    type: Array,
    default: () => []
  },
  parseBackgroundDetails: {
    type: Function,
    required: true
  },
  getSkillLabel: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:characterBackground',
  'backgroundChange',
  'goToFeatSpells'
])
</script>

<template>
  <div>
    <h2 class="text-base font-bold text-gray-900 mb-3">
      {{ selectedEdition === '2024' ? 'Background & Origin (2024)' : 'Background (2014)' }}
    </h2>

    <div class="mb-4" data-error-field="characterBackground">
      <label for="characterBackground" class="block text-xs font-semibold text-gray-700 mb-1">
        Character Background:
      </label>
      <v-select
        id="characterBackground"
        :model-value="characterBackground"
        :options="filteredBackgrounds"
        :get-option-label="b => b ? `${b.name} (${b.source || 'PHB'})` : ''"
        label="name"
        :placeholder="`Choose ${selectedEdition === '2024' ? 'origin background' : 'background'}...`"
        @update:model-value="val => { emit('update:characterBackground', val); emit('backgroundChange'); }"
        :class="{ 'has-error': errors.characterBackground }"
      />
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
          <v-select
            v-model="chosenBgSkills[idx - 1]"
            :options="bgSkillConfig.options"
            :get-option-label="skKey => getSkillLabel(skKey)"
            :selectable="skKey => !chosenBgSkills.includes(skKey) || chosenBgSkills[idx - 1] === skKey"
            :placeholder="`Select Skill #${idx}...`"
            :class="{ 'has-error': errors.bgSkills }"
          />
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
          <v-select
            v-model="bgChosenLanguages[idx - 1]"
            :options="standardLanguages"
            :selectable="l => !bgLangConfig.fixed.includes(l) && (!bgChosenLanguages.includes(l) || bgChosenLanguages[idx - 1] === l)"
            :placeholder="`Select Language #${idx}...`"
            :class="{ 'has-error': errors.bgLanguages && !bgChosenLanguages[idx - 1] }"
          />
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
          <v-select
            v-model="chosenBgTools[idx - 1]"
            :options="bgToolConfig.options"
            :selectable="opt => !chosenBgTools.includes(opt) || chosenBgTools[idx - 1] === opt"
            :placeholder="`Select Option #${idx}...`"
            :class="{ 'has-error': errors.bgTools }"
          />
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
        @click="emit('goToFeatSpells')"
        class="px-2.5 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded font-bold text-xs cursor-pointer shrink-0 transition"
      >
        Pick Feat Spells ({{ featChosenSpells.length }}) &rarr;
      </button>
    </div>
  </div>
</template>
