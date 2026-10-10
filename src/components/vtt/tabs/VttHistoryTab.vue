<script setup>
defineProps({
  rollHistory: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div class="space-y-1.5 text-xs">
    <div
      v-for="(h, idx) in rollHistory"
      :key="idx"
      class="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 font-mono"
    >
      <div>
        <span class="text-gray-400 mr-2 text-[11px]">{{ h.timestamp }}</span>
        <span class="text-gray-800 font-semibold">{{ h.label }}</span>
      </div>
      <div>
        <span class="text-gray-500 mr-2 text-[11px]">({{ h.breakdown || h.formula }})</span>
        <span
          class="text-xs font-bold"
          :class="h.isNat20 ? 'text-amber-600' : (h.isNat1 ? 'text-red-600' : 'text-gray-900')"
        >
          {{ h.total }}
        </span>
      </div>
    </div>
  </div>
</template>
