<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { IconX } from '@tabler/icons-vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  edition: {
    type: String,
    default: '2024'
  },
  apiUrl: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'addItem'])

const search = ref('')
const category = ref('all')
const loading = ref(false)
const loadingMore = ref(false)
const results = ref([])
const offset = ref(0)
const hasMore = ref(false)
const PAGE_LIMIT = 40

const searchItems = async (isLoadMore = false) => {
  if (isLoadMore) {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    offset.value = 0
    results.value = []
  }

  try {
    const params = new URLSearchParams()
    params.set('edition', props.edition)
    if (search.value.trim()) params.set('search', search.value.trim())
    if (category.value !== 'all') params.set('type', category.value)
    params.set('limit', String(PAGE_LIMIT))
    params.set('offset', String(offset.value))

    const res = await axios.get(`${props.apiUrl}/compendium/items?${params.toString()}`)
    const newItems = Array.isArray(res.data?.data) ? res.data.data : []
    hasMore.value = newItems.length === PAGE_LIMIT

    if (isLoadMore) {
      results.value.push(...newItems)
    } else {
      results.value = newItems
    }
    offset.value += newItems.length
  } catch (err) {
    console.error('Failed to search compendium items', err)
    if (!isLoadMore) {
      results.value = []
      hasMore.value = false
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const onScroll = (e) => {
  const el = e.target
  if (!el || loading.value || loadingMore.value || !hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    searchItems(true)
  }
}

watch(() => props.isOpen, (open) => {
  if (open && results.value.length === 0) {
    searchItems()
  }
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
  >
    <div class="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 text-xs space-y-3 max-h-[85vh] flex flex-col">
      <div class="flex items-center justify-between pb-2 border-b border-gray-200">
        <h3 class="font-bold text-gray-900 text-sm">Add Item from Compendium</h3>
        <button
          type="button"
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          v-model="search"
          @keyup.enter="searchItems(false)"
          placeholder="Search weapon, armor, pack, gear..."
          class="w-full sm:flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
        />
        <div class="flex gap-2 w-full sm:w-auto items-center">
          <select
            v-model="category"
            class="flex-1 min-w-[140px] p-2 border border-gray-300 rounded text-xs bg-white"
            @change="searchItems(false)"
          >
            <option value="all">All Types</option>
            <option value="weapon">Weapons</option>
            <option value="armor">Armor &amp; Shield</option>
          </select>
          <button
            type="button"
            @click="searchItems(false)"
            class="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded text-xs font-medium cursor-pointer shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      <div
        @scroll="onScroll"
        class="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[220px]"
      >
        <div v-if="loading" class="py-10 text-center text-gray-400">
          Searching items...
        </div>
        <div v-else-if="results.length === 0" class="py-10 text-center text-gray-400 italic">
          No items found. Try another search query.
        </div>
        <template v-else>
          <div
            v-for="it in results"
            :key="it.id || it.name"
            class="py-2 px-1 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <div class="font-semibold text-gray-900">{{ it.name }}</div>
              <div class="text-[10px] text-gray-500">
                <span class="capitalize">{{ it.type || 'Item' }}</span>
                <span v-if="it.weight"> &bull; {{ it.weight }} lb</span>
                <span v-if="it.ac"> &bull; AC {{ it.ac }}</span>
                <span v-if="it.dmg1"> &bull; {{ it.dmg1 }} {{ it.dmgType }}</span>
              </div>
            </div>
            <button
              type="button"
              @click="emit('addItem', it)"
              class="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-400 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
            >
              Add
            </button>
          </div>

          <div v-if="hasMore" class="p-2 text-center border-t border-gray-100">
            <button
              type="button"
              :disabled="loadingMore"
              @click="searchItems(true)"
              class="text-xs text-gray-800 hover:text-black font-medium py-1 px-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
            >
              {{ loadingMore ? 'Loading more...' : 'Load more items' }}
            </button>
          </div>
        </template>
      </div>

      <div class="pt-2 border-t border-gray-100 flex justify-end">
        <button
          type="button"
          @click="emit('close')"
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
