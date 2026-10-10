<script setup>
defineProps({
  liveDefenses: { type: Object, default: () => ({ resistances: [], immunities: [], vulnerabilities: [] }) },
  saveAdvantageNotes: { type: Array, default: () => [] },
  liveConditions: { type: Array, default: () => [] },
  isReadOnly: { type: Boolean, default: false }
})

const emit = defineEmits([
  'open-add-defense',
  'remove-defense',
  'open-save-notes',
  'open-conditions',
  'remove-condition'
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
    <!-- Defenses Card -->
    <div class="bg-white p-3 rounded border border-gray-200 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700">Defenses</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('open-add-defense')"
            class="text-gray-600 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
          >
            + Add
          </button>
        </div>

        <div class="mt-2 space-y-2">
          <!-- Resistances -->
          <div v-if="liveDefenses.resistances?.length">
            <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Resistances</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="d in liveDefenses.resistances"
                :key="d"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
              >
                <span>{{ d }}</span>
                <button v-if="!isReadOnly" type="button" @click.stop="emit('remove-defense', 'resistances', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
              </span>
            </div>
          </div>

          <!-- Immunities -->
          <div v-if="liveDefenses.immunities?.length">
            <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Immunities</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="d in liveDefenses.immunities"
                :key="d"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
              >
                <span>{{ d }}</span>
                <button v-if="!isReadOnly" type="button" @click.stop="emit('remove-defense', 'immunities', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
              </span>
            </div>
          </div>

          <!-- Vulnerabilities -->
          <div v-if="liveDefenses.vulnerabilities?.length">
            <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Vulnerabilities</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="d in liveDefenses.vulnerabilities"
                :key="d"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
              >
                <span>{{ d }}</span>
                <button v-if="!isReadOnly" type="button" @click.stop="emit('remove-defense', 'vulnerabilities', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
              </span>
            </div>
          </div>

          <div v-if="!liveDefenses.resistances?.length && !liveDefenses.immunities?.length && !liveDefenses.vulnerabilities?.length" class="text-xs text-gray-400 py-1 italic">
            No damage resistances or immunities.
          </div>
        </div>
      </div>

      <!-- Saving Throw Advantages & Notes inside Defenses Card -->
      <div class="mt-3 pt-2 border-t border-gray-100">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[9px] uppercase font-bold text-gray-400">Saving Throw Notes</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('open-save-notes')"
            class="text-gray-600 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
          >
            Configure
          </button>
        </div>
        <div v-if="saveAdvantageNotes.length" class="space-y-1">
          <div
            v-for="note in saveAdvantageNotes"
            :key="note.label"
            class="text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 leading-snug"
          >
            <strong class="font-semibold text-gray-900">{{ note.label }}</strong>
          </div>
        </div>
        <div v-else class="text-xs text-gray-400 italic">
          No special saving throw traits.
        </div>
      </div>
    </div>

    <!-- Conditions Card -->
    <div class="bg-white p-3 rounded border border-gray-200 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700">Conditions</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('open-conditions')"
            class="text-gray-600 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
          >
            Manage
          </button>
        </div>

        <div class="mt-2">
          <div v-if="liveConditions.length" class="flex flex-wrap gap-1">
            <span
              v-for="c in liveConditions"
              :key="c"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 border border-amber-300 text-amber-900"
            >
              <span>{{ c }}</span>
              <button v-if="!isReadOnly" type="button" @click.stop="emit('remove-condition', c)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
            </span>
          </div>
          <div v-else class="text-xs text-gray-400 py-2 italic text-center">
            No active conditions.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
