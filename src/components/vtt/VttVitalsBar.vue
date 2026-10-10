<script setup>
const props = defineProps({
  currentArmorClass: { type: [Number, String], default: 10 },
  computedInitiative: { type: Number, default: 0 },
  customSpeeds: { type: Object, default: () => ({ walk: 30 }) },
  otherSpeedsList: { type: Array, default: () => [] },
  proficiencyBonus: { type: [Number, String], default: 2 },
  currentHp: { type: Number, default: 10 },
  effectiveMaxHp: { type: Number, default: 10 },
  tempHpInput: { type: [Number, String], default: '' },
  remainingHitDice: { type: [Number, String], default: 1 },
  totalHitDice: { type: [Number, String], default: 1 },
  hpInput: { type: Number, default: 1 },
  isReadOnly: { type: Boolean, default: false }
})

const emit = defineEmits([
  'open-ac-modal',
  'roll-initiative',
  'open-speed-modal',
  'open-hp-modal',
  'update-temp-hp',
  'apply-heal',
  'apply-damage',
  'update:hp-input',
  'update:temp-hp-input'
])
</script>

<template>
  <div class="my-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 items-stretch">
    <!-- 4 Stats Group: 4 columns on mobile, contents on sm/md -->
    <div class="grid grid-cols-4 gap-1.5 sm:contents">
      <!-- Armor Class Shield Card Box -->
      <div class="sm:col-span-2 flex flex-col justify-center items-center h-[72px] sm:h-[76px]">
        <div
          @click="emit('open-ac-modal')"
          class="relative w-full max-w-[82px] h-[72px] sm:max-w-[88px] sm:h-[76px] flex flex-col items-center justify-center select-none cursor-pointer group hover:scale-[1.03] transition-transform"
          title="Configure Armor Class"
        >
          <svg
            class="absolute inset-0 w-full h-full drop-shadow-xs group-hover:drop-shadow-sm transition-all"
            viewBox="0 0 100 88"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="acShieldBg" x1="50" y1="4" x2="50" y2="84" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#f1f5f9" />
              </linearGradient>
            </defs>
            <!-- Outer Shield Shape -->
            <path
              d="M 5 6 Q 50 10 95 6 C 96.5 42 85 66 50 84 C 15 66 3.5 42 5 6 Z"
              fill="url(#acShieldBg)"
              stroke="#94a3b8"
              stroke-width="2.2"
              stroke-linejoin="round"
            />
            <!-- Inner Inset Rim -->
            <path
              d="M 11 12 Q 50 15.5 89 12 C 90 42 80 63 50 78 C 20 63 10 42 11 12 Z"
              fill="none"
              stroke="#cbd5e1"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
          </svg>
          <div class="relative z-10 flex flex-col items-center justify-center text-center px-1 -mt-0.5 sm:-mt-1">
            <span class="text-[7.5px] sm:text-[8.5px] font-bold text-gray-500 uppercase tracking-tight leading-none group-hover:text-gray-900 transition-colors">ARMOR CLASS</span>
            <span class="text-xl sm:text-2xl font-black text-gray-900 leading-none mt-1 sm:mt-1.5">{{ currentArmorClass }}</span>
          </div>
        </div>
      </div>

      <!-- Initiative -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('roll-initiative')"
        class="sm:col-span-2 bg-gray-100/70 hover:bg-gray-200/80 p-1.5 sm:p-2 rounded border border-gray-300 text-center transition cursor-pointer group flex flex-col items-center justify-center h-[72px] sm:h-[76px]"
      >
        <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold group-hover:text-gray-900 leading-none">Initiative</span>
        <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1.5">
          {{ computedInitiative >= 0 ? '+' : '' }}{{ computedInitiative }}
        </span>
      </button>
      <div
        v-else
        class="sm:col-span-2 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px] select-none"
      >
        <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none">Initiative</span>
        <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1.5">
          {{ computedInitiative >= 0 ? '+' : '' }}{{ computedInitiative }}
        </span>
      </div>

      <!-- Speed -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-speed-modal')"
        class="sm:col-span-2 bg-gray-100/70 hover:bg-gray-200/80 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px] cursor-pointer transition group"
        title="Configure Speeds & Movement"
      >
        <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none group-hover:text-gray-900 transition-colors">Speed</span>
        <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1">
          {{ customSpeeds?.walk || 30 }} <span class="text-xs font-normal text-gray-500">ft</span>
        </span>
        <div v-if="otherSpeedsList.length > 0" class="text-[7.5px] sm:text-[8px] text-gray-500 font-medium truncate max-w-full px-0.5 mt-0.5 leading-tight">
          <span v-for="(s, idx) in otherSpeedsList" :key="s.type">
            {{ s.type }} {{ s.speed }}ft{{ idx < otherSpeedsList.length - 1 ? ' · ' : '' }}
          </span>
        </div>
      </button>
      <div
        v-else
        class="sm:col-span-2 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px] select-none"
      >
        <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none">Speed</span>
        <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1">
          {{ customSpeeds?.walk || 30 }} <span class="text-xs font-normal text-gray-500">ft</span>
        </span>
        <div v-if="otherSpeedsList.length > 0" class="text-[7.5px] sm:text-[8px] text-gray-500 font-medium truncate max-w-full px-0.5 mt-0.5 leading-tight">
          <span v-for="(s, idx) in otherSpeedsList" :key="s.type">
            {{ s.type }} {{ s.speed }}ft{{ idx < otherSpeedsList.length - 1 ? ' · ' : '' }}
          </span>
        </div>
      </div>

      <!-- Proficiency Bonus -->
      <div class="sm:col-span-1 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px]">
        <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none">Prof</span>
        <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1.5">+{{ proficiencyBonus }}</span>
      </div>
    </div>

    <!-- Hit Points, Temp HP & Hit Dice Combined Card -->
    <div class="sm:col-span-5 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 flex flex-col justify-between h-[72px] sm:h-[76px]">
      <div class="grid grid-cols-3 gap-1 items-start text-center">
        <!-- Current HP -->
        <div
          :class="isReadOnly ? 'flex flex-col items-center px-1 -mx-0.5 py-0.5 select-none' : 'flex flex-col items-center cursor-pointer group hover:bg-gray-200/60 rounded px-1 -mx-0.5 py-0.5 transition'"
          @click="!isReadOnly && emit('open-hp-modal')"
          :title="isReadOnly ? 'Hit Points' : 'Manage Hit Points'"
        >
          <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none" :class="{ 'group-hover:text-gray-900 transition-colors': !isReadOnly }">Hit Points</span>
          <div class="flex items-baseline gap-0.5 mt-0.5">
            <span class="text-base sm:text-lg font-bold leading-none" :class="currentHp <= (effectiveMaxHp/3) ? 'text-red-700' : 'text-gray-900'">
              {{ currentHp }}
            </span>
            <span class="text-[10px] text-gray-500 font-semibold leading-none">/{{ effectiveMaxHp }}</span>
          </div>
        </div>

        <!-- Temp HP -->
        <div class="flex flex-col items-center">
          <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none">Temp HP</span>
          <div class="mt-0.5">
            <input
              v-if="!isReadOnly"
              type="number"
              min="0"
              :value="tempHpInput"
              @input="emit('update:temp-hp-input', $event.target.value)"
              @change="emit('update-temp-hp')"
              @keydown.enter="emit('update-temp-hp')"
              class="w-10 sm:w-11 text-center text-sm sm:text-base font-bold text-gray-900 bg-white border border-gray-300 rounded h-5 px-0.5 leading-none focus:border-gray-900 focus:outline-none"
              placeholder="0"
              title="Temporary Hit Points (click to edit)"
            />
            <span
              v-else
              class="w-10 sm:w-11 text-center text-sm sm:text-base font-bold text-gray-900 h-5 flex items-center justify-center font-mono leading-none select-none"
            >
              {{ tempHpInput || 0 }}
            </span>
          </div>
        </div>

        <!-- Hit Dice -->
        <div class="flex flex-col items-center">
          <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none">Hit Dice</span>
          <div class="text-sm sm:text-base font-bold text-gray-900 mt-0.5 font-mono leading-none">
            {{ remainingHitDice }}<span class="text-[10px] font-normal text-gray-500 font-sans">/{{ totalHitDice }}</span>
          </div>
        </div>
      </div>

      <!-- Heal / Damage Controls -->
      <div v-if="!isReadOnly" class="flex items-center gap-1 sm:gap-1.5 pt-1 border-t border-gray-200/80">
        <button
          type="button"
          @click="emit('apply-heal')"
          class="flex-1 bg-gray-900 hover:bg-black text-white text-[10px] h-5 rounded font-semibold transition cursor-pointer flex items-center justify-center leading-none"
        >
          Heal
        </button>
        <input
          type="number"
          min="1"
          :value="hpInput"
          @input="emit('update:hp-input', Number($event.target.value))"
          class="w-10 bg-white border border-gray-300 rounded h-5 text-center text-[11px] font-semibold shrink-0"
        />
        <button
          type="button"
          @click="emit('apply-damage')"
          class="flex-1 bg-gray-900 hover:bg-black text-white text-[10px] h-5 rounded font-semibold transition cursor-pointer flex items-center justify-center leading-none"
        >
          Damage
        </button>
      </div>
    </div>
  </div>
</template>
