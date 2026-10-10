<script setup>
import {
  IconPlus,
  IconTrash
} from '@tabler/icons-vue'
import { renderAnnotatedText, format5eEntries } from '../../../utils/textRenderer'

defineProps({
  char: { type: Object, required: true },
  vtt: { type: Object, default: () => ({}) },
  isReadOnly: { type: Boolean, default: false },
  monkLevel: { type: Number, default: 0 },
  unarmedStrikeDetails: { type: Object, default: () => ({}) },
  bonusActionSpells: { type: Array, default: () => [] },
  expandedSpells: { type: Object, default: () => ({}) },
  charSpellAttackBonus: { type: [Number, String], default: 0 },
  charCasterMod: { type: [Number, String], default: 0 },
  allSpellLevels: { type: Array, default: () => [] },
  hasCharClass: { type: Function, required: true },
  getCharClassLevel: { type: Function, required: true },
  isClassStateActive: { type: Function, required: true },
  rageBonusDamage: { type: [Number, String], default: 2 },
  getResourceAvailable: { type: Function, required: true },
  getResourceSpent: { type: Function, required: true },
  isResourceSlotExpended: { type: Function, required: true },
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
  automatedFeatureActions: { type: Array, default: () => [] },
  expandedAutoActions: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'open-add-custom-action',
  'roll-dice',
  'roll-formula',
  'toggle-class-state',
  'activate-second-wind',
  'activate-monk-ki-action',
  'activate-uncanny-metabolism',
  'activate-channel-divinity',
  'roll-divine-smite',
  'show-toast',
  'toggle-spell',
  'toggle-feat-free-cast',
  'cast-spell',
  'roll-custom-action-attack',
  'roll-custom-action-damage',
  'spend-custom-action',
  'restore-custom-action-use',
  'delete-custom-action',
  'toggle-auto-action',
  'toggle-resource-slot',
  'spend-resource',
  'restore-resource'
])
</script>

<template>
  <div class="space-y-2 pt-2 border-t border-gray-200">
    <div class="flex items-center justify-between pb-1 border-b border-gray-200">
      <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
        Bonus Actions
      </h3>
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-add-custom-action', 'bonus')"
        class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
      >
        <IconPlus class="w-3 h-3" />
        <span>Custom Bonus Action</span>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <!-- Two-Weapon Off-Hand Attack -->
      <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div>
          <span class="font-bold text-gray-900 text-xs">Two-Weapon Off-Hand Attack</span>
          <p class="text-[10px] text-gray-500">Attack with second light melee weapon (no ability mod to damage)</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('roll-dice', 'Off-Hand Attack', vtt.proficiency_bonus || 2)"
          class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
        >
          Roll Off-Hand
        </button>
        <span
          v-else
          class="px-2 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded font-semibold text-[10px] select-none shrink-0 font-mono"
        >
          Off-Hand
        </span>
      </div>

      <!-- Barbarian Rage -->
      <div v-if="hasCharClass('barbarian')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-gray-900 text-xs">Rage</span>
            <span
              v-if="isClassStateActive('barb_rage')"
              class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse"
            >
              ACTIVE (+{{ rageBonusDamage }} DMG)
            </span>
          </div>
          <p class="text-[10px] text-gray-500">Bonus Damage +{{ rageBonusDamage }} · Adv on STR Checks/Saves · B/P/S Resistance</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('toggle-class-state', 'barb_rage', 'barb_rage')"
          class="px-2.5 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
          :class="isClassStateActive('barb_rage') ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs' : 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800'"
        >
          {{ isClassStateActive('barb_rage') ? 'End Rage' : 'Enter Rage' }}
        </button>
      </div>

      <!-- Second Wind (if Fighter) -->
      <div v-if="hasCharClass('fighter')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-gray-900 text-xs">Second Wind</span>
            <span class="text-[9px] font-mono text-gray-500">
              ({{ getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) }} left)
            </span>
          </div>
          <p class="text-[10px] text-gray-500">Regain 1d10 + {{ getCharClassLevel('fighter') }} HP as a Bonus Action</p>
        </div>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('activate-second-wind')"
          :disabled="getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) <= 0"
          class="px-2 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
          :class="getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) > 0 ? 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
        >
          Heal (1d10+{{ getCharClassLevel('fighter') }})
        </button>
      </div>

      <!-- Rogue Cunning Action -->
      <div v-if="hasCharClass('rogue') && getCharClassLevel('rogue') >= 2" class="p-2 bg-gray-50 border border-gray-200 rounded">
        <span class="font-bold text-gray-900 text-xs">Cunning Action</span>
        <p class="text-[10px] text-gray-500 mt-0.5">Take Dash, Disengage, or Hide action as a Bonus Action.</p>
      </div>

      <!-- Monk Bonus Actions -->
      <template v-if="monkLevel >= 1">
        <!-- Bonus Unarmed Strike (Level 1+) -->
        <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
          <div>
            <span class="font-bold text-gray-900 text-xs">Bonus Unarmed Strike</span>
            <p class="text-[10px] text-gray-500">Make 1 Unarmed Strike as a Bonus Action (Martial Arts)</p>
          </div>
          <button
            v-if="!isReadOnly"
            type="button"
            @click="emit('roll-dice', 'Bonus Unarmed Strike', unarmedStrikeDetails.toHit)"
            class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
          >
            Strike {{ unarmedStrikeDetails.toHit >= 0 ? '+' : '' }}{{ unarmedStrikeDetails.toHit }} ({{ unarmedStrikeDetails.damageDice }})
          </button>
          <span
            v-else
            class="px-2 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded font-semibold text-[10px] select-none shrink-0 font-mono"
          >
            Strike {{ unarmedStrikeDetails.toHit >= 0 ? '+' : '' }}{{ unarmedStrikeDetails.toHit }} ({{ unarmedStrikeDetails.damageDice }})
          </span>
        </div>

        <!-- Ki / Focus Options (Level 2+) -->
        <template v-if="monkLevel >= 2">
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Flurry of Blows</span>
              <p class="text-[10px] text-gray-500">Make 2 Unarmed Strikes as a Bonus Action (Costs 1 Focus/Ki)</p>
            </div>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="emit('activate-monk-ki-action', 'Flurry of Blows', 1)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Flurry (1 Ki)
            </button>
          </div>
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Patient Defense</span>
              <p class="text-[10px] text-gray-500">{{ (char.edition || '2024') === '2024' ? 'Disengage (Free) or spend 1 Focus to Disengage AND Dodge' : 'Take Dodge action as a Bonus Action (Costs 1 Ki)' }}</p>
            </div>
            <div v-if="!isReadOnly" class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="(char.edition || '2024') === '2024'"
                type="button"
                @click="emit('show-toast', 'Patient Defense: Disengage activated (Free)!')"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
              >
                Disengage
              </button>
              <button
                type="button"
                @click="emit('activate-monk-ki-action', 'Patient Defense', 1)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
              >
                Dodge (1 Ki)
              </button>
            </div>
          </div>
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Step of the Wind</span>
              <p class="text-[10px] text-gray-500">{{ (char.edition || '2024') === '2024' ? 'Dash (Free) or spend 1 Focus to Dash AND Disengage, double jump' : 'Disengage & Dash, jump distance doubled (Costs 1 Ki)' }}</p>
            </div>
            <div v-if="!isReadOnly" class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="(char.edition || '2024') === '2024'"
                type="button"
                @click="emit('show-toast', 'Step of the Wind: Dash activated (Free)!')"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
              >
                Dash
              </button>
              <button
                type="button"
                @click="emit('activate-monk-ki-action', 'Step of the Wind', 1)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
              >
                Dash+Disengage (1 Ki)
              </button>
            </div>
          </div>
        </template>
      </template>

      <!-- Paladin Divine Smite (2024 Bonus Action) -->
      <div v-if="hasCharClass('paladin') && getCharClassLevel('paladin') >= 2" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div>
          <span class="font-bold text-gray-900 text-xs">Divine Smite</span>
          <p class="text-[10px] text-gray-500">Expend a spell slot to deal extra radiant damage immediately after a hit.</p>
        </div>
        <div v-if="!isReadOnly" class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            @click="emit('roll-divine-smite', 1)"
            class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
          >
            Lvl 1 (2d8)
          </button>
          <button
            type="button"
            @click="emit('roll-divine-smite', 2)"
            class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
          >
            Lvl 2 (3d8)
          </button>
        </div>
      </div>
    </div>

    <!-- Bonus Action Spells Grid -->
    <div v-if="bonusActionSpells.length > 0" class="space-y-2 pt-2 border-t border-gray-200">
      <div class="flex items-center justify-between pb-1 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Bonus Action Spells
          </h3>
          <span class="text-[10px] bg-gray-900 text-white px-1.5 py-0.2 rounded font-semibold font-mono">
            {{ bonusActionSpells.length }}
          </span>
        </div>
        <span class="text-[10px] text-gray-500">1 Bonus Action</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="sp in bonusActionSpells"
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

          <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-200">
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

    <!-- Custom Bonus Actions -->
    <div v-if="getCustomActionsByType('bonus').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Bonus Actions</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in getCustomActionsByType('bonus')"
          :key="act.id"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-1.5 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold bg-gray-200 text-gray-700 font-mono">Bonus Action</span>
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

    <!-- Automated Feature Actions (Bonus) -->
    <div v-if="automatedFeatureActions.filter(a => a.actionType === 'bonus').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Features & Feats (Bonus Action)</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in automatedFeatureActions.filter(a => a.actionType === 'bonus')"
          :key="act.id"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-1.5 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 text-gray-700 font-mono">Bonus</span>
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
                    @click="emit('toggle-resource-slot', { id: act.id, max: act.max }, idx)"
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
                @click="emit('restore-resource', act.id, 1)"
                :disabled="getResourceSpent(act.id) <= 0"
                class="px-1.5 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 text-[9px] font-bold cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                @click="emit('spend-resource', act.id, 1)"
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
