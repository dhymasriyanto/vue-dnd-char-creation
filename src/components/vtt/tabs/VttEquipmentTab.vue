<script setup>
import { IconPlus } from '@tabler/icons-vue'

defineProps({
  currency: {
    type: Object,
    required: true
  },
  currencySavedToast: {
    type: Boolean,
    default: false
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  totalWeight: {
    type: Number,
    default: 0
  },
  carryCapacity: {
    type: Number,
    default: 150
  },
  weightPercent: {
    type: Number,
    default: 0
  },
  weightBarColor: {
    type: String,
    default: 'bg-emerald-500'
  },
  weightStatusTextColor: {
    type: String,
    default: 'text-emerald-700'
  },
  weightStatusLabel: {
    type: String,
    default: 'Normal'
  },
  liveEquipment: {
    type: Array,
    default: () => []
  },
  equipmentSavedToast: {
    type: Boolean,
    default: false
  },
  selectedContainerFilter: {
    type: String,
    default: 'all'
  },
  equippedCount: {
    type: Number,
    default: 0
  },
  backpackCount: {
    type: Number,
    default: 0
  },
  availableContainers: {
    type: Array,
    default: () => []
  },
  currentActiveContainer: {
    type: Object,
    default: null
  },
  filteredEquipment: {
    type: Array,
    default: () => []
  },
  getContainerCurrentWeight: {
    type: Function,
    required: true
  },
  getContainerCapacity: {
    type: Function,
    required: true
  },
  isContainerItem: {
    type: Function,
    required: true
  },
  getItemEquipType: {
    type: Function,
    required: true
  },
  isItemEquippable: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'adjustCurrency',
  'saveCurrency',
  'openAddCustomItem',
  'openCompendiumModal',
  'update:selectedContainerFilter',
  'setItemContainer',
  'toggleEquipStatus',
  'changeItemAmount',
  'removeItem'
])
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- Currency Pouch (Interactive) -->
    <div class="bg-gray-50 p-3.5 rounded border border-gray-200">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Wealth &amp; Currency</h3>
        <span v-if="currencySavedToast" class="text-[10px] text-green-600 font-semibold transition">Saved</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <!-- PP -->
        <div class="bg-white p-2 border border-gray-200 rounded">
          <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">PP</span>
          <div v-if="!isReadOnly" class="flex items-center justify-center gap-1">
            <button
              type="button"
              @click="emit('adjustCurrency', 'pp', -1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >-</button>
            <input
              type="number"
              min="0"
              v-model.number="currency.pp"
              @change="emit('saveCurrency')"
              class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
            />
            <button
              type="button"
              @click="emit('adjustCurrency', 'pp', 1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >+</button>
          </div>
          <div v-else class="text-xs font-bold py-0.5 text-gray-900 font-mono select-none">
            {{ currency.pp || 0 }}
          </div>
        </div>

        <!-- GP -->
        <div class="bg-white p-2 border border-gray-200 rounded">
          <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">GP</span>
          <div v-if="!isReadOnly" class="flex items-center justify-center gap-1">
            <button
              type="button"
              @click="emit('adjustCurrency', 'gp', -1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
            >-</button>
            <input
              type="number"
              min="0"
              v-model.number="currency.gp"
              @change="emit('saveCurrency')"
              class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
            />
            <button
              type="button"
              @click="emit('adjustCurrency', 'gp', 1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
            >+</button>
          </div>
          <div v-else class="text-xs font-bold py-0.5 text-gray-900 font-mono select-none">
            {{ currency.gp || 0 }}
          </div>
        </div>

        <!-- EP -->
        <div class="bg-white p-2 border border-gray-200 rounded">
          <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">EP</span>
          <div v-if="!isReadOnly" class="flex items-center justify-center gap-1">
            <button
              type="button"
              @click="emit('adjustCurrency', 'ep', -1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >-</button>
            <input
              type="number"
              min="0"
              v-model.number="currency.ep"
              @change="emit('saveCurrency')"
              class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
            />
            <button
              type="button"
              @click="emit('adjustCurrency', 'ep', 1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >+</button>
          </div>
          <div v-else class="text-xs font-bold py-0.5 text-gray-900 font-mono select-none">
            {{ currency.ep || 0 }}
          </div>
        </div>

        <!-- SP -->
        <div class="bg-white p-2 border border-gray-200 rounded">
          <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">SP</span>
          <div v-if="!isReadOnly" class="flex items-center justify-center gap-1">
            <button
              type="button"
              @click="emit('adjustCurrency', 'sp', -1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >-</button>
            <input
              type="number"
              min="0"
              v-model.number="currency.sp"
              @change="emit('saveCurrency')"
              class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
            />
            <button
              type="button"
              @click="emit('adjustCurrency', 'sp', 1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
            >+</button>
          </div>
          <div v-else class="text-xs font-bold py-0.5 text-gray-900 font-mono select-none">
            {{ currency.sp || 0 }}
          </div>
        </div>

        <!-- CP -->
        <div class="bg-white p-2 border border-gray-200 rounded">
          <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">CP</span>
          <div v-if="!isReadOnly" class="flex items-center justify-center gap-1">
            <button
              type="button"
              @click="emit('adjustCurrency', 'cp', -1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
            >-</button>
            <input
              type="number"
              min="0"
              v-model.number="currency.cp"
              @change="emit('saveCurrency')"
              class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
            />
            <button
              type="button"
              @click="emit('adjustCurrency', 'cp', 1)"
              class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
            >+</button>
          </div>
          <div v-else class="text-xs font-bold py-0.5 text-gray-900 font-mono select-none">
            {{ currency.cp || 0 }}
          </div>
        </div>
      </div>
    </div>

    <!-- Encumbrance Bar Widget -->
    <div class="p-3 bg-gray-50 border border-gray-200 space-y-2">
      <div class="flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>Weight / Carrying Capacity</span>
        <span class="text-[11px] font-normal text-gray-500">{{ Math.round((totalWeight / (carryCapacity || 1)) * 100) }}%</span>
      </div>

      <div class="relative w-full bg-gray-200 h-6 overflow-hidden border border-gray-300">
        <div
          class="h-full transition-all duration-300"
          :class="weightBarColor"
          :style="{ width: `${weightPercent}%` }"
        ></div>
        <div
          class="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none tracking-tight"
          :class="weightPercent > 55 ? 'text-white drop-shadow-xs' : 'text-gray-900'"
        >
          {{ totalWeight.toFixed(1) }} / {{ carryCapacity }} lbs
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px]">
        <span class="text-gray-500">
          Status: <span class="font-bold" :class="weightStatusTextColor">{{ weightStatusLabel }}</span>
        </span>
        <span class="text-gray-500">
          Max: <strong class="text-gray-800">{{ carryCapacity }} lbs</strong>
        </span>
      </div>
    </div>

    <!-- Equipment Table -->
    <div class="bg-white border border-gray-200 rounded overflow-hidden">
      <div class="p-2.5 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 uppercase tracking-wider text-[11px] flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span>Inventory Items</span>
          <span class="text-[10px] text-gray-500 font-normal">({{ liveEquipment.length }} items)</span>
          <span v-if="equipmentSavedToast" class="text-[10px] text-green-600 font-semibold">Saved</span>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5">
          <button
            type="button"
            @click="emit('openAddCustomItem')"
            class="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1"
          >
            <IconPlus class="w-3 h-3" />
            <span>Custom Item</span>
          </button>
          <button
            type="button"
            @click="emit('openCompendiumModal')"
            class="bg-gray-800 hover:bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
          >
            Add Item
          </button>
        </div>
      </div>

      <!-- Container & Storage View Pills -->
      <div class="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50/70 border-b border-gray-200">
        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">View:</span>
        <button
          type="button"
          @click="emit('update:selectedContainerFilter', 'all')"
          :class="selectedContainerFilter === 'all' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
          class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
        >
          All Items ({{ liveEquipment.length }})
        </button>
        <button
          type="button"
          @click="emit('update:selectedContainerFilter', 'equipped')"
          :class="selectedContainerFilter === 'equipped' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
          class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
        >
          Equipped ({{ equippedCount }})
        </button>
        <button
          type="button"
          @click="emit('update:selectedContainerFilter', 'backpack')"
          :class="selectedContainerFilter === 'backpack' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
          class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
        >
          Backpack ({{ backpackCount }})
        </button>
        <button
          v-for="c in availableContainers"
          :key="c.name"
          type="button"
          @click="emit('update:selectedContainerFilter', c.name)"
          :class="selectedContainerFilter === c.name ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
          class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer flex items-center gap-1"
        >
          <span>{{ c.name }}</span>
          <span class="text-[10px] opacity-75">
            ({{ getContainerCurrentWeight(c.name).toFixed(1) }}{{ getContainerCapacity(c) ? '/' + getContainerCapacity(c) : '' }} lb)
          </span>
        </button>
      </div>

      <!-- Container Capacity Banner (if viewing specific container) -->
      <div
        v-if="currentActiveContainer"
        class="p-2.5 bg-gray-100/70 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
      >
        <div>
          <span class="font-bold text-gray-900">{{ currentActiveContainer.name }}</span>
          <span class="text-gray-500 ml-2">Items inside: {{ filteredEquipment.length }}</span>
        </div>
        <div v-if="getContainerCapacity(currentActiveContainer)" class="flex items-center gap-2 w-full sm:w-auto">
          <div class="text-[11px] text-gray-600 font-medium">
            {{ getContainerCurrentWeight(currentActiveContainer.name).toFixed(1) }} / {{ getContainerCapacity(currentActiveContainer) }} lbs
          </div>
          <div class="w-24 bg-gray-200 h-2 rounded overflow-hidden border border-gray-300">
            <div
              class="h-full bg-gray-800 rounded transition-all"
              :style="{ width: Math.min(100, (getContainerCurrentWeight(currentActiveContainer.name) / getContainerCapacity(currentActiveContainer)) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="filteredEquipment.length === 0" class="p-6 text-center text-gray-400 italic">
        {{ selectedContainerFilter === 'equipped' ? 'No items currently equipped.' : selectedContainerFilter === 'backpack' ? 'No items in backpack.' : selectedContainerFilter !== 'all' ? 'No items stored in this container yet.' : 'No equipment or gear recorded.' }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/50 text-[11px] text-gray-500 font-medium">
              <th class="py-2 px-3">Item Name</th>
              <th class="py-2 px-2 text-center">Location</th>
              <th class="py-2 px-2 text-center">Status</th>
              <th class="py-2 px-2 text-center">Qty</th>
              <th class="py-2 px-3 text-right">Weight</th>
              <th v-if="!isReadOnly" class="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(eq, eIdx) in filteredEquipment" :key="eIdx" class="hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">
                <span>{{ eq.name }}</span>
                <span v-if="isContainerItem(eq)" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                  Container{{ getContainerCapacity(eq) ? ' (' + getContainerCapacity(eq) + ' lb)' : '' }}
                </span>
                <span v-else-if="getItemEquipType(eq) === 'armor' || getItemEquipType(eq) === 'shield'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                  {{ getItemEquipType(eq) === 'shield' ? 'Shield' : 'Armor' }}
                </span>
                <span v-else-if="getItemEquipType(eq) === 'weapon'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                  Weapon
                </span>
                <span v-else-if="getItemEquipType(eq) === 'wearable'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                  Wearable
                </span>
                <span v-if="selectedContainerFilter === 'all' && eq.container_name" class="ml-1.5 text-[9px] text-gray-500 italic">
                  (in {{ eq.container_name }})
                </span>
              </td>
              <td class="py-2 px-2 text-center">
                <span
                  v-if="eq.status === 'equipped'"
                  class="text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded select-none"
                >
                  Equipped
                </span>
                <span v-else-if="isContainerItem(eq)" class="text-[10px] text-gray-400 font-mono select-none">Container</span>
                <select
                  v-else-if="!isReadOnly && availableContainers.length > 0"
                  :value="eq.container_name || ''"
                  @change="emit('setItemContainer', { item: eq, containerName: $event.target.value })"
                  class="text-[10px] p-1 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer"
                >
                  <option value="">Backpack</option>
                  <option v-for="c in availableContainers.filter(cont => cont !== eq)" :key="c.name" :value="c.name">
                    {{ c.name }}
                  </option>
                </select>
                <span v-else class="text-[10px] text-gray-600 font-mono select-none">{{ eq.container_name || 'Backpack' }}</span>
              </td>
              <td class="py-2 px-2 text-center">
                <button
                  v-if="!isReadOnly && isItemEquippable(eq) && !eq.container_name"
                  type="button"
                  @click="emit('toggleEquipStatus', eq)"
                  :class="eq.status === 'equipped' ? 'bg-gray-200 text-gray-800 border-gray-300 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
                  class="px-2 py-0.5 text-[10px] rounded border transition cursor-pointer capitalize"
                >
                  {{ eq.status === 'equipped' ? 'Equipped' : 'Equip' }}
                </button>
                <span v-else-if="eq.status === 'equipped'" class="text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded select-none">
                  Equipped
                </span>
                <span v-else-if="isItemEquippable(eq) && eq.container_name" class="text-[10px] text-gray-400 select-none" :title="'Stored in ' + eq.container_name">—</span>
                <span v-else class="text-[10px] text-gray-400 select-none">—</span>
              </td>
              <td class="py-2 px-2 text-center font-mono">
                <div v-if="!isReadOnly" class="inline-flex items-center gap-1">
                  <button
                    type="button"
                    @click="emit('changeItemAmount', { item: eq, delta: -1 })"
                    class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                  >-</button>
                  <span class="w-6 text-center text-xs font-semibold">{{ eq.amount || 1 }}</span>
                  <button
                    type="button"
                    @click="emit('changeItemAmount', { item: eq, delta: 1 })"
                    class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                  >+</button>
                </div>
                <span v-else class="w-6 text-center text-xs font-semibold select-none font-mono">
                  {{ eq.amount || 1 }}
                </span>
              </td>
              <td class="py-2 px-3 text-right font-mono text-gray-600">{{ eq.weight || '0' }} lb</td>
              <td v-if="!isReadOnly" class="py-2 px-3 text-right">
                <button
                  type="button"
                  @click="emit('removeItem', eq)"
                  class="text-gray-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer transition"
                  title="Remove Item"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
