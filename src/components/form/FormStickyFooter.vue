<script setup>
import { IconArrowLeft } from '@tabler/icons-vue'

defineProps({
  isFirstStep: { type: Boolean, default: true },
  isLastStep: { type: Boolean, default: false },
  isSubmitting: { type: Boolean, default: false },
  isEditMode: { type: Boolean, default: false }
})

const emit = defineEmits(['prev', 'next', 'back', 'submit'])
</script>

<template>
  <div class="sticky-buttons">
    <div class="button-container">
      <div v-if="!isFirstStep">
        <button
          type="button"
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded cursor-pointer transition text-xs font-medium"
          @click="emit('prev')"
        >
          Previous
        </button>
      </div>
      <div v-else>
        <button
          type="button"
          class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 p-2 rounded cursor-pointer transition text-xs font-medium flex items-center justify-center"
          @click="emit('back')"
          title="Back to Character List"
          aria-label="Back to Character List"
        >
          <IconArrowLeft class="w-4 h-4" />
        </button>
      </div>
    </div>
    <div class="button-container">
      <div v-if="!isLastStep">
        <button
          type="button"
          class="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded cursor-pointer transition text-xs font-medium"
          @click="emit('next')"
        >
          Next
        </button>
      </div>
      <div v-else>
        <button
          type="button"
          :disabled="isSubmitting"
          class="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded cursor-pointer disabled:opacity-50 transition text-xs font-semibold shadow-xs"
          @click="emit('submit')"
        >
          {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Submit & View Sheet') }}
        </button>
      </div>
    </div>
  </div>
</template>
