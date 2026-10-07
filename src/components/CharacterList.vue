<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { useAuth } from '../composables/useAuth'
import {
  IconBook,
  IconExternalLink,
  IconEye,
  IconEdit,
  IconTrash,
  IconUser,
  IconLogout
} from '@tabler/icons-vue'

const API_URL = useConfig().API_URL
const { openCompendium } = useCompendiumNav()
const { user, isAuthenticated, logout, openLoginModal } = useAuth()

const openCompendiumWindow = () => {
  window.open(`${window.location.origin}${window.location.pathname}?compendium=1`, '_blank')
}

const emit = defineEmits(['create', 'select', 'edit'])

const characters = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')
const editionFilter = ref('all') // 'all' | '2024' | '2014'
const deletingId = ref(null)

const fetchCharacters = async () => {
  if (!isAuthenticated.value) {
    characters.value = []
    isLoading.value = false
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get(`${API_URL}/character`)
    characters.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.error('Failed to load characters', err)
    errorMessage.value = 'Failed to load characters from server'
  } finally {
    isLoading.value = false
  }
}

watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    fetchCharacters()
  } else {
    characters.value = []
  }
})

const deleteCharacter = async (id, name, event) => {
  event.stopPropagation()
  if (!confirm(`Are you sure you want to delete character "${name}"?`)) {
    return
  }
  deletingId.value = id
  try {
    await axios.delete(`${API_URL}/character/${id}`)
    characters.value = characters.value.filter(c => c.id !== id)
  } catch (err) {
    console.error('Failed to delete character', err)
    alert('Failed to delete character')
  } finally {
    deletingId.value = null
  }
}

const filteredCharacters = computed(() => {
  return characters.value.filter(c => {
    if (editionFilter.value !== 'all' && c.edition !== editionFilter.value) {
      return false
    }
    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase()
    const nameMatch = (c.name || '').toLowerCase().includes(q)
    const classMatch = (c.class_name || '').toLowerCase().includes(q)
    const raceMatch = (c.race_name || '').toLowerCase().includes(q)
    const bgMatch = (c.background || '').toLowerCase().includes(q)
    return nameMatch || classMatch || raceMatch || bgMatch
  })
})

onMounted(() => {
  fetchCharacters()
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 tracking-tight">Characters</h1>
        <p class="text-xs text-gray-500 mt-0.5">
          Select a character to view sheet or create a new one.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="openCompendiumWindow"
          class="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <IconBook class="w-4 h-4 text-gray-700" />
          <span>Compendium</span>
          <IconExternalLink class="w-3.5 h-3.5 text-gray-400" />
        </button>

        <!-- Auth Status / Sign In -->
        <template v-if="!isAuthenticated">
          <button
            type="button"
            @click="openLoginModal"
            class="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <IconUser class="w-4 h-4 text-gray-700" />
            <span>Sign In</span>
          </button>
        </template>
        <template v-else>
          <div class="flex items-center gap-2 bg-gray-100 border border-gray-300 px-2.5 py-1.5 rounded text-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-semibold text-gray-900">{{ user.username }}</span>
            <span
              v-if="user.auth_provider && user.auth_provider !== 'local'"
              class="text-[10px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded font-mono uppercase"
            >
              {{ user.auth_provider }}
            </span>
            <button
              type="button"
              @click="logout"
              title="Sign Out"
              class="text-gray-400 hover:text-gray-800 transition cursor-pointer ml-0.5"
            >
              <IconLogout class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>

        <button
          type="button"
          @click="emit('create')"
          class="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded shadow-sm transition cursor-pointer"
        >
          Create Character
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
      <div class="relative flex-1 max-w-sm">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by name, class, species..."
          class="w-full text-xs p-2 pl-3 bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-gray-200 p-1 rounded">
          <button
            type="button"
            @click="editionFilter = 'all'"
            :class="editionFilter === 'all' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            class="px-2.5 py-1 text-xs rounded transition cursor-pointer"
          >
            All
          </button>
          <button
            type="button"
            @click="editionFilter = '2024'"
            :class="editionFilter === '2024' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            class="px-2.5 py-1 text-xs rounded transition cursor-pointer"
          >
            2024
          </button>
          <button
            type="button"
            @click="editionFilter = '2014'"
            :class="editionFilter === '2014' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            class="px-2.5 py-1 text-xs rounded transition cursor-pointer"
          >
            2014
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12 text-xs text-gray-500">
      Loading characters...
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded my-4">
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCharacters.length === 0" class="text-center py-12 bg-white border border-gray-200 rounded p-6">
      <p class="text-sm font-medium text-gray-700">No characters found</p>
      <p class="text-xs text-gray-500 mt-1">Get started by creating your first character.</p>
      <button
        type="button"
        @click="emit('create')"
        class="mt-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded transition cursor-pointer"
      >
        Create Character
      </button>
    </div>

    <!-- Character Table / Cards -->
    <div v-else class="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
      <!-- Mobile Cards (< sm) -->
      <div class="block sm:hidden divide-y divide-gray-100">
        <div
          v-for="c in filteredCharacters"
          :key="c.id"
          @click="emit('select', c.id)"
          class="p-3 space-y-2 hover:bg-gray-50 cursor-pointer transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-sm block">{{ c.name || 'Unnamed' }}</span>
              <span class="text-[11px] text-gray-500">
                Level {{ c.level }} {{ c.class_name || 'Adventurer' }}
                <span v-if="c.sub_class_name">({{ c.sub_class_name }})</span>
              </span>
            </div>
            <span
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-100 text-gray-700 shrink-0"
            >
              {{ c.edition === '2024' ? '2024' : '2014' }}
            </span>
          </div>

          <div class="text-[11px] text-gray-600 grid grid-cols-2 gap-1 pt-1 border-t border-gray-100">
            <div><span class="text-gray-400">Species: </span>{{ c.race_name || '-' }}</div>
            <div><span class="text-gray-400">Background: </span>{{ c.background || '-' }}</div>
          </div>

          <div class="flex items-center justify-end gap-1 pt-2 border-t border-gray-100" @click.stop>
            <button
              type="button"
              @click="emit('select', c.id)"
              title="View Sheet"
              aria-label="View Sheet"
              class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition cursor-pointer"
            >
              <IconEye class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="emit('edit', c.id)"
              title="Edit"
              aria-label="Edit"
              class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition cursor-pointer"
            >
              <IconEdit class="w-4 h-4" />
            </button>
            <button
              type="button"
              :disabled="deletingId === c.id"
              @click="deleteCharacter(c.id, c.name, $event)"
              title="Delete"
              aria-label="Delete"
              class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-red-600 transition cursor-pointer disabled:opacity-50"
            >
              <IconTrash class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop Table (>= sm) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
              <th class="py-2.5 px-3">Name</th>
              <th class="py-2.5 px-3">Edition</th>
              <th class="py-2.5 px-3">Level & Class</th>
              <th class="py-2.5 px-3">Species / Race</th>
              <th class="py-2.5 px-3">Background</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="c in filteredCharacters"
              :key="c.id"
              @click="emit('select', c.id)"
              class="hover:bg-gray-50 cursor-pointer transition"
            >
              <td class="py-3 px-3">
                <span class="font-bold text-gray-900 block">{{ c.name || 'Unnamed' }}</span>
                <span class="text-[11px] text-gray-400 font-normal">{{ c.alignment || 'Neutral' }}</span>
              </td>
              <td class="py-3 px-3">
                <span
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-100 text-gray-700 shrink-0"
                >
                  {{ c.edition === '2024' ? '2024' : '2014' }}
                </span>
              </td>
              <td class="py-3 px-3 text-gray-700">
                <div class="font-medium text-gray-900">
                  Level {{ c.level }} {{ c.class_name || 'Adventurer' }}
                </div>
                <div v-if="c.sub_class_name" class="text-[11px] text-gray-500">
                  {{ c.sub_class_name }}
                </div>
              </td>
              <td class="py-3 px-3 text-gray-700">
                {{ c.race_name || '-' }}
              </td>
              <td class="py-3 px-3 text-gray-700">
                {{ c.background || '-' }}
              </td>
              <td class="py-3 px-3 text-right">
                <div class="inline-flex items-center gap-1" @click.stop>
                  <button
                    type="button"
                    @click="emit('select', c.id)"
                    title="View Sheet"
                    aria-label="View Sheet"
                    class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                  >
                    <IconEye class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    @click="emit('edit', c.id)"
                    title="Edit"
                    aria-label="Edit"
                    class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                  >
                    <IconEdit class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :disabled="deletingId === c.id"
                    @click="deleteCharacter(c.id, c.name, $event)"
                    title="Delete"
                    aria-label="Delete"
                    class="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-red-600 transition cursor-pointer disabled:opacity-50"
                  >
                    <IconTrash class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
