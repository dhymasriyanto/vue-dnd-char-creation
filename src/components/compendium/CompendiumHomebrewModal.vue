<script setup>
import { IconX } from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  homebrewCategory: {
    type: String,
    default: 'spell'
  },
  homebrewForm: {
    type: Object,
    required: true
  },
  homebrewError: {
    type: String,
    default: ''
  },
  isSavingHomebrew: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:show',
  'update:homebrewCategory',
  'submit'
])
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
  >
    <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-xl w-full p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
      <div class="flex items-center justify-between pb-2 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-gray-900 text-sm">Create Homebrew Entry</h3>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Custom</span>
        </div>
        <button
          type="button"
          @click="emit('update:show', false)"
          class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="emit('submit')" class="space-y-3">
        <!-- Category Selector -->
        <div>
          <label class="block font-semibold text-gray-700 mb-1">Category *</label>
          <select
            :value="homebrewCategory"
            @change="emit('update:homebrewCategory', $event.target.value)"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900 capitalize"
          >
            <option value="spell">Spell</option>
            <option value="item">Item / Equipment</option>
            <option value="monster">Monster / Creature</option>
            <option value="feat">Feat</option>
            <option value="subclass">Subclass</option>
            <option value="subrace">Subrace / Lineage</option>
          </select>
        </div>

        <!-- Name -->
        <div>
          <label class="block font-semibold text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            v-model="homebrewForm.name"
            required
            placeholder="e.g. Eldritch Blade, Vorpal Greatsword, Dire Drake"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
          />
        </div>

        <!-- SPELL Fields -->
        <div v-if="homebrewCategory === 'spell'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Spell Attributes</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Level</label>
              <select v-model.number="homebrewForm.level" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                <option :value="0">Cantrip (0)</option>
                <option v-for="l in 9" :key="l" :value="l">Level {{ l }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">School</label>
              <select v-model="homebrewForm.school" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                <option value="abjuration">Abjuration</option>
                <option value="conjuration">Conjuration</option>
                <option value="divination">Divination</option>
                <option value="enchantment">Enchantment</option>
                <option value="evocation">Evocation</option>
                <option value="illusion">Illusion</option>
                <option value="necromancy">Necromancy</option>
                <option value="transmutation">Transmutation</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Casting Time</label>
              <input type="text" v-model="homebrewForm.casting_time" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Range</label>
              <input type="text" v-model="homebrewForm.range" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Components</label>
              <input type="text" v-model="homebrewForm.components" placeholder="V, S" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Duration</label>
              <input type="text" v-model="homebrewForm.duration" placeholder="Instantaneous" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Damage Dice</label>
              <input type="text" v-model="homebrewForm.damage_dice" placeholder="e.g. 2d8" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
              <input type="text" v-model="homebrewForm.damage_type" placeholder="e.g. fire" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Save Ability</label>
              <select v-model="homebrewForm.save_ability" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs uppercase">
                <option value="">None</option>
                <option value="str">STR</option>
                <option value="dex">DEX</option>
                <option value="con">CON</option>
                <option value="int">INT</option>
                <option value="wis">WIS</option>
                <option value="cha">CHA</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Classes (comma separated)</label>
              <input type="text" v-model="homebrewForm.classes" placeholder="Wizard, Sorcerer" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div class="flex items-center gap-4 pt-1">
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" v-model="homebrewForm.concentration" class="rounded text-gray-900" />
              <span>Concentration</span>
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" v-model="homebrewForm.ritual" class="rounded text-gray-900" />
              <span>Ritual</span>
            </label>
          </div>
        </div>

        <!-- ITEM Fields -->
        <div v-if="homebrewCategory === 'item'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Item Attributes</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Type</label>
              <select v-model="homebrewForm.item_type" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                <option value="gear">Gear</option>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="potion">Potion</option>
                <option value="scroll">Scroll</option>
                <option value="ring">Ring</option>
                <option value="rod">Rod</option>
                <option value="staff">Staff</option>
                <option value="wand">Wand</option>
                <option value="wondrous item">Wondrous Item</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Rarity</label>
              <select v-model="homebrewForm.rarity" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                <option value="none">None / Common</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="very rare">Very Rare</option>
                <option value="legendary">Legendary</option>
                <option value="artifact">Artifact</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Weight (lb)</label>
              <input type="text" v-model="homebrewForm.weight" placeholder="1" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Cost (CP)</label>
              <input type="number" min="0" v-model.number="homebrewForm.cost_cp" placeholder="100" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div v-if="homebrewForm.item_type === 'weapon'" class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Damage Dice</label>
              <input type="text" v-model="homebrewForm.damage_dice" placeholder="e.g. 1d8" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Damage Type</label>
              <input type="text" v-model="homebrewForm.damage_type" placeholder="e.g. slashing" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div v-if="homebrewForm.item_type === 'armor'" class="grid grid-cols-2 gap-2 items-center">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Base AC</label>
              <input type="number" min="0" v-model.number="homebrewForm.base_ac" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div class="pt-3">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="homebrewForm.ac_dex_bonus" class="rounded text-gray-900" />
                <span>DEX Bonus to AC</span>
              </label>
            </div>
          </div>
        </div>

        <!-- MONSTER Fields -->
        <div v-if="homebrewCategory === 'monster'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Monster Stats</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">CR</label>
              <input type="text" v-model="homebrewForm.cr" placeholder="1" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Size</label>
              <select v-model="homebrewForm.size" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                <option value="T">Tiny (T)</option>
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="H">Huge (H)</option>
                <option value="G">Gargantuan (G)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Type</label>
              <input type="text" v-model="homebrewForm.type" placeholder="humanoid, beast" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Alignment</label>
              <input type="text" v-model="homebrewForm.alignment" placeholder="neutral" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Armor Class (AC)</label>
              <input type="number" min="0" v-model.number="homebrewForm.ac" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Hit Points (HP)</label>
              <input type="number" min="1" v-model.number="homebrewForm.hp" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Speed (ft)</label>
              <input type="number" min="0" step="5" v-model.number="homebrewForm.speed" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <!-- Ability Scores 6-grid -->
          <div>
            <span class="block text-[11px] text-gray-600 mb-1">Ability Scores</span>
            <div class="grid grid-cols-6 gap-1 text-center font-mono">
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">STR</span>
                <input type="number" v-model.number="homebrewForm.str" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">DEX</span>
                <input type="number" v-model.number="homebrewForm.dex" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">CON</span>
                <input type="number" v-model.number="homebrewForm.con" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">INT</span>
                <input type="number" v-model.number="homebrewForm.int" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">WIS</span>
                <input type="number" v-model.number="homebrewForm.wis" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
              <div>
                <span class="block text-[9px] uppercase font-bold text-gray-500">CHA</span>
                <input type="number" v-model.number="homebrewForm.cha" class="w-full bg-white border border-gray-300 rounded p-1 text-center text-xs" />
              </div>
            </div>
          </div>
        </div>

        <!-- FEAT Fields -->
        <div v-if="homebrewCategory === 'feat'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Feat Details</div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Category</label>
              <select v-model="homebrewForm.category" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                <option value="G">General Feat</option>
                <option value="O">Origin Feat</option>
                <option value="FS">Fighting Style Feat</option>
                <option value="EB">Epic Boon Feat</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Prerequisite</label>
              <input type="text" v-model="homebrewForm.prerequisite" placeholder="e.g. Level 4+, Strength 13" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <div>
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" v-model="homebrewForm.repeatable" class="rounded text-gray-900" />
              <span>Repeatable Feat</span>
            </label>
          </div>
        </div>

        <!-- SUBCLASS Fields -->
        <div v-if="homebrewCategory === 'subclass'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Subclass Details</div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Parent Class *</label>
              <select v-model="homebrewForm.class_name" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs capitalize">
                <option value="Barbarian">Barbarian</option>
                <option value="Bard">Bard</option>
                <option value="Cleric">Cleric</option>
                <option value="Druid">Druid</option>
                <option value="Fighter">Fighter</option>
                <option value="Monk">Monk</option>
                <option value="Paladin">Paladin</option>
                <option value="Ranger">Ranger</option>
                <option value="Rogue">Rogue</option>
                <option value="Sorcerer">Sorcerer</option>
                <option value="Warlock">Warlock</option>
                <option value="Wizard">Wizard</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Spellcasting Ability (if any)</label>
              <select v-model="homebrewForm.spellcasting_ability" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs uppercase">
                <option value="">None</option>
                <option value="int">INT</option>
                <option value="wis">WIS</option>
                <option value="cha">CHA</option>
              </select>
            </div>
          </div>
        </div>

        <!-- SUBRACE Fields -->
        <div v-if="homebrewCategory === 'subrace'" class="space-y-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
          <div class="font-semibold text-gray-800 border-b border-gray-200 pb-1">Subrace / Lineage Details</div>
          <div>
            <label class="block text-[11px] text-gray-600 mb-0.5">Parent Species / Race *</label>
            <input type="text" v-model="homebrewForm.race_name" placeholder="e.g. Elf, Dwarf, Human" class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs" />
          </div>
        </div>

        <!-- Common Description / Rules Text -->
        <div>
          <label class="block font-semibold text-gray-700 mb-1">Description / Rules Text</label>
          <textarea
            v-model="homebrewForm.entries"
            rows="4"
            placeholder="Full description, traits, features, or background lore..."
            class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
          ></textarea>
        </div>

        <div v-if="homebrewError" class="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {{ homebrewError }}
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="emit('update:show', false)"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSavingHomebrew"
            class="px-4 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs"
          >
            {{ isSavingHomebrew ? 'Saving...' : 'Save Homebrew' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
