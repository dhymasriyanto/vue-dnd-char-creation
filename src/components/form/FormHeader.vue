<script setup>
import { ref } from 'vue'
import { IconArrowLeft, IconCamera } from '@tabler/icons-vue'

defineProps({
  isFirstStep: { type: Boolean, default: true },
  selectedEdition: { type: String, default: '2024' },
  currentSourceOptions: { type: Array, default: () => [] },
  selectedSources: { type: Array, default: () => [] },
  displayImageUrl: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isUploadingImage: { type: Boolean, default: false },
  imageUploadError: { type: String, default: '' },
  characterName: { type: String, default: '' },
  errors: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'back',
  'change-edition',
  'toggle-source',
  'set-sources-core-only',
  'set-sources-select-all',
  'avatar-selected',
  'remove-image',
  'update:characterName'
])

const avatarFileInputRef = ref(null)

const triggerAvatarSelect = () => {
  avatarFileInputRef.value?.click()
}
</script>

<template>
  <div>
    <!-- Header: Back & Ruleset Edition Selector -->
    <div class="mb-5 pb-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <button
          type="button"
          @click="emit('back')"
          class="text-xs bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 font-medium transition cursor-pointer mb-2 sm:mb-0 flex items-center justify-center"
          title="Back to Character List"
          aria-label="Back to Character List"
        >
          <IconArrowLeft class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-gray-700">Ruleset:</span>
        <div class="flex gap-1 bg-gray-200 p-1 rounded">
          <button
            type="button"
            :disabled="!isFirstStep"
            @click="emit('change-edition', '2024')"
            :class="[
              selectedEdition === '2024' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-700 hover:text-black',
              !isFirstStep ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            class="px-3 py-1 text-xs rounded font-medium transition"
          >
            2024 One D&D
          </button>
          <button
            type="button"
            :disabled="!isFirstStep"
            @click="emit('change-edition', '2014')"
            :class="[
              selectedEdition === '2014' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-700 hover:text-black',
              !isFirstStep ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            class="px-3 py-1 text-xs rounded font-medium transition"
          >
            2014 Classic
          </button>
        </div>
      </div>
    </div>

    <!-- Source Books Toolbar (Disabled outside first step) -->
    <div class="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs" :class="!isFirstStep ? 'bg-gray-100/70 border-gray-200' : ''">
      <div class="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <div class="flex items-center gap-2 font-semibold text-gray-700">
          <span>Sources:</span>
          <div v-if="isFirstStep" class="flex items-center gap-1 font-normal">
            <button
              type="button"
              @click="emit('set-sources-core-only')"
              class="px-1.5 py-0.5 text-[10px] bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium cursor-pointer transition shadow-2xs"
            >
              Core Only
            </button>
            <button
              type="button"
              @click="emit('set-sources-select-all')"
              class="px-1.5 py-0.5 text-[10px] bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium cursor-pointer transition shadow-2xs"
            >
              Select All
            </button>
          </div>
        </div>
        <span v-if="isFirstStep" class="text-[10px] text-gray-500">Core default</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="src in currentSourceOptions"
          :key="src.code"
          type="button"
          :disabled="!isFirstStep"
          @click="emit('toggle-source', src.code)"
          :class="[
            !isFirstStep ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
            (selectedSources || []).includes(src.code) ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold shadow-xs' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
          ]"
          class="px-2 py-0.5 rounded border text-[11px] transition"
        >
          <span class="font-bold">{{ src.code }}</span>
          <span class="hidden sm:inline text-[10px] ml-1 opacity-75">({{ src.label.split('(')[0].trim() }})</span>
        </button>
      </div>
    </div>

    <!-- Character Avatar & Name Input -->
    <div class="mb-5 flex flex-row items-center gap-3 sm:gap-4" data-error-field="characterName">
      <!-- Portrait Uploader -->
      <div class="relative shrink-0 flex flex-col items-center">
        <div
          @click="triggerAvatarSelect"
          class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 bg-gray-50 flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden transition shadow-xs"
          title="Upload character image (Max 2MB)"
        >
          <img
            v-if="displayImageUrl"
            :src="displayImageUrl"
            alt="Portrait"
            class="w-full h-full object-cover"
          />
          <div v-else class="flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-600">
            <IconCamera class="w-5 h-5 mb-0.5" />
            <span class="text-[9px] font-bold uppercase tracking-wider">Photo</span>
          </div>

          <!-- Hover overlay if image exists -->
          <div
            v-if="displayImageUrl"
            class="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-semibold"
          >
            Change
          </div>

          <!-- Loading state -->
          <div
            v-if="isUploadingImage"
            class="absolute inset-0 bg-white/85 flex items-center justify-center text-[10px] font-bold text-gray-700"
          >
            ...
          </div>
        </div>

        <input
          ref="avatarFileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="emit('avatar-selected', $event)"
        />

        <button
          v-if="imageUrl"
          type="button"
          @click="emit('remove-image')"
          class="mt-1 text-[10px] text-gray-500 hover:text-red-600 underline font-medium cursor-pointer"
        >
          Remove
        </button>
      </div>

      <!-- Name Input -->
      <div class="flex-1 min-w-0">
        <label for="characterName" class="block text-xs font-semibold text-gray-700 mb-1">Character Name:</label>
        <input
          type="text"
          id="characterName"
          :value="characterName"
          @input="emit('update:characterName', $event.target.value)"
          :class="errors.characterName ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
          class="p-2 border rounded w-full text-xs bg-white focus:outline-none focus:border-gray-900"
          placeholder="Enter character name"
        />
        <p v-if="errors.characterName" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.characterName }}
        </p>
        <p v-if="imageUploadError" class="mt-1 text-xs text-red-600 font-medium">
          {{ imageUploadError }}
        </p>
      </div>
    </div>
  </div>
</template>
