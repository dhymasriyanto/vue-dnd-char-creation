<script setup>
defineProps({
  availableClassNames: {
    type: Array,
    default: () => []
  },
  selectedClassTableClass: {
    type: String,
    default: ''
  },
  classTableData: {
    type: Object,
    default: null
  },
  currentClassTableLevel: {
    type: Number,
    default: 1
  },
  inspectingFeature: {
    type: Object,
    default: null
  },
  currentTableSubclass: {
    type: Object,
    default: null
  },
  isLoadingClassTable: {
    type: Boolean,
    default: false
  },
  getCharClassLevel: {
    type: Function,
    required: true
  },
  getSubclassFeaturesForLevel: {
    type: Function,
    required: true
  },
  renderAnnotatedText: {
    type: Function,
    required: true
  },
  format5eEntries: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedClassTableClass',
  'update:inspectingFeature',
  'toggleFeatureDetail',
  'toggleSubclassFeatureDetail'
])
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- Multiclass Selector / Class Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-200">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[10px] font-bold text-gray-500 uppercase">Class:</span>
        <button
          v-for="cName in availableClassNames"
          :key="cName"
          type="button"
          @click="emit('update:selectedClassTableClass', cName)"
          :class="selectedClassTableClass === cName ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded text-xs transition cursor-pointer capitalize"
        >
          {{ cName }} (Lvl {{ getCharClassLevel(cName) }})
        </button>
      </div>
      <div v-if="classTableData" class="flex items-center gap-3 text-[11px] text-gray-600">
        <span>Hit Die: <strong class="text-gray-900 font-mono">1{{ classTableData.hitDice }}</strong></span>
        <span v-if="classTableData.subclassTitle">Subclass: <strong class="text-gray-900">{{ classTableData.subclassTitle }} (Lvl {{ classTableData.subclassLevel }})</strong></span>
      </div>
    </div>

    <!-- Feature Detail Box (if clicked) -->
    <div
      v-if="inspectingFeature"
      class="p-3.5 bg-white border-2 border-gray-900 text-gray-800 rounded-md space-y-2.5 shadow-sm"
    >
      <div class="flex items-center justify-between pb-2 border-b border-gray-200">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-gray-900 text-xs">{{ inspectingFeature.name }}</span>
          <span class="text-[10px] bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded border border-gray-300 font-mono">
            Level {{ inspectingFeature.level }}
          </span>
          <span v-if="inspectingFeature.isSubclass || inspectingFeature.subclassFeatures?.length" class="text-[10px] bg-white text-gray-700 px-1.5 py-0.5 rounded border border-gray-300 font-medium">
            {{ currentTableSubclass?.name || inspectingFeature.subclassTitle || 'Subclass' }}
          </span>
        </div>
        <button
          type="button"
          @click="emit('update:inspectingFeature', null)"
          class="text-gray-400 hover:text-gray-700 font-bold text-base leading-none cursor-pointer px-1"
        >×</button>
      </div>

      <!-- If inspecting generic subclass feature with multiple features at this level -->
      <div v-if="inspectingFeature.subclassFeatures && inspectingFeature.subclassFeatures.length" class="space-y-3">
        <div
          v-if="inspectingFeature.entries && inspectingFeature.entries.length"
          class="prose-xs text-gray-500 leading-relaxed italic text-[11px] pb-1 border-b border-gray-100"
          v-html="renderAnnotatedText(format5eEntries(inspectingFeature.entries))"
        ></div>
        <div
          v-for="sf in inspectingFeature.subclassFeatures"
          :key="sf.id || sf.name"
          class="space-y-1.5 bg-gray-50 p-3 rounded border border-gray-200"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-900 text-xs">{{ sf.name }}</span>
            <span class="text-[10px] bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-mono">Level {{ sf.level }}</span>
          </div>
          <div class="prose-xs text-gray-700 leading-relaxed" v-html="renderAnnotatedText(format5eEntries(sf.entries))"></div>
        </div>
      </div>

      <!-- Normal or single feature entries -->
      <div v-else class="prose-xs text-gray-700 leading-relaxed" v-html="renderAnnotatedText(format5eEntries(inspectingFeature.entries))"></div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingClassTable" class="p-8 text-center text-gray-400 italic">
      Loading class progression table...
    </div>

    <!-- Table View -->
    <div v-else-if="classTableData" class="overflow-x-auto border border-gray-200 rounded shadow-xs bg-white">
      <table class="w-full text-left text-xs divide-y divide-gray-200">
        <thead class="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
          <tr>
            <th class="py-2.5 px-3 whitespace-nowrap text-center">Level</th>
            <th class="py-2.5 px-3 whitespace-nowrap text-center">PB</th>
            <th class="py-2.5 px-3 min-w-[200px]">Class Features</th>
            <th
              v-for="(hdr, hIdx) in classTableData.headers"
              :key="hIdx"
              class="py-2.5 px-3 whitespace-nowrap text-center font-mono"
            >
              {{ hdr }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr
            v-for="row in classTableData.rows"
            :key="row.level"
            :class="[
              row.level === currentClassTableLevel
                ? 'bg-gray-100 font-semibold border-l-4 border-l-gray-900'
                : 'hover:bg-gray-50/80'
            ]"
            class="transition"
          >
            <!-- Level -->
            <td class="py-2 px-3 text-center whitespace-nowrap font-mono">
              <span :class="row.level === currentClassTableLevel ? 'text-gray-900 font-bold' : 'text-gray-700'">
                {{ row.levelLabel }}
              </span>
            </td>

            <!-- Proficiency Bonus -->
            <td class="py-2 px-3 text-center whitespace-nowrap font-mono text-gray-600">
              {{ row.proficiencyBonus }}
            </td>

            <!-- Features -->
            <td class="py-2 px-3">
              <div v-if="(row.features && row.features.length) || getSubclassFeaturesForLevel(row.level).length" class="flex flex-wrap gap-1">
                <!-- Class Features -->
                <button
                  v-for="feat in row.features"
                  :key="feat.id || feat.name"
                  type="button"
                  @click="emit('toggleFeatureDetail', feat, row.level)"
                  class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer text-left flex items-center gap-1 shadow-2xs"
                  :class="inspectingFeature?.name === feat.name && inspectingFeature?.level === row.level
                    ? 'border-2 border-gray-900 bg-gray-100 text-gray-950 font-bold shadow-xs'
                    : 'border border-gray-200 bg-white hover:bg-gray-100 text-gray-800'"
                >
                  <span>{{ feat.name }}</span>
                </button>

                <!-- Subclass Features -->
                <button
                  v-for="scf in getSubclassFeaturesForLevel(row.level)"
                  :key="'scf_' + (scf.id || scf.name)"
                  type="button"
                  @click="emit('toggleSubclassFeatureDetail', scf, row.level)"
                  class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer text-left flex items-center gap-1 shadow-2xs"
                  :class="inspectingFeature?.name === scf.name && inspectingFeature?.level === row.level
                    ? 'border-2 border-gray-900 bg-gray-100 text-gray-950 font-bold shadow-xs'
                    : 'border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium'"
                >
                  <span class="text-[9px] uppercase px-1 py-0.2 border border-gray-300 bg-white text-gray-700 rounded font-bold">Subclass</span>
                  <span>{{ scf.name }}</span>
                </button>
              </div>
              <span v-else class="text-gray-400 italic text-[11px]">—</span>
            </td>

            <!-- Custom Class Columns -->
            <td
              v-for="(val, vIdx) in row.customValues"
              :key="vIdx"
              class="py-2 px-3 text-center whitespace-nowrap font-mono text-gray-700"
            >
              {{ val || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
