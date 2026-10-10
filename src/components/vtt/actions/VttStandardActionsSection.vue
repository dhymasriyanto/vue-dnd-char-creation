<script setup>
import {
  IconPlus,
  IconTrash
} from '@tabler/icons-vue'
import { renderAnnotatedText, format5eEntries } from '../../../utils/textRenderer'

defineProps({
  char: { type: Object, required: true },
  isReadOnly: { type: Boolean, default: false },
  computedSkills: { type: Object, default: () => ({}) },
  featActionSpells: { type: Array, default: () => [] },
  expandedSpells: { type: Object, default: () => ({}) },
  charSpellAttackBonus: { type: [Number, String], default: 0 },
  charCasterMod: { type: [Number, String], default: 0 },
  charProfBonus: { type: [Number, String], default: 2 },
  allSpellLevels: { type: Array, default: () => [] },
  hasCharClass: { type: Function, required: true },
  getCharClassLevel: { type: Function, required: true },
  isResourceSlotExpended: { type: Function, required: true },
  getResourceAvailable: { type: Function, required: true },
  getResourceSpent: { type: Function, required: true },
  getCustomActionsByType: { type: Function, required: true },
  getCustomActionAvailable: { type: Function, required: true },
  getCustomActionSpent: { type: Function, required: true },
  getCustomActionAttackBonus: { type: Function, required: true },
  getCustomActionDamageLabel: { type: Function, required: true },
  getFeatName: { type: Function, required: true },
  isFeatSpell: { type: Function, required: true },
  getSpellRange: { type: Function, required: true },
  isFeatCastExpended: { type: Function, required: true },
  extractSpellMechanics: { type: Function, required: true },
  getSpellEntries: { type: Function, required: true },
  getAvailableSlots: { type: Function, required: true },
  formatSpellEntry: { type: Function, required: true },
  toggleResourceSlot: { type: Function, required: true },
  spendResource: { type: Function, required: true },
  restoreResource: { type: Function, required: true },
  automatedFeatureActions: { type: Array, default: () => [] },
  expandedAutoActions: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'open-add-custom-action',
  'roll-dice',
  'roll-formula',
  'toggle-spell',
  'toggle-feat-free-cast',
  'cast-spell',
  'roll-custom-action-attack',
  'roll-custom-action-damage',
  'spend-custom-action',
  'restore-custom-action-use',
  'delete-custom-action',
  'toggle-auto-action',
  'activate-action-surge',
  'activate-channel-divinity',
  'activate-lay-on-hands'
])
</script>

<template>
  <div class="space-y-2 pt-2 border-t border-gray-200">
    <div class="flex items-center justify-between pb-1 border-b border-gray-200">
      <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
        Actions in Combat
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-gray-500 hidden sm:inline">Standard & Custom Actions</span>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('open-add-custom-action', 'action')"
          class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
        >
          <IconPlus class="w-3 h-3" />
          <span>Custom Action</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
      <!-- Attack -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Attack</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make 1 or more weapon or unarmed attacks (Extra Attack applies).</p>
      </div>

      <!-- Dash -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Dash</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Gain extra movement equal to your speed ({{ char.speed || 30 }} ft.) for the turn.</p>
      </div>

      <!-- Disengage -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Disengage</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Your movement does not provoke opportunity attacks for the rest of this turn.</p>
      </div>

      <!-- Dodge -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Dodge</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attacks against you have Disadvantage; you make DEX saves with Advantage.</p>
      </div>

      <!-- Grapple -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Grapple</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use an attack to seize a creature within reach using 1 free hand.</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('roll-dice', 'Grapple Check (Athletics)', computedSkills.athletics?.total || 0)"
          class="text-left text-[10px] font-mono text-gray-900 hover:underline cursor-pointer"
        >
          Roll Athletics ({{ computedSkills.athletics?.modifier_string || '+0' }})
        </button>
        <span
          v-else
          class="text-left text-[10px] font-mono text-gray-600 select-none"
        >
          Athletics ({{ computedSkills.athletics?.modifier_string || '+0' }})
        </span>
      </div>

      <!-- Help -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Help</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Give an ally Advantage on their next ability check or attack roll before your next turn.</p>
      </div>

      <!-- Hide -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Hide</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make a Dexterity (Stealth) check to conceal yourself (DC 15 in 2024 rules).</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('roll-dice', 'Stealth Check (Hide)', computedSkills.stealth?.total || 0)"
          class="text-left text-[10px] font-mono text-gray-900 hover:underline cursor-pointer"
        >
          Roll Stealth ({{ computedSkills.stealth?.modifier_string || '+0' }})
        </button>
        <span
          v-else
          class="text-left text-[10px] font-mono text-gray-600 select-none"
        >
          Stealth ({{ computedSkills.stealth?.modifier_string || '+0' }})
        </span>
      </div>

      <!-- Ready -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Ready</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Choose a trigger and an action or movement to take as a Reaction.</p>
      </div>

      <!-- Search -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Search</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Devote your attention to finding something (Perception, Investigation, Survival).</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5 flex-wrap text-[10px]">
          <button type="button" @click="emit('roll-dice', 'Perception Check', computedSkills.perception?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Perception ({{ computedSkills.perception?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'Investigation Check', computedSkills.investigation?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Investigation ({{ computedSkills.investigation?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'Survival Check', computedSkills.survival?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Survival ({{ computedSkills.survival?.modifier_string || '+0' }})
          </button>
        </div>
        <div v-else class="flex items-center gap-1.5 flex-wrap text-[10px] select-none text-gray-700">
          <span>Perception ({{ computedSkills.perception?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>Investigation ({{ computedSkills.investigation?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>Survival ({{ computedSkills.survival?.modifier_string || '+0' }})</span>
        </div>
      </div>

      <!-- Shove -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Shove</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Push a creature 5 ft. away or knock it Prone (uses 1 attack).</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('roll-dice', 'Shove Check (Athletics)', computedSkills.athletics?.total || 0)"
          class="text-left text-[10px] font-mono text-gray-900 hover:underline cursor-pointer"
        >
          Roll Athletics ({{ computedSkills.athletics?.modifier_string || '+0' }})
        </button>
      </div>

      <!-- Improvise -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Improvise</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Do something not covered by other actions, adjudicated by the DM.</p>
      </div>

      <!-- Influence (2024 rules) -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Influence</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Persuade, deceive, or intimidate a monster to change its attitude.</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5 text-[10px]">
          <button type="button" @click="emit('roll-dice', 'Persuasion Check', computedSkills.persuasion?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Persuasion ({{ computedSkills.persuasion?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'Deception Check', computedSkills.deception?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Deception ({{ computedSkills.deception?.modifier_string || '+0' }})
          </button>
        </div>
        <div v-else class="flex items-center gap-1.5 text-[10px] select-none text-gray-700">
          <span>Persuasion ({{ computedSkills.persuasion?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>Deception ({{ computedSkills.deception?.modifier_string || '+0' }})</span>
        </div>
      </div>

      <!-- Magic Action (2024 rules) -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Magic</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Cast a spell that has a casting time of 1 Action, or use a magic item.</p>
        </div>
        <button
          v-if="!isReadOnly && (char.spells?.length > 0 || char.spell?.length > 0)"
          type="button"
          @click="emit('roll-dice', 'Spell Attack', charSpellAttackBonus)"
          class="text-left text-[10px] font-mono text-gray-900 hover:underline cursor-pointer"
        >
          Spell Attack (+{{ charSpellAttackBonus }})
        </button>
        <span
          v-else-if="(char.spells?.length > 0 || char.spell?.length > 0)"
          class="text-left text-[10px] font-mono text-gray-600 select-none"
        >
          Spell Attack (+{{ charSpellAttackBonus }})
        </span>
      </div>

      <!-- Study (2024 rules) -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900">Study</div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Recall lore about a creature or area (Arcana, History, Nature, Religion).</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5 flex-wrap text-[10px]">
          <button type="button" @click="emit('roll-dice', 'Arcana Check', computedSkills.arcana?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Arcana ({{ computedSkills.arcana?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'History Check', computedSkills.history?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            History ({{ computedSkills.history?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'Nature Check', computedSkills.nature?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Nature ({{ computedSkills.nature?.modifier_string || '+0' }})
          </button>
          <span>·</span>
          <button type="button" @click="emit('roll-dice', 'Religion Check', computedSkills.religion?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Religion ({{ computedSkills.religion?.modifier_string || '+0' }})
          </button>
        </div>
        <div v-else class="flex items-center gap-1.5 flex-wrap text-[10px] select-none text-gray-700">
          <span>Arcana ({{ computedSkills.arcana?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>History ({{ computedSkills.history?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>Nature ({{ computedSkills.nature?.modifier_string || '+0' }})</span>
          <span>·</span>
          <span>Religion ({{ computedSkills.religion?.modifier_string || '+0' }})</span>
        </div>
      </div>

      <!-- Utilize (2024 rules) -->
      <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
        <div class="font-bold text-gray-900">Utilize</div>
        <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use a nonmagical object that requires an Action (e.g., drink a potion, open a stuck door).</p>
      </div>

      <!-- Fighter: Action Surge -->
      <div v-if="hasCharClass('fighter') && getCharClassLevel('fighter') >= 2" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900 flex items-center justify-between">
            <span>Action Surge</span>
            <span class="text-[9px] font-mono text-gray-500">
              {{ getResourceAvailable({ id: 'fighter_action_surge', max: getCharClassLevel('fighter') >= 17 ? 2 : 1 }) }} / {{ getCharClassLevel('fighter') >= 17 ? 2 : 1 }}
            </span>
          </div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Take 1 additional Action on your turn. (Recharges on Short/Long Rest).</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('activate-action-surge')"
          :disabled="getResourceAvailable({ id: 'fighter_action_surge', max: getCharClassLevel('fighter') >= 17 ? 2 : 1 }) <= 0"
          class="w-full py-1 rounded bg-gray-900 hover:bg-black text-white text-[10px] font-bold cursor-pointer disabled:opacity-40 transition"
        >
          Use Action Surge
        </button>
      </div>

      <!-- Cleric / Paladin: Channel Divinity (Action) -->
      <div v-if="(hasCharClass('cleric') && getCharClassLevel('cleric') >= 2) || (hasCharClass('paladin') && getCharClassLevel('paladin') >= 3)" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900 flex items-center justify-between">
            <span>Channel Divinity</span>
            <span class="text-[9px] font-mono text-gray-500">
              {{ getResourceAvailable({ id: hasCharClass('cleric') ? 'cleric_channel_divinity' : 'paladin_channel_divinity', max: 2 }) }}
            </span>
          </div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Turn Undead, Divine Spark, Harness Divine Power, Sacred Weapon.</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5 flex-wrap text-[10px]">
          <button
            type="button"
            @click="emit('activate-channel-divinity', 'Turn Undead')"
            class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
          >
            Turn Undead
          </button>
          <button
            type="button"
            @click="emit('activate-channel-divinity', 'Divine Spark')"
            class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
          >
            Divine Spark
          </button>
          <button
            type="button"
            @click="emit('activate-channel-divinity', 'Harness Divine Power')"
            class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
          >
            Harness Power
          </button>
        </div>
      </div>

      <!-- Paladin: Lay on Hands (Action in 2014) -->
      <div v-if="hasCharClass('paladin')" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
        <div>
          <div class="font-bold text-gray-900 flex items-center justify-between">
            <span>Lay on Hands</span>
            <span class="text-[9px] font-mono text-gray-500">
              Pool: {{ getResourceAvailable({ id: 'paladin_lay_on_hands', max: getCharClassLevel('paladin') * 5 }) }} HP
            </span>
          </div>
          <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Heal creatures from your healing pool. (5 HP can cure disease/poison).</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1.5 flex-wrap text-[10px]">
          <button type="button" @click="emit('activate-lay-on-hands', 5)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Heal 5 HP
          </button>
          <span>·</span>
          <button type="button" @click="emit('activate-lay-on-hands', 10)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">
            Heal 10 HP
          </button>
          <span>·</span>
          <button type="button" @click="emit('activate-lay-on-hands', 5)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer" title="Cure disease or neutralize poison">
            Cure Poison (5 HP)
          </button>
        </div>
      </div>
    </div>

    <!-- Feat Action Spells Grid -->
    <div v-if="featActionSpells.length > 0" class="space-y-2 pt-2 border-t border-gray-200">
      <div class="flex items-center justify-between pb-1 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Action Spells & Cantrips
          </h3>
          <span class="text-[10px] bg-gray-900 text-white px-1.5 py-0.2 rounded font-semibold font-mono">
            {{ featActionSpells.length }}
          </span>
        </div>
        <span class="text-[10px] text-gray-500">1 Action Casting Time</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="sp in featActionSpells"
          :key="sp.id || sp.name"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-1.5 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                <span class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                  {{ isFeatSpell(sp) ? getFeatName(sp) : (sp.source || 'Spell') }}
                </span>
                <span v-if="Number(sp.level) === 0 || sp.is_cantrip" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">Cantrip</span>
                <span v-else class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">Level {{ sp.level }}</span>
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">
                <span>{{ getSpellRange(sp) }}</span>
                <span v-if="Number(sp.level) > 0" class="ml-1 font-mono">
                  · Available Slots: {{ getAvailableSlots(sp.level) }}
                </span>
              </div>
            </div>
            <button
              type="button"
              @click="emit('toggle-spell', sp)"
              class="text-[10px] text-gray-500 hover:text-gray-900 underline cursor-pointer shrink-0"
            >
              {{ expandedSpells[sp.id || sp.name] ? 'Hide' : 'Details' }}
            </button>
          </div>

          <!-- Free cast tracking for Feat spells -->
          <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-200">
            <div v-if="Number(sp.level) > 0 && isFeatSpell(sp)" class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
              <span class="text-gray-500 font-medium">Free Cast (1/Long Rest):</span>
              <button
                v-if="!isReadOnly"
                type="button"
                @click="emit('toggle-feat-free-cast', sp)"
                class="w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                :title="isFeatCastExpended(sp) ? 'Click to restore free cast' : 'Click to spend free cast'"
              >
                <span
                  v-if="!isFeatCastExpended(sp)"
                  class="w-1.5 h-1.5 rounded-full bg-gray-900 pointer-events-none"
                ></span>
              </button>
              <span
                v-else
                class="w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center bg-white"
              >
                <span
                  v-if="!isFeatCastExpended(sp)"
                  class="w-1.5 h-1.5 rounded-full bg-gray-900 pointer-events-none"
                ></span>
              </span>
              <span class="font-mono font-semibold text-gray-800">
                {{ isFeatCastExpended(sp) ? '0/1' : '1/1' }}
              </span>
            </div>

            <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
              <button
                v-if="!isReadOnly"
                type="button"
                @click="emit('roll-dice', `${sp.name} Attack`, charSpellAttackBonus)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono cursor-pointer transition shadow-2xs"
              >
                Atk +{{ charSpellAttackBonus }}
              </button>
              <span v-else class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono">
                Atk +{{ charSpellAttackBonus }}
              </span>
            </template>

            <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
              <button
                v-if="!isReadOnly"
                type="button"
                @click="emit('roll-formula', `${sp.name} Damage/Heal`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula, extractSpellMechanics(sp, char.level, charCasterMod).addModToDice ? charCasterMod : 0)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono cursor-pointer transition shadow-2xs"
              >
                {{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }}
              </button>
              <span v-else class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono">
                {{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }}
              </span>
            </template>

            <template v-if="!isReadOnly && Number(sp.level) > 0">
              <button
                v-if="isFeatSpell(sp)"
                type="button"
                @click="emit('cast-spell', sp, false)"
                :disabled="isFeatCastExpended(sp)"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white font-semibold text-[10px] disabled:opacity-40 cursor-pointer shadow-2xs ml-auto"
              >
                Cast Free
              </button>
              <button
                type="button"
                @click="emit('cast-spell', sp, true)"
                :disabled="getAvailableSlots(sp.level) <= 0"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white font-semibold text-[10px] disabled:opacity-40 cursor-pointer shadow-2xs ml-auto"
              >
                Cast Slot
              </button>
            </template>
            <template v-else-if="!isReadOnly">
              <button
                type="button"
                @click="emit('cast-spell', sp, false)"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white font-semibold text-[10px] cursor-pointer shadow-2xs ml-auto"
              >
                Cast
              </button>
            </template>
          </div>

          <div
            v-if="expandedSpells[sp.id || sp.name]"
            class="pt-1.5 border-t border-gray-100 text-[10px] text-gray-600 space-y-1"
          >
            <div v-if="getSpellEntries(sp).length" class="space-y-1">
              <div
                v-for="(ent, eIdx) in getSpellEntries(sp)"
                :key="eIdx"
                v-html="formatSpellEntry(ent)"
              ></div>
            </div>
            <p v-else class="text-gray-400 italic">No description available.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Actions List -->
    <div v-if="getCustomActionsByType('action').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Actions</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in getCustomActionsByType('action')"
          :key="act.id"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-1.5 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold bg-gray-200 text-gray-700 font-mono">Action</span>
                <span v-if="act.range" class="text-[9px] text-gray-500 font-mono">{{ act.range }}</span>
                <span v-if="act.hasDc" class="text-[9px] font-mono text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                  DC {{ act.dcBase + charProfBonus + (char[act.dcAbility] || 0) }} {{ act.dcAbility.toUpperCase() }}
                </span>
              </div>
              <p v-if="act.notes" class="text-[10px] text-gray-600 mt-0.5 leading-tight">{{ act.notes }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="!isReadOnly && act.hasAttack"
                type="button"
                @click="emit('roll-custom-action-attack', act)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono cursor-pointer transition"
              >
                Atk +{{ getCustomActionAttackBonus(act) }}
              </button>
              <button
                v-if="!isReadOnly && act.hasDamage"
                type="button"
                @click="emit('roll-custom-action-damage', act)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono cursor-pointer transition"
              >
                {{ getCustomActionDamageLabel(act) }}
              </button>
              <button
                v-if="!isReadOnly"
                type="button"
                @click="emit('delete-custom-action', act.id)"
                class="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                title="Delete action"
              >
                <IconTrash class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="act.resource" class="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px]">
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 font-medium">Uses:</span>
              <div class="flex items-center gap-1">
                <span
                  v-for="idx in act.resource.max"
                  :key="idx"
                  class="w-2.5 h-2.5 rounded-full border border-gray-900"
                  :class="idx <= getCustomActionAvailable(act) ? 'bg-gray-900' : 'bg-transparent'"
                ></span>
              </div>
              <span class="font-mono text-gray-700 font-bold ml-1">
                {{ getCustomActionAvailable(act) }} / {{ act.resource.max }}
              </span>
              <span class="text-[9px] text-gray-400 capitalize">({{ act.resource.recharge }} rest)</span>
            </div>
            <div v-if="!isReadOnly" class="flex items-center gap-1">
              <button
                type="button"
                @click="emit('restore-custom-action-use', act.id)"
                :disabled="getCustomActionSpent(act.id) <= 0"
                class="px-1.5 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 text-[9px] font-bold cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                @click="emit('spend-custom-action', act)"
                :disabled="getCustomActionAvailable(act) <= 0"
                class="px-1.5 py-0.5 rounded bg-gray-900 hover:bg-black disabled:opacity-30 text-white text-[9px] font-bold cursor-pointer"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Automated Feature Actions (Action) -->
    <div v-if="automatedFeatureActions.filter(a => a.actionType === 'action').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Features & Feats (Action)</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in automatedFeatureActions.filter(a => a.actionType === 'action')"
          :key="act.id"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-1.5 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 text-gray-700 font-mono">Action</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-100 border border-gray-200 text-gray-600 font-mono uppercase">{{ act.source }}</span>
              </div>
              <p v-if="act.description" class="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2">{{ act.description }}</p>
            </div>
            <button
              v-if="act.entries && act.entries.length"
              type="button"
              @click="emit('toggle-auto-action', act.id)"
              class="text-[10px] text-gray-500 hover:text-gray-900 underline cursor-pointer shrink-0"
            >
              {{ expandedAutoActions[act.id] ? 'Hide' : 'Details' }}
            </button>
          </div>

          <div v-if="act.hasResource" class="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px]">
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 font-medium">Uses:</span>
              <div v-if="act.max <= 8" class="flex items-center gap-1">
                <template v-if="!isReadOnly">
                  <button
                    v-for="idx in act.max"
                    :key="idx"
                    type="button"
                    @click="toggleResourceSlot({ id: act.id, max: act.max }, idx)"
                    class="w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isResourceSlotExpended({ id: act.id, max: act.max }, idx) ? 'Click to restore use' : 'Click to spend use'"
                  >
                    <span
                      v-if="!isResourceSlotExpended({ id: act.id, max: act.max }, idx)"
                      class="w-1.5 h-1.5 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                </template>
                <template v-else>
                  <span
                    v-for="idx in act.max"
                    :key="idx"
                    class="w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center bg-white select-none"
                  >
                    <span
                      v-if="!isResourceSlotExpended({ id: act.id, max: act.max }, idx)"
                      class="w-1.5 h-1.5 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </span>
                </template>
              </div>
              <span class="font-mono text-gray-700 font-bold ml-1 select-none">
                {{ getResourceAvailable({ id: act.id, max: act.max }) }} / {{ act.max }}
              </span>
              <span class="text-[9px] text-gray-400 capitalize">({{ act.recharge }} rest)</span>
            </div>
            <div v-if="!isReadOnly" class="flex items-center gap-1">
              <button
                type="button"
                @click="restoreResource(act.id, 1)"
                :disabled="getResourceSpent(act.id) <= 0"
                class="px-1.5 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 text-[9px] font-bold cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                @click="spendResource(act.id, 1)"
                :disabled="getResourceAvailable({ id: act.id, max: act.max }) <= 0"
                class="px-1.5 py-0.5 rounded bg-gray-900 hover:bg-black disabled:opacity-30 text-white text-[9px] font-bold cursor-pointer"
              >
                Use
              </button>
            </div>
          </div>

          <div
            v-show="expandedAutoActions[act.id]"
            class="p-2 border-t border-gray-200 bg-white text-gray-700 space-y-1 text-[11px] rounded leading-relaxed"
            v-html="renderAnnotatedText(format5eEntries(act.entries))"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
