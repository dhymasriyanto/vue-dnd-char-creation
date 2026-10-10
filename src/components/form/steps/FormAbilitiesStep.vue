<script setup>
import {
  ABILITY_KEYS,
  KEY_TO_SHORT,
  KEY_TO_LABEL,
  STANDARD_ARRAY
} from '../../../constants/formConstants'

const props = defineProps({
  allClassRecommendations: { type: Array, default: () => [] },
  scoreMethod: { type: String, default: 'standard' },
  pointBuyRemaining: { type: Number, default: 27 },
  errors: { type: Object, default: () => ({}) },
  selectedEdition: { type: String, default: '2024' },
  characterBackground: { type: [String, Object], default: '' },
  bgEligibleAbilities: { type: Array, default: () => [] },
  asi2024Mode: { type: String, default: 'plus2_plus1' },
  asi2024Plus2: { type: String, default: '' },
  asi2024Plus1: { type: String, default: '' },
  characterRace: { type: Object, default: () => ({}) },
  characterSubRace: { type: Object, default: () => ({}) },
  asi2014Mode: { type: String, default: 'racial' },
  asi2014CustomPlus2: { type: String, default: '' },
  asi2014CustomPlus1: { type: String, default: '' },
  asiBonuses: { type: Object, default: () => ({}) },
  raceChoiceConfig: { type: Object, default: null },
  raceChooseStats: { type: Array, default: () => [] },
  baseScores: { type: Object, required: true },
  totalScores: { type: Object, required: true },
  abilityModifiers: { type: Object, required: true },
  allUnlockedAsiList: { type: Array, default: () => [] },
  filteredFeats: { type: Array, default: () => [] },

  setScoreMethod: { type: Function, required: true },
  resetPointBuy: { type: Function, required: true },
  rollAllStats: { type: Function, required: true },
  rollSingleStat: { type: Function, required: true },
  onStandardArraySelect: { type: Function, required: true },
  canDecrementPointBuy: { type: Function, required: true },
  canIncrementPointBuy: { type: Function, required: true },
  decrementPointBuy: { type: Function, required: true },
  incrementPointBuy: { type: Function, required: true },
  isPrimaryStat: { type: Function, required: true }
})

const emit = defineEmits([
  'update:asi2024Mode',
  'update:asi2024Plus2',
  'update:asi2024Plus1',
  'update:asi2014Mode',
  'update:asi2014CustomPlus2',
  'update:asi2014CustomPlus1'
])
</script>

<template>
  <div>
    <h2 class="text-base font-bold text-gray-900 mb-3">Ability Scores</h2>

    <!-- Class Primary Stats Recommendation -->
    <div v-if="allClassRecommendations.length" class="mb-3 text-xs text-gray-600 space-y-1">
      <div v-for="cr in allClassRecommendations" :key="cr.name">
        Recommended for <span class="capitalize">{{ cr.name.toLowerCase() }}</span>:
        <span class="font-medium text-gray-800">{{ cr.stats.join(', ') }}</span>
      </div>
    </div>

    <!-- Generation Method Selector -->
    <div class="mb-4">
      <label class="block text-xs font-semibold text-gray-700 mb-1">Score Generation Method:</label>
      <div class="flex gap-1 bg-gray-100 p-1 rounded">
        <button
          type="button"
          @click="setScoreMethod('standard')"
          :class="scoreMethod === 'standard' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
          class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
        >
          Standard Array
        </button>
        <button
          type="button"
          @click="setScoreMethod('pointbuy')"
          :class="scoreMethod === 'pointbuy' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
          class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
        >
          Point Buy (27)
        </button>
        <button
          type="button"
          @click="setScoreMethod('manual')"
          :class="scoreMethod === 'manual' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'"
          class="flex-1 py-1.5 text-xs rounded text-center transition cursor-pointer"
        >
          Manual / Roll
        </button>
      </div>
    </div>

    <!-- Method Sub-banner -->
    <div v-if="scoreMethod === 'standard'" class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
      Standard array (15, 14, 13, 12, 10, 8). Values are automatically swapped when assigned.
    </div>

    <div v-else-if="scoreMethod === 'pointbuy'" data-error-field="pointbuy" class="mb-4 p-2.5 bg-gray-50 border rounded text-xs flex justify-between items-center" :class="errors.pointbuy ? 'border-red-400' : 'border-gray-200'">
      <span class="font-medium" :class="pointBuyRemaining < 0 ? 'text-red-600' : 'text-gray-700'">
        Points: {{ pointBuyRemaining }} / 27
      </span>
      <button
        type="button"
        @click="resetPointBuy"
        class="text-xs text-gray-500 underline hover:text-gray-800 cursor-pointer"
      >
        Reset to 8
      </button>
    </div>

    <div v-else-if="scoreMethod === 'manual'" class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs flex justify-between items-center">
      <span class="text-gray-600">Enter numbers directly or roll 4d6 (drop lowest).</span>
      <button
        type="button"
        @click="rollAllStats"
        class="px-2.5 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black transition cursor-pointer"
      >
        Roll All
      </button>
    </div>

    <p v-if="errors.pointbuy" class="mb-3 text-xs text-red-600 font-medium">
      {{ errors.pointbuy }}
    </p>

    <!-- ASI Bonus Section (Background in 2024; Race in 2014) -->
    <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
      <!-- 2024 ASI Section -->
      <div v-if="selectedEdition === '2024'" data-error-field="asi2024">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-800">
            Background ASI: {{ characterBackground || 'None Selected' }}
          </span>
          <div class="flex gap-1">
            <button
              type="button"
              @click="emit('update:asi2024Mode', 'plus2_plus1')"
              :class="asi2024Mode === 'plus2_plus1' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              +2 / +1
            </button>
            <button
              type="button"
              @click="emit('update:asi2024Mode', 'plus1_three')"
              :class="asi2024Mode === 'plus1_three' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              +1 / +1 / +1
            </button>
          </div>
        </div>

        <div v-if="asi2024Mode === 'plus2_plus1'" class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="block text-gray-600 mb-1">+2 Ability:</label>
            <select
              :value="asi2024Plus2"
              @change="emit('update:asi2024Plus2', $event.target.value)"
              class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs"
            >
              <option v-for="ab in bgEligibleAbilities" :key="ab" :value="ab">
                {{ KEY_TO_LABEL[ab] }} (+2)
              </option>
            </select>
          </div>
          <div>
            <label class="block text-gray-600 mb-1">+1 Ability:</label>
            <select
              :value="asi2024Plus1"
              @change="emit('update:asi2024Plus1', $event.target.value)"
              class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs"
            >
              <option v-for="ab in bgEligibleAbilities.filter(k => k !== asi2024Plus2)" :key="ab" :value="ab">
                {{ KEY_TO_LABEL[ab] }} (+1)
              </option>
            </select>
          </div>
        </div>

        <div v-else class="text-gray-600 mt-1">
          +1 to: {{ bgEligibleAbilities.slice(0, 3).map(k => KEY_TO_LABEL[k]).join(', ') }}
        </div>

        <p v-if="errors.asi2024" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.asi2024 }}
        </p>
      </div>

      <!-- 2014 ASI Section -->
      <div v-else>
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-800">
            Racial ASI: {{ characterRace.name || 'None' }}
            <span v-if="characterSubRace.name">({{ characterSubRace.name }})</span>
          </span>
          <div class="flex gap-1">
            <button
              type="button"
              @click="emit('update:asi2014Mode', 'racial')"
              :class="asi2014Mode === 'racial' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              Racial
            </button>
            <button
              type="button"
              @click="emit('update:asi2014Mode', 'custom')"
              :class="asi2014Mode === 'custom' ? 'bg-white text-gray-900 border font-medium shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              Custom (+2/+1)
            </button>
          </div>
        </div>

        <div v-if="asi2014Mode === 'custom'" class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="block text-gray-600 mb-1">+2 Custom:</label>
            <select
              :value="asi2014CustomPlus2"
              @change="emit('update:asi2014CustomPlus2', $event.target.value)"
              class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs"
            >
              <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                {{ KEY_TO_LABEL[k] }} (+2)
              </option>
            </select>
          </div>
          <div>
            <label class="block text-gray-600 mb-1">+1 Custom:</label>
            <select
              :value="asi2014CustomPlus1"
              @change="emit('update:asi2014CustomPlus1', $event.target.value)"
              class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs"
            >
              <option v-for="k in ABILITY_KEYS.filter(a => a !== asi2014CustomPlus2)" :key="k" :value="k">
                {{ KEY_TO_LABEL[k] }} (+1)
              </option>
            </select>
          </div>
        </div>

        <div v-else class="text-gray-600">
          <span>{{ Object.entries(asiBonuses).filter(([_, v]) => v > 0).map(([k, v]) => `${KEY_TO_LABEL[k]} +${v}`).join(', ') || 'No racial bonus detected' }}</span>

          <div v-if="raceChoiceConfig" class="grid grid-cols-2 gap-2 mt-2">
            <div v-for="idx in raceChoiceConfig.count" :key="idx">
              <select v-model="raceChooseStats[idx - 1]" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
                <option
                  v-for="opt in raceChoiceConfig.from"
                  :key="opt"
                  :value="opt"
                  :disabled="raceChooseStats.filter((val, i) => i !== idx - 1).includes(opt)"
                >
                  {{ KEY_TO_LABEL[opt] }} (+1)
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 6 Ability Score Cards Grid -->
    <div
      data-error-field="abilities"
      class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 p-1 rounded"
      :class="errors.abilities ? 'border border-red-500 rounded p-2' : ''"
    >
      <div
        v-for="stat in ABILITY_KEYS"
        :key="stat"
        class="p-3 border border-gray-200 rounded bg-white flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold uppercase text-gray-800">{{ KEY_TO_SHORT[stat] }}</span>
            <span v-if="isPrimaryStat(stat)" class="text-[10px] text-gray-500 font-medium">Primary</span>
          </div>

          <div class="flex items-baseline justify-between mb-1">
            <span class="text-xl font-bold text-gray-900">{{ totalScores[stat] }}</span>
            <span class="text-xs font-semibold text-gray-600">{{ abilityModifiers[stat] }}</span>
          </div>

          <div class="text-[11px] text-gray-500 mb-2">
            Base {{ baseScores[stat] }} <span v-if="asiBonuses[stat]">(+{{ asiBonuses[stat] }})</span>
          </div>
        </div>

        <!-- Method Controls -->
        <div class="pt-2 border-t border-gray-100">
          <!-- Standard Array Selector -->
          <div v-if="scoreMethod === 'standard'">
            <select
              :value="baseScores[stat]"
              @change="onStandardArraySelect(stat, $event.target.value)"
              class="w-full p-1 text-xs border border-gray-300 rounded bg-white text-gray-800"
            >
              <option v-for="val in STANDARD_ARRAY" :key="val" :value="val">
                {{ val }}
              </option>
            </select>
          </div>

          <!-- Point Buy Controls -->
          <div v-else-if="scoreMethod === 'pointbuy'" class="flex items-center justify-between gap-1">
            <button
              type="button"
              @click="decrementPointBuy(stat)"
              :disabled="!canDecrementPointBuy(stat)"
              class="w-7 h-7 border rounded text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              -
            </button>
            <span class="text-xs font-medium">{{ baseScores[stat] }}</span>
            <button
              type="button"
              @click="incrementPointBuy(stat)"
              :disabled="!canIncrementPointBuy(stat)"
              class="w-7 h-7 border rounded text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              +
            </button>
          </div>

          <!-- Manual / Roll Controls -->
          <div v-else-if="scoreMethod === 'manual'" class="flex gap-1">
            <input
              type="number"
              min="3"
              max="20"
              v-model.number="baseScores[stat]"
              class="p-1 border border-gray-300 rounded w-full text-xs text-center"
            />
            <button
              type="button"
              @click="rollSingleStat(stat)"
              class="px-2 border rounded text-xs text-gray-600 hover:text-black cursor-pointer"
              title="Roll 4d6 drop lowest"
            >
              Roll
            </button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="errors.abilities" class="mt-1 mb-4 text-xs text-red-600 font-medium">
      {{ errors.abilities }}
    </p>

    <!-- Level 4, 6, 8, etc. ASI / Feat Improvement Choices -->
    <div v-if="allUnlockedAsiList.length > 0" data-error-field="asiTiers" class="mb-5 p-3.5 bg-gray-50 border rounded text-xs space-y-3" :class="errors.asiTiers ? 'border-red-400' : 'border-gray-200'">
      <div class="font-semibold text-gray-900 border-b border-gray-200 pb-1.5 flex justify-between items-center">
        <span>Level Improvements (ASI or Feat)</span>
        <span class="text-[10px] text-gray-500 font-normal">{{ allUnlockedAsiList.length }} improvement{{ allUnlockedAsiList.length > 1 ? 's' : '' }} eligible</span>
      </div>

      <div v-for="item in allUnlockedAsiList" :key="item.errorKey" :data-error-field="item.errorKey" class="p-2.5 bg-white border border-gray-200 rounded space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-gray-800">{{ item.className }} &mdash; Level {{ item.tier }}</span>
          <div class="flex gap-1 bg-gray-100 p-0.5 rounded">
            <button
              type="button"
              @click="item.choice.type = 'asi'"
              :class="item.choice.type === 'asi' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
            >
              Ability Increase
            </button>
            <button
              type="button"
              @click="item.choice.type = 'feat'"
              :class="item.choice.type === 'feat' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500'"
              class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
            >
              Feat
            </button>
          </div>
        </div>

        <!-- ASI Sub-options -->
        <div v-if="item.choice.type === 'asi'" class="space-y-2 pt-1">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="radio" value="+2" v-model="item.choice.asiMode" class="text-gray-900 focus:ring-0" />
              <span>+2 to one ability</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="radio" value="+1_+1" v-model="item.choice.asiMode" class="text-gray-900 focus:ring-0" />
              <span>+1 to two abilities</span>
            </label>
          </div>

          <div v-if="item.choice.asiMode === '+2'">
            <select v-model="item.choice.plus2Stat" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
              <option value="">Select Ability (+2)...</option>
              <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                {{ KEY_TO_LABEL[k] }} (+2)
              </option>
            </select>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <select v-model="item.choice.plus1StatA" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
              <option value="">Select Ability A (+1)...</option>
              <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                {{ KEY_TO_LABEL[k] }} (+1)
              </option>
            </select>
            <select v-model="item.choice.plus1StatB" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
              <option value="">Select Ability B (+1)...</option>
              <option v-for="k in ABILITY_KEYS.filter(a => a !== item.choice.plus1StatA)" :key="k" :value="k">
                {{ KEY_TO_LABEL[k] }} (+1)
              </option>
            </select>
          </div>
        </div>

        <!-- Feat Sub-options -->
        <div v-else-if="item.choice.type === 'feat'" class="space-y-2 pt-1">
          <div>
            <label class="block text-gray-600 text-[11px] mb-1">Choose Feat:</label>
            <v-select
              v-model="item.choice.featName"
              :options="filteredFeats"
              :reduce="f => f.name"
              :get-option-label="f => `${f.name} (${f.source || 'PHB'})`"
              :get-option-key="f => f.name + '|' + (f.source || '')"
              placeholder="Select a feat..."
            />
          </div>
          <div>
            <label class="block text-gray-600 text-[11px] mb-1">Feat Ability Increase (+1 if applicable):</label>
            <select v-model="item.choice.featAbility" class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs">
              <option value="">None (+0)</option>
              <option v-for="k in ABILITY_KEYS" :key="k" :value="k">
                +1 {{ KEY_TO_LABEL[k] }}
              </option>
            </select>
          </div>
        </div>

        <!-- Unselected prompt -->
        <div v-else class="text-[11px] text-gray-500 italic pt-1">
          Choose Ability Increase or Feat above.
        </div>

        <p v-if="errors[item.errorKey]" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors[item.errorKey] }}
        </p>
      </div>

      <p v-if="errors.asiTiers" class="mt-1 text-xs text-red-600 font-medium">
        {{ errors.asiTiers }}
      </p>
    </div>
  </div>
</template>
