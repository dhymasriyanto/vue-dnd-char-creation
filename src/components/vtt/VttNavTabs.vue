<script setup>
defineProps({
  vtt: { type: Object, default: () => ({}) },
  activeTab: { type: String, default: 'actions' },
  charSpellsCount: { type: Number, default: 0 },
  liveEquipmentCount: { type: Number, default: 0 },
  rollHistoryCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:activeTab'])
</script>

<template>
  <div>
    <!-- Senses Bar -->
    <div class="flex flex-wrap items-center gap-3 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-4 text-gray-600">
      <span class="font-bold text-gray-700 uppercase text-[10px] tracking-wider">Senses:</span>
      <span>Passive Perception: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_perception || 10 }}</strong></span>
      <span>Passive Investigation: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_investigation || 10 }}</strong></span>
      <span>Passive Insight: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_insight || 10 }}</strong></span>
      <span v-if="vtt.senses?.darkvision">Darkvision: <strong class="text-gray-900">{{ vtt.senses.darkvision }}</strong></span>
    </div>

    <!-- Tabs Navigation -->
    <div class="flex gap-2 border-b border-gray-200 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
      <button
        type="button"
        @click="emit('update:activeTab', 'actions')"
        :class="activeTab === 'actions' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ACTIONS
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'spells')"
        :class="activeTab === 'spells' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SPELLS</span>
        <span v-if="charSpellsCount" class="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ charSpellsCount }}
        </span>
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'skills')"
        :class="activeTab === 'skills' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SKILLS</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          18
        </span>
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'features')"
        :class="activeTab === 'features' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        FEATURES
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'class_table')"
        :class="activeTab === 'class_table' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        CLASS TABLE
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'equipment')"
        :class="activeTab === 'equipment' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>EQUIPMENT</span>
        <span v-if="liveEquipmentCount" class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ liveEquipmentCount }}
        </span>
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'characteristics')"
        :class="activeTab === 'characteristics' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        CHARACTERISTICS
      </button>
      <button
        type="button"
        @click="emit('update:activeTab', 'background')"
        :class="activeTab === 'background' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        BACKGROUND
      </button>
      <button
        type="button"
        v-if="rollHistoryCount"
        @click="emit('update:activeTab', 'history')"
        :class="activeTab === 'history' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>HISTORY</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ rollHistoryCount }}
        </span>
      </button>
    </div>
  </div>
</template>
