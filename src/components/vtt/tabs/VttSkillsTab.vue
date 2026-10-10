<script setup>
import {
  IconStarFilled,
  IconPlus,
  IconTrash
} from '@tabler/icons-vue'

defineProps({
  computedSkills: {
    type: Object,
    default: () => ({})
  },
  hasJackOfAllTrades: {
    type: Boolean,
    default: false
  },
  hasRemarkableAthlete: {
    type: Boolean,
    default: false
  },
  customSkills: {
    type: Array,
    default: () => []
  },
  customSkillsList: {
    type: Array,
    default: () => []
  },
  isReadOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'rollDice',
  'openAddCustomSkill',
  'deleteCustomSkill'
])
</script>

<template>
  <div class="space-y-3 text-xs">
    <!-- Legend -->
    <div class="flex items-center gap-3 sm:gap-4 text-[11px] text-gray-500 pb-2 border-b border-gray-200 flex-wrap">
      <span class="font-semibold text-gray-700">Proficiency:</span>
      <span class="inline-flex items-center gap-1.5">
        <IconStarFilled class="w-3.5 h-3.5 text-gray-900" />
        <span>Expertise</span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-gray-800 inline-block"></span>
        <span>Proficient</span>
      </span>
      <span v-if="hasJackOfAllTrades" class="inline-flex items-center gap-1.5" title="Bard: Jack of All Trades (+½ PB rounded down)">
        <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
        <span>Jack of All Trades</span>
      </span>
      <span v-else-if="hasRemarkableAthlete" class="inline-flex items-center gap-1.5" title="Champion: Remarkable Athlete (+½ PB rounded up)">
        <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
        <span>Remarkable Athlete</span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"></span>
        <span>Not Proficient</span>
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div
        v-for="(sk, sName) in computedSkills"
        :key="sName"
        class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition"
      >
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 flex items-center justify-center shrink-0">
            <IconStarFilled
              v-if="sk.expertise"
              class="w-3.5 h-3.5 text-gray-900"
              title="Expertise"
            />
            <span
              v-else-if="sk.proficient"
              class="w-2.5 h-2.5 rounded-full bg-gray-800"
              title="Proficient"
            ></span>
            <span
              v-else-if="sk.jack_of_all_trades"
              class="font-mono font-bold text-[11px] text-gray-800"
              title="Jack of All Trades (+½ PB rounded down)"
            >½</span>
            <span
              v-else-if="sk.remarkable_athlete"
              class="font-mono font-bold text-[11px] text-gray-800"
              title="Remarkable Athlete (+½ PB rounded up)"
            >½</span>
            <span
              v-else
              class="w-2.5 h-2.5 rounded-full border border-gray-300"
              title="Not Proficient"
            ></span>
          </span>
          <span class="capitalize font-medium text-gray-800">{{ sName.replace(/_/g, ' ') }}</span>
          <span class="text-[10px] text-gray-400 uppercase">({{ sk.ability.slice(0, 3) }})</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-gray-500 font-mono text-[11px]">Passive {{ sk.passive }}</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('rollDice', `${sName.replace(/_/g, ' ').toUpperCase()} Check`, sk.total)"
            class="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-mono font-bold transition cursor-pointer text-xs"
          >
            {{ sk.modifier_string }}
          </button>
          <span
            v-else
            class="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-800 font-mono font-bold text-xs select-none"
          >
            {{ sk.modifier_string }}
          </span>
        </div>
      </div>
    </div>

    <!-- Custom Skills Section -->
    <div class="pt-3 border-t border-gray-200 space-y-2">
      <div class="flex items-center justify-between pb-1">
        <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
          Custom Skills ({{ customSkills.length }})
        </h3>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('openAddCustomSkill')"
          class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
        >
          <IconPlus class="w-3 h-3" />
          <span>Add Custom Skill</span>
        </button>
      </div>

      <div v-if="customSkillsList.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="csk in customSkillsList"
          :key="csk.id"
          class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition"
        >
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 flex items-center justify-center shrink-0">
              <IconStarFilled v-if="csk.expertise" class="w-3.5 h-3.5 text-gray-900" title="Expertise" />
              <span v-else-if="csk.proficient" class="w-2.5 h-2.5 rounded-full bg-gray-800" title="Proficient"></span>
              <span v-else class="w-2.5 h-2.5 rounded-full border border-gray-300" title="Not Proficient"></span>
            </span>
            <span class="capitalize font-medium text-gray-800">{{ csk.name }}</span>
            <span class="text-[10px] text-gray-400 uppercase">({{ csk.ability.slice(0, 3) }})</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-mono text-[11px]">Passive {{ csk.passive }}</span>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="emit('rollDice', `${csk.name.toUpperCase()} Check`, csk.total)"
              class="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-mono font-bold transition cursor-pointer text-xs"
            >
              {{ csk.modifier_string }}
            </button>
            <span
              v-else
              class="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-800 font-mono font-bold text-xs select-none"
            >
              {{ csk.modifier_string }}
            </span>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="emit('deleteCustomSkill', csk.id)"
              class="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
              title="Delete custom skill"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
