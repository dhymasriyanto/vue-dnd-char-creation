<script setup>
import { ref } from 'vue'
import {
  IconCamera,
  IconStar,
  IconStarFilled,
  IconCampfire,
  IconMoon,
  IconBook,
  IconShare,
  IconHome,
  IconEdit,
  IconMenu2,
  IconX
} from '@tabler/icons-vue'

const props = defineProps({
  char: { type: Object, required: true },
  classSummary: { type: String, default: '' },
  resolvedImageUrl: { type: String, default: '' },
  isUploadingAvatar: { type: Boolean, default: false },
  isReadOnly: { type: Boolean, default: false },
  campaignName: { type: String, default: '' },
  isInspired: { type: Boolean, default: false }
})

const emit = defineEmits([
  'avatar-change',
  'open-campaign',
  'toggle-inspiration',
  'open-short-rest',
  'open-long-rest',
  'open-compendium',
  'open-export',
  'back',
  'edit'
])

const avatarFileInput = ref(null)
const isMobileMenuOpen = ref(false)

const triggerAvatarUpload = () => {
  if (props.isReadOnly || props.isUploadingAvatar) return
  avatarFileInput.value?.click()
}

const onFileChange = (e) => {
  emit('avatar-change', e)
}
</script>

<template>
  <div class="flex flex-row justify-between items-start pb-4 border-b border-gray-200 gap-3 relative">
    <div class="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
      <!-- Avatar / Initial with interactive click to change -->
      <div
        @click="triggerAvatarUpload"
        :class="isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-gray-500'"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-base sm:text-lg overflow-hidden shrink-0 shadow-xs relative group transition"
        :title="isReadOnly ? 'Character Portrait' : 'Click to change portrait (Max 2MB)'"
      >
        <img
          v-if="resolvedImageUrl"
          :src="resolvedImageUrl"
          :alt="char.name"
          class="w-full h-full object-cover"
        />
        <span v-else>{{ (char.name || 'H').charAt(0).toUpperCase() }}</span>

        <!-- Hover overlay -->
        <div v-if="!isReadOnly" class="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-[9px] font-semibold text-center leading-tight p-0.5">
          <span v-if="isUploadingAvatar">...</span>
          <template v-else>
            <IconCamera class="w-3.5 h-3.5 mb-0.5" />
            <span>Change</span>
          </template>
        </div>
      </div>
      <input
        ref="avatarFileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{{ char.name || 'Hero' }}</h1>
          <span
            class="text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-semibold border bg-gray-100 border-gray-200 text-gray-700 whitespace-nowrap"
          >
            {{ char.edition === '2024' ? '2024 One D&D' : '2014 5e' }}
          </span>
        </div>
        <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug flex flex-wrap gap-x-1.5">
          <span class="whitespace-nowrap">Level {{ char.level || 1 }} <strong class="text-gray-900 font-semibold">{{ classSummary }}</strong></span>
          <span class="whitespace-nowrap">• {{ char.race?.name || 'Unknown Species' }}</span>
          <span class="whitespace-nowrap">• {{ char.background || 'No Background' }}</span>
          <span class="whitespace-nowrap">• {{ char.alignment || 'Neutral' }}</span>
        </p>
      </div>
    </div>

    <!-- Actions, Campaign & Rest in Header Toolbar (Desktop view) -->
    <div class="hidden sm:flex items-center gap-1 sm:gap-1.5 shrink-0 pt-0.5 flex-wrap justify-end">
      <!-- Campaign Trigger -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-campaign')"
        class="bg-white hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded border border-gray-300 font-medium transition cursor-pointer shadow-xs text-xs max-w-[130px] truncate"
        title="Campaign Settings"
      >
        {{ campaignName || 'No Campaign' }}
      </button>

      <!-- Heroic Inspiration -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('toggle-inspiration')"
        class="p-1.5 rounded border transition cursor-pointer shadow-xs flex items-center justify-center"
        :class="isInspired ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-400'"
        :title="isInspired ? 'Heroic Inspiration (Active)' : 'Heroic Inspiration (Inactive)'"
        aria-label="Heroic Inspiration"
      >
        <IconStarFilled v-if="isInspired" class="w-4 h-4 text-amber-500" />
        <IconStar v-else class="w-4 h-4 text-gray-400" />
      </button>
      <span
        v-else
        class="p-1.5 rounded border shadow-xs flex items-center justify-center select-none"
        :class="isInspired ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-gray-50 border-gray-200 text-gray-400'"
        :title="isInspired ? 'Heroic Inspiration (Active)' : 'Heroic Inspiration (Inactive)'"
      >
        <IconStarFilled v-if="isInspired" class="w-4 h-4 text-amber-500" />
        <IconStar v-else class="w-4 h-4 text-gray-300" />
      </span>

      <!-- Short Rest -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-short-rest')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Short Rest"
        aria-label="Short Rest"
      >
        <IconCampfire class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Long Rest -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-long-rest')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Long Rest"
        aria-label="Long Rest"
      >
        <IconMoon class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Compendium -->
      <button
        type="button"
        @click="emit('open-compendium')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Compendium"
        aria-label="Compendium"
      >
        <IconBook class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Export / Share -->
      <button
        type="button"
        @click="emit('open-export')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Export / Share Character (PDF, Link, Avrae)"
        aria-label="Export / Share Character"
      >
        <IconShare class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Home -->
      <button
        type="button"
        @click="emit('back')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Home"
        aria-label="Home"
      >
        <IconHome class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Edit Character -->
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('edit')"
        class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
        title="Edit Character"
        aria-label="Edit Character"
      >
        <IconEdit class="w-4 h-4 text-gray-700" />
      </button>

      <!-- Read Only Badge -->
      <span
        v-else
        class="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold select-none"
      >
        Read Only
      </span>
    </div>

    <!-- Mobile Hamburger Button & Dropdown Menu -->
    <div class="sm:hidden relative shrink-0">
      <button
        type="button"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 shadow-xs flex items-center justify-center transition cursor-pointer"
        aria-label="Menu"
      >
        <IconX v-if="isMobileMenuOpen" class="w-5 h-5 text-gray-700" />
        <IconMenu2 v-else class="w-5 h-5 text-gray-700" />
      </button>

      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-30"
        @click="isMobileMenuOpen = false"
      ></div>

      <div
        v-if="isMobileMenuOpen"
        class="absolute right-0 top-11 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-40 text-xs divide-y divide-gray-100"
      >
        <!-- Campaign in Mobile Menu -->
        <div class="px-3 py-2 flex items-center justify-between">
          <span class="font-medium text-gray-600">Campaign</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('open-campaign'); isMobileMenuOpen = false"
            class="font-semibold text-gray-900 hover:underline max-w-[110px] truncate"
          >
            {{ campaignName || 'No Campaign' }}
          </button>
          <span
            v-else
            class="font-semibold text-gray-900 max-w-[110px] truncate"
          >
            {{ campaignName || 'No Campaign' }}
          </span>
        </div>

        <!-- Inspiration in Mobile Menu -->
        <div class="px-3 py-2 flex items-center justify-between">
          <span class="font-medium text-gray-600">Inspiration</span>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('toggle-inspiration')"
            :class="isInspired ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-200'"
            class="px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 cursor-pointer"
          >
            <IconStarFilled v-if="isInspired" class="w-3.5 h-3.5 text-amber-500" />
            <IconStar v-else class="w-3.5 h-3.5 text-gray-400" />
            <span>{{ isInspired ? 'Active' : 'Off' }}</span>
          </button>
          <span
            v-else
            :class="isInspired ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200'"
            class="px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 select-none"
          >
            <IconStarFilled v-if="isInspired" class="w-3.5 h-3.5 text-amber-500" />
            <IconStar v-else class="w-3.5 h-3.5 text-gray-400" />
            <span>{{ isInspired ? 'Active' : 'Off' }}</span>
          </span>
        </div>

        <!-- Rests -->
        <div v-if="!isReadOnly" class="py-1">
          <button
            type="button"
            @click="emit('open-short-rest'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconCampfire class="w-4 h-4 text-gray-600" />
            <span>Short Rest</span>
          </button>
          <button
            type="button"
            @click="emit('open-long-rest'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconMoon class="w-4 h-4 text-gray-600" />
            <span>Long Rest</span>
          </button>
        </div>

        <!-- Export & Share -->
        <div class="py-1">
          <button
            type="button"
            @click="emit('open-export'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconShare class="w-4 h-4 text-gray-600" />
            <span>Export & Share</span>
          </button>
        </div>

        <!-- Navigation & Edit -->
        <div class="py-1">
          <button
            type="button"
            @click="emit('open-compendium'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconBook class="w-4 h-4 text-gray-600" />
            <span>Compendium</span>
          </button>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('edit'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconEdit class="w-4 h-4 text-gray-600" />
            <span>Edit Character</span>
          </button>
          <button
            type="button"
            @click="emit('back'); isMobileMenuOpen = false"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
          >
            <IconHome class="w-4 h-4 text-gray-600" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
