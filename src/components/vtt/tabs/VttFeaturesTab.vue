<script setup>
defineProps({
  combinedClassFeatures: {
    type: Array,
    default: () => []
  },
  unpackedTraits: {
    type: Array,
    default: () => []
  },
  char: {
    type: Object,
    required: true
  },
  allFeatureKeys: {
    type: Array,
    default: () => []
  },
  expandedFeatures: {
    type: Object,
    default: () => ({})
  },
  cleanProficiencyName: {
    type: Function,
    default: (name) => name || ''
  },
  isOptionalFeature: {
    type: Function,
    default: () => false
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

const emit = defineEmits(['toggleFeature', 'expandAllFeatures'])
</script>

<template>
  <div class="space-y-4 text-xs">
    <div class="flex items-center justify-end pb-1 border-b border-gray-100">
      <button
        type="button"
        @click="emit('expandAllFeatures', allFeatureKeys)"
        class="text-xs text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
      >
        Toggle All
      </button>
    </div>

    <!-- Class & Subclass Features -->
    <div v-if="combinedClassFeatures.length" class="space-y-2">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Class & Subclass Features</h3>
      <div class="space-y-1.5">
        <div
          v-for="feat in combinedClassFeatures"
          :key="feat._key"
          class="border border-gray-200 rounded bg-white overflow-hidden"
        >
          <div
            @click="emit('toggleFeature', feat._key)"
            class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-gray-900">{{ feat.name }}</span>
              <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                Level {{ feat.level }}
              </span>
              <span
                v-if="feat.isSubclass"
                class="text-[10px] bg-white border border-gray-300 px-1.5 py-0.5 rounded text-gray-700 font-medium"
              >
                Subclass Feature
              </span>
              <span v-if="isOptionalFeature(feat)" class="text-[11px] font-medium text-gray-600">
                Optional Feature
              </span>
            </div>
            <span class="font-mono text-gray-400 font-bold text-sm leading-none">
              {{ expandedFeatures[feat._key] ? '-' : '+' }}
            </span>
          </div>

          <div
            v-show="expandedFeatures[feat._key]"
            class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
          >
            <div v-if="feat.entries && feat.entries.length" v-html="renderAnnotatedText(format5eEntries(feat.entries))"></div>
            <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Species / Race Traits -->
    <div v-if="unpackedTraits.length" class="space-y-2">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Species & Lineage Traits</h3>
      <div class="space-y-1.5">
        <div
          v-for="tr in unpackedTraits"
          :key="tr._key || tr.id || tr.name"
          class="border border-gray-200 rounded bg-white overflow-hidden"
        >
          <div
            @click="emit('toggleFeature', tr._key || ('tr_' + (tr.id || tr.name)))"
            class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
          >
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">{{ tr.name }}</span>
              <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Species Trait</span>
            </div>
            <span class="font-mono text-gray-400 font-bold text-sm leading-none">
              {{ expandedFeatures[tr._key || ('tr_' + (tr.id || tr.name))] ? '-' : '+' }}
            </span>
          </div>

          <div
            v-show="expandedFeatures[tr._key || ('tr_' + (tr.id || tr.name))]"
            class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
          >
            <div v-if="tr.entries && tr.entries.length" v-html="renderAnnotatedText(format5eEntries(tr.entries))"></div>
            <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Background Features -->
    <div v-if="char.feature?.length" class="space-y-2">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Background Feature</h3>
      <div class="space-y-1.5">
        <div
          v-for="feat in char.feature"
          :key="feat.id || feat.name"
          class="border border-gray-200 rounded bg-white overflow-hidden"
        >
          <div
            @click="emit('toggleFeature', 'bf_' + (feat.id || feat.name))"
            class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
          >
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">{{ feat.name }}</span>
              <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Background</span>
            </div>
            <span class="font-mono text-gray-400 font-bold text-sm leading-none">
              {{ expandedFeatures['bf_' + (feat.id || feat.name)] ? '-' : '+' }}
            </span>
          </div>

          <div
            v-show="expandedFeatures['bf_' + (feat.id || feat.name)]"
            class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
          >
            <div v-if="feat.entries && feat.entries.length" v-html="renderAnnotatedText(format5eEntries(feat.entries))"></div>
            <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Feats -->
    <div v-if="char.feat?.length" class="space-y-2">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Feats</h3>
      <div class="space-y-1.5">
        <div
          v-for="ft in char.feat"
          :key="ft.id || ft.name"
          class="border border-gray-200 rounded bg-white overflow-hidden"
        >
          <div
            @click="emit('toggleFeature', 'ft_' + (ft.id || ft.name))"
            class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
          >
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">{{ ft.name }}</span>
              <span class="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                Feat
              </span>
            </div>
            <span class="font-mono text-gray-400 font-bold text-sm leading-none">
              {{ expandedFeatures['ft_' + (ft.id || ft.name)] ? '-' : '+' }}
            </span>
          </div>

          <div
            v-show="expandedFeatures['ft_' + (ft.id || ft.name)]"
            class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
          >
            <div v-if="ft.entries && ft.entries.length" v-html="renderAnnotatedText(format5eEntries(ft.entries))"></div>
            <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Languages -->
    <div v-if="char.language?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Languages Known</h3>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="lang in char.language"
          :key="lang.id || lang.name"
          class="bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded font-medium"
        >
          {{ lang.name }}
        </span>
      </div>
    </div>

    <!-- Proficiencies (Tools, Armor, Weapons) -->
    <div v-if="char.proficiency?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
      <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Proficiencies & Training</h3>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="p in char.proficiency"
          :key="p.id || p.name"
          class="bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200"
        >
          {{ cleanProficiencyName(p.name) }}
        </span>
      </div>
    </div>
  </div>
</template>
