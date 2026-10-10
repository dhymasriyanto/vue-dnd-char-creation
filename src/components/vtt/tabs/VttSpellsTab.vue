<script setup>
defineProps({
  char: { type: Object, required: true },
  charSpells: { type: Array, default: () => [] },
  isCaster: { type: Boolean, default: false },
  classSpells: { type: Array, default: () => [] },
  charCasterAbility: { type: String, default: 'int' },
  charCasterMod: { type: [Number, String], default: 0 },
  charSpellSaveDc: { type: [Number, String], default: 10 },
  charSpellAttackBonus: { type: [Number, String], default: 0 },
  allSpellLevels: { type: Array, default: () => [] },
  sheetSpellSlots: { type: Array, default: () => [] },
  sheetCantrips: { type: Array, default: () => [] },
  sheetLeveledSpells: { type: Array, default: () => [] },
  activeSpellsByLevel: { type: Array, default: () => [] },
  featSpells: { type: Array, default: () => [] },
  expandedSpells: { type: Object, default: () => ({}) },
  isReadOnly: { type: Boolean, default: false },
  getMaxSlots: { type: Function, required: true },
  getAvailableSlots: { type: Function, required: true },
  isSlotExpended: { type: Function, required: true },
  getSpellsAtLevel: { type: Function, required: true },
  extractSpellMechanics: { type: Function, required: true },
  getSpellCastingTime: { type: Function, required: true },
  getSpellRange: { type: Function, required: true },
  getSpellDuration: { type: Function, required: true },
  getSpellComponents: { type: Function, required: true },
  getSpellEntries: { type: Function, required: true },
  getSpellHigherLevels: { type: Function, required: true },
  getFeatName: { type: Function, required: true },
  isFeatSpell: { type: Function, required: true },
  isFeatCastExpended: { type: Function, required: true },
  formatSpellEntry: { type: Function, required: true },
  renderAnnotatedText: { type: Function, required: true }
})

const emit = defineEmits([
  'rollDice',
  'rollFormula',
  'restoreAllSlots',
  'toggleSlot',
  'castSpell',
  'toggleSpell',
  'toggleFeatFreeCast'
])
</script>

<template>
  <div class="space-y-4 text-xs">
    <div v-if="charSpells.length > 0 || isCaster" class="space-y-4">
      <!-- Caster Stat Box -->
      <div v-if="classSpells.length > 0 || isCaster" class="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-2.5">
        <div class="flex items-center justify-between border-b border-gray-200 pb-2">
          <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Spellcasting &amp; Slots
          </span>
          <span class="text-[11px] text-gray-500 font-mono">
            Ability: {{ charCasterAbility.toUpperCase() }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div class="bg-white border border-gray-200 rounded p-2">
            <div class="text-[10px] text-gray-500 uppercase font-semibold">Spellcasting Modifier</div>
            <div class="text-sm font-bold text-gray-900 font-mono">
              {{ charCasterMod >= 0 ? '+' : '' }}{{ charCasterMod }}
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded p-2">
            <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Save DC</div>
            <div class="text-sm font-bold text-gray-900 font-mono">{{ charSpellSaveDc }}</div>
          </div>

          <div class="bg-white border border-gray-200 rounded p-2">
            <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Attack Bonus</div>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="emit('rollDice', 'Spell Attack Roll', charSpellAttackBonus)"
              class="text-sm font-bold text-gray-900 hover:text-black transition font-mono cursor-pointer underline decoration-dotted"
              title="Click to roll spell attack"
            >
              {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
            </button>
            <span
              v-else
              class="text-sm font-bold text-gray-900 font-mono select-none block"
            >
              {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
            </span>
          </div>

          <div class="bg-white border border-gray-200 rounded p-2">
            <div class="text-[10px] text-gray-500 uppercase font-semibold">Known / Prepared</div>
            <div class="text-sm font-bold text-gray-900 font-mono">{{ classSpells.length }}</div>
          </div>
        </div>

        <!-- Interactive Spell Slots Tracker -->
        <div v-if="allSpellLevels.length > 0" class="pt-2 border-t border-gray-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Spell Slot Tracker</span>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="emit('restoreAllSlots')"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
            >
              Restore All (Long Rest)
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              v-for="lvl in allSpellLevels"
              :key="lvl"
              class="bg-white border border-gray-200 rounded p-2 flex flex-col justify-between"
            >
              <div class="flex justify-between items-center mb-1.5">
                <span class="font-bold text-gray-800 text-[11px]">
                  Level {{ lvl }}
                  <span v-if="sheetSpellSlots.find(s => s.level === lvl)?.isPact" class="text-[9px] font-mono text-purple-700 ml-1 font-semibold">(Pact · Short Rest)</span>
                </span>
                <span class="font-mono text-[10px] text-gray-500">
                  {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
                </span>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <template v-if="!isReadOnly">
                  <button
                    v-for="slotIdx in getMaxSlots(lvl)"
                    :key="slotIdx"
                    type="button"
                    @click="emit('toggleSlot', lvl, slotIdx)"
                    class="w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isSlotExpended(lvl, slotIdx) ? `Restore Level ${lvl} Slot ${slotIdx}` : `Expend Level ${lvl} Slot ${slotIdx}`"
                  >
                    <span
                      v-if="!isSlotExpended(lvl, slotIdx)"
                      class="w-2.5 h-2.5 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                </template>
                <template v-else>
                  <span
                    v-for="slotIdx in getMaxSlots(lvl)"
                    :key="slotIdx"
                    class="w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center bg-white select-none"
                  >
                    <span
                      v-if="!isSlotExpended(lvl, slotIdx)"
                      class="w-2.5 h-2.5 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cantrips List -->
      <div v-if="sheetCantrips.length > 0" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Cantrips (Level 0)</h3>
        <div class="space-y-1.5">
          <div
            v-for="sp in sheetCantrips"
            :key="sp.id || sp.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
              <div
                @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
              >
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                  <span class="font-bold text-gray-900">{{ sp.name }}</span>
                  <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                    {{ sp.school }}
                  </span>
                  <span v-if="sp.source" class="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                    {{ sp.source }}
                  </span>
                </div>
                <button
                  type="button"
                  class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                  aria-label="Toggle details"
                >
                  {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>

              <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                  <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="emit('rollDice', `${sp.name} Attack`, charSpellAttackBonus)"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Spell Attack"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </button>
                  <span
                    v-else
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </span>
                  <button
                    v-if="!isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="emit('rollFormula', `${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                  <span
                    v-else-if="isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </span>
                </template>

                <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                  <span
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                    title="Target Saving Throw"
                  >
                    DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                  </span>
                  <button
                    v-if="!isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    type="button"
                    @click="emit('rollFormula', `${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Roll Damage"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                  <span
                    v-else-if="isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </span>
                </template>

                <button
                  v-if="!isReadOnly"
                  type="button"
                  @click="emit('castSpell', sp)"
                  class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                  title="Cast Cantrip"
                >
                  Cast
                </button>

                <button
                  type="button"
                  @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                  class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                >
                  {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>
            </div>

            <!-- Spell Expanded Detail -->
            <div
              v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
              class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
            >
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
              </div>

              <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                <div
                  v-for="(ent, eIdx) in getSpellEntries(sp)"
                  :key="eIdx"
                  v-html="renderAnnotatedText(formatSpellEntry(ent))"
                ></div>
              </div>
              <p v-else class="text-gray-400 italic">No rules text recorded.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Leveled Spells List -->
      <div v-if="sheetLeveledSpells.length > 0" class="space-y-4">
        <div
          v-for="lvl in activeSpellsByLevel"
          :key="lvl"
          class="space-y-2"
        >
          <div class="flex items-center justify-between pb-1 border-b border-gray-200">
            <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
              Level {{ lvl }} Spells
              <span v-if="sheetSpellSlots.find(s => s.level === lvl)?.isPact" class="text-[9px] font-mono text-purple-700 ml-1 font-semibold">(Pact Magic)</span>
            </h3>
            <span class="text-[10px] text-gray-500 font-mono">
              Slots Available: {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
            </span>
          </div>

          <div class="space-y-1.5">
            <div
              v-for="sp in getSpellsAtLevel(lvl)"
              :key="sp.id || sp.name"
              class="border border-gray-200 rounded bg-white overflow-hidden"
            >
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                <div
                  @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                  class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
                >
                  <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <span class="font-bold text-gray-900">{{ sp.name }}</span>
                    <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                      {{ sp.school }}
                    </span>
                    <span v-if="sp.concentration" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold whitespace-nowrap">
                      Conc
                    </span>
                    <span v-if="sp.ritual" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold whitespace-nowrap">
                      Ritual
                    </span>
                  </div>
                  <button
                    type="button"
                    class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                    aria-label="Toggle details"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                  <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                    <button
                      v-if="!isReadOnly"
                      type="button"
                      @click="emit('rollDice', `${sp.name} Attack`, charSpellAttackBonus)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Spell Attack"
                    >
                      Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                    </button>
                    <span
                      v-else
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                    >
                      Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                    </span>
                    <button
                      v-if="!isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="emit('rollFormula', `${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                    <span
                      v-else-if="isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </span>
                  </template>

                  <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                    <span
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                      title="Target Saving Throw"
                    >
                      DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                    </span>
                    <button
                      v-if="!isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="emit('rollFormula', `${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                    <span
                      v-else-if="isReadOnly && extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </span>
                  </template>

                  <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="emit('castSpell', sp)"
                    :disabled="getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0"
                    :class="[
                      'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                      (getMaxSlots(lvl) === 0 || getAvailableSlots(lvl) > 0)
                        ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    ]"
                    :title="(getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0) ? 'No spell slots remaining at this level' : 'Cast Spell & Expend Slot'"
                  >
                    Cast
                  </button>

                  <button
                    type="button"
                    @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                    class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>
              </div>

              <!-- Spell Expanded Detail -->
              <div
                v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
              >
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                  <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                  <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                  <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                  <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                </div>

                <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                  <div
                    v-for="(ent, eIdx) in getSpellEntries(sp)"
                    :key="eIdx"
                    v-html="renderAnnotatedText(formatSpellEntry(ent))"
                  ></div>
                </div>
                <p v-else class="text-gray-400 italic">No rules text recorded.</p>

                <div v-if="getSpellHigherLevels(sp).length" class="pt-2 border-t border-gray-100">
                  <h5 class="font-bold text-gray-800 text-[11px] mb-1">Using Higher-Level Slots:</h5>
                  <div
                    v-for="(hl, hIdx) in getSpellHigherLevels(sp)"
                    :key="hIdx"
                    v-html="renderAnnotatedText(formatSpellEntry(hl))"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Feat Spells Section (Free Cast / Innate Magic) -->
      <div v-if="featSpells.length > 0" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <div>
            <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
              Feat Spells &amp; Innate Magic
            </h3>
            <p class="text-[10px] text-gray-500">Granted by feats (e.g. Magic Initiate) • Does not consume class spell preparation slots</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="!isReadOnly && allSpellLevels.length === 0"
              type="button"
              @click="emit('restoreAllSlots')"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold cursor-pointer underline"
            >
              Restore Free Casts (Long Rest)
            </button>
            <span class="text-[10px] bg-gray-900 text-white px-1.5 py-0.2 rounded font-semibold font-mono">
              {{ featSpells.length }}
            </span>
          </div>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="sp in featSpells"
            :key="sp.id || sp.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
              <div
                @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
              >
                <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span class="font-bold text-gray-900">{{ sp.name }}</span>
                  <span class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                    {{ getFeatName(sp) }}
                  </span>
                  <span v-if="Number(sp.level) === 0 || sp.is_cantrip" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                    Cantrip (At Will)
                  </span>
                  <span v-else class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                    Level {{ sp.level }} (1/LR)
                  </span>
                  <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                    {{ sp.school }}
                  </span>
                </div>
                <button
                  type="button"
                  class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                  aria-label="Toggle details"
                >
                  {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>

              <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                <!-- Slot tracker bubble for leveled feat spell -->
                <div v-if="Number(sp.level) > 0" class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
                  <span class="text-gray-500 font-medium">Slot:</span>
                  <button
                    v-if="!isReadOnly"
                    type="button"
                    @click.stop="emit('toggleFeatFreeCast', sp)"
                    class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isFeatCastExpended(sp) ? 'Click to restore slot' : 'Click to expend slot'"
                  >
                    <span
                      v-if="!isFeatCastExpended(sp)"
                      class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                  <span
                    v-else
                    class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center bg-white"
                  >
                    <span
                      v-if="!isFeatCastExpended(sp)"
                      class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </span>
                  <span class="font-mono font-semibold text-gray-800">
                    {{ isFeatCastExpended(sp) ? '0' : '1' }} / 1
                  </span>
                </div>

                <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                  <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="emit('rollDice', `${sp.name} Attack`, charSpellAttackBonus)"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </button>
                  <span
                    v-else
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                  >
                    Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                  </span>
                </template>
                <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
                  <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="emit('rollFormula', `${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </button>
                  <span
                    v-else
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 rounded text-[10px] font-semibold select-none"
                  >
                    Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                  </span>
                </template>

                <!-- Cast buttons -->
                <template v-if="!isReadOnly && Number(sp.level) > 0">
                  <button
                    type="button"
                    @click="emit('castSpell', sp, false)"
                    :disabled="isFeatCastExpended(sp)"
                    :class="[
                      'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                      !isFeatCastExpended(sp)
                        ? 'bg-gray-900 hover:bg-black text-white cursor-pointer'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    ]"
                  >
                    {{ isFeatCastExpended(sp) ? 'Free Expended' : 'Cast Free' }}
                  </button>
                  <button
                    v-if="allSpellLevels.length > 0"
                    type="button"
                    @click="emit('castSpell', sp, true)"
                    :disabled="getAvailableSlots(sp.level) === 0"
                    :class="[
                      'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                      getAvailableSlots(sp.level) > 0
                        ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    ]"
                    title="Cast using a spell slot"
                  >
                    Cast (Slot)
                  </button>
                </template>
                <template v-else-if="!isReadOnly">
                  <button
                    type="button"
                    @click="emit('castSpell', sp)"
                    class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Cast
                  </button>
                </template>

                <button
                  type="button"
                  @click="emit('toggleSpell', 'sp_' + (sp.id || sp.name))"
                  class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                >
                  {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                </button>
              </div>
            </div>

            <!-- Spell Expanded Detail -->
            <div
              v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
              class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
            >
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
              </div>

              <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                <div
                  v-for="(ent, eIdx) in getSpellEntries(sp)"
                  :key="eIdx"
                  v-html="renderAnnotatedText(formatSpellEntry(ent))"
                ></div>
              </div>
              <p v-else class="text-gray-400 italic">No rules text recorded.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="p-6 bg-gray-50 border border-gray-200 rounded text-center text-gray-500">
      <p class="font-bold text-gray-700 text-sm mb-1">No Spells Known</p>
      <p class="text-xs">This character does not currently have spells or spell slots recorded.</p>
    </div>
  </div>
</template>
