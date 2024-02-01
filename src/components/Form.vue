<script setup>
import axios from 'axios'
import RaceSubRaceDetail from './RaceSubRaceDetail.vue'
import ClassSubClassDetail from './ClassSubClassDetail.vue';
import {nextTick, onBeforeUpdate, onMounted, onUpdated, ref, watch } from 'vue'
import { useCharacterStore } from '../stores/character';
import { useConfig } from '../config'

const API_URL = useConfig().API_URL

const characterStore = useCharacterStore()

const currentStep = ref(1)
const scrollRef = ref()
const characterName = ref('')
const characterRace = ref({})
const characterSubRace = ref({})
const strength = ref(0)
const dexterity = ref(0)
const constitution = ref(0)
const intelligence = ref(0)
const wisdom = ref(0)
const charisma = ref(0)
const classSelected = ref('')
const characterClass = ref({})
const characterSubClass = ref({})
const characterBackground = ref('')
const alignment = ref('')
const race = ref({})
const subRace = ref({})
const allClass = ref({})
const subClass = ref({})
const error = ref('')
const classLevel = ref(1)

onMounted(() =>{
    axios.get(`${API_URL}/race`)
      .then((response) =>{
        race.value = response.data.data
      })
      .catch((error) => {
        console.log(error)
      })

    axios.get(`${API_URL}/class`)
      .then((response) =>{
        allClass.value = response.data.data
      })
      .catch((error) => {
        console.log(error)
      })

    nextTick(() => {
      attachClickHandlers()
    })
})

onUpdated(()=>{
  nextTick(() => {
    attachClickHandlers()
  })
})

onBeforeUpdate(() => {
  removeClickHandlers()
})

watch(currentStep, () => {
  removeClickHandlers()
  nextTick(() => {
    attachClickHandlers()
  })
})

watch(characterName, () => {
  error.value = ''
})

watch(characterRace, () => {
  error.value = ''
})

watch(strength, () => {
  error.value = ''
})

watch(dexterity, () => {
  error.value = ''
})

watch(constitution, () => {
  error.value = ''
})

watch(intelligence, () => {
  error.value = ''
})

watch(wisdom, () => {
  error.value = ''
})

watch(charisma, () => {
  error.value = ''
})

watch(error , () => {
  if (error.value) {
    nextTick(() => {
      scrollRef.value.scrollIntoView({ behavior: 'smooth' })
    })
  }
})

const nextStep = () => {
  switch (currentStep.value) {
    case 1:
      if (characterName.value === "" || Object.keys(characterRace).length === 0) {
        error.value = "Please fill all the fields";
        return;
      }
      break;
    case 2:
      if (Object.keys(characterClass).length === 0 || Object.keys(characterSubClass).length === 0) {
        error.value = "Please fill all the fields";
        return;
      }
      break;
    case 3:
      if (strength.value === 0 || dexterity.value === 0 || constitution.value === 0 || intelligence.value === 0 || wisdom.value === 0 || charisma.value === 0) {
        error.value = "Please fill all the fields";
        return;
      }
      break;
    case 4:
      if (characterBackground.value === "" || alignment.value === "") {
        error.value = "Please fill all the fields";
        return;
      }
      break;
    default:
  }
  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

const searchSubRace = async (race) => {
  characterSubRace.value = {}
  await axios.get(`${API_URL}/sub-race/${race.name}/${race.source}`)
    .then((response) =>{
      subRace.value = response.data.data
    })
    .catch((error) => {
      console.log(error)
    })
}

const searchClass = async (classSelected) => {
  characterSubClass.value = {}
  characterClass.value = {}
  subClass.value = {}
  await axios.get(`${API_URL}/class/${classSelected}`)
    .then((response) =>{
      characterClass.value.class = response.data.data.class[0]
      characterClass.value.classFeature = response.data.data.classFeature
      searchSubClass(response.data.data)
    })
    .catch((error) => {
      console.log(error)
    })
}

const searchSubClass = async (classSelected) => {
  await axios.get(`${API_URL}/sub-class/${classSelected.class[0].name.toLowerCase()}/${classSelected.class[0].source.toLowerCase()}`)
    .then((response) =>{
      subClass.value = response.data.data.subClass
      characterStore.subClassLists = response.data.data.subClass
    })
    .catch((error) => {
      console.log(error)
    })
}

const attachClickHandlers = () => {
  const elements = document.getElementsByClassName('clickable')
  for (let i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', handleAnnotationClick)
  }
}

const removeClickHandlers = () => {
  const elements = document.getElementsByClassName('clickable')
  for (let i = 0; i < elements.length; i++) {
    elements[i].removeEventListener('click', handleAnnotationClick)
  }
}

const handleAnnotationClick = (event) => {
  console.log(event.target.innerText)
}

const submitForm = () => {
  console.log("Form submitted!", {
    characterName: characterName.value,
    characterRace: characterRace.value,
    characterSubRace: characterSubRace.value,
    characterClass: characterClass.value,
    characterSubClass: characterSubClass.value,
    strength: strength.value,
    dexterity: dexterity.value,
    constitution: constitution.value,
    intelligence: intelligence.value,
    wisdom: wisdom.value,
    charisma: charisma.value,
    characterBackground: characterBackground.value,
    alignment: alignment.value,
  })
}
</script>

<template>
  <div ref="scrollRef" class="max-w-md mx-auto mb-20 my-8 p-6 bg-white rounded shadow-md">
    <div v-if="currentStep === 1">
      <!-- Step 1: Basic Information -->
      <h2 class="text-2xl font-bold mb-4">Step 1: Basic Information</h2>
      <div class="mb-4">
        <label for="characterName" class="block text-sm font-medium text-gray-700">Character Name:</label>
        <input  type="text" id="characterName" v-model="characterName" class="mt-1 p-2 border rounded w-full" placeholder="Enter your character name">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="characterRace" class="block text-sm font-medium text-gray-700">Character Race:</label>
        <select id="characterRace" @change="searchSubRace(characterRace)" v-model="characterRace" class="mt-1 p-2 border rounded w-full">
          <option :value="{}">Choose race</option>
          <option v-for="r in race" :value="r">{{r.name}} ({{r.source}})</option>
        </select>
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <RaceSubRaceDetail :selected="characterRace" />
      <div v-if="Object.keys(characterRace).length != 0 && subRace.length != 0" class="my-4">
        <label for="characterSubRace" class="block text-sm font-medium text-gray-700">Character Sub Race:</label>
        <select id="characterSubRace" v-model="characterSubRace" class="mt-1 p-2 border rounded w-full">
          <option :value="{}">Choose sub race</option>
          <option v-for="r in subRace" :value="r">{{r.name}} ({{r.source}})</option>
        </select>
      </div>
      <RaceSubRaceDetail :selected="characterSubRace" />
    </div>

    <div v-else-if="currentStep === 2">
      <!-- Step 3: Class and Race -->
      <h2 class="text-2xl font-bold mb-4">Step 2: Class</h2>
      <div class="mb-4">
        <div class="grid grid-cols-4">
          <div class="col-span-3">
            <label for="characterClass" class="block text-sm font-medium text-gray-700">Character Class:</label>
            <select id="characterClass" @change="searchClass(classSelected)" v-model="classSelected" class="mt-1 p-2 border rounded w-full">
              <option value="">Choose class</option>
              <option v-for="(c,n) in allClass" :value="n">{{n.charAt(0).toUpperCase() + n.slice(1)}}</option>
            </select>
          </div>
          <div class="col-span-1">
            <label for="characterClassLevel" class="block ml-2 text-sm font-medium text-gray-700">Level:</label>
            <select v-model="classLevel" class="mt-1 ml-2 p-2 border rounded w-full" id="characterClassLevel">
              <option v-for="n in 20" :value="n">{{n}}</option>
            </select>
          </div>
        </div>
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <ClassSubClassDetail :selected="characterClass" :classLevel="classLevel" />
    </div>

    <div v-else-if="currentStep === 3">
      <!-- Step 2: Attributes -->
      <h2 class="text-2xl font-bold mb-4">Step 3: Ability Score</h2>
      <div class="mb-4">
        <label for="strength" class="block text-sm font-medium text-gray-700">Strength:</label>
        <input type="number" id="strength" v-model="strength" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="dexterity" class="block text-sm font-medium text-gray-700">Dexterity:</label>
        <input type="number" id="dexterity" v-model="dexterity" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="constitution" class="block text-sm font-medium text-gray-700">Constitution:</label>
        <input type="number" id="constitution" v-model="constitution" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="intelligence" class="block text-sm font-medium text-gray-700">Intelligence:</label>
        <input type="number" id="intelligence" v-model="intelligence" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="wisdom" class="block text-sm font-medium text-gray-700">Wisdom:</label>
        <input type="number" id="wisdom" v-model="wisdom" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="charisma" class="block text-sm font-medium text-gray-700">Charisma:</label>
        <input type="number" id="charisma" v-model="charisma" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="currentStep === 4">
      <!-- Step 3: Class and Race -->
      <h2 class="text-2xl font-bold mb-4">Step 3: Background and Alignment</h2>
      <div class="mb-4">
        <label for="characterClass" class="block text-sm font-medium text-gray-700">Character Background:</label>
        <input type="text" id="characterClass" v-model="characterClass" class="mt-1 p-2 border rounded w-full">
      </div>
      <div class="mb-4">
        <label for="alignment" class="block text-sm font-medium text-gray-700">Alignment:</label>
        <input type="text" id="alignment" v-model="alignment" class="mt-1 p-2 border rounded w-full">
      </div>
    </div>
  </div>
  <div class="sticky-buttons">
    <div class="button-container">
      <div v-if="currentStep !== 1">
        <button class="bg-gray-300 text-gray-700 px-4 py-2 rounded" @click="prevStep">Previous</button>
      </div>
    </div>
    <div class="button-container">
      <div v-if="currentStep !== 4">
        <button class="bg-blue-500 text-white px-4 py-2 rounded" @click="nextStep">Next</button>
      </div>
      <div v-else>
        <button class="bg-green-500 text-white px-4 py-2 rounded" @click="submitForm">Submit</button>
      </div>
    </div>
  </div>
</template>

<style>
.sticky-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #ffffff; /* You can adjust the background color */
  padding: 10px;
  box-shadow: 0px -2px 10px rgba(0, 0, 0, 0.1); /* Optional: Add a shadow effect */
  display: flex;
  justify-content: space-between;
}

.button-container {
  display: flex;
}

.sticky-buttons button {
  margin-right: 10px; /* Optional: Add some spacing between buttons */
}
</style>

