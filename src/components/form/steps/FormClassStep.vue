<script setup>
import ClassSubClassDetail from '../../ClassSubClassDetail.vue'
import ClassSpellsPicker from '../../ClassSpellsPicker.vue'
import FeatSpellsPicker from '../../FeatSpellsPicker.vue'

const props = defineProps({
  totalCharacterLevel: { type: Number, default: 1 },
  availableClassesForMulticlass: { type: Object, default: () => ({}) },
  classSelected: { type: String, default: '' },
  filteredClasses: { type: Object, default: () => ({}) },
  classLevel: { type: [Number, String], default: 1 },
  maxPrimaryClassLevel: { type: Number, default: 20 },
  isSpellcasterClass: { type: Boolean, default: false },
  detectedFeatSpellSources: { type: Array, default: () => [] },
  classSubTab: { type: String, default: 'features' },
  chosenSpells: { type: Array, default: () => [] },
  featChosenSpells: { type: Array, default: () => [] },
  characterClass: { type: Object, default: () => ({}) },
  availableSubClasses: { type: Array, default: () => [] },
  selectedSubClassKey: { type: String, default: '' },
  subclassUnlockLevel: { type: Number, default: 3 },
  subClassFeatures: { type: Array, default: () => [] },
  classSkillConfig: { type: Object, default: () => ({ count: 0, from: [] }) },
  availableClassSkills: { type: Array, default: () => [] },
  chosenClassSkills: { type: Array, default: () => [] },
  priorGrantedSkills: { type: Array, default: () => [] },
  getSkillLabel: { type: Function, required: true },
  expertiseConfig: { type: Object, default: () => ({ eligible: false, count: 0 }) },
  allProficientSkills: { type: Array, default: () => [] },
  chosenExpertiseSkills: { type: Array, default: () => [] },
  classToolConfig: { type: Object, default: () => ({ count: 0, from: [] }) },
  chosenClassTools: { type: Array, default: () => [] },
  asiTierChoices: { type: Object, default: () => ({}) },
  unlockedAsiTiers: { type: Array, default: () => [] },
  filteredFeats: { type: Array, default: () => [] },
  selectedEdition: { type: String, default: '2024' },
  currentAbilityScoresMap: { type: Object, default: () => ({}) },
  selectedSubClassItem: { type: Object, default: null },
  strength: { type: Number, default: 10 },
  dexterity: { type: Number, default: 10 },
  constitution: { type: Number, default: 10 },
  intelligence: { type: Number, default: 10 },
  wisdom: { type: Number, default: 10 },
  charisma: { type: Number, default: 10 },
  computedProficiencyBonus: { type: Number, default: 2 },
  multiclasses: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },

  // Handler functions
  addMulticlass: { type: Function, required: true },
  searchClass: { type: Function, required: true },
  onSubClassSelect: { type: Function, required: true },
  toggleClassSkill: { type: Function, required: true },
  toggleExpertiseSkill: { type: Function, required: true },
  onUpdateClassTool: { type: Function, required: true },
  removeMulticlass: { type: Function, required: true },
  getMaxLevelForMc: { type: Function, required: true },
  onMcClassChange: { type: Function, required: true },
  getMcPrereqStatus: { type: Function, required: true },
  formatPrerequisitesText: { type: Function, required: true },
  getMcProficiencies: { type: Function, required: true },
  isMcPrereqMet: { type: Function, required: true },
  getMcSkillConfig: { type: Function, required: true },
  getMcAvailableSkills: { type: Function, required: true },
  isSkillPriorGranted: { type: Function, required: true },
  toggleMcSkill: { type: Function, required: true },
  isMcSpellcaster: { type: Function, required: true },
  getMcAvailableSubClasses: { type: Function, required: true },
  getSubclassUnlockLevel: { type: Function, required: true },
  getUnlockedAsiTiersForClass: { type: Function, required: true },
  onMcSubclassSelect: { type: Function, required: true }
})

const emit = defineEmits([
  'update:classSelected',
  'update:classLevel',
  'update:classSubTab',
  'update:chosenSpells',
  'update:featChosenSpells'
])
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h2 class="text-base font-bold text-gray-900">Class & Subclass</h2>
        <p class="text-xs text-gray-500">
          Total Character Level: <span class="font-bold text-gray-800">{{ totalCharacterLevel }} / 20</span>
        </p>
      </div>
      <button
        v-if="totalCharacterLevel < 20 && Object.keys(availableClassesForMulticlass).length > 0"
        type="button"
        @click="addMulticlass"
        class="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded transition cursor-pointer flex items-center gap-1"
      >
        <span>+ Add Class</span>
      </button>
    </div>

    <!-- Primary Class Card -->
    <div class="p-3 bg-white border border-gray-200 rounded mb-4">
      <div class="text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-2">
        Primary Class
      </div>
      <div class="grid grid-cols-4 gap-2 mb-3">
        <div class="col-span-3" data-error-field="characterClass">
          <label for="characterClass" class="block text-xs font-semibold text-gray-700 mb-1">Class:</label>
          <v-select
            id="characterClass"
            :model-value="classSelected || null"
            :options="Object.keys(filteredClasses)"
            :get-option-label="n => n ? n.charAt(0).toUpperCase() + n.slice(1) : ''"
            placeholder="Choose class..."
            @update:model-value="val => { emit('update:classSelected', val || ''); searchClass(val || '') }"
            :class="{ 'has-error': errors.characterClass }"
          />
          <p v-if="errors.characterClass" class="mt-1 text-xs text-red-600 font-medium">
            {{ errors.characterClass }}
          </p>
        </div>

        <div class="col-span-1">
          <label for="characterClassLevel" class="block text-xs font-semibold text-gray-700 mb-1">Level:</label>
          <select
            :value="classLevel"
            @change="emit('update:classLevel', Number($event.target.value))"
            class="p-2 border border-gray-300 rounded w-full text-xs bg-white"
            id="characterClassLevel"
          >
            <option v-for="n in maxPrimaryClassLevel" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>

      <!-- Sub-tabs for Class Features vs Spells vs Feat Spells -->
      <div v-if="isSpellcasterClass || detectedFeatSpellSources.length > 0" class="flex border-b border-gray-200 mb-3">
        <button
          type="button"
          @click="emit('update:classSubTab', 'features')"
          :class="classSubTab === 'features' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
          class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t"
        >
          Class Features
        </button>
        <button
          v-if="isSpellcasterClass"
          type="button"
          @click="emit('update:classSubTab', 'spells')"
          :class="classSubTab === 'spells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
          class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
        >
          <span>Spells</span>
          <span
            v-if="chosenSpells.length > 0"
            class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200"
          >
            {{ chosenSpells.length }}
          </span>
        </button>
        <button
          v-if="detectedFeatSpellSources.length > 0"
          type="button"
          @click="emit('update:classSubTab', 'featSpells')"
          :class="classSubTab === 'featSpells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:text-gray-700 font-medium'"
          class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
        >
          <span>Feat Spells</span>
          <span
            v-if="featChosenSpells.length > 0"
            class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200"
          >
            {{ featChosenSpells.length }}
          </span>
        </button>
      </div>

      <!-- Features view -->
      <div v-show="classSubTab === 'features' || (!isSpellcasterClass && classSubTab !== 'featSpells')">
        <ClassSubClassDetail
          :selected="characterClass"
          :classLevel="Number(classLevel)"
          :availableSubClasses="availableSubClasses"
          :selectedSubClassKey="selectedSubClassKey"
          :subclassError="errors.subclass"
          :subclassUnlockLevel="subclassUnlockLevel"
          :subClassFeatures="subClassFeatures"
          :classSkillConfig="classSkillConfig"
          :availableClassSkills="availableClassSkills"
          :chosenClassSkills="chosenClassSkills"
          :priorGrantedSkills="priorGrantedSkills"
          :skillError="errors.classSkills"
          :getSkillLabel="getSkillLabel"
          :expertiseConfig="expertiseConfig"
          :allProficientSkills="allProficientSkills"
          :chosenExpertiseSkills="chosenExpertiseSkills"
          :expertiseError="errors.expertises"
          :classToolConfig="classToolConfig"
          :chosenClassTools="chosenClassTools"
          :toolError="errors.classTools"
          :asiTierChoices="asiTierChoices"
          :unlockedAsiTiers="unlockedAsiTiers"
          :filteredFeats="filteredFeats"
          :asiTierErrors="errors"
          :errorPrefix="''"
          :edition="selectedEdition"
          :abilityScores="currentAbilityScoresMap"
          @selectSubclass="onSubClassSelect"
          @toggleClassSkill="toggleClassSkill"
          @toggleExpertiseSkill="toggleExpertiseSkill"
          @updateClassTool="onUpdateClassTool"
        />
      </div>

      <!-- Spells view -->
      <div v-if="isSpellcasterClass && classSubTab === 'spells'" data-error-field="classSpells">
        <ClassSpellsPicker
          :edition="selectedEdition"
          :className="characterClass.class?.name || classSelected"
          :subclassName="selectedSubClassItem?.name || ''"
          :classLevel="Number(classLevel)"
          :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
          :proficiencyBonus="computedProficiencyBonus"
          :error="errors.classSpells"
          :model-value="chosenSpells"
          @update:model-value="emit('update:chosenSpells', $event)"
          @close="emit('update:classSubTab', 'features')"
        />
      </div>

      <!-- Feat Spells view -->
      <div v-if="detectedFeatSpellSources.length > 0 && classSubTab === 'featSpells'">
        <FeatSpellsPicker
          :edition="selectedEdition"
          :featSources="detectedFeatSpellSources"
          :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
          :proficiencyBonus="computedProficiencyBonus"
          :model-value="featChosenSpells"
          @update:model-value="emit('update:featChosenSpells', $event)"
          @close="emit('update:classSubTab', 'features')"
        />
      </div>
    </div>

    <!-- Secondary Multiclass Collapsible Cards -->
    <div
      v-for="(mc, mcIdx) in multiclasses"
      :key="mc.id"
      :id="mc.id"
      class="border rounded mb-4 bg-white shadow-xs transition relative"
      :class="[
        errors['class_mc_' + mcIdx] ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200',
        !mc.isCollapsed ? 'focus-within:z-30' : ''
      ]"
      :data-error-field="'class_mc_' + mcIdx"
    >
      <!-- Collapsible Header -->
      <div
        @click="mc.isCollapsed = !mc.isCollapsed"
        class="flex items-center justify-between p-3 bg-gray-50/90 hover:bg-gray-100/80 cursor-pointer select-none transition border-b border-gray-200"
        :class="mc.isCollapsed ? 'rounded' : 'rounded-t'"
      >
        <div class="flex items-center gap-2">
          <svg
            class="w-3.5 h-3.5 text-gray-500 transition-transform duration-200"
            :class="{ '-rotate-90': mc.isCollapsed }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          <span class="text-xs font-bold uppercase tracking-wider text-gray-900">
            Class {{ mcIdx + 2 }}: {{ mc.characterClass?.class?.name || (mc.classSelected ? (mc.classSelected.charAt(0).toUpperCase() + mc.classSelected.slice(1)) : 'Secondary Class') }}
          </span>
          <span v-if="mc.classSelected" class="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-gray-100 text-gray-700 border border-gray-200">
            Level {{ mc.classLevel }}
          </span>
        </div>

        <button
          type="button"
          @click.stop="removeMulticlass(mcIdx)"
          class="text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer px-2 py-1 rounded hover:bg-red-50 transition"
        >
          Remove Class
        </button>
      </div>

      <!-- Collapsible Content -->
      <div v-show="!mc.isCollapsed" class="p-3 rounded-b">
        <div class="grid grid-cols-4 gap-2 mb-3">
          <div class="col-span-3">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Class:</label>
            <v-select
              :model-value="mc.classSelected || null"
              :options="Object.keys(filteredClasses)"
              :get-option-label="n => n ? n.charAt(0).toUpperCase() + n.slice(1) : ''"
              :selectable="n => n.toLowerCase() !== (classSelected || '').toLowerCase() && !multiclasses.some((other, oIdx) => oIdx !== mcIdx && other.classSelected?.toLowerCase() === n.toLowerCase())"
              placeholder="Choose secondary class..."
              @update:model-value="val => { mc.classSelected = val || ''; onMcClassChange(mc) }"
              :class="{ 'has-error': errors['class_mc_' + mcIdx] }"
            />
            <p v-if="errors['class_mc_' + mcIdx]" class="mt-1 text-xs text-red-600 font-medium">
              {{ errors['class_mc_' + mcIdx] }}
            </p>
          </div>

          <div class="col-span-1">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Level:</label>
            <select v-model="mc.classLevel" class="p-2 border border-gray-300 rounded w-full text-xs bg-white">
              <option v-for="n in getMaxLevelForMc(mcIdx)" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Prompt when no class selected yet -->
        <div v-if="!mc.classSelected" class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-center text-xs text-gray-500">
          Choose a secondary class above to configure its progression, features, and archetypes.
        </div>

        <!-- When class is selected -->
        <template v-else>
          <!-- Multiclass Prerequisites & Proficiencies Rules Card -->
          <div class="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                Multiclassing Rules ({{ (mc.classSelected || '').toUpperCase() }})
              </span>
              <span
                v-if="getMcPrereqStatus(mc).scoresAssigned"
                :class="getMcPrereqStatus(mc).met
                  ? 'text-emerald-700 font-semibold'
                  : 'text-red-600 font-semibold'"
                class="text-[11px]"
              >
                {{ getMcPrereqStatus(mc).met ? 'Prerequisite Met' : 'Prerequisite Not Met' }}
              </span>
              <span
                v-else
                class="text-[11px] text-gray-500 font-normal"
              >
                Min 13 Required
              </span>
            </div>

            <!-- Prerequisites Breakdown -->
            <div class="space-y-1 text-gray-700 pt-1 border-t border-gray-200">
              <div class="flex items-start justify-between gap-2">
                <span>
                  <span class="font-semibold text-gray-800">Prerequisite ({{ (mc.classSelected || '').toUpperCase() }}):</span>
                  Min 13 {{ formatPrerequisitesText(mc.classSelected, mc.characterClass?.class) }}
                </span>
                <span
                  v-if="getMcPrereqStatus(mc).scoresAssigned"
                  :class="getMcPrereqStatus(mc).met ? 'text-emerald-700' : 'text-rose-600'"
                  class="font-mono text-[11px] font-semibold shrink-0"
                >
                  {{ getMcPrereqStatus(mc).details }}
                </span>
              </div>
            </div>

            <!-- Multiclass Proficiencies Gained Breakdown -->
            <div class="pt-2 border-t border-gray-200 space-y-1 text-gray-700">
              <div class="font-semibold text-gray-800 text-[11px] uppercase tracking-wider">
                Proficiencies Gained:
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div><b>Armor:</b> {{ getMcProficiencies(mc).armor.length ? getMcProficiencies(mc).armor.join(', ') : 'None' }}</div>
                <div><b>Weapons:</b> {{ getMcProficiencies(mc).weapons.length ? getMcProficiencies(mc).weapons.join(', ') : 'None' }}</div>
                <div><b>Tools:</b> {{ getMcProficiencies(mc).tools.length ? getMcProficiencies(mc).tools.join(', ') : 'None' }}</div>
                <div><b>Starting Equipment:</b> {{ getMcProficiencies(mc).equipment?.length ? getMcProficiencies(mc).equipment.join(', ') : 'None' }}</div>
              </div>
            </div>

            <!-- Interactive Multiclass Skill Choice (e.g. Rogue, Ranger, Bard) -->
            <div
              v-if="isMcPrereqMet(mc) && getMcSkillConfig(mc).count > 0"
              :data-error-field="'skills_mc_' + mcIdx"
              class="pt-2 border-t border-gray-200 space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-800 text-[11px]">
                  Choose {{ getMcSkillConfig(mc).count }} Skill Proficiency:
                </span>
                <span class="text-[11px] text-gray-500 font-mono">
                  {{ (mc.chosenSkills || []).length }} / {{ Math.min(getMcSkillConfig(mc).count, getMcAvailableSkills(mc).length) }} selected
                </span>
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="skKey in getMcSkillConfig(mc).from"
                  :key="skKey"
                  type="button"
                  :disabled="isSkillPriorGranted(skKey, mc)"
                  @click="toggleMcSkill(mc, skKey, mcIdx)"
                  :class="[
                    isSkillPriorGranted(skKey, mc)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      : (mc.chosenSkills || []).includes(skKey)
                        ? 'border-gray-800 bg-gray-100 text-gray-900 font-semibold ring-1 ring-gray-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                    'px-2 py-1 border rounded text-xs transition cursor-pointer'
                  ]"
                >
                  {{ getSkillLabel(skKey) }}
                  <span v-if="isSkillPriorGranted(skKey, mc)" class="text-[9px] text-gray-400 ml-1">
                    (already granted)
                  </span>
                </button>
              </div>
              <p v-if="errors['skills_mc_' + mcIdx]" class="text-xs text-red-600 font-medium">
                {{ errors['skills_mc_' + mcIdx] }}
              </p>
            </div>
          </div>

          <!-- If multiclass prerequisites are met: show feature collapses & spells -->
          <template v-if="isMcPrereqMet(mc)">
            <!-- Sub-tabs for Features vs Spells (if secondary class is Spellcaster) -->
            <div v-if="isMcSpellcaster(mc)" class="flex border-b border-gray-200 mb-3">
              <button
                type="button"
                @click="mc.classSubTab = 'features'"
                :class="mc.classSubTab === 'features' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-white' : 'text-gray-500 hover:text-gray-700 font-medium'"
                class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t"
              >
                Features
              </button>
              <button
                type="button"
                @click="mc.classSubTab = 'spells'"
                :class="mc.classSubTab === 'spells' ? 'border-b-2 border-gray-800 text-gray-900 font-bold bg-white' : 'text-gray-500 hover:text-gray-700 font-medium'"
                class="px-3.5 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition rounded-t flex items-center gap-1.5"
              >
                <span>Spells</span>
                <span v-if="mc.chosenSpells?.length > 0" class="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-700 rounded-full font-mono font-bold border border-gray-200">
                  {{ mc.chosenSpells.length }}
                </span>
              </button>
            </div>

            <!-- Features view -->
            <div v-show="!isMcSpellcaster(mc) || mc.classSubTab === 'features'">
              <ClassSubClassDetail
                v-if="mc.characterClass?.class"
                :selected="mc.characterClass"
                :classLevel="Number(mc.classLevel)"
                :availableSubClasses="getMcAvailableSubClasses(mc)"
                :selectedSubClassKey="mc.selectedSubClassKey"
                :subclassError="errors['subclass_mc_' + mcIdx]"
                :subclassUnlockLevel="getSubclassUnlockLevel(mc.classSelected || mc.characterClass?.class?.name, selectedEdition)"
                :subClassFeatures="mc.selectedSubClassItem?.subClassFeature || []"
                :classSkillConfig="{ count: 0, from: [] }"
                :availableClassSkills="[]"
                :chosenClassSkills="[]"
                :priorGrantedSkills="allProficientSkills"
                :skillError="''"
                :getSkillLabel="getSkillLabel"
                :expertiseConfig="{ eligible: false, count: 0 }"
                :allProficientSkills="allProficientSkills"
                :chosenExpertiseSkills="[]"
                :expertiseError="''"
                :classToolConfig="{ count: 0, from: [] }"
                :chosenClassTools="[]"
                :toolError="''"
                :asiTierChoices="mc.asiTierChoices"
                :unlockedAsiTiers="getUnlockedAsiTiersForClass(mc.classSelected || mc.characterClass?.class?.name, mc.classLevel)"
                :filteredFeats="filteredFeats"
                :asiTierErrors="errors"
                :errorPrefix="'mc_' + mcIdx"
                :edition="selectedEdition"
                :abilityScores="currentAbilityScoresMap"
                @selectSubclass="(key) => onMcSubclassSelect(mc, key, mcIdx)"
                @toggleClassSkill="() => {}"
                @toggleExpertiseSkill="() => {}"
                @updateClassTool="() => {}"
              />
            </div>

            <!-- Spells view -->
            <div v-if="isMcSpellcaster(mc) && mc.classSubTab === 'spells'">
              <ClassSpellsPicker
                :edition="selectedEdition"
                :className="mc.characterClass.class?.name || mc.classSelected"
                :subclassName="mc.selectedSubClassItem?.name || ''"
                :classLevel="Number(mc.classLevel)"
                :abilityScores="{ strength, dexterity, constitution, intelligence, wisdom, charisma }"
                :proficiencyBonus="computedProficiencyBonus"
                :error="''"
                v-model="mc.chosenSpells"
                @close="mc.classSubTab = 'features'"
              />
            </div>
          </template>

          <!-- Locked State When Prerequisites Not Met -->
          <div
            v-else
            class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-center text-xs text-gray-600 space-y-1"
          >
            <div class="font-semibold text-gray-800">
              Prerequisites Not Met
            </div>
            <p class="text-[11px] text-gray-500 leading-relaxed max-w-md mx-auto">
              Features, subclass options, and spells remain locked until ability score prerequisites are satisfied in the Ability Scores step.
            </p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
