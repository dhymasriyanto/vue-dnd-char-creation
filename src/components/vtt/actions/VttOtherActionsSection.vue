<script setup>
import {
  IconPlus,
  IconTrash
} from '@tabler/icons-vue'
import { renderAnnotatedText, format5eEntries } from '../../../utils/textRenderer'

defineProps({
  vtt: { type: Object, default: () => ({}) },
  isReadOnly: { type: Boolean, default: false },
  getResourceAvailable: { type: Function, required: true },
  getResourceSpent: { type: Function, required: true },
  isResourceSlotExpended: { type: Function, required: true },
  getCustomActionsByType: { type: Function, required: true },
  getCustomActionAvailable: { type: Function, required: true },
  getCustomActionSpent: { type: Function, required: true },
  getCustomActionAttackBonus: { type: Function, required: true },
  getCustomActionDamageLabel: { type: Function, required: true },
  automatedFeatureActions: { type: Array, default: () => [] },
  expandedAutoActions: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'open-add-custom-action',
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
        Other & Interactions
      </h3>
      <button
        v-if="!isReadOnly"
        type="button"
        @click="emit('open-add-custom-action', 'other')"
        class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
      >
        <IconPlus class="w-3 h-3" />
        <span>Custom Other</span>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div class="p-2 bg-gray-50 border border-gray-200 rounded">
        <span class="font-bold text-gray-900 text-xs">Free Object Interaction</span>
        <p class="text-[10px] text-gray-500 mt-0.5">Interact with 1 object or feature of the environment for free on your turn during movement or action.</p>
      </div>
      <div class="p-2 bg-gray-50 border border-gray-200 rounded">
        <span class="font-bold text-gray-900 text-xs">Short Rest & Hit Dice</span>
        <p class="text-[10px] text-gray-500 mt-0.5">Spend 1 or more Hit Dice to regain hit points during a 1-hour rest.</p>
      </div>
    </div>

    <!-- Custom Other Actions -->
    <div v-if="getCustomActionsByType('other').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Other Actions</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in getCustomActionsByType('other')"
          :key="act.id"
          class="p-2.5 bg-gray-50 border border-gray-200 rounded space-y-1.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold bg-gray-200 text-gray-700 font-mono">{{ act.type }}</span>
                <span v-if="act.range" class="text-[9px] text-gray-500 font-mono">{{ act.range }}</span>
                <span v-if="act.hasDc" class="text-[9px] font-mono text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                  DC {{ act.dcBase + (vtt.proficiency_bonus || 2) + (vtt.abilities?.[act.dcAbility]?.modifier ?? 0) }} {{ act.dcAbility.toUpperCase() }}
                </span>
              </div>
              <p v-if="act.notes" class="text-[10px] text-gray-600 mt-0.5 leading-tight">{{ act.notes }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="!isReadOnly && act.hasAttack"
                type="button"
                @click="emit('roll-custom-action-attack', act)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] transition cursor-pointer font-mono"
              >
                Hit ({{ getCustomActionAttackBonus(act) >= 0 ? '+' : '' }}{{ getCustomActionAttackBonus(act) }})
              </button>
              <span
                v-else-if="isReadOnly && act.hasAttack"
                class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono select-none"
              >
                Hit ({{ getCustomActionAttackBonus(act) >= 0 ? '+' : '' }}{{ getCustomActionAttackBonus(act) }})
              </span>
              <button
                v-if="!isReadOnly && act.hasDamage && act.damageDice"
                type="button"
                @click="emit('roll-custom-action-damage', act)"
                class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-[10px] transition cursor-pointer font-mono"
              >
                Dmg ({{ getCustomActionDamageLabel(act) }})
              </button>
              <span
                v-else-if="isReadOnly && act.hasDamage && act.damageDice"
                class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-[10px] font-mono select-none"
              >
                Dmg ({{ getCustomActionDamageLabel(act) }})
              </span>
              <button
                v-if="!isReadOnly"
                type="button"
                @click="emit('delete-custom-action', act.id)"
                class="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                title="Delete custom other action"
              >
                <IconTrash class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Resource Tracker -->
          <div v-if="act.resource" class="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px]">
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 font-medium">Uses:</span>
              <div class="flex items-center gap-1">
                <span
                  v-for="u in act.resource.max"
                  :key="u"
                  class="w-2.5 h-2.5 rounded-full border transition"
                  :class="u <= (act.resource.max - getCustomActionSpent(act.id)) ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'"
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

    <!-- Automated Other Actions from Features -->
    <div v-if="automatedFeatureActions.filter(a => a.actionType === 'other').length > 0" class="space-y-1.5 pt-2">
      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Feature Other Abilities</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="act in automatedFeatureActions.filter(a => a.actionType === 'other')"
          :key="act.id"
          class="p-2.5 bg-gray-50 border border-gray-200 rounded space-y-1.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ act.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 text-gray-700 font-mono">{{ act.source }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-100 border border-gray-200 text-gray-600 font-mono uppercase">Other</span>
              </div>
              <p v-if="act.description" class="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2">{{ act.description }}</p>
            </div>
            <button
              type="button"
              @click="emit('toggle-auto-action', act.id)"
              class="font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer shrink-0"
            >
              {{ expandedAutoActions[act.id] ? '-' : '+' }}
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
