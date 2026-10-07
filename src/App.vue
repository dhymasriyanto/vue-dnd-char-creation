<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import CharacterList from './components/CharacterList.vue'
import CampaignView from './components/CampaignView.vue'
import Form from './components/Form.vue'
import VttSheetView from './components/VttSheetView.vue'
import TooltipPopover from './components/TooltipPopover.vue'
import CompendiumFilterModal from './components/CompendiumFilterModal.vue'
import CompendiumView from './components/CompendiumView.vue'
import AuthModal from './components/AuthModal.vue'
import { useConfig } from './config'
import { useCompendiumNav } from './composables/useCompendiumNav'
import { useAuth } from './composables/useAuth'
import {
  IconLock,
  IconBook,
  IconUsers,
  IconShield,
  IconLogout,
  IconExternalLink,
  IconMenu2,
  IconX
} from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const { isCompendiumOpen, openCompendium, closeCompendium } = useCompendiumNav()
const { user, initAuth, isAuthenticated, isAuthReady, openLoginModal, logout } = useAuth()

const openCompendiumInApp = (options = { category: 'all' }) => {
  openCompendium({ ...options, updateUrl: true })
}

const mainMenu = ref('characters') // 'characters' | 'campaign'
const campaignRoomId = ref(null)
const isMobileNavOpen = ref(false)

const syncStateFromUrl = () => {
  const p = new URLSearchParams(window.location.search)

  // 1. Compendium view
  if (p.get('compendium') === '1' || p.has('compendium')) {
    const category = p.get('category') || p.get('tab') || 'all'
    const search = p.get('search') || ''
    const queryObj = {}
    for (const [key, value] of p.entries()) {
      if (!['compendium', 'tab', 'category', 'search'].includes(key)) {
        queryObj[key] = value
      }
    }
    openCompendium({
      category,
      search,
      item: search ? { name: search } : null,
      params: queryObj,
      updateUrl: false
    })
    return
  }

  // If not compendium URL, ensure compendium is closed
  closeCompendium()

  // 2. Character detail requested (?character=ID or ?id=ID)
  const charId = p.get('character') || p.get('id')
  if (charId) {
    if (selectedCharacter.value?.id !== Number(charId)) {
      selectCharacter(charId, false)
    } else {
      currentView.value = 'sheet'
    }
    return
  }

  // 3. Wizard create / edit
  if (p.get('create') === '1') {
    characterToEdit.value = null
    selectedCharacter.value = null
    currentView.value = 'wizard'
    return
  }
  if (p.get('edit')) {
    editCharacter(p.get('edit'), false)
    return
  }

  // 4. Campaign view requested (?tab=campaign or ?campaign=ID or ?join=CODE)
  if (p.get('tab') === 'campaign' || p.has('campaign') || p.has('join') || p.has('campaign_code')) {
    currentView.value = 'list'
    mainMenu.value = 'campaign'
    selectedCharacter.value = null
    characterToEdit.value = null
    campaignRoomId.value = p.get('campaign') ? Number(p.get('campaign')) : null
    return
  }

  // 5. Default: Characters list
  currentView.value = 'list'
  mainMenu.value = 'characters'
  selectedCharacter.value = null
  characterToEdit.value = null
  campaignRoomId.value = null
}

onMounted(() => {
  initAuth()
  syncStateFromUrl()

  window.addEventListener('popstate', () => {
    syncStateFromUrl()
  })
})

// Auto-sync when auth is ready
watch([isAuthReady, isAuthenticated], ([ready, auth]) => {
  if (ready && auth) {
    syncStateFromUrl()
  } else if (ready && !auth) {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('compendium') && !params.get('character') && !params.get('id')) {
      selectedCharacter.value = null
      characterToEdit.value = null
      currentView.value = 'list'
    } else if (params.get('character') || params.get('id')) {
      syncStateFromUrl()
    }
  }
})

const switchMainMenu = (tab) => {
  mainMenu.value = tab
  currentView.value = 'list'
  selectedCharacter.value = null
  closeCompendium()
  const url = new URL(window.location.origin + window.location.pathname)
  if (tab === 'campaign') {
    if (campaignRoomId.value) {
      url.searchParams.set('campaign', campaignRoomId.value)
    } else {
      url.searchParams.set('tab', 'campaign')
    }
  }
  window.history.pushState({ tab, view: 'list' }, '', url.toString())
}

const openCampaignFromSheet = (campId) => {
  campaignRoomId.value = campId ? Number(campId) : null
  currentView.value = 'list'
  selectedCharacter.value = null
  closeCompendium()
  mainMenu.value = 'campaign'
  const url = new URL(window.location.origin + window.location.pathname)
  if (campId) {
    url.searchParams.set('campaign', campId)
  } else {
    url.searchParams.set('tab', 'campaign')
  }
  window.history.pushState({ tab: 'campaign', view: 'list', campaignId: campId }, '', url.toString())
}

const currentView = ref('list') // 'list' | 'wizard' | 'sheet'
const selectedCharacter = ref(null)
const characterToEdit = ref(null)
const isLoadingDetail = ref(false)
const errorMessage = ref('')

const openWizard = () => {
  errorMessage.value = ''
  characterToEdit.value = null
  selectedCharacter.value = null
  closeCompendium()
  currentView.value = 'wizard'
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set('create', '1')
  window.history.pushState({ view: 'wizard' }, '', url.toString())
}

const editCharacter = async (id, updateUrl = true) => {
  isLoadingDetail.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/character/${id}`)
    if (res.data?.data) {
      characterToEdit.value = res.data.data
      selectedCharacter.value = null
      closeCompendium()
      currentView.value = 'wizard'
      if (updateUrl) {
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.set('edit', id)
        window.history.pushState({ view: 'wizard', editId: id }, '', url.toString())
      }
    } else {
      errorMessage.value = 'Character data not found'
    }
  } catch (err) {
    console.error('Failed to load character for editing', err)
    errorMessage.value = 'Failed to load character for editing'
  } finally {
    isLoadingDetail.value = false
  }
}

const backToList = (updateUrl = true) => {
  errorMessage.value = ''
  selectedCharacter.value = null
  characterToEdit.value = null
  currentView.value = 'list'
  closeCompendium()
  if (updateUrl) {
    const url = new URL(window.location.origin + window.location.pathname)
    if (mainMenu.value === 'campaign') {
      if (campaignRoomId.value) {
        url.searchParams.set('campaign', campaignRoomId.value)
      } else {
        url.searchParams.set('tab', 'campaign')
      }
    }
    window.history.pushState({ view: 'list', tab: mainMenu.value }, '', url.toString())
  }
}

const selectCharacter = async (id, updateUrl = true) => {
  isLoadingDetail.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/character/${id}`)
    if (res.data?.data) {
      selectedCharacter.value = res.data.data
      currentView.value = 'sheet'
      closeCompendium()
      if (updateUrl) {
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.set('character', id)
        window.history.pushState({ view: 'sheet', id }, '', url.toString())
      }
    } else {
      errorMessage.value = 'Character data not found'
    }
  } catch (err) {
    console.error('Failed to load character detail', err)
    errorMessage.value = 'Failed to load character details'
  } finally {
    isLoadingDetail.value = false
  }
}

const onCharacterSaved = (charData) => {
  characterToEdit.value = null
  selectedCharacter.value = charData
  currentView.value = 'sheet'
  closeCompendium()
  if (charData?.id) {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('character', charData.id)
    window.history.replaceState({ view: 'sheet', id: charData.id }, '', url.toString())
  }
}

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('character') && !params.get('id')) {
      selectedCharacter.value = null
      characterToEdit.value = null
      currentView.value = 'list'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 text-sm">
    <CompendiumView v-if="isCompendiumOpen" />

    <template v-else>
      <!-- Loading Auth Session -->
      <div v-if="!isAuthReady" class="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-if="isLoadingDetail" class="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-white border border-gray-200 shadow-md rounded px-6 py-4 text-center">
          <div class="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-gray-600">Loading character sheet...</p>
        </div>
      </div>

      <div v-if="errorMessage" class="max-w-2xl mx-auto mt-4 px-4">
        <div class="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex justify-between items-center">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold ml-2">x</button>
        </div>
      </div>

      <!-- Public or Authenticated Sheet View -->
      <template v-if="currentView === 'sheet' && selectedCharacter">
        <VttSheetView
          :character="selectedCharacter"
          :read-only="!isAuthenticated || (Boolean(selectedCharacter.user_id) && user?.id !== selectedCharacter.user_id)"
          @back="backToList"
          @create="openWizard"
          @edit="editCharacter"
          @open-campaign="openCampaignFromSheet"
        />
      </template>

      <!-- Auth Gate when unauthenticated -->
      <div v-else-if="!isAuthenticated" class="max-w-md mx-auto pt-24 px-4 text-center">
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-900">
            <IconLock class="w-6 h-6" />
          </div>
          <h2 class="text-base font-bold text-gray-900 tracking-tight">Authentication Required</h2>
          <p class="text-xs text-gray-500 mt-1.5 mb-6">
            Sign in to view your character roster and create new characters. The rules compendium remains accessible without an account.
          </p>
          <div class="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              @click="openLoginModal"
              class="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded shadow-xs transition cursor-pointer"
            >
              Sign In / Register
            </button>
            <button
              type="button"
              @click="openCompendium({ category: 'all' })"
              class="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <IconBook class="w-4 h-4 text-gray-700" />
              <span>Browse Compendium</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Authenticated Views -->
      <template v-else>
        <!-- Main Menu & Content Views -->
        <template v-if="currentView === 'list'">
          <!-- Top Navigation Header -->
          <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
              <!-- Left: Brand -->
              <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded bg-gray-900 text-white flex items-center justify-center text-[10px] font-black tracking-wider">5e</span>
                <span class="font-bold text-gray-900 text-sm tracking-tight">D&D Hub</span>
              </div>

              <!-- Desktop Nav (Hidden on Mobile) -->
              <div class="hidden sm:flex items-center gap-4">
                <!-- Menu: Characters vs Campaign -->
                <nav class="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    @click="switchMainMenu('characters')"
                    :class="mainMenu === 'characters' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'"
                    class="px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <IconUsers class="w-3.5 h-3.5" />
                    <span>Characters</span>
                  </button>
                  <button
                    type="button"
                    @click="switchMainMenu('campaign')"
                    :class="mainMenu === 'campaign' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'"
                    class="px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <IconShield class="w-3.5 h-3.5" />
                    <span>Campaign</span>
                  </button>
                </nav>

                <!-- Right: Compendium & User Status -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    @click="openCompendiumInApp({ category: 'all' })"
                    class="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <IconBook class="w-4 h-4 text-gray-700" />
                    <span>Compendium</span>
                  </button>

                  <div class="flex items-center gap-2 bg-gray-100 border border-gray-300 px-2 sm:px-2.5 py-1.5 rounded text-xs">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="font-semibold text-gray-900 max-w-[120px] truncate">{{ user?.username }}</span>
                    <button
                      type="button"
                      @click="logout"
                      title="Sign Out"
                      class="text-gray-400 hover:text-gray-800 transition cursor-pointer ml-0.5"
                    >
                      <IconLogout class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Mobile Hamburger Menu (Visible only on < sm) -->
              <div class="sm:hidden relative">
                <button
                  type="button"
                  @click="isMobileNavOpen = !isMobileNavOpen"
                  class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 shadow-xs flex items-center justify-center transition cursor-pointer"
                  aria-label="Navigation menu"
                >
                  <IconX v-if="isMobileNavOpen" class="w-5 h-5 text-gray-700" />
                  <IconMenu2 v-else class="w-5 h-5 text-gray-700" />
                </button>

                <!-- Mobile Backdrop -->
                <div
                  v-if="isMobileNavOpen"
                  class="fixed inset-0 z-40 bg-black/25"
                  @click="isMobileNavOpen = false"
                ></div>

                <!-- Mobile Dropdown -->
                <div
                  v-if="isMobileNavOpen"
                  class="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-50 text-xs divide-y divide-gray-100"
                >
                  <!-- User Info Section -->
                  <div class="px-3.5 py-2.5 flex items-center justify-between bg-gray-50/80">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span class="font-semibold text-gray-900 truncate">{{ user?.username }}</span>
                    </div>
                    <button
                      type="button"
                      @click="isMobileNavOpen = false; logout()"
                      class="text-gray-500 hover:text-red-600 font-medium flex items-center gap-1 text-[11px] shrink-0 ml-2"
                    >
                      <IconLogout class="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  <!-- Navigation Items -->
                  <div class="py-1">
                    <button
                      type="button"
                      @click="switchMainMenu('characters'); isMobileNavOpen = false"
                      :class="mainMenu === 'characters' ? 'bg-gray-100 font-bold text-gray-900' : 'text-gray-700 hover:bg-gray-50 font-medium'"
                      class="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left transition cursor-pointer"
                    >
                      <IconUsers class="w-4 h-4 text-gray-600" />
                      <span>Characters</span>
                    </button>

                    <button
                      type="button"
                      @click="switchMainMenu('campaign'); isMobileNavOpen = false"
                      :class="mainMenu === 'campaign' ? 'bg-gray-100 font-bold text-gray-900' : 'text-gray-700 hover:bg-gray-50 font-medium'"
                      class="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left transition cursor-pointer"
                    >
                      <IconShield class="w-4 h-4 text-gray-600" />
                      <span>Campaign</span>
                    </button>

                    <button
                      type="button"
                      @click="openCompendiumInApp({ category: 'all' }); isMobileNavOpen = false"
                      class="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-gray-700 hover:bg-gray-50 font-medium transition cursor-pointer"
                    >
                      <IconBook class="w-4 h-4 text-gray-600" />
                      <span>Compendium</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main>
            <CharacterList
              v-if="mainMenu === 'characters'"
              @create="openWizard"
              @select="selectCharacter"
              @edit="editCharacter"
            />

            <CampaignView
              v-else-if="mainMenu === 'campaign'"
              :initial-campaign-id="campaignRoomId"
              @open-character="selectCharacter"
            />
          </main>
        </template>

        <Form
          v-else-if="currentView === 'wizard'"
          :character-to-edit="characterToEdit"
          @back="backToList"
          @created="onCharacterSaved"
        />
      </template>
    </template>

    <TooltipPopover />
    <CompendiumFilterModal />
    <AuthModal />
  </div>
</template>

<style scoped>
</style>
