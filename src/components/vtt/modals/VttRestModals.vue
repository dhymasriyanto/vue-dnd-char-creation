<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  showShortRest: {
    type: Boolean,
    default: false
  },
  showLongRest: {
    type: Boolean,
    default: false
  },
  hitDieFaces: {
    type: [Number, String],
    default: 8
  },
  conMod: {
    type: Number,
    default: 0
  },
  currentHp: {
    type: Number,
    default: 10
  },
  maxHp: {
    type: Number,
    default: 10
  },
  remainingHitDice: {
    type: Number,
    default: 1
  },
  maxHitDiceCount: {
    type: Number,
    default: 1
  },
  shortRestRollResult: {
    type: Object,
    default: null
  },
  recoverSummaryText: {
    type: String,
    default: ''
  },
  charEdition: {
    type: String,
    default: '2024'
  }
})

const emit = defineEmits([
  'rollHitDie',
  'completeShortRest',
  'closeShortRest',
  'closeLongRest',
  'executeLongRest'
])

const longRestRule = ref(props.charEdition === '2024' ? '5.5e' : '5e')
const resetMaxHpOnRest = ref(true)

watch(() => props.charEdition, (ed) => {
  longRestRule.value = ed === '2024' ? '5.5e' : '5e'
})

const handleExecuteLongRest = () => {
  emit('executeLongRest', {
    rule: longRestRule.value,
    resetMaxHp: resetMaxHpOnRest.value
  })
}
</script>

<template>
  <div>
    <!-- Short Rest Modal -->
    <div v-if="showShortRest" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Short Rest</span>
          <button type="button" @click="emit('completeShortRest')" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <p class="text-xs text-gray-600">
          Spend Hit Dice to recover Hit Points. You regain 1d{{ hitDieFaces }} + CON modifier ({{ conMod >= 0 ? '+' : '' }}{{ conMod }}) per die rolled.
        </p>

        <div class="bg-gray-50 border border-gray-200 rounded p-3 flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase font-bold text-gray-500">Current HP</div>
            <div class="text-lg font-bold text-gray-900">{{ currentHp }} <span class="text-xs font-normal text-gray-500">/ {{ maxHp }}</span></div>
          </div>
          <div class="text-right">
            <div class="text-[10px] uppercase font-bold text-gray-500">Available Hit Dice</div>
            <div class="text-lg font-bold text-gray-900 font-mono">{{ remainingHitDice }} <span class="text-xs font-normal text-gray-500">/ {{ maxHitDiceCount }}d{{ hitDieFaces }}</span></div>
          </div>
        </div>

        <div v-if="shortRestRollResult" class="p-2.5 bg-gray-100 border border-gray-300 rounded text-xs space-y-1">
          <div class="font-bold text-gray-900">Hit Die Spent: +{{ shortRestRollResult.healed }} HP recovered!</div>
          <div class="text-gray-700 font-mono text-[11px]">
            Rolled {{ shortRestRollResult.roll }} on d{{ shortRestRollResult.die }} {{ shortRestRollResult.mod >= 0 ? '+' : '' }}{{ shortRestRollResult.mod }} (CON) = {{ shortRestRollResult.total }}
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button
            type="button"
            @click="emit('rollHitDie')"
            :disabled="remainingHitDice <= 0 || currentHp >= maxHp"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition"
          >
            Roll 1 Hit Die
          </button>
          <button
            type="button"
            @click="emit('completeShortRest')"
            class="px-3.5 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow-xs"
          >
            Finish Short Rest
          </button>
        </div>
      </div>
    </div>

    <!-- Long Rest Modal -->
    <div v-if="showLongRest" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Long Rest</h3>
          <button
            type="button"
            @click="emit('closeLongRest')"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Flavor / Description -->
        <p class="text-xs text-gray-600 leading-relaxed">
          A long rest is a period of extended downtime, at least 8 hours long, during which a character sleeps for at least 6 hours and performs no more than 2 hours of light activity, such as reading, talking, eating, or standing watch.
        </p>

        <!-- Hit Dice Recovery Rule Selection -->
        <div class="space-y-2 pt-1">
          <label
            class="flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition"
            :class="longRestRule === '5e' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900/10' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="radio"
              name="longRestRule"
              value="5e"
              v-model="longRestRule"
              class="mt-0.5 text-gray-900 accent-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <div class="text-xs">
              <span class="font-bold text-gray-900 block">Recover 1/2 Hit Dice</span>
              <span class="text-gray-500 text-[11px]">Use 5e Rules (2014)</span>
            </div>
          </label>

          <label
            class="flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition"
            :class="longRestRule === '5.5e' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900/10' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="radio"
              name="longRestRule"
              value="5.5e"
              v-model="longRestRule"
              class="mt-0.5 text-gray-900 accent-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <div class="text-xs">
              <span class="font-bold text-gray-900 block">Recover all Hit Dice</span>
              <span class="text-gray-500 text-[11px]">Use 5.5e Rules (2024)</span>
            </div>
          </label>
        </div>

        <!-- RECOVER Summary Box -->
        <div class="border-t border-b border-gray-200 py-3">
          <span class="text-[10px] font-black uppercase text-gray-900 tracking-wider block mb-1">RECOVER</span>
          <p class="text-xs text-gray-800 font-medium">
            {{ recoverSummaryText }}
          </p>
        </div>

        <!-- Reset Maximum HP checkbox -->
        <div class="pt-0.5">
          <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
            <input
              type="checkbox"
              v-model="resetMaxHpOnRest"
              class="rounded text-gray-900 accent-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer"
            />
            <span>Reset Maximum HP changes during this rest</span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="longRestRule = charEdition === '2024' ? '5.5e' : '5e'; resetMaxHpOnRest = true"
            class="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
          >
            Reset defaults
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="emit('closeLongRest')"
              class="px-3.5 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleExecuteLongRest"
              class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition shadow-xs"
            >
              Take Long Rest
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
