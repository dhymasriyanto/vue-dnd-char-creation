<script setup>
defineProps({
  isDiceTrayOpen: {
    type: Boolean,
    default: false
  },
  diceRollMode: {
    type: String,
    default: 'normal'
  },
  diceMultiplier: {
    type: Number,
    default: 1
  },
  diceMod: {
    type: Number,
    default: 0
  },
  standardDice: {
    type: Array,
    default: () => [4, 6, 8, 10, 12, 20, 100]
  },
  lastRoll: {
    type: Object,
    default: null
  },
  isReadOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:isDiceTrayOpen',
  'update:diceRollMode',
  'update:diceMultiplier',
  'update:diceMod',
  'quickRollDie',
  'closeLastRoll'
])
</script>

<template>
  <div>
    <!-- Floating Dice Roller FAB (Bottom-Right) -->
    <div v-if="!isReadOnly" class="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
      <!-- Popover Menu -->
      <transition name="fade">
        <div
          v-if="isDiceTrayOpen"
          class="absolute bottom-14 right-0 w-72 max-w-[calc(100vw-24px)] bg-white border border-gray-200 rounded-xl shadow-2xl p-3.5 text-xs space-y-3 z-50 select-none"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <span class="font-bold text-gray-800 text-[11px] uppercase tracking-wider">Quick Dice Roller</span>
            <button
              type="button"
              @click="emit('update:isDiceTrayOpen', false)"
              class="text-gray-400 hover:text-gray-700 font-bold text-sm cursor-pointer p-0.5 leading-none"
            >
              ×
            </button>
          </div>

          <!-- Roll Advantage/Disadvantage Mode for d20 -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-gray-600 font-medium">d20 Mode:</span>
            <div class="inline-flex rounded border border-gray-200 overflow-hidden text-[10px]">
              <button
                type="button"
                @click="emit('update:diceRollMode', 'normal')"
                :class="diceRollMode === 'normal' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Normal
              </button>
              <button
                type="button"
                @click="emit('update:diceRollMode', 'adv')"
                :class="diceRollMode === 'adv' ? 'bg-green-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer border-l border-r border-gray-200"
              >
                Adv
              </button>
              <button
                type="button"
                @click="emit('update:diceRollMode', 'dis')"
                :class="diceRollMode === 'dis' ? 'bg-red-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Dis
              </button>
            </div>
          </div>

          <!-- Multiplier & Modifier Row -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Quantity</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="emit('update:diceMultiplier', Math.max(1, diceMultiplier - 1))"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  :value="diceMultiplier"
                  @input="emit('update:diceMultiplier', Number($event.target.value))"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="emit('update:diceMultiplier', Math.min(20, diceMultiplier + 1))"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Modifier</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="emit('update:diceMod', diceMod - 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  :value="diceMod"
                  @input="emit('update:diceMod', Number($event.target.value))"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="emit('update:diceMod', diceMod + 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>
          </div>

          <!-- Dice Buttons Grid -->
          <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-gray-100">
            <button
              v-for="d in standardDice"
              :key="d"
              type="button"
              @click="emit('quickRollDie', d)"
              class="py-2 px-1 bg-gray-50 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 rounded font-mono font-bold text-xs text-center transition cursor-pointer"
            >
              d{{ d }}
            </button>
          </div>
        </div>
      </transition>

      <!-- The FAB Circle Button -->
      <button
        type="button"
        @click="emit('update:isDiceTrayOpen', !isDiceTrayOpen)"
        class="w-12 h-12 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-95 border-2 border-white"
        title="Open Dice Roller"
      >
        <span v-if="!isDiceTrayOpen" class="font-mono text-xs font-bold">d20</span>
        <span v-else class="text-base font-bold leading-none">×</span>
      </button>
    </div>

    <!-- Floating Dice Roll Result Toast (Bottom-Left on Desktop, Centered on Mobile) -->
    <transition name="fade">
      <div
        v-if="lastRoll"
        class="fixed bottom-5 left-4 sm:left-6 z-50 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:bottom-5 max-sm:w-[92vw] sm:w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-3 text-xs"
        :class="lastRoll.isNat20 ? 'ring-2 ring-amber-400' : (lastRoll.isNat1 ? 'ring-2 ring-red-400' : '')"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-bold uppercase">ROLL</span>
            <span class="font-bold text-gray-900 text-xs truncate max-w-[170px]">{{ lastRoll.label }}</span>
          </div>
          <button
            type="button"
            @click="emit('closeLastRoll')"
            class="text-gray-400 hover:text-gray-700 text-sm font-bold leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div class="flex items-baseline justify-between mt-2 pt-1.5 border-t border-gray-100">
          <div>
            <div class="text-2xl font-bold text-gray-900 leading-none">{{ lastRoll.total }}</div>
            <div class="text-[11px] text-gray-500 font-mono mt-0.5">{{ lastRoll.breakdown || lastRoll.formula }}</div>
          </div>
          <div>
            <span v-if="lastRoll.isNat20" class="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded uppercase">Natural 20</span>
            <span v-else-if="lastRoll.isNat1" class="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded uppercase">Critical Miss</span>
            <span v-else class="text-[10px] text-gray-400 font-mono">{{ lastRoll.timestamp }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
