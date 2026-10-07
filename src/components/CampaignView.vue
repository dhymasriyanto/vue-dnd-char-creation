<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useAuth } from '../composables/useAuth'
import {
  IconPlus,
  IconUsers,
  IconShield,
  IconDice,
  IconSend,
  IconCopy,
  IconCheck,
  IconTrash,
  IconDoorExit,
  IconLink,
  IconUnlink,
  IconArrowLeft,
  IconMessage,
  IconClock,
  IconExternalLink,
  IconRefresh
} from '@tabler/icons-vue'

const props = defineProps({
  initialCampaignId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['open-character'])

const API_URL = useConfig().API_URL
const { user, isAuthenticated } = useAuth()

const campaigns = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const selectedCampaignId = ref(props.initialCampaignId ? Number(props.initialCampaignId) : null)
const campaignDetail = ref(null)
const isLoadingDetail = ref(false)

const userCharacters = ref([])
const selectedCharToLink = ref('')
const isLinkingChar = ref(false)

// Modals
const isCreateModalOpen = ref(false)
const newCampaignName = ref('')
const newCampaignDesc = ref('')
const isCreating = ref(false)

const isJoinModalOpen = ref(false)
const joinCodeInput = ref('')
const isJoining = ref(false)

const copiedCode = ref(false)
const copiedLink = ref(false)

// Messages / Chat & Roll Feed
const messages = ref([])
const chatInput = ref('')
const isSendingMessage = ref(false)
const speakingAs = ref('user') // 'user' or character_id
const feedTab = ref('all') // 'all' | 'chat' | 'rolls' | 'party'
const chatScrollContainer = ref(null)

let pollingTimer = null

const isDM = computed(() => {
  return Boolean(campaignDetail.value?.is_dm || campaignDetail.value?.user_id === user.value?.id)
})

const myLinkedCharacter = computed(() => {
  if (!campaignDetail.value?.characters || !user.value?.id) return null
  return campaignDetail.value.characters.find(c => c.user_id === user.value.id) || null
})

const availableCharsToLink = computed(() => {
  const linkedId = myLinkedCharacter.value?.id
  return userCharacters.value.filter(c => c.id !== linkedId)
})

const filteredMessages = computed(() => {
  if (feedTab.value === 'chat') {
    return messages.value.filter(m => m.message_type === 'chat')
  }
  if (feedTab.value === 'rolls') {
    return messages.value.filter(m => m.message_type === 'roll')
  }
  return messages.value
})

const fetchCampaigns = async () => {
  if (!isAuthenticated.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/campaign`)
    campaigns.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.error('Failed to load campaigns', err)
    errorMessage.value = 'Failed to load campaigns'
  } finally {
    isLoading.value = false
  }
}

const fetchUserCharacters = async () => {
  if (!isAuthenticated.value) return
  try {
    const res = await axios.get(`${API_URL}/character`)
    userCharacters.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.error('Failed to load user characters', err)
  }
}

const fetchCampaignDetail = async (id) => {
  isLoadingDetail.value = true
  try {
    const res = await axios.get(`${API_URL}/campaign/${id}`)
    campaignDetail.value = res.data?.data || null
    if (campaignDetail.value) {
      selectedCampaignId.value = id
    }
  } catch (err) {
    console.error('Failed to load campaign detail', err)
    errorMessage.value = 'Failed to load campaign details'
  } finally {
    isLoadingDetail.value = false
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatScrollContainer.value) {
      chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight
    }
  })
}

const fetchMessages = async (silent = false) => {
  if (!selectedCampaignId.value) return
  try {
    const res = await axios.get(`${API_URL}/campaign/${selectedCampaignId.value}/messages?limit=100`)
    const newMsgs = Array.isArray(res.data?.data) ? res.data.data : []
    const prevCount = messages.value.length
    messages.value = newMsgs
    if (!silent || newMsgs.length > prevCount) {
      scrollToBottom()
    }
  } catch (err) {
    console.error('Failed to load messages', err)
  }
}

const startPolling = () => {
  stopPolling()
  pollingTimer = setInterval(() => {
    if (selectedCampaignId.value) {
      fetchMessages(true)
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

const selectCampaign = async (id, updateUrl = true) => {
  errorMessage.value = ''
  selectedCampaignId.value = id
  if (updateUrl && typeof window !== 'undefined') {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('campaign', id)
    window.history.pushState({ tab: 'campaign', campaign: id }, '', url.toString())
  }
  await Promise.all([
    fetchCampaignDetail(id),
    fetchMessages(),
    fetchUserCharacters()
  ])
  startPolling()
}

const backToCampaignList = (updateUrl = true) => {
  stopPolling()
  selectedCampaignId.value = null
  campaignDetail.value = null
  messages.value = []
  if (updateUrl && typeof window !== 'undefined') {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('tab', 'campaign')
    window.history.pushState({ tab: 'campaign' }, '', url.toString())
  }
  fetchCampaigns()
}

const openCreateModal = () => {
  newCampaignName.value = ''
  newCampaignDesc.value = ''
  isCreateModalOpen.value = true
}

const createCampaign = async () => {
  if (!newCampaignName.value.trim()) return
  isCreating.value = true
  try {
    const res = await axios.post(`${API_URL}/campaign`, {
      name: newCampaignName.value.trim(),
      description: newCampaignDesc.value.trim()
    })
    isCreateModalOpen.value = false
    await fetchCampaigns()
    if (res.data?.data?.id) {
      selectCampaign(res.data.data.id)
    }
  } catch (err) {
    console.error('Failed to create campaign', err)
    alert(err.response?.data?.message || 'Failed to create campaign')
  } finally {
    isCreating.value = false
  }
}

const openJoinModal = (code = '') => {
  joinCodeInput.value = code
  isJoinModalOpen.value = true
}

const joinCampaign = async () => {
  if (!joinCodeInput.value.trim()) return
  isJoining.value = true
  try {
    const res = await axios.post(`${API_URL}/campaign/join`, {
      code: joinCodeInput.value.trim().toUpperCase()
    })
    isJoinModalOpen.value = false
    await fetchCampaigns()
    if (res.data?.data?.id) {
      selectCampaign(res.data.data.id)
    }
  } catch (err) {
    console.error('Failed to join campaign', err)
    alert(err.response?.data?.message || 'Invalid or non-existent invite code')
  } finally {
    isJoining.value = false
  }
}

const leaveCampaign = async () => {
  if (!confirm('Are you sure you want to leave this campaign?')) return
  try {
    await axios.post(`${API_URL}/campaign/${selectedCampaignId.value}/leave`)
    backToCampaignList()
  } catch (err) {
    console.error('Failed to leave campaign', err)
    alert('Failed to leave campaign')
  }
}

const deleteCampaign = async () => {
  if (!confirm('Are you sure you want to DELETE this campaign? This action cannot be undone.')) return
  try {
    await axios.delete(`${API_URL}/campaign/${selectedCampaignId.value}`)
    backToCampaignList()
  } catch (err) {
    console.error('Failed to delete campaign', err)
    alert('Failed to delete campaign')
  }
}

const linkCharacter = async () => {
  if (!selectedCharToLink.value) return
  isLinkingChar.value = true
  try {
    await axios.post(`${API_URL}/campaign/${selectedCampaignId.value}/link-character`, {
      character_id: Number(selectedCharToLink.value)
    })
    selectedCharToLink.value = ''
    await fetchCampaignDetail(selectedCampaignId.value)
    await fetchUserCharacters()
  } catch (err) {
    console.error('Failed to link character', err)
    alert(err.response?.data?.message || 'Failed to link character')
  } finally {
    isLinkingChar.value = false
  }
}

const unlinkCharacter = async (charId) => {
  if (!confirm('Unlink this character from the campaign?')) return
  try {
    await axios.post(`${API_URL}/campaign/${selectedCampaignId.value}/unlink-character`, {
      character_id: Number(charId)
    })
    await fetchCampaignDetail(selectedCampaignId.value)
    await fetchUserCharacters()
  } catch (err) {
    console.error('Failed to unlink character', err)
    alert('Failed to unlink character')
  }
}

const sendMessage = async () => {
  const text = chatInput.value.trim()
  if (!text || isSendingMessage.value) return
  isSendingMessage.value = true
  const charId = speakingAs.value !== 'user' ? Number(speakingAs.value) : (myLinkedCharacter.value?.id || null)

  try {
    await axios.post(`${API_URL}/campaign/${selectedCampaignId.value}/messages`, {
      message: text,
      character_id: charId
    })
    chatInput.value = ''
    await fetchMessages(true)
  } catch (err) {
    console.error('Failed to send message', err)
  } finally {
    isSendingMessage.value = false
  }
}

const rollQuickDice = async (faces = 20) => {
  const roll = Math.floor(Math.random() * faces) + 1
  const isNat20 = faces === 20 && roll === 20
  const isNat1 = faces === 20 && roll === 1
  const charId = myLinkedCharacter.value?.id || null

  try {
    await axios.post(`${API_URL}/campaign/${selectedCampaignId.value}/rolls`, {
      character_id: charId,
      roll_name: `d${faces} Roll`,
      roll_data: {
        label: `d${faces} Roll`,
        formula: `1d${faces}`,
        total: roll,
        isNat20,
        isNat1,
        breakdown: `d${faces} (${roll})`,
        timestamp: new Date().toLocaleTimeString()
      }
    })
    await fetchMessages(true)
  } catch (err) {
    console.error('Failed to send quick roll', err)
  }
}

const copyCode = (code) => {
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    copiedCode.value = true
    setTimeout(() => { copiedCode.value = false }, 2000)
  }).catch(() => {
    prompt('Copy invite code:', code)
  })
}

const copyLink = (code) => {
  if (!code) return
  const link = `${window.location.origin}${window.location.pathname}?join=${code}`
  navigator.clipboard.writeText(link).then(() => {
    copiedLink.value = true
    setTimeout(() => { copiedLink.value = false }, 2000)
  }).catch(() => {
    prompt('Copy invite link:', link)
  })
}

onMounted(() => {
  fetchCampaigns()
  fetchUserCharacters()

  // Auto-join from URL param ?join=CODE or ?campaign_code=CODE
  const params = new URLSearchParams(window.location.search)
  const joinCode = params.get('join') || params.get('campaign_code')
  if (joinCode) {
    openJoinModal(joinCode)
  } else if (props.initialCampaignId) {
    selectCampaign(props.initialCampaignId, false)
  } else if (params.get('campaign')) {
    selectCampaign(params.get('campaign'), false)
  }
})

onUnmounted(() => {
  stopPolling()
})

watch(() => props.initialCampaignId, (newId) => {
  if (newId) {
    selectCampaign(newId, false)
  } else if (selectedCampaignId.value) {
    backToCampaignList(false)
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-4">
    <!-- Error message banner -->
    <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex justify-between items-center">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
    </div>

    <!-- VIEW 1: CAMPAIGN LIST -->
    <div v-if="!selectedCampaignId">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            Join or manage tabletop campaigns, share roll histories, and chat with your party.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openJoinModal()"
            class="px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs cursor-pointer transition flex items-center gap-1.5"
          >
            <IconLink class="w-4 h-4 text-gray-700" />
            <span>Join with Code</span>
          </button>
          <button
            type="button"
            @click="openCreateModal"
            class="px-4 py-2 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer transition flex items-center gap-1.5"
          >
            <IconPlus class="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-16 text-center text-gray-400">
        <div class="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span class="text-xs">Loading campaigns...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="campaigns.length === 0" class="py-16 text-center">
        <div class="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
          <IconShield class="w-7 h-7" />
        </div>
        <h3 class="text-sm font-bold text-gray-800">No Campaigns Found</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
          You haven't joined or created any campaigns yet. Create one as DM or join using an invite code.
        </p>
        <div class="flex justify-center gap-2">
          <button
            type="button"
            @click="openCreateModal"
            class="px-4 py-2 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            Create Your First Campaign
          </button>
          <button
            type="button"
            @click="openJoinModal()"
            class="px-3.5 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            Join with Code
          </button>
        </div>
      </div>

      <!-- Campaign Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
        <div
          v-for="camp in campaigns"
          :key="camp.id"
          @click="selectCampaign(camp.id)"
          class="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-900/40 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <h2 class="text-sm font-bold text-gray-900 group-hover:text-black line-clamp-1">
                {{ camp.name }}
              </h2>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
                :class="camp.is_dm ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 border border-gray-200'"
              >
                {{ camp.is_dm ? 'DM' : 'Player' }}
              </span>
            </div>

            <p class="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
              {{ camp.description || 'No description provided.' }}
            </p>
          </div>

          <div class="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1 font-medium text-gray-700" title="Members">
                <IconUsers class="w-3.5 h-3.5 text-gray-400" />
                <span>{{ camp.member_count || 1 }}</span>
              </span>
              <span class="flex items-center gap-1 font-medium text-gray-700" title="Characters">
                <IconShield class="w-3.5 h-3.5 text-gray-400" />
                <span>{{ camp.character_count || 0 }}</span>
              </span>
            </div>

            <span class="text-[11px] font-mono text-gray-400">
              DM: {{ camp.dm_name }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: CAMPAIGN DETAIL & ACTIVITY -->
    <div v-else-if="campaignDetail" class="space-y-4">
      <!-- Detail Header -->
      <div class="bg-white border border-gray-200 rounded-lg p-3.5 sm:p-4">
        <!-- Top bar: Back, Title, DM Badge, Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-3">
          <!-- Title & Back -->
          <div class="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              @click="backToCampaignList"
              class="p-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer transition shrink-0 mt-0.5"
              title="Back to Campaign List"
            >
              <IconArrowLeft class="w-4 h-4" />
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {{ campaignDetail.name }}
                </h1>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
                  :class="isDM ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 border border-gray-200'"
                >
                  {{ isDM ? 'You are DM' : 'Player' }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">
                Dungeon Master: <span class="font-semibold text-gray-700">{{ campaignDetail.dm_name }}</span>
              </p>
            </div>
          </div>

          <!-- Invite code & actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-xs">
              <span class="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Code:</span>
              <span class="font-mono font-bold text-gray-900 tracking-wider mr-2">{{ campaignDetail.invite_code }}</span>
              <div class="h-3 w-px bg-gray-300 mr-1.5"></div>
              <button
                type="button"
                @click="copyCode(campaignDetail.invite_code)"
                class="text-gray-600 hover:text-gray-900 font-semibold cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200/60 transition"
                title="Copy code only"
              >
                <IconCheck v-if="copiedCode" class="w-3.5 h-3.5 text-emerald-600" />
                <IconCopy v-else class="w-3.5 h-3.5 text-gray-500" />
                <span>{{ copiedCode ? 'Copied!' : 'Code' }}</span>
              </button>
              <div class="h-3 w-px bg-gray-300 mx-1"></div>
              <button
                type="button"
                @click="copyLink(campaignDetail.invite_code)"
                class="text-gray-600 hover:text-gray-900 font-semibold cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200/60 transition"
                title="Copy full invite link"
              >
                <IconCheck v-if="copiedLink" class="w-3.5 h-3.5 text-emerald-600" />
                <IconLink v-else class="w-3.5 h-3.5 text-gray-500" />
                <span>{{ copiedLink ? 'Copied!' : 'Link' }}</span>
              </button>
            </div>

            <button
              v-if="isDM"
              type="button"
              @click="deleteCampaign"
              class="px-2.5 py-1 rounded border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-600 hover:text-red-700 text-xs font-medium cursor-pointer transition flex items-center gap-1 shrink-0"
              title="Delete Campaign"
            >
              <IconTrash class="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              v-else
              type="button"
              @click="leaveCampaign"
              class="px-2.5 py-1 rounded border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-600 hover:text-red-700 text-xs font-medium cursor-pointer transition flex items-center gap-1 shrink-0"
              title="Leave Campaign"
            >
              <IconDoorExit class="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        <p v-if="campaignDetail.description" class="text-xs text-gray-600 pt-3 leading-relaxed">
          {{ campaignDetail.description }}
        </p>

        <!-- User Character Link Banner (Available for both DM & Players) -->
        <div class="mt-3 pt-3 border-t border-gray-100 bg-gray-50/80 p-3 rounded-lg border border-gray-200 text-xs space-y-2">
          <!-- Top line: Current linked character status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">My Character:</span>
              <template v-if="myLinkedCharacter">
                <span class="font-bold text-gray-900">{{ myLinkedCharacter.name }}</span>
                <span class="text-gray-500 text-[11px]">({{ myLinkedCharacter.class_name || 'Lvl ' + myLinkedCharacter.level }})</span>
              </template>
              <span v-else class="text-gray-500 italic">No character linked yet</span>
            </div>

            <!-- Action buttons for linked character -->
            <div v-if="myLinkedCharacter" class="flex items-center gap-2">
              <button
                type="button"
                @click="emit('open-character', myLinkedCharacter.id)"
                class="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
              >
                <span>Open Sheet</span>
                <IconExternalLink class="w-3 h-3 text-gray-500" />
              </button>
              <button
                type="button"
                @click="unlinkCharacter(myLinkedCharacter.id)"
                class="px-2 py-1 rounded bg-white hover:bg-red-50 border border-gray-300 hover:border-red-300 text-red-600 text-xs font-medium cursor-pointer transition flex items-center gap-1 shadow-2xs"
              >
                <IconUnlink class="w-3 h-3 text-red-500" />
                <span>Unlink</span>
              </button>
            </div>
          </div>

          <!-- Switch or Link Character form -->
          <div class="pt-2 border-t border-gray-200/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span class="text-[11px] text-gray-500 shrink-0">
              {{ myLinkedCharacter ? 'Switch Character:' : 'Link a Character:' }}
            </span>
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <select
                v-model="selectedCharToLink"
                class="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 truncate focus:outline-none focus:border-gray-900"
              >
                <option value="">{{ myLinkedCharacter ? '-- Choose another character --' : '-- Choose character to link --' }}</option>
                <option v-for="c in availableCharsToLink" :key="c.id" :value="c.id">
                  {{ c.name }} (Lvl {{ c.level }} {{ c.class_name || '' }})
                </option>
              </select>
              <button
                type="button"
                @click="linkCharacter"
                :disabled="!selectedCharToLink || isLinkingChar"
                class="px-3.5 py-1 rounded bg-gray-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer transition shrink-0 shadow-2xs"
              >
                {{ myLinkedCharacter ? 'Switch' : 'Link' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout: 2 Columns (Party Members / Feed) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- LEFT COLUMN: PARTY ROSTER (4 cols) -->
        <div class="lg:col-span-4 bg-white border border-gray-200 rounded-lg p-3.5 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-gray-200">
            <h3 class="font-bold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <IconUsers class="w-4 h-4 text-gray-600" />
              <span>Party Members ({{ campaignDetail.characters?.length || 0 }})</span>
            </h3>
            <span class="text-[10px] text-gray-400 font-mono">{{ campaignDetail.members?.length || 1 }} Players</span>
          </div>

          <!-- Empty Party -->
          <div v-if="!campaignDetail.characters || campaignDetail.characters.length === 0" class="py-6 text-center text-gray-400 text-xs">
            No characters linked to this campaign yet.
          </div>

          <!-- Party Members List -->
          <div v-else class="space-y-2.5">
            <div
              v-for="ch in campaignDetail.characters"
              :key="ch.id"
              class="p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-400/70 shadow-2xs transition flex flex-col gap-2"
            >
              <!-- Row 1: Character Name & Player Tag -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-bold text-xs text-gray-900 truncate">{{ ch.name }}</span>
                  <span v-if="ch.user_id === user?.id" class="px-1.5 py-0.2 rounded bg-gray-900 text-white text-[9px] font-bold uppercase shrink-0">You</span>
                </div>
                <span class="text-[11px] text-gray-500 font-medium truncate">
                  Player: <span class="text-gray-700 font-semibold">{{ ch.player_name }}</span>
                </span>
              </div>

              <!-- Row 2: Sub-info & Combat Stats Pills -->
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
                <span class="text-gray-500 text-[11px] truncate">
                  {{ ch.race_name || '' }} {{ ch.class_name || 'Lvl ' + ch.level }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span class="bg-gray-100 text-gray-800 border border-gray-200 px-1.5 py-0.5 rounded font-bold" title="Hit Points">
                    HP {{ ch.hp ?? 0 }}/{{ ch.max_hp ?? 0 }}
                  </span>
                  <span class="bg-gray-100 text-gray-800 border border-gray-200 px-1.5 py-0.5 rounded font-bold" title="Armor Class">
                    AC {{ ch.ac ?? 10 }}
                  </span>
                </div>
              </div>

              <!-- Row 3: Action button -->
              <div class="flex items-center justify-end pt-1">
                <button
                  type="button"
                  @click="emit('open-character', ch.id)"
                  class="text-[11px] text-gray-700 hover:text-black font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <span>View Sheet</span>
                  <IconExternalLink class="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: CHAT & ROLL HISTORY (8 cols) -->
        <div class="lg:col-span-8 bg-white border border-gray-200 rounded-lg flex flex-col h-[520px] sm:h-[600px] overflow-hidden">
          <!-- Feed Header & Tabs -->
          <div class="p-2.5 sm:p-3 border-b border-gray-200 flex items-center justify-between gap-2 bg-gray-50/70">
            <div class="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                @click="feedTab = 'all'"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition shrink-0"
                :class="feedTab === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/60'"
              >
                All Activity
              </button>
              <button
                type="button"
                @click="feedTab = 'chat'"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                :class="feedTab === 'chat' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/60'"
              >
                <IconMessage class="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                type="button"
                @click="feedTab = 'rolls'"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                :class="feedTab === 'rolls' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/60'"
              >
                <IconDice class="w-3.5 h-3.5" />
                <span>Rolls</span>
              </button>
            </div>

            <!-- Quick Dice Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="rollQuickDice(20)"
                class="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
                title="Roll 1d20"
              >
                <IconDice class="w-3.5 h-3.5 text-gray-700" />
                <span>d20</span>
              </button>
              <button
                type="button"
                @click="fetchMessages(false)"
                class="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 cursor-pointer transition shadow-xs"
                title="Refresh Messages"
              >
                <IconRefresh class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Message History Container -->
          <div ref="chatScrollContainer" class="flex-1 p-3.5 overflow-y-auto space-y-3 bg-white">
            <div v-if="filteredMessages.length === 0" class="py-20 text-center text-gray-400 text-xs">
              No activity recorded yet. Send a message or roll dice from character sheet!
            </div>

            <div
              v-for="msg in filteredMessages"
              :key="msg.id"
              class="text-xs"
            >
              <!-- Roll Message Card -->
              <div
                v-if="msg.message_type === 'roll'"
                class="border border-gray-300 bg-gray-50 rounded-lg p-2.5 space-y-1 shadow-2xs"
              >
                <div class="flex items-center justify-between text-gray-500 text-[10px]">
                  <span class="font-bold text-gray-800 flex items-center gap-1">
                    <IconDice class="w-3.5 h-3.5 text-gray-900" />
                    <span>{{ msg.sender_name }}</span>
                  </span>
                  <span class="font-mono">{{ new Date(msg.created_at).toLocaleTimeString() }}</span>
                </div>

                <div class="flex items-baseline justify-between pt-0.5">
                  <span class="font-bold text-gray-900 text-xs">
                    {{ msg.roll_data?.label || msg.roll_data?.title || 'Dice Roll' }}
                  </span>
                  <span
                    class="text-base font-black px-1.5 py-0.2 rounded"
                    :class="msg.roll_data?.isNat20 ? 'bg-amber-100 text-amber-800 border border-amber-300' : (msg.roll_data?.isNat1 ? 'bg-red-100 text-red-800 border border-red-300' : 'text-gray-900')"
                  >
                    {{ msg.roll_data?.total }}
                  </span>
                </div>

                <div class="text-[10px] text-gray-500 font-mono">
                  {{ msg.roll_data?.breakdown || msg.message }}
                </div>
              </div>

              <!-- Standard Chat Message -->
              <div v-else class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-gray-900">{{ msg.sender_name }}</span>
                  <span class="text-[10px] text-gray-400 font-mono">{{ new Date(msg.created_at).toLocaleTimeString() }}</span>
                </div>
                <div class="text-gray-800 bg-gray-100/70 p-2 rounded-md leading-relaxed whitespace-pre-wrap">
                  {{ msg.message }}
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Input Bar -->
          <div class="p-2.5 border-t border-gray-200 bg-gray-50/80">
            <form @submit.prevent="sendMessage" class="flex items-center gap-2">
              <input
                type="text"
                v-model="chatInput"
                placeholder="Message campaign or party..."
                class="flex-1 bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900 placeholder-gray-400"
              />
              <button
                type="submit"
                :disabled="!chatInput.trim() || isSendingMessage"
                class="px-3.5 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-xs"
              >
                <IconSend class="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: CREATE CAMPAIGN -->
    <div v-if="isCreateModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Create New Campaign</h3>
          <button type="button" @click="isCreateModalOpen = false" class="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Campaign Name *</label>
            <input
              type="text"
              v-model="newCampaignName"
              placeholder="e.g. Curse of Strahd / Dragon of Icespire Peak"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Description</label>
            <textarea
              v-model="newCampaignDesc"
              rows="3"
              placeholder="Campaign notes, scheduling, house rules..."
              class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="isCreateModalOpen = false"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="createCampaign"
            :disabled="!newCampaignName.trim() || isCreating"
            class="px-4 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            {{ isCreating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: JOIN CAMPAIGN -->
    <div v-if="isJoinModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Join Campaign</h3>
          <button type="button" @click="isJoinModalOpen = false" class="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer">✕</button>
        </div>

        <div class="text-xs space-y-2">
          <p class="text-gray-600">
            Enter the 6-character campaign invite code provided by your Dungeon Master.
          </p>
          <div>
            <label class="block font-bold text-gray-700 mb-1">Invite Code</label>
            <input
              type="text"
              v-model="joinCodeInput"
              placeholder="e.g. A1B2C3"
              maxlength="20"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-center font-mono font-bold text-sm uppercase text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="isJoinModalOpen = false"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="joinCampaign"
            :disabled="!joinCodeInput.trim() || isJoining"
            class="px-4 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            {{ isJoining ? 'Joining...' : 'Join' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
