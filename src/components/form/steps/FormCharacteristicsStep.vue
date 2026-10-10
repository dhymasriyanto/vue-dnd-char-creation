<script setup>
import { ref } from 'vue'
import {
  IconPlus,
  IconTrash,
  IconDice
} from '@tabler/icons-vue'
import {
  LIFESTYLES,
  DND_SIZES
} from '../../../utils/characteristicsHelper'

const props = defineProps({
  characteristics: {
    type: Object,
    required: true
  },
  alignment: {
    type: String,
    default: ''
  },
  alignments: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:alignment', 'openTraitModal'])

const activeNotesSubTab = ref('ALL') // 'ALL' | 'ORGS' | 'ALLIES' | 'ENEMIES' | 'BACKSTORY' | 'OTHER'

const addPersonalityTrait = () => {
  props.characteristics.personalityTraits.push('')
}
const removePersonalityTrait = (idx) => {
  props.characteristics.personalityTraits.splice(idx, 1)
}

const addIdeal = () => {
  props.characteristics.ideals.push('')
}
const removeIdeal = (idx) => {
  props.characteristics.ideals.splice(idx, 1)
}

const addBond = () => {
  props.characteristics.bonds.push('')
}
const removeBond = (idx) => {
  props.characteristics.bonds.splice(idx, 1)
}

const addFlaw = () => {
  props.characteristics.flaws.push('')
}
const removeFlaw = (idx) => {
  props.characteristics.flaws.splice(idx, 1)
}
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-2">
      <h2 class="text-sm font-bold text-gray-900 tracking-wider uppercase">CHARACTERISTICS</h2>
    </div>

    <!-- Top Characteristics Grid -->
    <div class="bg-gray-50/70 p-3 sm:p-4 rounded border border-gray-200">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <!-- Alignment -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">ALIGNMENT</label>
          <v-select
            :model-value="alignment"
            @update:model-value="emit('update:alignment', $event)"
            :options="alignments"
            placeholder="--"
            class="text-xs bg-white rounded"
          />
        </div>
        <!-- Gender -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">GENDER</label>
          <select
            v-model="characteristics.gender"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          >
            <option value="">--</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <!-- Eyes -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">EYES</label>
          <input
            type="text"
            v-model="characteristics.eyes"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Size -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">SIZE</label>
          <select
            v-model="characteristics.size"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          >
            <option value="">--</option>
            <option v-for="s in DND_SIZES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <!-- Height -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">HEIGHT</label>
          <input
            type="text"
            v-model="characteristics.height"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Faith -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">FAITH</label>
          <input
            type="text"
            v-model="characteristics.faith"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Hair -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">HAIR</label>
          <input
            type="text"
            v-model="characteristics.hair"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Skin -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">SKIN</label>
          <input
            type="text"
            v-model="characteristics.skin"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Age -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">AGE</label>
          <input
            type="text"
            v-model="characteristics.age"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
        <!-- Weight -->
        <div>
          <label class="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">WEIGHT</label>
          <input
            type="text"
            v-model="characteristics.weight"
            placeholder="--"
            class="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
      </div>
    </div>

    <!-- Personality Traits, Ideals, Bonds, Flaws -->
    <div class="space-y-4 pt-1">
      <!-- Personality Traits -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-gray-900 text-xs">Personality Traits</h3>
          <button
            type="button"
            @click="emit('openTraitModal', 'personalityTraits')"
            class="inline-flex items-center gap-1 text-[11px] text-gray-700 hover:text-black font-semibold cursor-pointer px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="View suggested traits table or roll"
          >
            <IconDice class="w-3.5 h-3.5 text-gray-600" />
            <span>Table / Roll</span>
          </button>
        </div>
        <div v-if="characteristics.personalityTraits.length === 0">
          <button
            type="button"
            @click="addPersonalityTrait"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Personality Trait</span>
          </button>
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="(trait, idx) in characteristics.personalityTraits"
            :key="idx"
            class="flex items-start gap-1.5"
          >
            <textarea
              v-model="characteristics.personalityTraits[idx]"
              rows="2"
              placeholder="Enter personality trait..."
              class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
            <button
              type="button"
              @click="removePersonalityTrait(idx)"
              class="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
              title="Remove"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            @click="addPersonalityTrait"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1 pt-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Personality Trait</span>
          </button>
        </div>
      </div>

      <!-- Ideals -->
      <div class="space-y-2 pt-2 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-gray-900 text-xs">Ideals</h3>
          <button
            type="button"
            @click="emit('openTraitModal', 'ideals')"
            class="inline-flex items-center gap-1 text-[11px] text-gray-700 hover:text-black font-semibold cursor-pointer px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="View suggested ideals table or roll"
          >
            <IconDice class="w-3.5 h-3.5 text-gray-600" />
            <span>Table / Roll</span>
          </button>
        </div>
        <div v-if="characteristics.ideals.length === 0">
          <button
            type="button"
            @click="addIdeal"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Ideal</span>
          </button>
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="(ideal, idx) in characteristics.ideals"
            :key="idx"
            class="flex items-start gap-1.5"
          >
            <textarea
              v-model="characteristics.ideals[idx]"
              rows="2"
              placeholder="Enter ideal..."
              class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
            <button
              type="button"
              @click="removeIdeal(idx)"
              class="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
              title="Remove"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            @click="addIdeal"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1 pt-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Ideal</span>
          </button>
        </div>
      </div>

      <!-- Bonds -->
      <div class="space-y-2 pt-2 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-gray-900 text-xs">Bonds</h3>
          <button
            type="button"
            @click="emit('openTraitModal', 'bonds')"
            class="inline-flex items-center gap-1 text-[11px] text-gray-700 hover:text-black font-semibold cursor-pointer px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="View suggested bonds table or roll"
          >
            <IconDice class="w-3.5 h-3.5 text-gray-600" />
            <span>Table / Roll</span>
          </button>
        </div>
        <div v-if="characteristics.bonds.length === 0">
          <button
            type="button"
            @click="addBond"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Bond</span>
          </button>
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="(bond, idx) in characteristics.bonds"
            :key="idx"
            class="flex items-start gap-1.5"
          >
            <textarea
              v-model="characteristics.bonds[idx]"
              rows="2"
              placeholder="Enter bond..."
              class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
            <button
              type="button"
              @click="removeBond(idx)"
              class="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
              title="Remove"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            @click="addBond"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1 pt-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Bond</span>
          </button>
        </div>
      </div>

      <!-- Flaws -->
      <div class="space-y-2 pt-2 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-gray-900 text-xs">Flaws</h3>
          <button
            type="button"
            @click="emit('openTraitModal', 'flaws')"
            class="inline-flex items-center gap-1 text-[11px] text-gray-700 hover:text-black font-semibold cursor-pointer px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="View suggested flaws table or roll"
          >
            <IconDice class="w-3.5 h-3.5 text-gray-600" />
            <span>Table / Roll</span>
          </button>
        </div>
        <div v-if="characteristics.flaws.length === 0">
          <button
            type="button"
            @click="addFlaw"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Flaw</span>
          </button>
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="(flaw, idx) in characteristics.flaws"
            :key="idx"
            class="flex items-start gap-1.5"
          >
            <textarea
              v-model="characteristics.flaws[idx]"
              rows="2"
              placeholder="Enter flaw..."
              class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
            <button
              type="button"
              @click="removeFlaw(idx)"
              class="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
              title="Remove"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            @click="addFlaw"
            class="text-gray-500 hover:text-gray-800 text-xs font-medium cursor-pointer inline-flex items-center gap-1 pt-1"
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Flaw</span>
          </button>
        </div>
      </div>
    </div>

    <!-- APPEARANCE -->
    <div class="space-y-2 pt-3 border-t border-gray-200">
      <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">APPEARANCE</h3>
      <textarea
        v-model="characteristics.appearance"
        rows="3"
        placeholder="+ Add Appearance information (physical features, clothing, demeanor, scars, etc.)"
        class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
      ></textarea>
    </div>

    <!-- Lifestyle & Wealth -->
    <div class="space-y-2 pt-3 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Lifestyle & Wealth</h3>
        <span class="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
          {{ LIFESTYLES.find(l => l.value === characteristics.lifestyle)?.cost || '1 gp/day' }}
        </span>
      </div>
      <v-select
        v-model="characteristics.lifestyle"
        :options="LIFESTYLES"
        :reduce="opt => opt.value"
        label="label"
        :clearable="false"
        class="text-xs bg-white rounded"
      />
      <p class="text-[11px] text-gray-500">
        {{ LIFESTYLES.find(l => l.value === characteristics.lifestyle)?.desc }}
      </p>
    </div>

    <!-- Notes & Organizations Sub-Tabs -->
    <div class="pt-4 border-t border-gray-200 space-y-3">
      <!-- Sub-tabs bar: ALL, ORGS, ALLIES, ENEMIES, BACKSTORY, OTHER -->
      <div class="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold border-b border-gray-200">
        <button
          v-for="st in ['ALL', 'ORGS', 'ALLIES', 'ENEMIES', 'BACKSTORY', 'OTHER']"
          :key="st"
          type="button"
          @click="activeNotesSubTab = st"
          :class="activeNotesSubTab === st ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition cursor-pointer"
        >
          {{ st }}
        </button>
      </div>

      <!-- Sections displayed based on activeNotesSubTab -->
      <div class="space-y-4 pt-1">
        <!-- ORGANIZATIONS -->
        <div v-if="activeNotesSubTab === 'ALL' || activeNotesSubTab === 'ORGS'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ORGANIZATIONS</h4>
          <textarea
            v-model="characteristics.notes.organizations"
            rows="2"
            placeholder="+ Add Organizations"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- ALLIES -->
        <div v-if="activeNotesSubTab === 'ALL' || activeNotesSubTab === 'ALLIES'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ALLIES</h4>
          <textarea
            v-model="characteristics.notes.allies"
            rows="2"
            placeholder="+ Add Allies"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- ENEMIES -->
        <div v-if="activeNotesSubTab === 'ALL' || activeNotesSubTab === 'ENEMIES'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ENEMIES</h4>
          <textarea
            v-model="characteristics.notes.enemies"
            rows="2"
            placeholder="+ Add Enemies"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- BACKSTORY -->
        <div v-if="activeNotesSubTab === 'ALL' || activeNotesSubTab === 'BACKSTORY'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">BACKSTORY</h4>
          <textarea
            v-model="characteristics.notes.backstory"
            rows="3"
            placeholder="+ Add Backstory"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- OTHER -->
        <div v-if="activeNotesSubTab === 'ALL' || activeNotesSubTab === 'OTHER'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">OTHER</h4>
          <textarea
            v-model="characteristics.notes.other"
            rows="2"
            placeholder="+ Add Other"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>
