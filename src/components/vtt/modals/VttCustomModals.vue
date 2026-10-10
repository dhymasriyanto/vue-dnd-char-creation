<script setup>
defineProps({
  showActionModal: {
    type: Boolean,
    default: false
  },
  editingCustomActionId: {
    type: [String, Number],
    default: null
  },
  newCustomActionForm: {
    type: Object,
    required: true
  },
  showSkillModal: {
    type: Boolean,
    default: false
  },
  newCustomSkillForm: {
    type: Object,
    required: true
  },
  showItemModal: {
    type: Boolean,
    default: false
  },
  newCustomItemForm: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'closeAction',
  'saveAction',
  'closeSkill',
  'saveSkill',
  'closeItem',
  'saveItem'
])
</script>

<template>
  <div>
    <!-- Custom Action Modal -->
    <div v-if="showActionModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">
            {{ editingCustomActionId ? 'Edit Custom Action' : 'Create Custom Action' }}
          </h3>
          <button type="button" @click="emit('closeAction')" class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer">×</button>
        </div>

        <form @submit.prevent="emit('saveAction')" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              v-model="newCustomActionForm.name"
              required
              placeholder="e.g. Ki-Fueled Strike, Breath Weapon, Flaming Sword"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Activation Type</label>
              <select
                v-model="newCustomActionForm.type"
                class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              >
                <option value="attack">Attack</option>
                <option value="action">Action</option>
                <option value="bonus">Bonus Action</option>
                <option value="reaction">Reaction</option>
                <option value="other">Other / Special</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Range / Reach</label>
              <input
                type="text"
                v-model="newCustomActionForm.range"
                placeholder="e.g. 5 ft., 30 ft., Self, Touch"
                class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <!-- Attack / DC Box -->
          <div class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
            <div class="font-semibold text-gray-800">Attack Roll & Save DC</div>
            <div class="flex items-center gap-4 flex-wrap">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="newCustomActionForm.hasAttack" class="rounded text-gray-900" />
                <span class="text-gray-700">Has Attack Roll</span>
              </label>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="newCustomActionForm.hasDc" class="rounded text-gray-900" />
                <span class="text-gray-700">Has Saving Throw DC</span>
              </label>
            </div>

            <div v-if="newCustomActionForm.hasAttack" class="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Attack Stat Mod</label>
                <select
                  v-model="newCustomActionForm.attackAbility"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 uppercase"
                >
                  <option value="str">STR</option>
                  <option value="dex">DEX</option>
                  <option value="con">CON</option>
                  <option value="int">INT</option>
                  <option value="wis">WIS</option>
                  <option value="cha">CHA</option>
                  <option value="none">Flat Bonus Only</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Bonus Attack Modifier</label>
                <input
                  type="number"
                  v-model.number="newCustomActionForm.attackBonusFlat"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
            </div>

            <div v-if="newCustomActionForm.hasDc" class="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Save Ability</label>
                <select
                  v-model="newCustomActionForm.dcAbility"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 uppercase"
                >
                  <option value="str">STR</option>
                  <option value="dex">DEX</option>
                  <option value="con">CON</option>
                  <option value="int">INT</option>
                  <option value="wis">WIS</option>
                  <option value="cha">CHA</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Base DC (8 + PB + Ability)</label>
                <input
                  type="number"
                  v-model.number="newCustomActionForm.dcBase"
                  placeholder="8"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
            </div>
          </div>

          <!-- Damage Box -->
          <div class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-gray-800">Damage</span>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="newCustomActionForm.hasDamage" class="rounded text-gray-900" />
                <span class="text-gray-700">Deals Damage</span>
              </label>
            </div>
            <div v-if="newCustomActionForm.hasDamage" class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Dice Formula</label>
                <input
                  type="text"
                  v-model="newCustomActionForm.damageDice"
                  placeholder="e.g. 1d8, 2d6"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Ability Mod</label>
                <select
                  v-model="newCustomActionForm.damageAbility"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 uppercase"
                >
                  <option value="str">STR</option>
                  <option value="dex">DEX</option>
                  <option value="con">CON</option>
                  <option value="int">INT</option>
                  <option value="wis">WIS</option>
                  <option value="cha">CHA</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
                <input
                  type="text"
                  v-model="newCustomActionForm.damageType"
                  placeholder="e.g. fire, slashing"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
            </div>
          </div>

          <!-- Limited Resource Box -->
          <div class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-gray-800">Limited Uses & Tracker</span>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="newCustomActionForm.hasResource" class="rounded text-gray-900" />
                <span class="text-gray-700">Track Uses</span>
              </label>
            </div>
            <div v-if="newCustomActionForm.hasResource" class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  v-model.number="newCustomActionForm.resourceMax"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Recharge On</label>
                <select
                  v-model="newCustomActionForm.resourceRecharge"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                >
                  <option value="short">Short Rest</option>
                  <option value="long">Long Rest</option>
                  <option value="day">Daily / Dawn</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Notes / Description -->
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Notes / Description</label>
            <textarea
              v-model="newCustomActionForm.notes"
              rows="2"
              placeholder="Effect details, trigger condition, etc."
              class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              @click="emit('closeAction')"
              class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Save Action
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Skill Modal -->
    <div v-if="showSkillModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-sm w-full p-5 space-y-3.5">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Add Custom Skill</h3>
          <button type="button" @click="emit('closeSkill')" class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer">×</button>
        </div>

        <form @submit.prevent="emit('saveSkill')" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Skill Name *</label>
            <input
              type="text"
              v-model="newCustomSkillForm.name"
              required
              placeholder="e.g. Lore: Dragons, Alchemy, Streetwise"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block font-semibold text-gray-700 mb-1">Governing Ability</label>
            <select
              v-model="newCustomSkillForm.ability"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900 capitalize"
            >
              <option value="str">Strength (STR)</option>
              <option value="dex">Dexterity (DEX)</option>
              <option value="con">Constitution (CON)</option>
              <option value="int">Intelligence (INT)</option>
              <option value="wis">Wisdom (WIS)</option>
              <option value="cha">Charisma (CHA)</option>
            </select>
          </div>

          <div class="flex items-center gap-4 pt-1">
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" v-model="newCustomSkillForm.proficient" class="rounded text-gray-900" />
              <span class="text-gray-700">Proficient (+PB)</span>
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" v-model="newCustomSkillForm.expertise" class="rounded text-gray-900" />
              <span class="text-gray-700">Expertise (2x PB)</span>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              @click="emit('closeSkill')"
              class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Add Skill
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Item Modal -->
    <div v-if="showItemModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-3.5">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Create Custom Item</h3>
          <button type="button" @click="emit('closeItem')" class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer">×</button>
        </div>

        <form @submit.prevent="emit('saveItem')" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              v-model="newCustomItemForm.name"
              required
              placeholder="e.g. Ring of Warmth, Vorpal Sword, Elixir"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Type</label>
              <select
                v-model="newCustomItemForm.item_type"
                class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900 capitalize"
              >
                <option value="gear">Adventuring Gear</option>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="potion">Potion</option>
                <option value="scroll">Scroll</option>
                <option value="wondrous item">Wondrous Item</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Weight (lb)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                v-model.number="newCustomItemForm.weight"
                class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                v-model.number="newCustomItemForm.amount"
                class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <div v-if="newCustomItemForm.item_type === 'weapon'" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
            <div class="font-semibold text-gray-800">Weapon Details</div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Dice</label>
                <input
                  type="text"
                  v-model="newCustomItemForm.damage_dice"
                  placeholder="e.g. 1d8"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
                <input
                  type="text"
                  v-model="newCustomItemForm.damage_type"
                  placeholder="e.g. slashing"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Range</label>
                <input
                  type="text"
                  v-model="newCustomItemForm.range"
                  placeholder="e.g. 5 ft."
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
            </div>
          </div>

          <div v-if="newCustomItemForm.item_type === 'armor'" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
            <div class="font-semibold text-gray-800">Armor Details</div>
            <div class="grid grid-cols-2 gap-2 items-center">
              <div>
                <label class="block text-[11px] text-gray-600 mb-0.5">Base AC</label>
                <input
                  type="number"
                  min="0"
                  v-model.number="newCustomItemForm.base_ac"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                />
              </div>
              <div class="pt-3">
                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="newCustomItemForm.dexMod" class="rounded text-gray-900" />
                  <span class="text-gray-700">Add DEX Modifier</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-gray-700 mb-1">Status</label>
            <select
              v-model="newCustomItemForm.status"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            >
              <option value="inventory">In Inventory</option>
              <option value="equipped">Equipped</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              @click="emit('closeItem')"
              class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
