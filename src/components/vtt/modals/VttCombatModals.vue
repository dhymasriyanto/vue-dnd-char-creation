<script setup>
import {
  IconCheck,
  IconChevronUp,
  IconChevronDown
} from '@tabler/icons-vue'

const props = defineProps({
  showHpModal: { type: Boolean, default: false },
  showAcModal: { type: Boolean, default: false },
  showSpeedModal: { type: Boolean, default: false },
  showAddDefenseModal: { type: Boolean, default: false },
  showConditionModal: { type: Boolean, default: false },
  showSaveNoteModal: { type: Boolean, default: false },

  // HP Modal
  currentHp: { type: Number, default: 10 },
  tempHp: { type: Number, default: 0 },
  previewMaxHp: { type: Number, default: 10 },
  newHpPreview: { type: Number, default: 10 },
  healModalInput: { type: Number, default: null },
  damageModalInput: { type: Number, default: null },
  maxHpModifierInput: { type: [Number, String], default: '' },
  overrideMaxHpInput: { type: [Number, String], default: '' },

  // AC Modal
  currentArmorClass: { type: Number, default: 10 },
  acBreakdown: { type: Object, default: () => ({}) },
  acCustom: { type: Object, default: () => ({}) },
  isAcCustomizeOpen: { type: Boolean, default: false },

  // Speed Modal
  customSpeeds: { type: Object, default: () => ({}) },

  // Defense Modal
  newDefenseType: { type: String, default: 'resistances' },
  newDefenseDamage: { type: String, default: 'Acid' },
  damageTypes: { type: Array, default: () => [] },

  // Conditions Modal
  allConditions: { type: Array, default: () => [] },
  exhaustionLevel: { type: Number, default: null },
  maxExhaustionLevel: { type: Number, default: 6 },
  isConditionActive: { type: Function, default: () => false },
  getExhaustionDescription: { type: Function, default: () => '' },

  // Save Note Modal
  customSaveNoteInput: { type: String, default: '' }
})

const emit = defineEmits([
  'update:currentHp',
  'update:tempHp',
  'update:healModalInput',
  'update:damageModalInput',
  'update:maxHpModifierInput',
  'update:overrideMaxHpInput',
  'update:isAcCustomizeOpen',
  'update:newDefenseType',
  'update:newDefenseDamage',
  'update:customSaveNoteInput',
  'closeHpModal',
  'applyModalHeal',
  'applyModalDamage',
  'closeAcModal',
  'cancelSpeedModal',
  'closeSpeedModal',
  'closeAddDefenseModal',
  'addDefense',
  'closeConditionModal',
  'toggleCondition',
  'setExhaustionLevel',
  'closeSaveNoteModal',
  'saveCustomSaveNote'
])
</script>

<template>
  <div>
    <!-- HP Management Modal -->
    <div v-if="showHpModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Hit Points</h3>
          <button
            type="button"
            @click="emit('closeHpModal')"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- 3 Boxes: Current / Max / Temp -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <!-- Current HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">CURRENT</span>
            <input
              type="number"
              min="0"
              :max="previewMaxHp"
              :value="currentHp"
              @input="emit('update:currentHp', Number($event.target.value))"
              class="w-full text-center text-lg font-black text-gray-900 bg-white border border-gray-300 rounded mt-1 py-0.5 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <!-- Max HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center justify-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">MAX</span>
            <span class="text-lg font-black text-gray-900 mt-1 py-0.5">{{ previewMaxHp }}</span>
          </div>

          <!-- Temp HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">TEMP</span>
            <input
              type="number"
              min="0"
              :value="tempHp"
              @input="emit('update:tempHp', Number($event.target.value))"
              placeholder="0"
              class="w-full text-center text-lg font-black text-gray-900 bg-white border border-gray-300 rounded mt-1 py-0.5 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <!-- Heal & Damage Calculator Grid -->
        <div class="border border-gray-200 rounded-lg p-3 bg-gray-50/80">
          <div class="grid grid-cols-3 gap-2 items-center text-center">
            <!-- HEAL Section -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">HEALING</span>
              <div class="flex items-center gap-1 w-full justify-center">
                <input
                  type="number"
                  min="0"
                  :value="healModalInput"
                  @input="emit('update:healModalInput', Number($event.target.value))"
                  placeholder="0"
                  class="w-16 bg-white border border-gray-300 rounded text-center text-sm font-bold py-1 text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  @click="emit('applyModalHeal')"
                  class="w-7 h-7 bg-gray-900 hover:bg-black text-white font-bold rounded flex items-center justify-center text-sm cursor-pointer shadow-xs transition"
                  title="Apply Healing"
                >
                  +
                </button>
              </div>
            </div>

            <!-- NEW HP Preview Box -->
            <div class="flex flex-col items-center justify-center border-x border-gray-200 px-2">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">NEW HP</span>
              <span class="text-2xl font-black text-gray-900 my-0.5">{{ newHpPreview }}</span>
              <span class="text-[10px] text-gray-500">Preview</span>
            </div>

            <!-- DAMAGE Section -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">DAMAGE</span>
              <div class="flex items-center gap-1 w-full justify-center">
                <input
                  type="number"
                  min="0"
                  :value="damageModalInput"
                  @input="emit('update:damageModalInput', Number($event.target.value))"
                  placeholder="0"
                  class="w-16 bg-white border border-gray-300 rounded text-center text-sm font-bold py-1 text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  @click="emit('applyModalDamage')"
                  class="w-7 h-7 bg-gray-900 hover:bg-black text-white font-bold rounded flex items-center justify-center text-sm cursor-pointer shadow-xs transition"
                  title="Apply Damage"
                >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Max HP Modifier & Override Max HP Fields -->
        <div class="space-y-3 pt-1">
          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex-1">
              <span class="font-bold text-gray-800 block text-[11px] uppercase tracking-wide">MAX HP MODIFIER</span>
              <span class="text-gray-500 text-[10px]">Adjusts maximum hit points by this amount.</span>
            </div>
            <input
              type="number"
              :value="maxHpModifierInput"
              @input="emit('update:maxHpModifierInput', $event.target.value)"
              placeholder="--"
              class="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-center text-xs font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex-1">
              <span class="font-bold text-gray-800 block text-[11px] uppercase tracking-wide">OVERRIDE MAX HP</span>
              <span class="text-gray-500 text-[10px]">Overrides base hit points calculation.</span>
            </div>
            <input
              type="number"
              :value="overrideMaxHpInput"
              @input="emit('update:overrideMaxHpInput', $event.target.value)"
              placeholder="--"
              class="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-center text-xs font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="emit('closeHpModal')"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>

    <!-- Armor Class Modal -->
    <div v-if="showAcModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <div class="flex items-baseline gap-2">
            <h3 class="text-base font-bold text-gray-900 tracking-tight">Armor Class</h3>
            <span class="text-xl font-black text-gray-900 leading-none">{{ currentArmorClass }}</span>
          </div>
          <button
            type="button"
            @click="emit('closeAcModal')"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- AC Breakdown -->
        <div class="space-y-1.5 bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          <div class="font-bold text-gray-700 uppercase text-[10px] tracking-wider mb-1">Base AC Breakdown</div>
          <div class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.baseArmorValue }} Armor ({{ acBreakdown.armorName }})</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.baseArmorValue }}</span>
          </div>
          <div class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.dexBonus >= 0 ? '+' : '' }}{{ acBreakdown.dexBonus }} {{ acBreakdown.dexBonusLabel }}</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.dexBonus >= 0 ? '+' : '' }}{{ acBreakdown.dexBonus }}</span>
          </div>
          <div v-if="acBreakdown.hasShield" class="flex justify-between items-center text-gray-800">
            <span>+2 Shield</span>
            <span class="font-bold text-gray-900">+2</span>
          </div>
          <div v-if="acBreakdown.magicBonus !== 0" class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.magicBonus > 0 ? '+' : '' }}{{ acBreakdown.magicBonus }} Magic Bonus</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.magicBonus > 0 ? '+' : '' }}{{ acBreakdown.magicBonus }}</span>
          </div>
          <div v-if="acBreakdown.miscBonus !== 0" class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.miscBonus > 0 ? '+' : '' }}{{ acBreakdown.miscBonus }} Misc Bonus</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.miscBonus > 0 ? '+' : '' }}{{ acBreakdown.miscBonus }}</span>
          </div>
          <div v-if="acBreakdown.overrideAc !== null" class="pt-1.5 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
            <span>Total Overridden</span>
            <span class="font-black text-gray-900">{{ acBreakdown.overrideAc }}</span>
          </div>
        </div>

        <!-- Collapsible Customize Section -->
        <div class="border border-gray-200 rounded overflow-hidden">
          <button
            type="button"
            @click="emit('update:isAcCustomizeOpen', !isAcCustomizeOpen)"
            class="w-full flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200/70 text-xs font-bold text-gray-800 cursor-pointer transition select-none"
          >
            <span>Customize</span>
            <component :is="isAcCustomizeOpen ? IconChevronUp : IconChevronDown" class="w-4 h-4 text-gray-600" />
          </button>

          <div v-if="isAcCustomizeOpen" class="p-3 space-y-3 bg-white text-xs">
            <!-- 1. Override AC -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">OVERRIDE AC</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model="acCustom.override_ac"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_override_ac"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 2. Override Base Armor + DEX -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">OVERRIDE BASE ARMOR + DEX</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model="acCustom.override_base"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_override_base"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 3. Additional Magic Bonus -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">ADDITIONAL MAGIC BONUS</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model.number="acCustom.magic_bonus"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_magic"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 4. Additional Misc Bonus -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">ADDITIONAL MISC BONUS</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model.number="acCustom.misc_bonus"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_misc"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="emit('closeAcModal')"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>

    <!-- Speed & Movement Modal -->
    <div v-if="showSpeedModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Speed & Movement</h3>
          <button
            type="button"
            @click="emit('cancelSpeedModal')"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Speeds Grid -->
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Walking Speed</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.walk"
                  class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Flying Speed</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.fly"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Swimming</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.swim"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Climbing</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.climb"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Burrowing</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.burrow"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Movement Notes</label>
            <textarea
              v-model="customSpeeds.notes"
              rows="2"
              placeholder="e.g. Hover, Mobile feat +10ft, difficult terrain ignores..."
              class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="emit('cancelSpeedModal')"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="emit('closeSpeedModal')"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded cursor-pointer transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Add Defense Modal -->
    <div v-if="showAddDefenseModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Add Defense</span>
          <button type="button" @click="emit('closeAddDefenseModal')" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Defense Type</label>
          <select
            :value="newDefenseType"
            @change="emit('update:newDefenseType', $event.target.value)"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
          >
            <option value="resistances">Resistance (Half damage)</option>
            <option value="immunities">Immunity (No damage)</option>
            <option value="vulnerabilities">Vulnerability (Double damage)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Damage Type</label>
          <select
            :value="newDefenseDamage"
            @change="emit('update:newDefenseDamage', $event.target.value)"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
          >
            <option v-for="d in damageTypes" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('closeAddDefenseModal')"
            class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="emit('addDefense')"
            class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Conditions Modal -->
    <div v-if="showConditionModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Manage Active Conditions</span>
          <button type="button" @click="emit('closeConditionModal')" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto p-1">
          <button
            v-for="cond in allConditions"
            :key="cond"
            type="button"
            @click="emit('toggleCondition', cond)"
            class="px-2 py-1.5 rounded border text-left text-xs font-medium transition cursor-pointer flex items-center justify-between"
            :class="isConditionActive(cond) ? 'bg-gray-900 border-gray-900 text-white font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'"
          >
            <span>{{ cond }}</span>
            <IconCheck v-if="isConditionActive(cond)" class="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <!-- Exhaustion Stepper & Details when active -->
        <div v-if="exhaustionLevel !== null" class="border border-gray-300 bg-gray-50 rounded p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-gray-900 uppercase tracking-wide">Exhaustion Level</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="exhaustionLevel > 1 ? emit('setExhaustionLevel', exhaustionLevel - 1) : emit('toggleCondition', 'Exhaustion')"
                class="w-6 h-6 rounded bg-gray-900 hover:bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition"
                title="Decrease Level"
              >
                -
              </button>
              <span class="font-black text-sm text-gray-900 w-16 text-center">Level {{ exhaustionLevel }}</span>
              <button
                type="button"
                @click="emit('setExhaustionLevel', exhaustionLevel + 1)"
                :disabled="exhaustionLevel >= maxExhaustionLevel"
                class="w-6 h-6 rounded bg-gray-900 hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition"
                title="Increase Level"
              >
                +
              </button>
            </div>
          </div>
          <p class="text-[11px] text-gray-600 leading-tight">
            {{ getExhaustionDescription(exhaustionLevel) }}
          </p>
        </div>

        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="emit('closeConditionModal')"
            class="px-3.5 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Save Note Modal -->
    <div v-if="showSaveNoteModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Saving Throw Notes</span>
          <button type="button" @click="emit('closeSaveNoteModal')" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Additional Save Modifiers / Resistances</label>
          <textarea
            :value="customSaveNoteInput"
            @input="emit('update:customSaveNoteInput', $event.target.value)"
            rows="3"
            placeholder="e.g. +2 against spells from Magic Resistance, Danger Sense on DEX saves..."
            class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-500"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('closeSaveNoteModal')"
            class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="emit('saveCustomSaveNote')"
            class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
