<script setup>
import RaceSubRaceDetail from '../../RaceSubRaceDetail.vue'

const props = defineProps({
  selectedEdition: {
    type: String,
    default: '2024'
  },
  characterRace: {
    type: Object,
    default: () => ({})
  },
  characterSubRace: {
    type: Object,
    default: () => ({})
  },
  filteredRaces: {
    type: Array,
    default: () => []
  },
  filteredSubRaces: {
    type: Array,
    default: () => []
  },
  isSubraceRequired: {
    type: Boolean,
    default: false
  },
  raceChooseStats: {
    type: Object,
    default: () => ({})
  },
  raceLangConfig: {
    type: Object,
    default: () => ({ choiceCount: 0, fixed: [] })
  },
  raceChosenLanguages: {
    type: Array,
    default: () => []
  },
  standardLanguages: {
    type: Array,
    default: () => []
  },
  errors: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'update:characterRace',
  'update:characterSubRace',
  'update:raceChooseStats',
  'searchSubRace'
])

const onRaceSelect = (r) => {
  const selected = r || {}
  emit('update:characterRace', selected)
  emit('searchSubRace', selected)
}
</script>

<template>
  <div>
    <h2 class="text-base font-bold text-gray-900 mb-3">{{ selectedEdition === '2024' ? 'Species' : 'Race' }}</h2>
    <div class="mb-4" data-error-field="characterRace">
      <label for="characterRace" class="block text-xs font-semibold text-gray-700 mb-1">
        {{ selectedEdition === '2024' ? 'Character Species:' : 'Character Race:' }}
      </label>
      <v-select
        id="characterRace"
        :model-value="characterRace && characterRace.name ? characterRace : null"
        :options="filteredRaces"
        :get-option-label="r => r?.name ? `${r.name} (${r.source || 'PHB'})` : ''"
        :get-option-key="r => r ? (r.id || r.name + '|' + (r.source || '')) : ''"
        :placeholder="`Choose ${selectedEdition === '2024' ? 'species' : 'race'}...`"
        @update:model-value="onRaceSelect"
        :class="{ 'has-error': errors.characterRace }"
      />
      <p v-if="errors.characterRace" class="mt-1 text-xs text-red-600 font-medium">
        {{ errors.characterRace }}
      </p>
    </div>

    <RaceSubRaceDetail
      :selected="characterRace"
      :abilityChoices="raceChooseStats"
      @update:abilityChoices="$emit('update:raceChooseStats', $event)"
    />

    <div v-if="Object.keys(characterRace || {}).length !== 0 && filteredSubRaces.length !== 0" class="my-4" data-error-field="characterSubRace">
      <label for="characterSubRace" class="block text-xs font-semibold text-gray-700 mb-1">
        {{ selectedEdition === '2024' ? 'Lineage / Subrace:' : 'Sub Race / Lineage:' }}
        <span v-if="isSubraceRequired" class="text-red-500">*</span>
        <span v-else class="text-gray-400 font-normal ml-1">(Optional)</span>
      </label>
      <v-select
        id="characterSubRace"
        :model-value="characterSubRace && characterSubRace.name ? characterSubRace : null"
        :options="filteredSubRaces"
        :get-option-label="r => r?.name ? `${r.name} (${r.source || 'PHB'})` : ''"
        :get-option-key="r => r ? (r.id || r.name + '|' + (r.source || '')) : ''"
        :placeholder="isSubraceRequired ? `Choose ${selectedEdition === '2024' ? 'lineage' : 'sub race'} (Required)...` : 'None / Standard'"
        @update:model-value="r => $emit('update:characterSubRace', r || {})"
        :class="{ 'has-error': errors.characterSubRace }"
      />
      <p v-if="errors.characterSubRace" class="mt-1 text-xs text-red-600 font-medium">
        {{ errors.characterSubRace }}
      </p>
    </div>
    <RaceSubRaceDetail
      :selected="characterSubRace"
      :abilityChoices="raceChooseStats"
      @update:abilityChoices="$emit('update:raceChooseStats', $event)"
    />

    <!-- Race Language Choices -->
    <div v-if="raceLangConfig.choiceCount > 0" data-error-field="raceLanguages" class="my-4 p-3 bg-gray-50 border rounded text-xs" :class="errors.raceLanguages ? 'border-red-400' : 'border-gray-200'">
      <div class="font-medium text-gray-800 mb-1.5">
        Choose {{ raceLangConfig.choiceCount }} Language{{ raceLangConfig.choiceCount > 1 ? 's' : '' }} ({{ selectedEdition === '2024' ? 'Species' : 'Race' }}):
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div v-for="idx in raceLangConfig.choiceCount" :key="idx">
          <v-select
            v-model="raceChosenLanguages[idx - 1]"
            :options="standardLanguages"
            :selectable="l => !raceLangConfig.fixed.includes(l) && (!raceChosenLanguages.includes(l) || raceChosenLanguages[idx - 1] === l)"
            :placeholder="`Select Language #${idx}...`"
            :class="{ 'has-error': errors.raceLanguages && !raceChosenLanguages[idx - 1] }"
          />
        </div>
      </div>
      <p v-if="errors.raceLanguages" class="mt-1 text-xs text-red-600 font-medium">
        {{ errors.raceLanguages }}
      </p>
    </div>
  </div>
</template>
