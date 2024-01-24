<script setup>
  import CollapsedComponent from './CollapsedComponent.vue'

  defineProps({
    selected: {
      type: Object,
      required: true
    },
    classLevel: {
      type: Number,
      required: true
    }
  })
</script>

<template>
  <div v-if="Object.keys(selected).length != 0">
    <h3 class="text-xl font-bold mb-2">{{ selected.class.name }} Class Feature</h3>
    <div v-for="classFeature in selected.classFeature">
      <CollapsedComponent v-if="classLevel >= classFeature.level" :data="classFeature" />
    </div>
  </div>
</template>

<style>
.clickable {
  color: #3182ce;
  cursor: pointer;
}
</style>
