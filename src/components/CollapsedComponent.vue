<script setup>
  import { ref } from 'vue'
  import { useCharacterStore } from '../stores/character';
  import axios from 'axios';
  import {useConfig} from '../config'

  defineProps({
    data: {
      type: Object,
      required: true,
    },
    classData: {
      type: Object,
      required: true
    },
  })

  const isCollapsed = ref(true);

  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
  }

  const API_URL = useConfig().API_URL

  const characterStore = useCharacterStore()

  const subClassSelected = ref({})

  const searchSubClassFeature = async (subClassSelected) => {
    await axios.get(`${API_URL}/sub-class/${subClassSelected.className.toLowerCase()}/${subClassSelected.classSource.toLowerCase()}/${subClassSelected.name}/${subClassSelected.source}/${subClassSelected.shortName}/${subClassSelected.page}`)
      .then((response) =>{
        characterStore.characterSubClass = response.data.data
      })
      .catch((error) => {
        console.log(error)
      })
  }

  const renderAnnotatedText = (text) => {
      if (typeof text !== 'string') {
        return '';
      }

      const replaceAnnotation = (content) => {
        const annotationRegex = /\{@(\w+) ((?:[^{}]+|\{[^{}]*\})+)\}/g;
        return text.replace(annotationRegex, (match, type, content) => {
          const contentParts = content.split('|')[0];
          const regex = /\{@(\w+) ((?:[^{}]+|\{[^{}])+)/g;
          const another = contentParts.replace(regex, (match, type, content) => {
            return `<span class="clickable" @click="handleClick('${match}')">${content}</span>`;
          });

          return `<span class="clickable" @click="handleClick('${match}')">${another}</span>`;
        });
      }

      return replaceAnnotation(text);
  }

  const formatClassFeature  = (text) =>{
    // Split the input text using the pipe character as a delimiter
    const parts = text.split('|');

    // Extract the desired parts
    const featureName = parts[0];
    const level = parseInt(parts[3], 10); // Convert level to a numeric value

    return { featureName, level };
  }
</script>

<template>
  <div class="collapsed">
    <div class="grid grid-cols-5 header">
      <div class="p-2 col-span-4" @click="toggleCollapse">
        <div>
          {{ data.name }}
        </div>
        <div class="text-xs font-thin text-gray-500" v-if="data.level"> <!-- Display level if available -->
          Level {{ data.level }}
        </div>
      </div>
      <div class="flex justify-end mr-2 items-center">
        <span v-if="isCollapsed">+</span>
        <span v-else>-</span>
      </div>
    </div>
    <transition name="fade">
      <div v-show="!isCollapsed" class="content">
        <ul>
          <li v-for="e in data.entries">
            <p class="mb-3" v-html="renderAnnotatedText(e)"></p>
            <div v-if="e.type === 'entries'" class="my-6">
              <h2 class="font-bold" v-html="renderAnnotatedText(e.name)"></h2>
              <div class="mb-3" v-for="en in e.entries">
                  <div v-if="en.type === 'abilityDc'">
                    <p>
                      <b>Spell save DC</b> = 8 + your proficiency bonus + your <span v-for="att in en.attributes">{{att}}</span> modifier
                    </p>
                    <p>
                      <b>Spell attack modifier</b> = your proficiency bonus + your <span v-for="att in en.attributes">{{att}}</span> modifier
                    </p>
                  </div>
                  <span v-html="renderAnnotatedText(en)"></span>
              </div>
            </div>
          </li>

          <div  v-for="cf in classData">
            <div v-if="typeof cf === 'object'">
              <div v-if="formatClassFeature(cf.classFeature).featureName === data.name && formatClassFeature(cf.classFeature).level === data.level">
                <div v-if="cf.gainSubclassFeature">
                  <label for="characterSubClass" class="block text-sm font-medium text-gray-700">Character Sub Class:</label>
                  <select id="characterSubClass" @change="searchSubClassFeature(subClassSelected)" v-model="subClassSelected" class="mt-1 p-2 border rounded w-full">
                    <option :value="{}">Choose sub class</option>
                    <option v-for="c in characterStore.subClassLists" :value="c">{{c.name}} ({{c.source}})</option>
                  </select>
                </div>
              </div>
            </div>
            <div v-else>
              <div v-if="formatClassFeature(cf) === data.name">
                <!-- Code here -->
              </div>
            </div>
          </div>
        </ul>
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.collapsed {
  border: 1px solid #ccc;
  margin-bottom: 10px;
}

.header {
  padding: 10px;
  background-color: #f0f0f0;
  cursor: pointer;
  justify-content: space-between;
}

.content {
  padding: 10px;
  border-top: 1px solid #ccc;
}

</style>

