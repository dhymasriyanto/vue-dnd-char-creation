<script setup>
import { IconEdit } from '@tabler/icons-vue'
import { LIFESTYLES } from '../../../utils/characteristicsHelper'

defineProps({
  char: {
    type: Object,
    required: true
  },
  parsedCharacteristics: {
    type: Object,
    default: () => ({})
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  sheetNotes: {
    type: Object,
    required: true
  },
  sheetNotesSubTab: {
    type: String,
    default: 'ALL'
  },
  isSavingNotes: {
    type: Boolean,
    default: false
  },
  notesSavedToast: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'edit',
  'update:sheetNotesSubTab',
  'saveSheetNotes'
])
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- Characteristics Header Card -->
    <div class="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold text-gray-900 tracking-wider uppercase">CHARACTERISTICS & DETAILS</h2>
        <p class="text-[11px] text-gray-500 mt-0.5">Physical appearance, traits, lifestyle, and character notes.</p>
      </div>
      <div v-if="!isReadOnly" class="flex items-center gap-1.5">
        <button
          type="button"
          @click="emit('edit')"
          class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-1 rounded text-xs font-medium cursor-pointer shadow-xs inline-flex items-center gap-1"
          title="Edit all characteristics in wizard"
        >
          <IconEdit class="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      </div>
    </div>

    <!-- Top Characteristics Grid (10 fields matching user screenshot) -->
    <div class="p-3.5 bg-white border border-gray-200 rounded">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">ALIGNMENT</div>
          <div class="font-semibold text-gray-900">{{ char.alignment || parsedCharacteristics.alignment || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">GENDER</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.gender || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">EYES</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.eyes || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">SIZE</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.size || 'Medium' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">HEIGHT</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.height || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">FAITH</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.faith || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">HAIR</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.hair || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">SKIN</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.skin || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">AGE</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.age || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">WEIGHT</div>
          <div class="font-semibold text-gray-900">{{ parsedCharacteristics.weight || '—' }}</div>
        </div>
      </div>
    </div>

    <!-- Personality Traits, Ideals, Bonds, Flaws -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Personality Traits -->
      <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
        <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
          <span>Personality Traits</span>
        </div>
        <div v-if="parsedCharacteristics.personalityTraits && parsedCharacteristics.personalityTraits.length" class="space-y-1">
          <p
            v-for="(tr, idx) in parsedCharacteristics.personalityTraits"
            :key="idx"
            class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
          >
            "{{ tr }}"
          </p>
        </div>
        <p v-else class="text-xs text-gray-400 italic">No personality traits recorded.</p>
      </div>

      <!-- Ideals -->
      <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
        <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
          <span>Ideals</span>
        </div>
        <div v-if="parsedCharacteristics.ideals && parsedCharacteristics.ideals.length" class="space-y-1">
          <p
            v-for="(idItem, idx) in parsedCharacteristics.ideals"
            :key="idx"
            class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
          >
            "{{ idItem }}"
          </p>
        </div>
        <p v-else class="text-xs text-gray-400 italic">No ideals recorded.</p>
      </div>

      <!-- Bonds -->
      <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
        <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
          <span>Bonds</span>
        </div>
        <div v-if="parsedCharacteristics.bonds && parsedCharacteristics.bonds.length" class="space-y-1">
          <p
            v-for="(bd, idx) in parsedCharacteristics.bonds"
            :key="idx"
            class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
          >
            "{{ bd }}"
          </p>
        </div>
        <p v-else class="text-xs text-gray-400 italic">No bonds recorded.</p>
      </div>

      <!-- Flaws -->
      <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
        <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
          <span>Flaws</span>
        </div>
        <div v-if="parsedCharacteristics.flaws && parsedCharacteristics.flaws.length" class="space-y-1">
          <p
            v-for="(fl, idx) in parsedCharacteristics.flaws"
            :key="idx"
            class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
          >
            "{{ fl }}"
          </p>
        </div>
        <p v-else class="text-xs text-gray-400 italic">No flaws recorded.</p>
      </div>
    </div>

    <!-- Appearance -->
    <div class="p-3.5 bg-white border border-gray-200 rounded space-y-2">
      <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">APPEARANCE</h3>
      <p v-if="parsedCharacteristics.appearance" class="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
        {{ parsedCharacteristics.appearance }}
      </p>
      <p v-else class="text-xs text-gray-400 italic">No appearance description provided.</p>
    </div>

    <!-- Lifestyle & Wealth -->
    <div class="p-3.5 bg-white border border-gray-200 rounded space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Lifestyle & Wealth</h3>
        <span class="text-[11px] font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
          {{ parsedCharacteristics.lifestyle || 'Modest' }} &bull; {{ LIFESTYLES.find(l => l.value === (parsedCharacteristics.lifestyle || 'Modest'))?.cost || '1 gp/day' }}
        </span>
      </div>
      <p class="text-xs text-gray-600">
        {{ LIFESTYLES.find(l => l.value === (parsedCharacteristics.lifestyle || 'Modest'))?.desc }}
      </p>
    </div>

    <!-- Notes & Organizations with interactive save -->
    <div class="p-4 bg-white border border-gray-200 rounded space-y-3">
      <div class="flex items-center justify-between">
        <!-- Sub-tabs bar: ALL, ORGS, ALLIES, ENEMIES, BACKSTORY, OTHER -->
        <div class="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
          <button
            v-for="st in ['ALL', 'ORGS', 'ALLIES', 'ENEMIES', 'BACKSTORY', 'OTHER']"
            :key="st"
            type="button"
            @click="emit('update:sheetNotesSubTab', st)"
            :class="sheetNotesSubTab === st ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'"
            class="px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition cursor-pointer"
          >
            {{ st }}
          </button>
        </div>

        <div v-if="!isReadOnly" class="flex items-center gap-2">
          <span v-if="notesSavedToast" class="text-[11px] text-emerald-600 font-semibold animate-pulse">Saved!</span>
          <button
            type="button"
            :disabled="isSavingNotes"
            @click="emit('saveSheetNotes')"
            class="bg-gray-900 hover:bg-black text-white px-3 py-1 rounded text-xs font-medium cursor-pointer transition shadow-xs disabled:opacity-50"
          >
            {{ isSavingNotes ? 'Saving...' : 'Save Notes' }}
          </button>
        </div>
      </div>

      <div class="space-y-4 pt-2">
        <!-- ORGANIZATIONS -->
        <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ORGS'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ORGANIZATIONS</h4>
          <textarea
            v-model="sheetNotes.organizations"
            rows="2"
            :readonly="isReadOnly"
            :placeholder="isReadOnly ? 'None' : '+ Add Organizations'"
            :class="{ 'bg-gray-50 text-gray-700 cursor-default': isReadOnly }"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- ALLIES -->
        <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ALLIES'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ALLIES</h4>
          <textarea
            v-model="sheetNotes.allies"
            rows="2"
            :readonly="isReadOnly"
            :placeholder="isReadOnly ? 'None' : '+ Add Allies'"
            :class="{ 'bg-gray-50 text-gray-700 cursor-default': isReadOnly }"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- ENEMIES -->
        <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ENEMIES'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ENEMIES</h4>
          <textarea
            v-model="sheetNotes.enemies"
            rows="2"
            :readonly="isReadOnly"
            :placeholder="isReadOnly ? 'None' : '+ Add Enemies'"
            :class="{ 'bg-gray-50 text-gray-700 cursor-default': isReadOnly }"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- BACKSTORY -->
        <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'BACKSTORY'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">BACKSTORY</h4>
          <textarea
            v-model="sheetNotes.backstory"
            rows="4"
            :readonly="isReadOnly"
            :placeholder="isReadOnly ? 'None' : '+ Add Backstory'"
            :class="{ 'bg-gray-50 text-gray-700 cursor-default': isReadOnly }"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <!-- OTHER -->
        <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'OTHER'" class="space-y-1.5">
          <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">OTHER</h4>
          <textarea
            v-model="sheetNotes.other"
            rows="2"
            :readonly="isReadOnly"
            :placeholder="isReadOnly ? 'None' : '+ Add Other'"
            :class="{ 'bg-gray-50 text-gray-700 cursor-default': isReadOnly }"
            class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>
