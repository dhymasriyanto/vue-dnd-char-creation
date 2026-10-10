<script setup>
import { IconX, IconDice } from '@tabler/icons-vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  backgroundName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'select', 'roll'])
</script>

<template>
  <div
    v-if="isOpen"
    @click.self="emit('close')"
    class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
  >
    <div class="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full text-xs max-h-[85vh] flex flex-col">
      <div class="flex items-center justify-between p-3.5 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-900 text-sm">{{ title }} Table</h3>
          <p class="text-[11px] text-gray-500">
            {{ backgroundName ? `${backgroundName} suggested options` : 'Suggested options' }} (d{{ options.length }})
          </p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>

      <div class="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
        <span class="text-xs text-gray-600">Pick any option below or roll:</span>
        <button
          type="button"
          @click="emit('roll')"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded cursor-pointer transition shadow-xs"
        >
          <IconDice class="w-4 h-4" />
          <span>Roll Random (d{{ options.length }})</span>
        </button>
      </div>

      <div class="p-3 overflow-y-auto space-y-2 flex-1">
        <div
          v-for="(opt, idx) in options"
          :key="idx"
          @click="emit('select', opt)"
          class="p-2.5 rounded border border-gray-200 hover:border-gray-900 hover:bg-gray-50 cursor-pointer transition flex items-start gap-2.5 group text-xs text-gray-700"
        >
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 group-hover:bg-gray-900 group-hover:text-white font-bold text-[11px] shrink-0 text-gray-600 transition">
            {{ idx + 1 }}
          </span>
          <span class="flex-1 leading-relaxed">{{ opt }}</span>
        </div>
      </div>

      <div class="p-3 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          @click="emit('close')"
          class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
