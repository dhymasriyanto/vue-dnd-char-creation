<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import CharacterList from './components/CharacterList.vue'
import Form from './components/Form.vue'
import VttSheetView from './components/VttSheetView.vue'
import TooltipPopover from './components/TooltipPopover.vue'
import CompendiumFilterModal from './components/CompendiumFilterModal.vue'
import CompendiumView from './components/CompendiumView.vue'
import AuthModal from './components/AuthModal.vue'
import { useConfig } from './config'
import { useCompendiumNav } from './composables/useCompendiumNav'
import { useAuth } from './composables/useAuth'
import { IconLock, IconBook } from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const { isCompendiumOpen, openCompendium } = useCompendiumNav()
const { initAuth, isAuthenticated, isAuthReady, openLoginModal } = useAuth()

onMounted(() => {
  initAuth()
  const params = new URLSearchParams(window.location.search)
  if (params.get('compendium') === '1' || params.has('compendium')) {
    const tab = params.get('tab') || 'all'
    const search = params.get('search') || ''
    const queryObj = {}
    for (const [key, value] of params.entries()) {
      if (!['compendium', 'tab', 'search'].includes(key)) {
        queryObj[key] = value
      }
    }
    openCompendium({
      category: tab,
      search,
      item: search ? { name: search } : null,
      params: queryObj
    })
  }
})

const currentView = ref('list') // 'list' | 'wizard' | 'sheet'
const selectedCharacter = ref(null)
const characterToEdit = ref(null)
const isLoadingDetail = ref(false)
const errorMessage = ref('')

const openWizard = () => {
  errorMessage.value = ''
  characterToEdit.value = null
  currentView.value = 'wizard'
}

const editCharacter = async (id) => {
  isLoadingDetail.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/character/${id}`)
    if (res.data?.data) {
      characterToEdit.value = res.data.data
      currentView.value = 'wizard'
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

const backToList = () => {
  errorMessage.value = ''
  selectedCharacter.value = null
  characterToEdit.value = null
  currentView.value = 'list'
}

const selectCharacter = async (id) => {
  isLoadingDetail.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/character/${id}`)
    if (res.data?.data) {
      selectedCharacter.value = res.data.data
      currentView.value = 'sheet'
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
}

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    selectedCharacter.value = null
    characterToEdit.value = null
    currentView.value = 'list'
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

        <CharacterList
          v-if="currentView === 'list'"
          @create="openWizard"
          @select="selectCharacter"
          @edit="editCharacter"
        />

        <Form
          v-else-if="currentView === 'wizard'"
          :character-to-edit="characterToEdit"
          @back="backToList"
          @created="onCharacterSaved"
        />

        <VttSheetView
          v-else-if="currentView === 'sheet' && selectedCharacter"
          :character="selectedCharacter"
          @back="backToList"
          @create="openWizard"
          @edit="editCharacter"
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
