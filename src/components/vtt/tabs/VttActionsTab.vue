<script setup>
import { ref } from 'vue'
import VttAttacksSection from '../actions/VttAttacksSection.vue'
import VttStandardActionsSection from '../actions/VttStandardActionsSection.vue'
import VttBonusActionsSection from '../actions/VttBonusActionsSection.vue'
import VttReactionsSection from '../actions/VttReactionsSection.vue'
import VttOtherActionsSection from '../actions/VttOtherActionsSection.vue'

const props = defineProps({
  char: { type: Object, required: true },
  vtt: { type: Object, default: () => ({}) },
  isReadOnly: { type: Boolean, default: false },
  classResourceTrackers: { type: Array, default: () => [] },
  classSummary: { type: String, default: '' },
  attackTableEntries: { type: Array, default: () => [] },
  computedSkills: { type: Object, default: () => ({}) },
  featActionSpells: { type: Array, default: () => [] },
  bonusActionSpells: { type: Array, default: () => [] },
  reactionSpells: { type: Array, default: () => [] },
  automatedFeatureActions: { type: Array, default: () => [] },
  unarmedStrikeDetails: { type: Object, default: () => ({}) },
  equippedWeapons: { type: Array, default: () => [] },
  monkLevel: { type: Number, default: 0 },
  monkMartialArtsDie: { type: String, default: '' },
  charSpells: { type: Array, default: () => [] },
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
  isClassStateActive: { type: Function, required: true },
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
  rageBonusDamage: { type: Function, required: true },
  getAbilityMod: { type: Function, required: true },
  toggleResourceSlot: { type: Function, required: true },
  spendResource: { type: Function, required: true },
  restoreResource: { type: Function, required: true },
  toggleClassState: { type: Function, required: true },
  activateSecondWind: { type: Function, required: true },
  rollResourceDie: { type: Function, required: true },
  openAddCustomAction: { type: Function, required: true },
  rollDice: { type: Function, required: true },
  rollFormula: { type: Function, required: true },
  spendCustomAction: { type: Function, required: true },
  deleteCustomAction: { type: Function, required: true },
  activateActionSurge: { type: Function, required: true },
  activateChannelDivinity: { type: Function, required: true },
  activateLayOnHands: { type: Function, required: true },
  showToast: { type: Function, required: true },
  toggleSpell: { type: Function, required: true },
  toggleFeatFreeCast: { type: Function, required: true },
  castSpell: { type: Function, required: true },
  rollCustomActionAttack: { type: Function, required: true },
  rollCustomActionDamage: { type: Function, required: true },
  restoreCustomActionUse: { type: Function, required: true },
  activateMonkKiAction: { type: Function, required: true },
  activateUncannyMetabolism: { type: Function, required: true },
  activateIndomitable: { type: Function, required: true },
  deflectAttacksReaction: { type: Function, required: true },
  rollDivineSmite: { type: Function, default: () => {} },
  selectTab: { type: Function, default: () => {} }
})

const actionSubFilter = ref('all')
const expandedAutoActions = ref({})
const toggleAutoAction = (id) => {
  expandedAutoActions.value[id] = !expandedAutoActions.value[id]
}
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- Action Sub-Filters -->
    <div class="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold border-b border-gray-100">
      <button
        type="button"
        @click="actionSubFilter = 'all'"
        :class="actionSubFilter === 'all' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ALL
      </button>
      <button
        type="button"
        @click="actionSubFilter = 'attack'"
        :class="actionSubFilter === 'attack' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ATTACK ({{ attackTableEntries.length }})
      </button>
      <button
        type="button"
        @click="actionSubFilter = 'action'"
        :class="actionSubFilter === 'action' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ACTION
      </button>
      <button
        type="button"
        @click="actionSubFilter = 'bonus'"
        :class="actionSubFilter === 'bonus' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        BONUS ACTION
      </button>
      <button
        type="button"
        @click="actionSubFilter = 'reaction'"
        :class="actionSubFilter === 'reaction' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        REACTION
      </button>
      <button
        type="button"
        @click="actionSubFilter = 'other'"
        :class="actionSubFilter === 'other' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        OTHER
      </button>
    </div>

    <!-- Active Class Resource Trackers -->
    <div v-if="classResourceTrackers.length > 0" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
      <div class="flex items-center justify-between border-b border-gray-200 pb-1.5">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Class Resource Counters
          </h3>
          <span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-mono font-semibold">
            {{ classSummary }}
          </span>
        </div>
        <span v-if="!isReadOnly" class="text-[10px] text-gray-500 hidden sm:inline">
          Click circles or +/- to manage active uses
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <div
          v-for="res in classResourceTrackers"
          :key="res.id"
          class="p-2.5 bg-white border border-gray-200 rounded space-y-2 hover:border-gray-300 transition"
        >
          <div class="flex items-start justify-between gap-1.5">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ res.name }}</span>
                <span
                  v-if="res.hasActiveToggle && isClassStateActive(res.id)"
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse"
                >
                  ACTIVE
                </span>
              </div>
              <p class="text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2" :title="res.subtitle">
                {{ res.subtitle }}
              </p>
            </div>
            <span class="text-[9px] font-mono px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded shrink-0">
              {{ res.rechargeLabel }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
            <!-- Counter bubbles -->
            <div v-if="res.max <= 8 && res.type === 'counter'" class="flex items-center gap-1.5 flex-wrap">
              <template v-if="!isReadOnly">
                <button
                  v-for="slotIdx in res.max"
                  :key="slotIdx"
                  type="button"
                  @click="toggleResourceSlot(res, slotIdx)"
                  class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                  :title="isResourceSlotExpended(res, slotIdx) ? 'Click to restore use' : 'Click to spend use'"
                >
                  <span
                    v-if="!isResourceSlotExpended(res, slotIdx)"
                    class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                  ></span>
                </button>
              </template>
              <template v-else>
                <span
                  v-for="slotIdx in res.max"
                  :key="slotIdx"
                  class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center bg-white select-none"
                >
                  <span
                    v-if="!isResourceSlotExpended(res, slotIdx)"
                    class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                  ></span>
                </span>
              </template>
              <span class="font-mono text-[10px] font-semibold text-gray-700 ml-1 select-none">
                {{ getResourceAvailable(res) }} / {{ res.displayMax }}
              </span>
            </div>

            <!-- Pool Counter (+ / - buttons) -->
            <div v-else-if="!isReadOnly" class="flex items-center gap-1">
              <button
                type="button"
                @click="spendResource(res.id, 1)"
                :disabled="getResourceAvailable(res) <= 0"
                class="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer"
                title="Spend 1 use"
              >
                -
              </button>
              <span class="font-mono text-xs font-bold text-gray-900 px-1">
                {{ getResourceAvailable(res) }} / {{ res.displayMax }}
              </span>
              <button
                type="button"
                @click="restoreResource(res.id, 1)"
                :disabled="getResourceSpent(res.id) <= 0"
                class="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer"
                title="Restore 1 use"
              >
                +
              </button>
            </div>
            <div v-else class="flex items-center">
              <span class="font-mono text-xs font-bold text-gray-900 px-1 select-none">
                {{ getResourceAvailable(res) }} / {{ res.displayMax }}
              </span>
            </div>

            <!-- Quick Action button -->
            <div v-if="!isReadOnly" class="flex items-center gap-1 shrink-0">
              <button
                v-if="res.id === 'fighter_second_wind'"
                type="button"
                @click="activateSecondWind"
                :disabled="getResourceAvailable(res) <= 0"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[10px] font-bold cursor-pointer disabled:opacity-30 shadow-2xs"
              >
                Heal
              </button>
              <button
                v-if="res.die && res.rollFormula"
                type="button"
                @click="rollResourceDie(res)"
                :disabled="getResourceAvailable(res) <= 0"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[10px] font-bold cursor-pointer disabled:opacity-30 shadow-2xs font-mono"
              >
                Roll {{ res.die }}
              </button>
              <button
                v-if="res.hasActiveToggle"
                type="button"
                @click="toggleClassState(res.id, res.id)"
                class="px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer shadow-2xs transition"
                :class="isClassStateActive(res.id) ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-900 hover:bg-black text-white'"
              >
                {{ isClassStateActive(res.id) ? 'End' : 'Active' }}
              </button>
              <button
                v-if="res.id === 'monk_uncanny_metabolism'"
                type="button"
                @click="activateUncannyMetabolism"
                :disabled="getResourceAvailable(res) <= 0"
                class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[10px] font-bold cursor-pointer disabled:opacity-30 shadow-2xs"
              >
                Restore Ki
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. Attacks Section -->
    <VttAttacksSection
      v-if="actionSubFilter === 'all' || actionSubFilter === 'attack'"
      :attack-table-entries="attackTableEntries"
      :is-read-only="isReadOnly"
      :get-custom-action-available="getCustomActionAvailable"
      @open-custom-attack="openAddCustomAction('attack')"
      @roll-dice="(lbl, mod) => rollDice(lbl, mod)"
      @roll-formula="(lbl, form, mod) => rollFormula(lbl, form, mod)"
      @spend-custom-action="(act) => spendCustomAction(act)"
      @delete-custom-action="(id) => deleteCustomAction(id)"
    />

    <!-- 2. Standard Actions Section -->
    <VttStandardActionsSection
      v-if="actionSubFilter === 'all' || actionSubFilter === 'action'"
      :char="char"
      :is-read-only="isReadOnly"
      :computed-skills="computedSkills"
      :feat-action-spells="featActionSpells"
      :expanded-spells="expandedSpells"
      :char-spell-attack-bonus="charSpellAttackBonus"
      :char-caster-mod="charCasterMod"
      :char-prof-bonus="charProfBonus"
      :all-spell-levels="allSpellLevels"
      :has-char-class="hasCharClass"
      :get-char-class-level="getCharClassLevel"
      :is-resource-slot-expended="isResourceSlotExpended"
      :get-resource-available="getResourceAvailable"
      :get-resource-spent="getResourceSpent"
      :get-custom-actions-by-type="getCustomActionsByType"
      :get-custom-action-available="getCustomActionAvailable"
      :get-custom-action-spent="getCustomActionSpent"
      :get-custom-action-attack-bonus="getCustomActionAttackBonus"
      :get-custom-action-damage-label="getCustomActionDamageLabel"
      :get-feat-name="getFeatName"
      :is-feat-spell="isFeatSpell"
      :get-spell-range="getSpellRange"
      :is-feat-cast-expended="isFeatCastExpended"
      :extract-spell-mechanics="extractSpellMechanics"
      :get-spell-entries="getSpellEntries"
      :get-available-slots="getAvailableSlots"
      :format-spell-entry="formatSpellEntry"
      :toggle-resource-slot="toggleResourceSlot"
      :spend-resource="spendResource"
      :restore-resource="restoreResource"
      :automated-feature-actions="automatedFeatureActions"
      :expanded-auto-actions="expandedAutoActions"
      @open-add-custom-action="(type) => openAddCustomAction(type)"
      @roll-dice="(lbl, mod) => rollDice(lbl, mod)"
      @roll-formula="(lbl, form, mod) => rollFormula(lbl, form, mod)"
      @toggle-spell="(sp) => toggleSpell(sp)"
      @toggle-feat-free-cast="(sp) => toggleFeatFreeCast(sp)"
      @cast-spell="(sp, slot) => castSpell(sp, slot)"
      @roll-custom-action-attack="(act) => rollCustomActionAttack(act)"
      @roll-custom-action-damage="(act) => rollCustomActionDamage(act)"
      @spend-custom-action="(act) => spendCustomAction(act)"
      @restore-custom-action-use="(id) => restoreCustomActionUse(id)"
      @delete-custom-action="(id) => deleteCustomAction(id)"
      @toggle-auto-action="(id) => toggleAutoAction(id)"
      @activate-action-surge="activateActionSurge"
      @activate-channel-divinity="(feat) => activateChannelDivinity(feat)"
      @activate-lay-on-hands="(amt) => activateLayOnHands(amt)"
    />

    <!-- 3. Bonus Actions Section -->
    <VttBonusActionsSection
      v-if="actionSubFilter === 'all' || actionSubFilter === 'bonus'"
      :char="char"
      :vtt="vtt"
      :is-read-only="isReadOnly"
      :monk-level="monkLevel"
      :unarmed-strike-details="unarmedStrikeDetails"
      :bonus-action-spells="bonusActionSpells"
      :expanded-spells="expandedSpells"
      :char-spell-attack-bonus="charSpellAttackBonus"
      :char-caster-mod="charCasterMod"
      :char-prof-bonus="charProfBonus"
      :all-spell-levels="allSpellLevels"
      :has-char-class="hasCharClass"
      :get-char-class-level="getCharClassLevel"
      :is-class-state-active="isClassStateActive"
      :rage-bonus-damage="rageBonusDamage"
      :get-resource-available="getResourceAvailable"
      :get-resource-spent="getResourceSpent"
      :is-resource-slot-expended="isResourceSlotExpended"
      :get-custom-actions-by-type="getCustomActionsByType"
      :get-custom-action-available="getCustomActionAvailable"
      :get-custom-action-spent="getCustomActionSpent"
      :get-custom-action-attack-bonus="getCustomActionAttackBonus"
      :get-custom-action-damage-label="getCustomActionDamageLabel"
      :get-feat-name="getFeatName"
      :is-feat-spell="isFeatSpell"
      :get-spell-range="getSpellRange"
      :is-feat-cast-expended="isFeatCastExpended"
      :extract-spell-mechanics="extractSpellMechanics"
      :get-spell-entries="getSpellEntries"
      :get-available-slots="getAvailableSlots"
      :format-spell-entry="formatSpellEntry"
      :automated-feature-actions="automatedFeatureActions"
      :expanded-auto-actions="expandedAutoActions"
      @open-add-custom-action="(type) => openAddCustomAction(type)"
      @roll-dice="(lbl, mod) => rollDice(lbl, mod)"
      @roll-formula="(lbl, form, mod) => rollFormula(lbl, form, mod)"
      @toggle-class-state="(k, resId) => toggleClassState(k, resId)"
      @activate-second-wind="activateSecondWind"
      @activate-monk-ki-action="(act, cost) => activateMonkKiAction(act, cost)"
      @activate-uncanny-metabolism="activateUncannyMetabolism"
      @activate-channel-divinity="(feat) => activateChannelDivinity(feat)"
      @roll-divine-smite="(slot) => rollDivineSmite(slot)"
      @show-toast="(msg) => showToast(msg)"
      @toggle-spell="(sp) => toggleSpell(sp)"
      @toggle-feat-free-cast="(sp) => toggleFeatFreeCast(sp)"
      @cast-spell="(sp, slot) => castSpell(sp, slot)"
      @roll-custom-action-attack="(act) => rollCustomActionAttack(act)"
      @roll-custom-action-damage="(act) => rollCustomActionDamage(act)"
      @spend-custom-action="(act) => spendCustomAction(act)"
      @restore-custom-action-use="(id) => restoreCustomActionUse(id)"
      @delete-custom-action="(id) => deleteCustomAction(id)"
      @toggle-auto-action="(id) => toggleAutoAction(id)"
      @toggle-resource-slot="(res, idx) => toggleResourceSlot(res, idx)"
      @spend-resource="(id, amt) => spendResource(id, amt)"
      @restore-resource="(id, amt) => restoreResource(id, amt)"
    />

    <!-- 4. Reactions Section -->
    <VttReactionsSection
      v-if="actionSubFilter === 'all' || actionSubFilter === 'reaction'"
      :char="char"
      :is-read-only="isReadOnly"
      :monk-level="monkLevel"
      :reaction-spells="reactionSpells"
      :expanded-spells="expandedSpells"
      :char-spell-attack-bonus="charSpellAttackBonus"
      :char-caster-mod="charCasterMod"
      :has-char-class="hasCharClass"
      :get-char-class-level="getCharClassLevel"
      :get-ability-mod="getAbilityMod"
      :get-resource-available="getResourceAvailable"
      :get-resource-spent="getResourceSpent"
      :is-resource-slot-expended="isResourceSlotExpended"
      :get-custom-actions-by-type="getCustomActionsByType"
      :get-custom-action-available="getCustomActionAvailable"
      :get-custom-action-spent="getCustomActionSpent"
      :get-custom-action-attack-bonus="getCustomActionAttackBonus"
      :get-custom-action-damage-label="getCustomActionDamageLabel"
      :get-feat-name="getFeatName"
      :is-feat-spell="isFeatSpell"
      :get-spell-range="getSpellRange"
      :is-feat-cast-expended="isFeatCastExpended"
      :extract-spell-mechanics="extractSpellMechanics"
      :get-spell-entries="getSpellEntries"
      :get-available-slots="getAvailableSlots"
      :format-spell-entry="formatSpellEntry"
      :automated-feature-actions="automatedFeatureActions"
      :expanded-auto-actions="expandedAutoActions"
      @open-add-custom-action="(type) => openAddCustomAction(type)"
      @roll-dice="(lbl, mod) => rollDice(lbl, mod)"
      @roll-formula="(lbl, form, mod) => rollFormula(lbl, form, mod)"
      @activate-indomitable="activateIndomitable"
      @deflect-attacks-reaction="deflectAttacksReaction"
      @show-toast="(msg) => showToast(msg)"
      @toggle-spell="(sp) => toggleSpell(sp)"
      @toggle-feat-free-cast="(sp) => toggleFeatFreeCast(sp)"
      @cast-spell="(sp, slot) => castSpell(sp, slot)"
      @roll-custom-action-attack="(act) => rollCustomActionAttack(act)"
      @roll-custom-action-damage="(act) => rollCustomActionDamage(act)"
      @spend-custom-action="(act) => spendCustomAction(act)"
      @restore-custom-action-use="(id) => restoreCustomActionUse(id)"
      @delete-custom-action="(id) => deleteCustomAction(id)"
      @toggle-auto-action="(id) => toggleAutoAction(id)"
      @toggle-resource-slot="(res, idx) => toggleResourceSlot(res, idx)"
      @spend-resource="(id, amt) => spendResource(id, amt)"
      @restore-resource="(id, amt) => restoreResource(id, amt)"
    />

    <!-- 5. Other Actions Section -->
    <VttOtherActionsSection
      v-if="actionSubFilter === 'all' || actionSubFilter === 'other'"
      :vtt="vtt"
      :is-read-only="isReadOnly"
      :get-resource-available="getResourceAvailable"
      :get-resource-spent="getResourceSpent"
      :is-resource-slot-expended="isResourceSlotExpended"
      :get-custom-actions-by-type="getCustomActionsByType"
      :get-custom-action-available="getCustomActionAvailable"
      :get-custom-action-spent="getCustomActionSpent"
      :get-custom-action-attack-bonus="getCustomActionAttackBonus"
      :get-custom-action-damage-label="getCustomActionDamageLabel"
      :automated-feature-actions="automatedFeatureActions"
      :expanded-auto-actions="expandedAutoActions"
      @open-add-custom-action="(type) => openAddCustomAction(type)"
      @roll-custom-action-attack="(act) => rollCustomActionAttack(act)"
      @roll-custom-action-damage="(act) => rollCustomActionDamage(act)"
      @spend-custom-action="(act) => spendCustomAction(act)"
      @restore-custom-action-use="(id) => restoreCustomActionUse(id)"
      @delete-custom-action="(id) => deleteCustomAction(id)"
      @toggle-auto-action="(id) => toggleAutoAction(id)"
      @toggle-resource-slot="(res, idx) => toggleResourceSlot(res, idx)"
      @spend-resource="(id, amt) => spendResource(id, amt)"
      @restore-resource="(id, amt) => restoreResource(id, amt)"
    />
  </div>
</template>
