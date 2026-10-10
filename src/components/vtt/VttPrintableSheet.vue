<script setup>
import { reactive } from 'vue'
import { IconPrinter } from '@tabler/icons-vue'

const props = defineProps({
  isPreviewing: {
    type: Boolean,
    default: false
  },
  char: {
    type: Object,
    required: true
  },
  vtt: {
    type: Object,
    required: true
  },
  resolvedImageUrl: {
    type: String,
    default: ''
  },
  resolvedPlayerName: {
    type: String,
    default: '—'
  },
  classSummary: {
    type: String,
    default: ''
  },
  parsedCharacteristics: {
    type: Object,
    default: () => ({})
  },
  currentArmorClass: {
    type: Number,
    default: 10
  },
  remainingHitDice: {
    type: [Number, String],
    default: 1
  },
  totalHitDice: {
    type: [Number, String],
    default: 1
  },
  computedSkills: {
    type: Object,
    default: () => ({})
  },
  cleanProficiencyName: {
    type: Function,
    default: (name) => name || ''
  },
  printAttackRows: {
    type: Array,
    default: () => []
  },
  classResourceTrackers: {
    type: Array,
    default: () => []
  },
  currency: {
    type: Object,
    default: () => ({})
  },
  liveEquipment: {
    type: Array,
    default: () => []
  },
  combinedClassFeatures: {
    type: Array,
    default: () => []
  },
  unpackedTraits: {
    type: Array,
    default: () => []
  },
  charSpellSaveDc: {
    type: [Number, String],
    default: 10
  },
  charSpellAttackBonus: {
    type: [Number, String],
    default: 0
  },
  getMaxSlots: {
    type: Function,
    default: () => 0
  },
  expendedSlots: {
    type: Object,
    default: () => ({})
  },
  getPrintSpellRows: {
    type: Function,
    default: () => []
  },
  sheetNotes: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['closePreview'])

const printOverrides = reactive({})

const getPrintVal = (key, defaultVal) => {
  return printOverrides[key] !== undefined ? printOverrides[key] : (defaultVal ?? '')
}

const setPrintVal = (key, val) => {
  printOverrides[key] = val
}

const triggerPrint = () => {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div>
    <!-- Print Preview Floating Toolbar (Screen only, hidden in print) -->
    <div
      v-if="isPreviewing"
      class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-300 shadow-md px-4 py-2.5 flex items-center justify-between print:hidden"
    >
      <div class="flex items-center gap-3">
        <span class="font-bold text-black text-xs sm:text-sm">Character Sheet Print Preview (3 Pages)</span>
        <span class="text-[11px] text-gray-500 hidden md:inline">All numbers and fields below are editable inputs. Edit before printing.</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="triggerPrint"
          class="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition shadow-xs"
        >
          <IconPrinter class="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </button>
        <button
          type="button"
          @click="emit('closePreview')"
          class="px-3.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-black rounded text-xs font-semibold cursor-pointer transition shadow-xs"
        >
          Exit Preview
        </button>
      </div>
    </div>

    <!-- Dedicated Printable Character Sheet (Visible in print or preview mode) -->
    <div
      :class="isPreviewing ? 'block pt-14 pb-20 bg-gray-100/70 min-h-screen space-y-8' : 'hidden print:block'"
      class="print:block printable-sheet w-full text-xs font-sans text-gray-900"
    >
      <!-- ========================================== -->
      <!-- PAGE 1: CORE COMBAT, SKILLS & FEATURES     -->
      <!-- ========================================== -->
      <div class="print-page print-page-container bg-white border border-gray-300 shadow-md p-4 max-w-[850px] mx-auto print:border-0 print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none">
        <div class="print-page-preview-header text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-200 pb-1 flex justify-between print:hidden">
          <span>Page 1: Combat, Skills &amp; Features</span>
          <span>D&amp;D 5e Character Sheet</span>
        </div>

        <!-- Header Block -->
        <div class="border-2 border-gray-900 rounded p-2.5 mb-2 bg-white">
          <div class="flex items-center justify-between gap-3">
            <!-- Character Name & Avatar -->
            <div class="flex items-center gap-2.5 min-w-[220px]">
              <div v-if="resolvedImageUrl" class="w-12 h-12 rounded border border-gray-400 overflow-hidden shrink-0">
                <img :src="resolvedImageUrl" :alt="char.name" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1">
                <input
                  type="text"
                  :value="getPrintVal('char_name', char.name || 'Unnamed Character')"
                  @input="setPrintVal('char_name', $event.target.value)"
                  class="text-lg font-black uppercase tracking-wide text-gray-900 leading-tight bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0"
                />
                <div class="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Character Name</div>
              </div>
            </div>

            <!-- Metadata Grid -->
            <div class="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] border-l border-gray-300 pl-3 flex-1">
              <div>
                <input
                  type="text"
                  :value="getPrintVal('class_summary', classSummary)"
                  @input="setPrintVal('class_summary', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Class &amp; Level</div>
              </div>
              <div>
                <input
                  type="text"
                  :value="getPrintVal('background', char.background || '—')"
                  @input="setPrintVal('background', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Background</div>
              </div>
              <div>
                <input
                  type="text"
                  :value="getPrintVal('player_name', resolvedPlayerName)"
                  @input="setPrintVal('player_name', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Player Name</div>
              </div>
              <div>
                <input
                  type="text"
                  :value="getPrintVal('race', char.race?.name || (typeof char.race === 'string' ? char.race : '') || '—')"
                  @input="setPrintVal('race', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Race</div>
              </div>
              <div>
                <input
                  type="text"
                  :value="getPrintVal('alignment', parsedCharacteristics.alignment || char.alignment || '—')"
                  @input="setPrintVal('alignment', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Alignment</div>
              </div>
              <div>
                <input
                  type="text"
                  :value="getPrintVal('xp', char.experience_points || '0')"
                  @input="setPrintVal('xp', $event.target.value)"
                  class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-black w-full p-0 text-[10px] leading-tight"
                />
                <div class="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Experience Points</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Core Vitals Summary Bar -->
        <div class="grid grid-cols-6 gap-2 mb-2 text-center">
          <!-- Armor Class -->
          <div class="flex flex-col items-center justify-center relative min-h-[50px] border border-gray-800 rounded bg-white">
            <span class="text-[7.5px] font-black text-gray-700 uppercase tracking-wider leading-none">ARMOR CLASS</span>
            <input
              type="text"
              :value="getPrintVal('ac', vtt.combat?.armor_class || currentArmorClass || 10)"
              @input="setPrintVal('ac', $event.target.value)"
              class="w-10 text-center font-black text-base text-gray-900 bg-transparent border-0 focus:outline-none p-0 leading-none mt-0.5"
            />
          </div>

          <!-- Initiative -->
          <div class="border border-gray-800 rounded p-1 bg-white flex flex-col items-center justify-center">
            <div class="text-[8.5px] font-bold uppercase text-gray-600 leading-none mb-0.5">Initiative</div>
            <input
              type="text"
              :value="getPrintVal('initiative', (vtt.combat?.initiative >= 0 ? '+' : '') + (vtt.combat?.initiative || 0))"
              @input="setPrintVal('initiative', $event.target.value)"
              class="w-12 text-center text-sm font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
            />
          </div>

          <!-- Speed -->
          <div class="border border-gray-800 rounded p-1 bg-white flex flex-col items-center justify-center">
            <div class="text-[8.5px] font-bold uppercase text-gray-600 leading-none mb-0.5">Speed</div>
            <div class="flex items-center justify-center text-sm font-bold text-gray-900 leading-none">
              <input
                type="text"
                :value="getPrintVal('speed', vtt.combat?.speed || 30)"
                @input="setPrintVal('speed', $event.target.value)"
                class="w-8 text-center text-sm font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
              />
              <span class="text-[10px] font-normal text-gray-600 ml-0.5">ft.</span>
            </div>
          </div>

          <!-- Prof Bonus -->
          <div class="border border-gray-800 rounded p-1 bg-white flex flex-col items-center justify-center">
            <div class="text-[8.5px] font-bold uppercase text-gray-600 leading-none mb-0.5">Prof. Bonus</div>
            <input
              type="text"
              :value="getPrintVal('prof_bonus', '+' + (vtt.proficiency_bonus || 2))"
              @input="setPrintVal('prof_bonus', $event.target.value)"
              class="w-10 text-center text-sm font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
            />
          </div>

          <!-- Hit Points -->
          <div class="border border-gray-800 rounded p-1 bg-white flex flex-col items-center justify-center">
            <div class="text-[8px] font-bold uppercase text-gray-600 leading-none mb-0.5">Hit Points (Cur / Max)</div>
            <div class="flex items-center justify-center gap-0.5 text-sm font-bold text-gray-900 leading-none">
              <input
                type="text"
                :value="getPrintVal('current_hp', char.hp != null ? char.hp : (vtt.combat?.hp?.max || 10))"
                @input="setPrintVal('current_hp', $event.target.value)"
                class="w-8 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
              />
              <span class="text-gray-400">/</span>
              <input
                type="text"
                :value="getPrintVal('max_hp', vtt.combat?.hp?.max || 10)"
                @input="setPrintVal('max_hp', $event.target.value)"
                class="w-8 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
              />
            </div>
            <div class="text-[8px] text-gray-500 mt-0.5">
              Temp: <input
                type="text"
                :value="getPrintVal('temp_hp', char.temp_hp || 0)"
                @input="setPrintVal('temp_hp', $event.target.value)"
                class="w-6 text-center text-[9px] font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
              />
            </div>
          </div>

          <!-- Hit Dice & Death Saves -->
          <div class="border border-gray-800 rounded p-1 bg-white flex flex-col items-center justify-center">
            <div class="text-[8px] font-bold uppercase text-gray-600 leading-none mb-0.5">Hit Dice &amp; Death Saves</div>
            <div class="flex items-center justify-center text-[10px] font-bold text-gray-900 mb-0.5">
              <span>HD:</span>
              <input
                type="text"
                :value="getPrintVal('hit_dice', remainingHitDice + '/' + totalHitDice)"
                @input="setPrintVal('hit_dice', $event.target.value)"
                class="w-12 text-center text-[10px] font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 ml-0.5"
              />
            </div>
            <div class="flex items-center gap-1.5 text-[8px] text-gray-600 leading-none">
              <span>S: ○ ○ ○</span>
              <span>F: ○ ○ ○</span>
            </div>
          </div>
        </div>

        <!-- 3-Column Sheet Layout -->
        <div class="grid grid-cols-12 gap-2 mb-1">
          <!-- Left Column: Abilities & Saves, Senses, Skills, Proficiencies -->
          <div class="col-span-4 space-y-1.5">
            <!-- Ability Scores & Saving Throws -->
            <div class="border border-gray-800 rounded p-1.5 break-inside-avoid bg-white">
              <div class="text-[9.5px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 text-gray-800 tracking-wider">
                Abilities &amp; Saving Throws
              </div>
              <div class="space-y-0.5">
                <div
                  v-for="ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']"
                  :key="ability"
                  class="flex items-center justify-between p-0.5 border border-gray-200 rounded text-[10px]"
                >
                  <div class="w-12 flex items-center">
                    <span class="font-bold uppercase text-[9px] text-gray-700">{{ ability.slice(0, 3) }}</span>
                    <input
                      type="text"
                      :value="getPrintVal(ability + '_score', vtt.abilities?.[ability]?.score || 10)"
                      @input="setPrintVal(ability + '_score', $event.target.value)"
                      class="w-5 text-center text-[10px] font-semibold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 ml-1"
                    />
                  </div>
                  <div class="font-bold text-[10px] px-1 py-0.2 rounded bg-gray-100 border border-gray-300">
                    <input
                      type="text"
                      :value="getPrintVal(ability + '_mod', (vtt.abilities?.[ability]?.modifier >= 0 ? '+' : '') + (vtt.abilities?.[ability]?.modifier || 0))"
                      @input="setPrintVal(ability + '_mod', $event.target.value)"
                      class="w-6 text-center font-bold text-[10px] text-gray-900 bg-transparent border-0 focus:outline-none p-0"
                    />
                  </div>
                  <div class="text-right text-[9px] flex items-center gap-0.5">
                    <span class="text-gray-500 text-[8px]">SAVE</span>
                    <span :class="vtt.saving_throws?.[ability]?.proficient ? 'font-bold text-gray-900' : 'text-gray-500'">
                      {{ vtt.saving_throws?.[ability]?.proficient ? '●' : '○' }}
                    </span>
                    <input
                      type="text"
                      :value="getPrintVal(ability + '_save', vtt.saving_throws?.[ability]?.modifier_string || '+0')"
                      @input="setPrintVal(ability + '_save', $event.target.value)"
                      class="w-5 text-right text-[9px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
                      :class="vtt.saving_throws?.[ability]?.proficient ? 'font-bold text-gray-900' : 'text-gray-600'"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Passive Senses -->
            <div class="border border-gray-800 rounded p-1.5 text-[9px] break-inside-avoid bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Passive Senses
              </div>
              <div class="space-y-0.5">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Passive Perception (WIS)</span>
                  <input
                    type="text"
                    :value="getPrintVal('passive_perception', vtt.senses?.passive_perception || 10)"
                    @input="setPrintVal('passive_perception', $event.target.value)"
                    class="w-5 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
                  />
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Passive Investigation (INT)</span>
                  <input
                    type="text"
                    :value="getPrintVal('passive_investigation', vtt.senses?.passive_investigation || 10)"
                    @input="setPrintVal('passive_investigation', $event.target.value)"
                    class="w-5 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
                  />
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Passive Insight (WIS)</span>
                  <input
                    type="text"
                    :value="getPrintVal('passive_insight', vtt.senses?.passive_insight || 10)"
                    @input="setPrintVal('passive_insight', $event.target.value)"
                    class="w-5 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
                  />
                </div>
              </div>
            </div>

            <!-- Skills List (All 18 D&D Skills) -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] break-inside-avoid bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Skills
              </div>
              <div class="space-y-0.5">
                <div
                  v-for="(sData, sKey) in computedSkills"
                  :key="sKey"
                  class="flex items-center justify-between py-0.2 text-[9px]"
                >
                  <div class="flex items-center gap-1 truncate max-w-[150px]">
                    <span class="text-[8.5px] font-mono text-gray-900 w-3 text-center shrink-0">
                      {{ sData.expertise ? '★' : (sData.proficient ? '●' : '○') }}
                    </span>
                    <span :class="sData.proficient ? 'font-bold text-gray-900' : 'text-gray-700'" class="capitalize truncate">
                      {{ sKey.replace(/_/g, ' ') }}
                    </span>
                    <span class="text-[7.5px] text-gray-400 uppercase font-semibold">({{ sData.ability.slice(0, 3) }})</span>
                  </div>
                  <input
                    type="text"
                    :value="getPrintVal('skill_' + sKey, (sData.total >= 0 ? '+' : '') + sData.total)"
                    @input="setPrintVal('skill_' + sKey, $event.target.value)"
                    class="w-5 text-right text-[9px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
                    :class="sData.proficient ? 'font-bold text-gray-900' : 'text-gray-600'"
                  />
                </div>
              </div>
            </div>

            <!-- Proficiencies & Languages -->
            <div class="border border-gray-800 rounded p-1.5 text-[9px] break-inside-avoid bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Proficiencies &amp; Languages
              </div>
              <div v-if="char.language?.length" class="mb-1 leading-tight">
                <span class="font-bold text-gray-800">Languages: </span>
                <span class="text-gray-600">{{ char.language.map(l => l.name).join(', ') }}</span>
              </div>
              <div v-if="char.proficiency?.length" class="leading-tight">
                <span class="font-bold text-gray-800">Proficiencies: </span>
                <span class="text-gray-600">{{ char.proficiency.map(p => cleanProficiencyName(p.name)).join(', ') }}</span>
              </div>
            </div>
          </div>

          <!-- Middle Column: Attacks, Actions, Equipment & Coins -->
          <div class="col-span-4 space-y-1.5">
            <!-- Attacks & Weapons -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] break-inside-avoid bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Attacks &amp; Weapons
              </div>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-200 text-[8px] uppercase text-gray-500 font-bold">
                    <th class="pb-0.5">Name</th>
                    <th class="pb-0.5 text-center">Atk</th>
                    <th class="pb-0.5 text-right">Damage / Type</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(atk, idx) in printAttackRows" :key="'atk_' + idx" class="text-[9.5px]">
                    <td class="py-0.5 font-semibold text-gray-900 truncate max-w-[85px]">
                      <input
                        type="text"
                        :value="getPrintVal('atk_' + idx + '_name', atk.name)"
                        @input="setPrintVal('atk_' + idx + '_name', $event.target.value)"
                        class="w-full bg-transparent border-0 border-b border-gray-100 focus:outline-none p-0 text-[9.5px] font-semibold text-gray-900"
                        placeholder="—"
                      />
                    </td>
                    <td class="py-0.5 text-center font-bold text-gray-800">
                      <input
                        type="text"
                        :value="getPrintVal('atk_' + idx + '_bonus', atk.attack_bonus)"
                        @input="setPrintVal('atk_' + idx + '_bonus', $event.target.value)"
                        class="w-6 text-center font-bold text-gray-800 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9.5px]"
                      />
                    </td>
                    <td class="py-0.5 text-right text-gray-700">
                      <input
                        type="text"
                        :value="getPrintVal('atk_' + idx + '_damage', atk.damage)"
                        @input="setPrintVal('atk_' + idx + '_damage', $event.target.value)"
                        class="w-20 text-right text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9.5px]"
                        placeholder="—"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Combat Actions & Resources -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] break-inside-avoid bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800 flex justify-between items-center">
                <span>Combat Actions &amp; Resources</span>
              </div>
              <div class="space-y-1">
                <div v-for="res in (classResourceTrackers || []).slice(0, 4)" :key="res.id" class="border-b border-gray-100 pb-0.5">
                  <div class="flex justify-between items-center">
                    <span class="font-bold text-gray-900 text-[9px]">{{ res.name }}</span>
                    <span class="text-[8px] font-mono text-gray-500 uppercase">{{ res.recharge }}</span>
                  </div>
                  <div class="text-[8px] text-gray-600 truncate">{{ res.subtitle }}</div>
                </div>
                <div class="text-[8.5px] text-gray-600 leading-tight pt-0.5">
                  <span class="font-bold text-gray-800">Standard Actions: </span>
                  <span>Attack, Cast Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use Object.</span>
                </div>
              </div>
            </div>

            <!-- Equipment & Coins -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] break-inside-avoid bg-white">
              <div class="flex justify-between items-center border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase tracking-wider text-gray-800">Equipment &amp; Coins</span>
              </div>

              <!-- Coin purse (Editable inputs) -->
              <div class="grid grid-cols-5 gap-0.5 mb-1.5 text-center text-[8.5px] font-bold">
                <div class="border border-gray-300 rounded p-0.5 bg-white flex items-center justify-center gap-0.5">
                  <span>CP:</span>
                  <input
                    type="text"
                    :value="getPrintVal('coin_cp', currency.cp ?? char.treasure?.cp ?? 0)"
                    @input="setPrintVal('coin_cp', $event.target.value)"
                    class="w-5 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[8.5px]"
                  />
                </div>
                <div class="border border-gray-300 rounded p-0.5 bg-white flex items-center justify-center gap-0.5">
                  <span>SP:</span>
                  <input
                    type="text"
                    :value="getPrintVal('coin_sp', currency.sp ?? char.treasure?.sp ?? 0)"
                    @input="setPrintVal('coin_sp', $event.target.value)"
                    class="w-5 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[8.5px]"
                  />
                </div>
                <div class="border border-gray-300 rounded p-0.5 bg-white flex items-center justify-center gap-0.5">
                  <span>EP:</span>
                  <input
                    type="text"
                    :value="getPrintVal('coin_ep', currency.ep ?? char.treasure?.ep ?? 0)"
                    @input="setPrintVal('coin_ep', $event.target.value)"
                    class="w-5 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[8.5px]"
                  />
                </div>
                <div class="border border-gray-300 rounded p-0.5 bg-white flex items-center justify-center gap-0.5">
                  <span>GP:</span>
                  <input
                    type="text"
                    :value="getPrintVal('coin_gp', currency.gp ?? char.treasure?.gp ?? 0)"
                    @input="setPrintVal('coin_gp', $event.target.value)"
                    class="w-5 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[8.5px]"
                  />
                </div>
                <div class="border border-gray-300 rounded p-0.5 bg-white flex items-center justify-center gap-0.5">
                  <span>PP:</span>
                  <input
                    type="text"
                    :value="getPrintVal('coin_pp', currency.pp ?? char.treasure?.pp ?? 0)"
                    @input="setPrintVal('coin_pp', $event.target.value)"
                    class="w-5 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[8.5px]"
                  />
                </div>
              </div>

              <!-- Items list -->
              <div class="space-y-0.5">
                <div
                  v-for="eq in (liveEquipment || []).slice(0, 11)"
                  :key="eq.id || eq.name"
                  class="flex justify-between text-[9px] text-gray-700 border-b border-gray-50 py-0.2"
                >
                  <span class="truncate max-w-[145px]">{{ eq.name }} <span v-if="eq.quantity > 1">({{ eq.quantity }}x)</span></span>
                  <span class="text-gray-400 text-[8px] shrink-0">{{ eq.weight ? eq.weight + ' lb' : '—' }}</span>
                </div>
                <div v-if="!liveEquipment || liveEquipment.length === 0" class="text-gray-400 text-[8.5px] italic">
                  Standard adventurer pack
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Features & Traits -->
          <div class="col-span-4 space-y-1.5">
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Features &amp; Traits
              </div>

              <!-- Class & Subclass Features -->
              <div class="mb-2">
                <div class="font-bold text-gray-900 text-[9px] uppercase border-b border-gray-100 pb-0.5 mb-1">
                  Class &amp; Subclass Features
                </div>
                <div class="space-y-0.5">
                  <div
                    v-for="cf in (combinedClassFeatures || []).slice(0, 10)"
                    :key="cf._key || cf.name"
                    class="border-b border-gray-50 pb-0.2 text-[9px]"
                  >
                    <span class="font-semibold text-gray-900">{{ cf.name }}</span>
                    <span v-if="cf.isSubclass" class="text-[8px] text-gray-500 ml-1">(Subclass, Lvl {{ cf.level }})</span>
                    <span v-else-if="cf.level" class="text-[8px] text-gray-500 ml-1">(Lvl {{ cf.level }})</span>
                  </div>
                </div>
              </div>

              <!-- Racial Traits & Feats -->
              <div>
                <div class="font-bold text-gray-900 text-[9px] uppercase border-b border-gray-100 pb-0.5 mb-1">
                  Racial Traits &amp; Feats
                </div>
                <div class="space-y-0.5">
                  <div
                    v-for="tr in (unpackedTraits || []).slice(0, 6)"
                    :key="tr._key || tr.name"
                    class="border-b border-gray-50 pb-0.2 text-[9px]"
                  >
                    <span class="font-semibold text-gray-900">{{ tr.name }}</span>
                    <span class="text-[8px] text-gray-500 ml-1">(Racial)</span>
                  </div>
                  <div
                    v-for="ft in (char.feat || []).slice(0, 4)"
                    :key="ft.name"
                    class="border-b border-gray-50 pb-0.2 text-[9px]"
                  >
                    <span class="font-semibold text-gray-900">{{ ft.name }}</span>
                    <span class="text-[8px] text-gray-500 ml-1">(Feat)</span>
                  </div>
                  <div
                    v-for="bf in (char.feature || []).slice(0, 2)"
                    :key="bf.name"
                    class="border-b border-gray-50 pb-0.2 text-[9px]"
                  >
                    <span class="font-semibold text-gray-900">{{ bf.name }}</span>
                    <span class="text-[8px] text-gray-500 ml-1">(Background)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- PAGE 2: SPELLCASTING & SPELLBOOK           -->
      <!-- ========================================== -->
      <div class="print-page print-page-container bg-white border border-gray-300 shadow-md p-4 max-w-[850px] mx-auto print:border-0 print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none">
        <div class="print-page-preview-header text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-200 pb-1 flex justify-between print:hidden">
          <span>Page 2: Spellcasting</span>
          <span>D&amp;D 5e Character Sheet</span>
        </div>

        <!-- Spellcasting Header Block -->
        <div class="border-2 border-gray-900 rounded p-2 mb-2 bg-white flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <h2 class="font-black text-gray-900 uppercase text-base tracking-wide">Spellcasting</h2>
          </div>
          <div class="grid grid-cols-4 gap-2 text-center text-[10px] flex-1 max-w-xl">
            <div class="border border-gray-300 rounded p-1 bg-white">
              <div class="text-[8px] uppercase text-gray-500 font-bold">Spellcasting Class</div>
              <input
                type="text"
                :value="getPrintVal('spell_class', char.class?.name || (Array.isArray(char.class) ? char.class[0]?.name : 'Adventurer'))"
                @input="setPrintVal('spell_class', $event.target.value)"
                class="w-full text-center font-bold text-gray-900 text-[10px] bg-transparent border-0 focus:outline-none p-0"
              />
            </div>
            <div class="border border-gray-300 rounded p-1 bg-white">
              <div class="text-[8px] uppercase text-gray-500 font-bold">Spellcasting Ability</div>
              <input
                type="text"
                :value="getPrintVal('spell_ability', (vtt.spellcasting?.ability || 'INT').slice(0, 3).toUpperCase())"
                @input="setPrintVal('spell_ability', $event.target.value)"
                class="w-full text-center font-bold text-gray-900 text-[10px] bg-transparent border-0 focus:outline-none p-0 uppercase"
              />
            </div>
            <div class="border border-gray-300 rounded p-1 bg-white">
              <div class="text-[8px] uppercase text-gray-500 font-bold">Spell Save DC</div>
              <input
                type="text"
                :value="getPrintVal('spell_dc', charSpellSaveDc)"
                @input="setPrintVal('spell_dc', $event.target.value)"
                class="w-full text-center font-black text-gray-900 text-sm bg-transparent border-0 focus:outline-none p-0 leading-none"
              />
            </div>
            <div class="border border-gray-300 rounded p-1 bg-white">
              <div class="text-[8px] uppercase text-gray-500 font-bold">Spell Attack Bonus</div>
              <input
                type="text"
                :value="getPrintVal('spell_atk_bonus', '+' + charSpellAttackBonus)"
                @input="setPrintVal('spell_atk_bonus', $event.target.value)"
                class="w-full text-center font-black text-gray-900 text-sm bg-transparent border-0 focus:outline-none p-0 leading-none"
              />
            </div>
          </div>
        </div>

        <!-- 3-Column Spell Layout (Cantrips & Level 1 to 9) -->
        <div class="grid grid-cols-3 gap-2">
          <!-- Column 1: Cantrips, Level 1, Level 2 -->
          <div class="space-y-2">
            <!-- Cantrips (0 Level) -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 text-gray-900 tracking-wider">
                Cantrips (0 Level)
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(0, 6)" :key="'cantrip_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">○</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_0_' + idx, sp.name)"
                    @input="setPrintVal('spell_0_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 1 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">1st Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_1', getMaxSlots(1))"
                    @input="setPrintVal('slots_total_1', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_1', expendedSlots[1] || 0)"
                    @input="setPrintVal('slots_exp_1', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(1, 8)" :key="'lvl1_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_1_' + idx, sp.name)"
                    @input="setPrintVal('spell_1_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 2 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">2nd Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_2', getMaxSlots(2))"
                    @input="setPrintVal('slots_total_2', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_2', expendedSlots[2] || 0)"
                    @input="setPrintVal('slots_exp_2', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(2, 7)" :key="'lvl2_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_2_' + idx, sp.name)"
                    @input="setPrintVal('spell_2_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Level 3, Level 4, Level 5 -->
          <div class="space-y-2">
            <!-- Level 3 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">3rd Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_3', getMaxSlots(3))"
                    @input="setPrintVal('slots_total_3', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_3', expendedSlots[3] || 0)"
                    @input="setPrintVal('slots_exp_3', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(3, 7)" :key="'lvl3_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_3_' + idx, sp.name)"
                    @input="setPrintVal('spell_3_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 4 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">4th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_4', getMaxSlots(4))"
                    @input="setPrintVal('slots_total_4', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_4', expendedSlots[4] || 0)"
                    @input="setPrintVal('slots_exp_4', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(4, 7)" :key="'lvl4_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_4_' + idx, sp.name)"
                    @input="setPrintVal('spell_4_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 5 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">5th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_5', getMaxSlots(5))"
                    @input="setPrintVal('slots_total_5', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_5', expendedSlots[5] || 0)"
                    @input="setPrintVal('slots_exp_5', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(5, 7)" :key="'lvl5_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_5_' + idx, sp.name)"
                    @input="setPrintVal('spell_5_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Column 3: Level 6, Level 7, Level 8, Level 9 -->
          <div class="space-y-2">
            <!-- Level 6 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">6th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_6', getMaxSlots(6))"
                    @input="setPrintVal('slots_total_6', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_6', expendedSlots[6] || 0)"
                    @input="setPrintVal('slots_exp_6', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(6, 5)" :key="'lvl6_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_6_' + idx, sp.name)"
                    @input="setPrintVal('spell_6_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 7 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">7th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_7', getMaxSlots(7))"
                    @input="setPrintVal('slots_total_7', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_7', expendedSlots[7] || 0)"
                    @input="setPrintVal('slots_exp_7', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(7, 5)" :key="'lvl7_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_7_' + idx, sp.name)"
                    @input="setPrintVal('spell_7_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 8 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">8th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_8', getMaxSlots(8))"
                    @input="setPrintVal('slots_total_8', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_8', expendedSlots[8] || 0)"
                    @input="setPrintVal('slots_exp_8', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(8, 5)" :key="'lvl8_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_8_' + idx, sp.name)"
                    @input="setPrintVal('spell_8_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <!-- Level 9 -->
            <div class="border border-gray-800 rounded p-1.5 text-[9.5px] bg-white break-inside-avoid">
              <div class="flex items-center justify-between border-b border-gray-300 pb-0.5 mb-1">
                <span class="font-bold uppercase text-gray-900">9th Level</span>
                <div class="flex items-center gap-1.5 text-[8.5px] text-gray-600">
                  <span>Slots:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_total_9', getMaxSlots(9))"
                    @input="setPrintVal('slots_total_9', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                  <span>Exp:</span>
                  <input
                    type="text"
                    :value="getPrintVal('slots_exp_9', expendedSlots[9] || 0)"
                    @input="setPrintVal('slots_exp_9', $event.target.value)"
                    class="w-4 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0"
                  />
                </div>
              </div>
              <div class="space-y-0.5">
                <div v-for="(sp, idx) in getPrintSpellRows(9, 5)" :key="'lvl9_' + idx" class="flex items-center gap-1 py-0.2">
                  <span class="text-[8px] font-mono text-gray-400 w-3 text-center shrink-0">{{ sp.prepared ? '●' : '○' }}</span>
                  <input
                    type="text"
                    :value="getPrintVal('spell_9_' + idx, sp.name)"
                    @input="setPrintVal('spell_9_' + idx, $event.target.value)"
                    class="flex-1 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px] text-gray-900"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- PAGE 3: CHARACTERISTICS & NOTES            -->
      <!-- ========================================== -->
      <div class="print-page print-page-container bg-white border border-gray-300 shadow-md p-4 max-w-[850px] mx-auto print:border-0 print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none">
        <div class="print-page-preview-header text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-200 pb-1 flex justify-between print:hidden">
          <span>Page 3: Characteristics, Backstory &amp; Notes</span>
          <span>D&amp;D 5e Character Sheet</span>
        </div>

        <!-- Header Block -->
        <div class="border-2 border-gray-900 rounded p-2 mb-2 bg-white">
          <div class="flex items-center justify-between border-b border-gray-200 pb-1 mb-1.5">
            <h2 class="font-black text-gray-900 uppercase text-base tracking-wide">Characteristics &amp; Details</h2>
            <div class="text-[10px] text-gray-600 font-bold uppercase">
              {{ getPrintVal('char_name', char.name || 'Unnamed Character') }}
            </div>
          </div>
          <!-- Physical Stats Grid -->
          <div class="grid grid-cols-5 gap-1.5 text-[9px] text-gray-600">
            <div>
              <span class="font-bold text-gray-800">Age: </span>
              <input
                type="text"
                :value="getPrintVal('char_age', parsedCharacteristics.age || '—')"
                @input="setPrintVal('char_age', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Height: </span>
              <input
                type="text"
                :value="getPrintVal('char_height', parsedCharacteristics.height || '—')"
                @input="setPrintVal('char_height', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Weight: </span>
              <input
                type="text"
                :value="getPrintVal('char_weight', parsedCharacteristics.weight || '—')"
                @input="setPrintVal('char_weight', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Eyes: </span>
              <input
                type="text"
                :value="getPrintVal('char_eyes', parsedCharacteristics.eyes || '—')"
                @input="setPrintVal('char_eyes', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Skin: </span>
              <input
                type="text"
                :value="getPrintVal('char_skin', parsedCharacteristics.skin || '—')"
                @input="setPrintVal('char_skin', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Hair: </span>
              <input
                type="text"
                :value="getPrintVal('char_hair', parsedCharacteristics.hair || '—')"
                @input="setPrintVal('char_hair', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Size: </span>
              <input
                type="text"
                :value="getPrintVal('char_size', parsedCharacteristics.size || 'Medium')"
                @input="setPrintVal('char_size', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div>
              <span class="font-bold text-gray-800">Gender: </span>
              <input
                type="text"
                :value="getPrintVal('char_gender', parsedCharacteristics.gender || '—')"
                @input="setPrintVal('char_gender', $event.target.value)"
                class="w-12 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
            <div class="col-span-2">
              <span class="font-bold text-gray-800">Faith: </span>
              <input
                type="text"
                :value="getPrintVal('char_faith', parsedCharacteristics.faith || '—')"
                @input="setPrintVal('char_faith', $event.target.value)"
                class="w-28 font-medium text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]"
              />
            </div>
          </div>
        </div>

        <!-- 2-Column Characteristics Layout -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Left Column: Appearance, Backstory, Allies -->
          <div class="space-y-2">
            <!-- Physical Appearance -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Character Appearance
              </div>
              <div class="flex gap-2">
                <div v-if="resolvedImageUrl" class="w-16 h-16 rounded border border-gray-300 overflow-hidden shrink-0">
                  <img :src="resolvedImageUrl" :alt="char.name" class="w-full h-full object-cover" />
                </div>
                <textarea
                  :value="getPrintVal('char_appearance', parsedCharacteristics.appearance || '')"
                  @input="setPrintVal('char_appearance', $event.target.value)"
                  rows="4"
                  class="flex-1 bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-relaxed"
                  placeholder="Describe character appearance..."
                ></textarea>
              </div>
            </div>

            <!-- Backstory -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Character Backstory
              </div>
              <textarea
                :value="getPrintVal('char_backstory', sheetNotes.backstory || '')"
                @input="setPrintVal('char_backstory', $event.target.value)"
                rows="8"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-relaxed"
                placeholder="Character backstory, origin, and history..."
              ></textarea>
            </div>

            <!-- Allies & Organizations -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Allies &amp; Organizations
              </div>
              <textarea
                :value="getPrintVal('char_allies', sheetNotes.allies || sheetNotes.organizations || '')"
                @input="setPrintVal('char_allies', $event.target.value)"
                rows="4"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-relaxed"
                placeholder="Factions, allies, contacts, or organizations..."
              ></textarea>
            </div>
          </div>

          <!-- Right Column: Traits, Ideals, Bonds, Flaws, Additional Features & Treasure -->
          <div class="space-y-2">
            <!-- Personality Traits -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Personality Traits
              </div>
              <textarea
                :value="getPrintVal('char_traits', (parsedCharacteristics.personalityTraits || []).join('\n'))"
                @input="setPrintVal('char_traits', $event.target.value)"
                rows="3"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-snug"
                placeholder="Personality traits..."
              ></textarea>
            </div>

            <!-- Ideals -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Ideals
              </div>
              <textarea
                :value="getPrintVal('char_ideals', (parsedCharacteristics.ideals || []).join('\n'))"
                @input="setPrintVal('char_ideals', $event.target.value)"
                rows="2"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-snug"
                placeholder="Ideals & beliefs..."
              ></textarea>
            </div>

            <!-- Bonds -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Bonds
              </div>
              <textarea
                :value="getPrintVal('char_bonds', (parsedCharacteristics.bonds || []).join('\n'))"
                @input="setPrintVal('char_bonds', $event.target.value)"
                rows="2"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-snug"
                placeholder="Bonds & connections..."
              ></textarea>
            </div>

            <!-- Flaws -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Flaws
              </div>
              <textarea
                :value="getPrintVal('char_flaws', (parsedCharacteristics.flaws || []).join('\n'))"
                @input="setPrintVal('char_flaws', $event.target.value)"
                rows="2"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-snug"
                placeholder="Flaws & weaknesses..."
              ></textarea>
            </div>

            <!-- Additional Notes & Treasure -->
            <div class="border border-gray-800 rounded p-2 text-[9.5px] bg-white break-inside-avoid">
              <div class="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 tracking-wider text-gray-800">
                Additional Notes &amp; Treasure
              </div>
              <textarea
                :value="getPrintVal('char_notes', sheetNotes.other || '')"
                @input="setPrintVal('char_notes', $event.target.value)"
                rows="3"
                class="w-full bg-transparent border border-gray-200 rounded p-1 text-[9.5px] text-gray-800 focus:outline-none resize-none leading-snug"
                placeholder="Campaign notes, treasure, quest items..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4 portrait;
    margin: 5mm 5mm;
  }
  body, html {
    background: white !important;
    color: #111827 !important;
    font-size: 10px !important;
  }
  .printable-sheet {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    background: white !important;
    color: #111827 !important;
  }
  .print-page {
    display: block !important;
    width: 100% !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    min-height: 275mm !important;
    max-height: 284mm !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 0 10mm 0 !important;
  }
  .print-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
    margin-bottom: 0 !important;
  }
  .print-page-preview-header {
    display: none !important;
  }
  .print-page-container {
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
  input, textarea {
    border-color: #cbd5e1 !important;
    color: #111827 !important;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}
</style>
