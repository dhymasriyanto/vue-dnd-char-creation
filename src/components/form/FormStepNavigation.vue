<script setup>
defineProps({
  activeSteps: { type: Array, required: true },
  currentTab: { type: String, required: true }
})

const emit = defineEmits(['go-to-step'])
</script>

<template>
  <div class="flex items-center justify-between border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar gap-1 sm:gap-2 pb-0.5">
    <button
      v-for="tab in activeSteps"
      :key="tab.id"
      type="button"
      @click="emit('go-to-step', tab.id)"
      :class="[
        currentTab === tab.id
          ? 'border-gray-900 text-gray-900 font-bold'
          : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 font-medium',
        'flex-1 text-center py-2.5 px-1 sm:px-3 border-b-2 text-xs sm:text-sm transition cursor-pointer whitespace-nowrap'
      ]"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
