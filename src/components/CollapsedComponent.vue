<script setup>
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '../stores/character'
import { renderAnnotatedText, renderTableCell } from '../utils/textRenderer'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  classLevel: {
    type: Number,
    default: 1
  },
  isSubclassFeature: {
    type: Boolean,
    default: false
  },
  subclassUnlockLevel: {
    type: Number,
    default: 3
  },
  availableSubClasses: {
    type: Array,
    default: () => []
  },
  selectedSubClassKey: {
    type: String,
    default: ''
  },
  subclassError: {
    type: String,
    default: ''
  },
  hasError: {
    type: Boolean,
    default: false
  },
  errorPrefix: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['selectSubclass'])

// Start open if it's the subclass feature that needs user attention or has an error
const shouldStartOpen = computed(() => {
  if (props.hasError) return true
  if (props.subclassError) return true
  if (props.data?.isProficiencyFeature) return true
  return props.isSubclassFeature && props.classLevel >= props.subclassUnlockLevel && !props.selectedSubClassKey
})

const isCollapsed = ref(!shouldStartOpen.value)

watch(() => props.subclassError, (newErr) => {
  if (newErr && props.isSubclassFeature) {
    isCollapsed.value = false
  }
})

watch(() => props.hasError, (newErr) => {
  if (newErr) {
    isCollapsed.value = false
  }
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const characterStore = useCharacterStore()

const isSubclassFeatureBadge = computed(() => {
  return Boolean(
    props.isSubclassFeature ||
    props.data?._fromSubclass ||
    props.data?.subclassFeature ||
    props.data?.isSyntheticSubclassSlot ||
    props.data?.subclassName ||
    props.data?.subclassShortName ||
    props.data?.sub_class_id
  )
})

const isOptionalFeature = computed(() => {
  const d = props.data
  if (!d) return false
  if (d.isClassFeatureVariant || d.isOptional || d.optional) return true
  if (typeof d.name === 'string' && /\boptional\b/i.test(d.name)) return true
  const entriesStr = typeof d.entries === 'string' ? d.entries : JSON.stringify(d.entries || [])
  const lower = entriesStr.toLowerCase()
  return (
    lower.includes('optional class feature') ||
    lower.includes('optional feature') ||
    lower.includes('variantrule optional') ||
    lower.includes('{@variantrule optional')
  )
})

const onSelectSubclass = (key) => {
  emit('selectSubclass', key)
}
</script>

<template>
  <div
    class="border rounded mb-2 overflow-hidden bg-white text-xs transition"
    :class="(isSubclassFeature && subclassError && !selectedSubClassKey) || hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'"
  >
    <div
      class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-bold text-gray-900">{{ data.name }}</span>
        <span v-if="data.level" class="text-[11px] text-gray-500">Level {{ data.level }}</span>
        <span v-if="isSubclassFeatureBadge" class="text-[11px] font-medium text-indigo-600">
          Subclass Feature
        </span>
        <span v-if="data.subclassName" class="text-[11px] text-gray-500 font-normal">
          ({{ data.subclassName }})
        </span>
        <span v-if="isOptionalFeature" class="text-[11px] font-medium text-amber-600">
          Optional Feature
        </span>
      </div>
      <span class="text-gray-500 font-mono text-sm leading-none font-bold">
        {{ isCollapsed ? '+' : '-' }}
      </span>
    </div>

    <transition name="fade">
      <div v-show="!isCollapsed" class="p-3 border-t border-gray-200 bg-white space-y-3">
        <!-- Feature Entries / Explanations -->
        <div v-if="data.entries && data.entries.length" class="space-y-2 text-gray-700 leading-relaxed">
          <template v-for="(e, idx) in data.entries" :key="idx">
            <p v-if="typeof e === 'string'" v-html="renderAnnotatedText(e)"></p>
            <div v-else-if="typeof e === 'object' && e.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
              <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                <caption v-if="e.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                  {{ e.caption }}
                </caption>
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      v-for="(h, hIdx) in (e.colLabels || [])"
                      :key="hIdx"
                      class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                      v-html="renderTableCell(h)"
                    ></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="(r, rIdx) in (e.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                    <td
                      v-for="(c, cIdx) in r"
                      :key="cIdx"
                      class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                      v-html="renderTableCell(c)"
                    ></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="typeof e === 'object' && e.type === 'entries'" class="mt-2">
              <h4 v-if="e.name" class="font-bold text-gray-800" v-html="renderAnnotatedText(e.name)"></h4>
              <div v-for="(en, eIdx) in e.entries" :key="eIdx" class="mt-1">
                <p v-if="typeof en === 'string'" v-html="renderAnnotatedText(en)"></p>
                <div v-else-if="en.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                  <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                    <caption v-if="en.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                      {{ en.caption }}
                    </caption>
                    <thead class="bg-gray-50">
                      <tr>
                        <th
                          v-for="(h, hIdx) in (en.colLabels || [])"
                          :key="hIdx"
                          class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                          v-html="renderTableCell(h)"
                        ></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                      <tr v-for="(r, rIdx) in (en.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
                        <td
                          v-for="(c, cIdx) in r"
                          :key="cIdx"
                          class="px-2.5 py-1.5 text-gray-700 text-xs whitespace-normal align-top"
                          v-html="renderTableCell(c)"
                        ></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else-if="en.type === 'abilityDc'" class="p-2 bg-gray-50 border border-gray-200 rounded text-[11px]">
                  <div><b>Spell Save DC</b> = 8 + Proficiency Bonus + Ability Modifier</div>
                  <div><b>Spell Attack Modifier</b> = Proficiency Bonus + Ability Modifier</div>
                </div>
              </div>
            </div>
            <div v-else-if="typeof e === 'object' && e.type === 'list'" class="pl-3 sm:pl-4">
              <ul class="list-disc space-y-1">
                <li v-for="(item, iIdx) in e.items" :key="iIdx">
                  <span v-if="typeof item === 'string'" v-html="renderAnnotatedText(item)"></span>
                  <span v-else-if="item.name"><b>{{ item.name }}:</b> {{ renderAnnotatedText(item.entry || '') }}</span>
                </li>
              </ul>
            </div>
          </template>
        </div>
        <p v-else class="text-gray-400 italic">No additional rules text.</p>

        <!-- Subclass Choice Section (Inside this Subclass Feature Collapse) -->
        <div v-if="isSubclassFeature" :data-error-field="errorPrefix ? 'subclass_' + errorPrefix : 'subclass'" class="mt-3 pt-3 border-t border-gray-200 bg-gray-50/70 p-3 rounded">
          <div v-if="classLevel < subclassUnlockLevel" class="text-gray-600 text-xs">
            Subclass selection unlocks at Level {{ subclassUnlockLevel }} (Current: Level {{ classLevel }}).
          </div>
          <div v-else class="space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="block font-semibold text-gray-900 text-xs">
                Select Subclass (Required at Level {{ subclassUnlockLevel }}+):
              </label>
              <span v-if="selectedSubClassKey" class="text-[11px] text-indigo-700 font-semibold">Selected</span>
            </div>

            <!-- Selectable Subclass Cards/List -->
            <div v-if="availableSubClasses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="sc in availableSubClasses"
                :key="sc.name + '|' + (sc.source || '')"
                @click="onSelectSubclass(sc.name + '|' + (sc.source || ''))"
                :class="[
                  (selectedSubClassKey === (sc.name + '|' + (sc.source || '')) || selectedSubClassKey === sc.name || (selectedSubClassKey && selectedSubClassKey.startsWith(sc.name + '|')))
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  subclassError && !selectedSubClassKey ? 'border-red-400' : '',
                  'p-2.5 border rounded cursor-pointer transition text-xs'
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-gray-900">{{ sc.name }}</span>
                  <span class="text-[10px] text-gray-500 font-mono">{{ sc.source }}</span>
                </div>
                <p v-if="sc.short_name || sc.subclassSpells" class="text-[11px] text-gray-500 mt-0.5">
                  {{ sc.short_name || 'Subclass' }}
                </p>
              </div>
            </div>

            <!-- Fallback Dropdown -->
            <div v-else>
              <select
                :value="selectedSubClassKey"
                @change="e => onSelectSubclass(e.target.value)"
                :class="subclassError && !selectedSubClassKey ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'"
                class="w-full p-2 border rounded bg-white text-xs text-gray-900"
              >
                <option value="">Select a subclass...</option>
                <option
                  v-for="sc in availableSubClasses"
                  :key="sc.name + '|' + (sc.source || '')"
                  :value="sc.name + '|' + (sc.source || '')"
                >
                  {{ sc.name }} ({{ sc.source }})
                </option>
              </select>
            </div>

            <p v-if="subclassError && !selectedSubClassKey" class="mt-1 text-red-600 text-[11px] font-medium">
              {{ subclassError }}
            </p>

            <div v-if="selectedSubClassKey" class="mt-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded text-gray-700">
              <span class="font-medium text-gray-900">Current Subclass:</span>
              <span class="ml-1 text-indigo-700 font-semibold">
                {{ (selectedSubClassKey || '').split('|')[0] }}
              </span>
            </div>
          </div>
        </div>

        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<style scoped>
</style>
