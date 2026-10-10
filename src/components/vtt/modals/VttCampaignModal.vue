<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  activeCampaignId: {
    type: [Number, String],
    default: null
  },
  campaignName: {
    type: String,
    default: ''
  },
  charCampaignName: {
    type: String,
    default: ''
  },
  userCampaigns: {
    type: Array,
    default: () => []
  },
  selectedLinkCampaignId: {
    type: [Number, String],
    default: ''
  },
  isLinkingCampaign: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'close',
  'update:selectedLinkCampaignId',
  'goToCampaignRoom',
  'unlinkCharacter',
  'linkCharacter'
])
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3.5">
      <div class="flex items-center justify-between pb-2 border-b border-gray-200">
        <span class="font-bold text-gray-900 text-sm">Campaign Settings</span>
        <button type="button" @click="emit('close')" class="text-gray-400 hover:text-gray-700 font-bold leading-none cursor-pointer">×</button>
      </div>

      <!-- Currently Linked to a Campaign -->
      <div v-if="activeCampaignId" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase font-bold text-gray-400">Linked Campaign</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Active</span>
        </div>
        <div class="text-sm font-bold text-gray-900">{{ campaignName || charCampaignName }}</div>
        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            @click="emit('goToCampaignRoom')"
            class="flex-1 py-1.5 px-3 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer transition shadow-xs text-center"
          >
            Open Campaign Room
          </button>
          <button
            type="button"
            @click="emit('unlinkCharacter')"
            class="py-1.5 px-2.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer transition shadow-xs"
          >
            Unlink
          </button>
        </div>
      </div>

      <!-- Not linked or switch campaign -->
      <div v-else class="space-y-3">
        <div v-if="userCampaigns.length > 0" class="space-y-1.5">
          <label class="block text-xs font-semibold text-gray-700">Link to Existing Campaign</label>
          <div class="flex items-center gap-1.5">
            <select
              :value="selectedLinkCampaignId"
              @change="emit('update:selectedLinkCampaignId', $event.target.value)"
              class="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            >
              <option value="">Select a Campaign...</option>
              <option v-for="c in userCampaigns" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.is_dm ? 'DM' : 'Player' }})
              </option>
            </select>
            <button
              type="button"
              @click="emit('linkCharacter')"
              :disabled="!selectedLinkCampaignId || isLinkingCampaign"
              class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition shrink-0"
            >
              Link
            </button>
          </div>
        </div>
        <div v-else class="p-3 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-xs">
          No active campaigns found. Create or join a campaign first.
        </div>

        <div class="pt-1">
          <button
            type="button"
            @click="emit('goToCampaignRoom')"
            class="w-full py-2 px-3 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5"
          >
            <span>Go to Campaigns Menu</span>
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          @click="emit('close')"
          class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
