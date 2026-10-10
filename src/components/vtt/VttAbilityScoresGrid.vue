<script setup>
defineProps({
  abilities: { type: Object, default: () => ({}) },
  savingThrows: { type: Object, default: () => ({}) },
  isReadOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['roll-check', 'roll-save'])
</script>

<template>
  <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
    <div
      v-for="(stat, name) in abilities"
      :key="name"
      class="bg-white p-2.5 rounded border border-gray-200 text-center flex flex-col justify-between"
    >
      <span class="text-[10px] font-bold uppercase text-gray-500">{{ name.slice(0, 3) }}</span>

      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('roll-check', `${name.toUpperCase()} Check`, stat.modifier)"
        class="text-xl font-bold text-gray-900 hover:text-gray-700 transition cursor-pointer my-0.5"
        title="Click to roll Ability Check"
      >
        {{ stat.modifier_string }}
      </button>
      <span
        v-else
        class="text-xl font-bold text-gray-900 my-0.5 select-none font-mono block"
      >
        {{ stat.modifier_string }}
      </span>

      <span class="text-[11px] text-gray-500 font-mono">{{ stat.score }}</span>

      <!-- Saving Throw Roll Button -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('roll-save', `${name.toUpperCase()} Save`, savingThrows?.[name]?.total || stat.modifier)"
        class="mt-1 text-[10px] px-1 py-0.5 rounded transition cursor-pointer border"
        :class="savingThrows?.[name]?.proficient ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
      >
        Save {{ savingThrows?.[name]?.modifier_string || stat.modifier_string }}
      </button>
      <span
        v-else
        class="mt-1 text-[10px] px-1 py-0.5 rounded border select-none inline-block font-mono"
        :class="savingThrows?.[name]?.proficient ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600'"
      >
        Save {{ savingThrows?.[name]?.modifier_string || stat.modifier_string }}
      </span>
    </div>
  </div>
</template>
