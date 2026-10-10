<script setup>
import { IconX } from '@tabler/icons-vue'

defineProps({
  selectedBackgroundObj: { type: Object, default: null },
  selectedEdition: { type: String, default: '2024' },
  characterClass: { type: Object, default: () => ({}) },
  equipmentChoiceMode: { type: String, default: 'package' },
  computedTreasures: { type: Object, default: () => ({ gp: 0 }) },
  defaultStartingGold: { type: Number, default: 0 },
  backgroundStartingGold: { type: Number, default: 0 },
  classStartingGold: { type: Number, default: 0 },
  classEquipmentChoices: { type: Array, default: () => [] },
  chosenClassEquipmentChoices: { type: Object, default: () => ({}) },
  fixedClassItems: { type: Array, default: () => [] },
  bgEquipmentChoices: { type: Array, default: () => [] },
  chosenBgEquipmentChoices: { type: Object, default: () => ({}) },
  customStartingGold: { type: Number, default: 0 },
  errors: { type: Object, default: () => ({}) },
  computedTotalWeight: { type: Number, default: 0 },
  computedCarryCapacity: { type: Number, default: 150 },
  formWeightPercent: { type: Number, default: 0 },
  formWeightBarColor: { type: String, default: 'bg-emerald-500' },
  formWeightStatusTextColor: { type: String, default: 'text-emerald-700' },
  formWeightStatusLabel: { type: String, default: 'Normal' },
  userEquipmentList: { type: Array, default: () => [] },
  parseBackgroundDetails: { type: Function, required: true },
  renderAnnotatedText: { type: Function, required: true }
})

const emit = defineEmits([
  'update:equipmentChoiceMode',
  'update:customStartingGold',
  'syncDefaultEquipment',
  'resetStartingGold',
  'openWizardCompendium',
  'clearUserEquipment',
  'toggleWizardItemStatus',
  'changeWizardItemAmount',
  'removeWizardItem'
])
</script>

<template>
  <div>
    <h2 class="text-base font-bold text-gray-900 mb-3">Equipment &amp; Starting Wealth</h2>

    <!-- Selected Background Info Banner -->
    <div v-if="selectedBackgroundObj" class="mb-4 p-3.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-bold text-gray-900 text-sm">Background: {{ selectedBackgroundObj.name }}</span>
          <span class="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-200 text-gray-700">
            {{ selectedEdition === '2024' ? '2024 Rules' : '2014 Rules' }}
          </span>
        </div>
        <span class="text-[11px] text-gray-500 font-mono">
          {{ (parseBackgroundDetails(selectedBackgroundObj)?.bgStartingItems || []).length }} background items
        </span>
      </div>

      <div v-if="parseBackgroundDetails(selectedBackgroundObj).equipmentText" class="text-gray-700 leading-relaxed pt-1.5 border-t border-gray-200">
        <span class="font-semibold text-gray-800">Background Equipment: </span>
        <span v-html="renderAnnotatedText(parseBackgroundDetails(selectedBackgroundObj).equipmentText)"></span>
      </div>
    </div>
    <div v-else class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
      No background selected yet. Starting equipment will default to class starter kit. You can select a background in the Background tab.
    </div>

    <!-- Mode Selector -->
    <div class="mb-4">
      <label class="block text-xs font-semibold text-gray-700 mb-1.5">Starting Equipment Option:</label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label
          :class="[
            equipmentChoiceMode === 'package' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
            'p-3 border rounded cursor-pointer transition text-xs block'
          ]"
        >
          <input
            type="radio"
            value="package"
            :checked="equipmentChoiceMode === 'package'"
            @change="emit('update:equipmentChoiceMode', 'package')"
            class="hidden"
          />
          <div class="font-bold text-gray-900 mb-0.5">Starter Equipment Package</div>
          <p class="text-[11px] text-gray-600 leading-relaxed">
            {{ selectedEdition === '2024'
              ? `Standard starter gear from ${characterClass?.class?.name || 'Class'} & ${selectedBackgroundObj?.name || 'Background'}, plus ${computedTreasures.gp} GP pouch currency.`
              : `Class starting gear + ${selectedBackgroundObj?.name || 'Background'} equipment kit, plus ${computedTreasures.gp} GP starting pouch.`
            }}
          </p>
        </label>

        <label
          :class="[
            equipmentChoiceMode === 'gold' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
            'p-3 border rounded cursor-pointer transition text-xs block'
          ]"
        >
          <input
            type="radio"
            value="gold"
            :checked="equipmentChoiceMode === 'gold'"
            @change="emit('update:equipmentChoiceMode', 'gold')"
            class="hidden"
          />
          <div class="font-bold text-gray-900 mb-0.5">Starting Gold Only ({{ defaultStartingGold }} GP)</div>
          <p class="text-[11px] text-gray-600 leading-relaxed">
            {{ selectedEdition === '2024'
              ? 'Official 2024 rule: forego background equipment package and start with 50 GP to purchase items freely.'
              : `Classic rule: forego class and background gear. Receive ${defaultStartingGold} GP (class starting wealth) to purchase items freely.`
            }}
          </p>
        </label>
      </div>
    </div>

    <!-- Package View Details -->
    <div v-if="equipmentChoiceMode === 'package'" class="space-y-3 mb-4">
      <!-- Starting Wealth Pouch -->
      <div class="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-800">Starting Currency (Pouch):</span>
          <span class="font-bold text-amber-700 font-mono text-sm">{{ computedTreasures.gp }} GP</span>
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-600">
          <span>Background ({{ selectedBackgroundObj?.name || 'Background' }}): <strong class="text-gray-800 font-mono">{{ backgroundStartingGold }} GP</strong></span>
          <span>+</span>
          <span>Class ({{ characterClass?.class?.name || 'Class' }}): <strong class="text-gray-800 font-mono">{{ classStartingGold }} GP</strong></span>
          <span>=</span>
          <span>Total: <strong class="text-amber-700 font-mono">{{ computedTreasures.gp }} GP</strong></span>
        </div>
      </div>

      <!-- Class Starting Equipment Alternative Choices -->
      <div v-if="classEquipmentChoices.length > 0" class="p-3 bg-white border border-gray-200 rounded text-xs space-y-2.5">
        <div class="font-semibold text-gray-800 border-b border-gray-100 pb-1 flex items-center justify-between">
          <span>Primary Class Starting Equipment ({{ characterClass?.class?.name || 'Class 1' }})</span>
          <span class="text-[10px] text-gray-500 font-normal">Select starter gear options</span>
        </div>
        <div v-for="ch in classEquipmentChoices" :key="ch.id" class="space-y-1.5">
          <div class="text-[11px] text-gray-600 font-medium">{{ ch.label }}:</div>
          <div :class="['grid gap-2', ch.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2']">
            <label
              v-for="opt in ch.options"
              :key="opt.key"
              :class="[
                chosenClassEquipmentChoices[ch.id] === opt.key ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                'p-2.5 border rounded cursor-pointer transition text-xs block'
              ]"
            >
              <input
                type="radio"
                :name="ch.id"
                :value="opt.key"
                v-model="chosenClassEquipmentChoices[ch.id]"
                @change="emit('syncDefaultEquipment', true)"
                class="hidden"
              />
              <span class="font-medium text-gray-900 block leading-snug">{{ opt.description }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Fixed Class Items Chips -->
      <div v-if="fixedClassItems.length > 0" class="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
        <div class="font-semibold text-gray-700 mb-1">
          Standard gear included with {{ characterClass?.class?.name }}:
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(fItem, fIdx) in fixedClassItems"
            :key="fIdx"
            class="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded text-[11px]"
          >
            {{ fItem.amount > 1 ? `${fItem.amount}x ` : '' }}{{ fItem.name }}
          </span>
        </div>
      </div>

      <!-- Background Starting Equipment Alternative Choices -->
      <div v-if="bgEquipmentChoices.length > 0" class="p-3 bg-white border border-gray-200 rounded text-xs space-y-2.5">
        <div class="font-semibold text-gray-800 border-b border-gray-100 pb-1 flex items-center justify-between">
          <span>Background Equipment Choices</span>
          <span class="text-[10px] text-gray-500 font-normal">Select starter gear</span>
        </div>
        <div v-for="ch in bgEquipmentChoices" :key="ch.id" class="space-y-1.5">
          <div class="text-[11px] text-gray-600 font-medium">{{ ch.label }}:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              :class="[
                chosenBgEquipmentChoices[ch.id] === 'a' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                'p-2.5 border rounded cursor-pointer transition text-xs block'
              ]"
            >
              <input
                type="radio"
                :name="ch.id"
                value="a"
                v-model="chosenBgEquipmentChoices[ch.id]"
                @change="emit('syncDefaultEquipment', true)"
                class="hidden"
              />
              <span class="font-medium text-gray-900 block leading-snug">{{ ch.optionA.label }}</span>
            </label>

            <label
              :class="[
                chosenBgEquipmentChoices[ch.id] === 'b' ? 'border-gray-900 bg-gray-100 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300',
                'p-2.5 border rounded cursor-pointer transition text-xs block'
              ]"
            >
              <input
                type="radio"
                :name="ch.id"
                value="b"
                v-model="chosenBgEquipmentChoices[ch.id]"
                @change="emit('syncDefaultEquipment', true)"
                class="hidden"
              />
              <span class="font-medium text-gray-900 block leading-snug">{{ ch.optionB.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Background Items Chips -->
      <div
        v-if="selectedBackgroundObj && (parseBackgroundDetails(selectedBackgroundObj)?.bgStartingItems || []).length > 0"
        class="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs"
      >
        <div class="font-semibold text-gray-900 mb-1">
          Items from {{ selectedBackgroundObj.name }}:
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(itName, itIdx) in parseBackgroundDetails(selectedBackgroundObj).bgStartingItems"
            :key="itIdx"
            class="px-2 py-0.5 bg-white border border-gray-200 text-gray-800 rounded text-[11px]"
          >
            {{ itName }}
          </span>
        </div>
      </div>
    </div>

    <!-- Gold View Details -->
    <div v-else data-error-field="equipmentGold" class="space-y-3 p-3.5 bg-gray-50 border rounded text-xs mb-4" :class="errors.equipmentGold ? 'border-red-400' : 'border-gray-200'">
      <div>
        <label class="block font-semibold text-gray-800 mb-1">Starting Gold Pieces (GP):</label>
        <div class="flex items-center gap-2">
          <input
            id="customStartingGold"
            type="number"
            min="0"
            :value="customStartingGold"
            @input="emit('update:customStartingGold', Number($event.target.value))"
            :class="errors.equipmentGold ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
            class="p-2 border rounded w-32 bg-white text-xs font-mono font-bold"
          />
          <span class="text-xs font-bold text-gray-700">GP</span>
          <button
            type="button"
            @click="emit('resetStartingGold')"
            class="px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 cursor-pointer text-xs"
          >
            Reset to Default ({{ defaultStartingGold }} GP)
          </button>
        </div>
        <p v-if="errors.equipmentGold" class="mt-1 text-xs text-red-600 font-medium">
          {{ errors.equipmentGold }}
        </p>
        <p class="text-[11px] text-gray-500 mt-2 leading-relaxed">
          Standard rule: {{ selectedEdition === '2024' ? '2024 rules grant a flat 50 GP starting wealth option.' : `Classic 2014 rule gives an average of ${defaultStartingGold} GP for ${characterClass?.class?.name || 'your class'}.` }}
          Use "+ Add from Compendium" below to select equipment for your inventory.
        </p>
      </div>
    </div>

    <!-- Weight / Encumbrance Bar Widget -->
    <div class="p-3 bg-gray-50 border border-gray-200 space-y-2 mb-4">
      <div class="flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>Weight / Carrying Capacity</span>
        <span class="text-[11px] font-normal text-gray-500">{{ Math.round((computedTotalWeight / (computedCarryCapacity || 1)) * 100) }}%</span>
      </div>

      <div class="relative w-full bg-gray-200 h-6 overflow-hidden border border-gray-300">
        <div
          class="h-full transition-all duration-300"
          :class="formWeightBarColor"
          :style="{ width: `${formWeightPercent}%` }"
        ></div>
        <div
          class="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none tracking-tight"
          :class="formWeightPercent > 55 ? 'text-white drop-shadow-xs' : 'text-gray-900'"
        >
          {{ computedTotalWeight.toFixed(1) }} / {{ computedCarryCapacity }} lbs
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px]">
        <span class="text-gray-500">
          Status: <span class="font-bold" :class="formWeightStatusTextColor">{{ formWeightStatusLabel }}</span>
        </span>
        <span class="text-gray-500">
          Max: <strong class="text-gray-800">{{ computedCarryCapacity }} lbs</strong>
        </span>
      </div>
    </div>

    <!-- Inventory Items Table (Shared for both Package and Gold) -->
    <div class="border border-gray-200 rounded overflow-hidden">
      <div class="bg-gray-50 px-3 py-2 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span class="text-xs font-semibold text-gray-800">Inventory Items ({{ userEquipmentList.length }})</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="emit('openWizardCompendium')"
            class="bg-gray-900 hover:bg-black text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
          >
            + Add from Compendium
          </button>
          <button
            v-if="equipmentChoiceMode === 'package'"
            type="button"
            @click="emit('syncDefaultEquipment', true)"
            class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] px-2 py-1 rounded transition cursor-pointer"
            title="Reset to default class and background starter package"
          >
            Reset Default
          </button>
          <button
            v-else
            type="button"
            @click="emit('clearUserEquipment')"
            class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] px-2 py-1 rounded transition cursor-pointer"
            title="Clear all inventory items"
          >
            Clear All
          </button>
        </div>
      </div>

      <div v-if="userEquipmentList.length === 0" class="p-6 text-center text-gray-400 italic text-xs">
        No equipment in inventory. Click "+ Add from Compendium" to add items.
      </div>

      <div v-else class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        <div
          v-for="(item, idx) in userEquipmentList"
          :key="idx"
          class="px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs hover:bg-gray-50/70 gap-2"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
            <span class="font-medium text-gray-900 truncate">{{ item.name }}</span>
            <span v-if="item.is_armor" class="text-[10px] px-1 py-0.2 bg-gray-100 text-gray-800 border border-gray-200 rounded shrink-0">Armor</span>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <!-- Status Toggle -->
            <button
              type="button"
              @click="emit('toggleWizardItemStatus', idx)"
              :class="item.status === 'equipped' ? 'bg-gray-900 text-white border-gray-900 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
              class="px-2 py-0.5 text-[10px] rounded border transition cursor-pointer capitalize"
              title="Toggle Equipped / Inventory"
            >
              {{ item.status === 'equipped' ? 'Equipped' : 'Inventory' }}
            </button>

            <!-- Amount +/- -->
            <div class="inline-flex items-center gap-1">
              <button
                type="button"
                @click="emit('changeWizardItemAmount', { idx, delta: -1 })"
                class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
              >-</button>
              <span class="w-5 text-center text-[11px] font-semibold">{{ item.amount || 1 }}</span>
              <button
                type="button"
                @click="emit('changeWizardItemAmount', { idx, delta: 1 })"
                class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
              >+</button>
            </div>

            <!-- Weight -->
            <span class="text-[11px] text-gray-500 font-mono w-14 text-right">
              {{ item.weight || '0' }} lb
            </span>

            <!-- Delete -->
            <button
              type="button"
              @click="emit('removeWizardItem', idx)"
              class="text-gray-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              title="Remove Item"
            >
              <IconX class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
