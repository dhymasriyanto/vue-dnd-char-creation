<script setup>
import {
  IconPlus,
  IconBolt,
  IconHandStop,
  IconDice,
  IconSword,
  IconTrash
} from '@tabler/icons-vue'

defineProps({
  attackTableEntries: { type: Array, default: () => [] },
  isReadOnly: { type: Boolean, default: false },
  getCustomActionAvailable: { type: Function, default: () => 0 }
})

const emit = defineEmits([
  'open-custom-attack',
  'roll-dice',
  'roll-formula',
  'spend-custom-action',
  'delete-custom-action'
])
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between pb-1 border-b border-gray-200">
      <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
        Attacks & Attack Spells
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-gray-500 font-mono">{{ attackTableEntries.length }} Available</span>
        <button
          v-if="!isReadOnly"
          type="button"
          @click="emit('open-custom-attack')"
          class="px-2 py-0.5 rounded bg-gray-900 hover:bg-black text-white text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
        >
          <IconPlus class="w-3 h-3" />
          <span>Custom Attack</span>
        </button>
      </div>
    </div>

    <div v-if="attackTableEntries.length > 0" class="overflow-x-auto border border-gray-200 rounded shadow-xs bg-white">
      <table class="w-full text-left text-xs divide-y divide-gray-200">
        <thead class="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="py-2 px-3">Attack</th>
            <th class="py-2 px-3">Range</th>
            <th class="py-2 px-3 text-center">Hit / DC</th>
            <th class="py-2 px-3 text-center">Damage</th>
            <th class="py-2 px-3">Notes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr
            v-for="entry in attackTableEntries"
            :key="entry.id"
            class="hover:bg-gray-50/80 transition"
          >
            <!-- ATTACK Column -->
            <td class="py-2.5 px-3">
              <div class="flex items-center gap-2">
                <span
                  class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-gray-600 bg-gray-100 border border-gray-200"
                  :title="entry.subtitle"
                >
                  <IconBolt v-if="entry.type === 'spell'" class="w-3.5 h-3.5" />
                  <IconHandStop v-else-if="entry.type === 'unarmed'" class="w-3.5 h-3.5" />
                  <IconDice v-else-if="entry.type === 'feature'" class="w-3.5 h-3.5" />
                  <IconSword v-else class="w-3.5 h-3.5" />
                </span>
                <div class="min-w-0">
                  <div class="font-bold text-gray-900 truncate">{{ entry.name }}</div>
                  <div class="text-[10px] text-gray-500 truncate">{{ entry.subtitle }}</div>
                </div>
              </div>
            </td>

            <!-- RANGE Column -->
            <td class="py-2.5 px-3 whitespace-nowrap text-gray-600 text-[11px] font-mono">
              {{ entry.range }}
            </td>

            <!-- HIT / DC Column -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <button
                v-if="!isReadOnly && entry.toHit != null"
                type="button"
                @click="emit('roll-dice', `${entry.name} Attack`, entry.toHit)"
                class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                :title="`Roll ${entry.name} Attack (${entry.toHit >= 0 ? '+' : ''}${entry.toHit})`"
              >
                {{ entry.toHitLabel }}
              </button>
              <span
                v-else-if="isReadOnly && entry.toHit != null"
                class="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-xs select-none font-mono inline-block"
              >
                {{ entry.toHitLabel }}
              </span>
              <span
                v-else-if="entry.isDc"
                class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded font-bold text-[10px] font-mono whitespace-nowrap"
                title="Target Saving Throw"
              >
                {{ entry.dcText }}
              </span>
              <span v-else class="text-gray-400 font-mono text-xs">—</span>
            </td>

            <!-- DAMAGE Column -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <button
                v-if="!isReadOnly && entry.damageDice"
                type="button"
                @click="emit('roll-formula', `${entry.name} Damage`, entry.damageFormula, entry.damageMod)"
                class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                :title="`Roll Damage: ${entry.damageLabel}`"
              >
                {{ entry.damageLabel }}
              </button>
              <span
                v-else-if="isReadOnly && entry.damageDice"
                class="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-800 rounded font-bold text-xs select-none font-mono inline-block"
              >
                {{ entry.damageLabel }}
              </span>
              <span v-else class="text-gray-400 font-mono text-xs">—</span>
            </td>

            <!-- NOTES Column -->
            <td class="py-2.5 px-3 text-gray-500 text-[11px]">
              <div class="flex items-center justify-between gap-1">
                <span class="line-clamp-1" :title="entry.notes">{{ entry.notes }}</span>
                <div v-if="!isReadOnly && entry.type === 'custom'" class="flex items-center gap-1 shrink-0">
                  <div v-if="entry.customActionRef?.resource" class="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      type="button"
                      @click.stop="emit('spend-custom-action', entry.customActionRef)"
                      :disabled="getCustomActionAvailable(entry.customActionRef) <= 0"
                      class="px-1.5 py-0.5 rounded bg-gray-900 hover:bg-black text-white font-bold disabled:opacity-30 cursor-pointer text-[9px]"
                      title="Spend 1 use"
                    >
                      Use
                    </button>
                  </div>
                  <button
                    type="button"
                    @click.stop="emit('delete-custom-action', entry.customActionRef.id)"
                    class="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                    title="Delete custom attack"
                  >
                    <IconTrash class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 italic">
      No equipped weapons or attack spells available.
    </div>
  </div>
</template>
