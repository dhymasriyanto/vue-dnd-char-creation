<script setup>
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '../stores/character'
import { renderAnnotatedText, renderTableCell, format5eEntries } from '../utils/textRenderer'
import { IconChevronDown } from '@tabler/icons-vue'

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
    class="border rounded mb-2 bg-white text-xs transition relative"
    :class="[
      (isSubclassFeature && subclassError && !selectedSubClassKey) || hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200',
      !isCollapsed ? 'focus-within:z-30' : ''
    ]"
  >
    <div
      class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
      :class="isCollapsed ? 'rounded' : 'rounded-t'"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-bold text-gray-900">{{ data.name }}</span>
        <span v-if="data.level" class="text-[11px] text-gray-500">Level {{ data.level }}</span>
        <span v-if="isSubclassFeatureBadge" class="text-[11px] font-medium text-gray-600">
          Subclass Feature
        </span>
        <span v-if="data.subclassName" class="text-[11px] text-gray-500 font-normal">
          ({{ data.subclassName }})
        </span>
        <span v-if="isOptionalFeature" class="text-[11px] font-medium text-gray-600">
          Optional Feature
        </span>
      </div>
      <IconChevronDown
        class="w-4 h-4 text-gray-500 transition-transform duration-200"
        :class="{ '-rotate-180': !isCollapsed }"
      />
    </div>

    <transition name="fade">
      <div v-show="!isCollapsed" class="p-3 border-t border-gray-200 bg-white space-y-3 rounded-b">
        <!-- Feature Entries / Explanations -->
        <div
          v-if="data.entries && (Array.isArray(data.entries) ? data.entries.length : true)"
          class="space-y-2 text-gray-700 leading-relaxed text-xs"
          v-html="renderAnnotatedText(format5eEntries(data.entries))"
        ></div>
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
              <span v-if="selectedSubClassKey" class="text-[11px] text-gray-800 font-semibold">Selected</span>
            </div>

            <!-- Selectable Subclass Cards/List -->
            <div v-if="availableSubClasses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="sc in availableSubClasses"
                :key="sc.name + '|' + (sc.source || '')"
                @click="onSelectSubclass(sc.name + '|' + (sc.source || ''))"
                :class="[
                  (selectedSubClassKey === (sc.name + '|' + (sc.source || '')) || selectedSubClassKey === sc.name || (selectedSubClassKey && selectedSubClassKey.startsWith(sc.name + '|')))
                    ? 'border-gray-800 bg-gray-100 ring-1 ring-gray-800'
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
              <v-select
                :model-value="selectedSubClassKey || null"
                :options="availableSubClasses"
                :reduce="sc => sc.name + '|' + (sc.source || '')"
                :get-option-label="sc => `${sc.name} (${sc.source || 'PHB'})`"
                :get-option-key="sc => sc.name + '|' + (sc.source || '')"
                placeholder="Select a subclass..."
                @update:model-value="val => onSelectSubclass(val || '')"
                :class="{ 'has-error': subclassError && !selectedSubClassKey }"
              />
            </div>

            <p v-if="subclassError && !selectedSubClassKey" class="mt-1 text-red-600 text-[11px] font-medium">
              {{ subclassError }}
            </p>

            <div v-if="selectedSubClassKey" class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-gray-700">
              <span class="font-medium text-gray-900">Current Subclass:</span>
              <span class="ml-1 text-gray-900 font-semibold">
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
