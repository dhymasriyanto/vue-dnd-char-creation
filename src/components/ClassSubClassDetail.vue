<script setup>
  import CollapsedComponent from './CollapsedComponent.vue'
  import { useCharacterStore } from '../stores/character';
import {computed} from 'vue';


  const props = defineProps({
    selected: {
      type: Object,
      required: true
    },
    classLevel: {
      type: Number,
      required: true
    }
  })

  const characterStore = useCharacterStore()

  const combinedFeatures = computed(()=>{
    const classFeatures = props.selected.classFeature || []
    const subClassFeatures = characterStore.characterSubClass?.subClassFeature || []

    const allFeatures =  [...classFeatures, ...subClassFeatures]
    return allFeatures.sort((a,b) => a.level - b.level)
   })

</script>

<template>
  <div v-if="Object.keys(selected).length != 0">
    <h3 class="text-xl font-bold mb-2">{{ selected.class.name }} Class Feature</h3>
      <div v-for="classFeature in combinedFeatures">
        <CollapsedComponent v-if="classLevel >= classFeature.level" :data="classFeature" :classData="selected.class.classFeatures" />
      </div>
  </div>
</template>

<style>
.clickable {
  color: #3182ce;
  cursor: pointer;
}
</style>
