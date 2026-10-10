<script setup>
defineProps({
  char: {
    type: Object,
    required: true
  },
  bgCompendiumData: {
    type: Object,
    default: null
  },
  isFetchingBg: {
    type: Boolean,
    default: false
  },
  formatOriginFeatName: {
    type: Function,
    required: true
  },
  formatBgAbilityScores: {
    type: Function,
    required: true
  },
  formatBgSkills: {
    type: Function,
    required: true
  },
  formatBgTools: {
    type: Function,
    required: true
  },
  formatBgLanguages: {
    type: Function,
    required: true
  },
  formatBgEquipmentSummary: {
    type: Function,
    required: true
  },
  renderAnnotatedText: {
    type: Function,
    required: true
  },
  format5eEntries: {
    type: Function,
    required: true
  }
})
</script>

<template>
  <div class="space-y-4 text-xs">
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
</template>
