<template>
  <div class="max-w-md mx-auto my-8 p-6 bg-white rounded shadow-md">
    <div v-if="currentStep === 1">
      <!-- Step 1: Basic Information -->
      <h2 class="text-2xl font-bold mb-4">Step 1: Basic Information</h2>
      <div class="mb-4">
        <label for="characterName" class="block text-sm font-medium text-gray-700">Character Name:</label>
        <input type="text" id="characterName" v-model="characterName" class="mt-1 p-2 border rounded w-full">
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div class="mb-4">
        <label for="characterRace" class="block text-sm font-medium text-gray-700">Character Race:</label>
        <select id="characterRace" @change="searchSubRace(characterRace)" v-model="characterRace" class="mt-1 p-2 border rounded w-full">
          <option value="">Pilih Race</option>
          <option v-for="r in race" :value="r">{{r.name}} ({{r.source}})</option>
        </select>
        <p class="text-red-500 text-xs mt-1">{{ error }}</p>
      </div>
      <div v-if="characterRace">
        <h3 class="text-xl font-bold mb-2">{{ characterRace.name }} Details</h3>
        <p><strong>Source:</strong> {{ characterRace.source }}, Page {{ characterRace.page }}</p>
        <div class="flex" v-if="characterRace.otherSources">
          <p><strong>Other Sources:</strong></p>
          <ul>
            <li class="ml-2" v-for="source in characterRace.otherSources">{{ source.source }}, Page {{ source.page }}</li>
          </ul>
        </div>
        <p v-if="characterRace.size"><strong>Size:</strong> {{ characterRace.size[0] }}</p>
        <p v-if="typeof characterRace.speed === 'object'">
          <strong>Speed:</strong>
          {{ characterRace.speed.walk ? `Walk: ${characterRace.speed.walk} ft,` : '' }}
          {{ characterRace.speed.fly ? `Fly: ${characterRace.speed.fly} ft,` : '' }}
          {{ characterRace.speed.swim ? `Swim: ${characterRace.speed.swim } ft,` : ''}}
          {{ characterRace.speed.climb ? `Climb: ${characterRace.speed.climb } ft,` : ''}}</p>
        <p v-else-if="typeof characterRace.speed === 'number'"><strong>Speed:</strong> {{ characterRace.speed }} ft</p>
        <p v-if="characterRace.ability">
          <strong>Ability Scores:</strong>
          {{ formatAbilityScores(characterRace.ability[0]) }}
        </p>
        <p v-if="characterRace.age"><strong>Age:</strong> Mature at {{ characterRace.age.mature }} years, Max age is {{ characterRace.age.max }} years</p>
        <p v-if="characterRace.darkvision"><strong>Darkvision:</strong> {{ characterRace.darkvision }} ft</p>
        <p v-if="characterRace.heightAndWeight">
          <strong>Height and Weight:</strong>
          {{ characterRace.heightAndWeight.baseHeight }} (+ {{ characterRace.heightAndWeight.heightMod }}) inches, {{ characterRace.heightAndWeight.baseWeight }} (+ {{ characterRace.heightAndWeight.weightMod }}) lb
        </p>
        <p v-if="characterRace.traitTags"><strong>Trait Tags:</strong> {{ characterRace.traitTags.join(', ') }}</p>
        <p v-if="characterRace.skillProficiencies">
          <strong>Skill Proficiencies:</strong>
          <span v-for="(skill, index, ix) in characterRace.skillProficiencies" :key="index">
            {{ index > 0 ? ', ' : '' }}
            <span v-if="Object.keys(skill)[index] === 'any'">
              Pilih {{ skill.any }} dari semua
            </span>
            <span v-else-if="Object.keys(skill)[index] === 'choose'">
              Pilih {{ skill.choose.count }} dari {{ this.loopChoose(skill.choose.from) }}
            </span>
            <span v-else>
              {{ Object.keys(skill)[index] }}
            </span>
          </span>
        </p>
        <p v-if="characterRace.languageProficiencies">
          <strong>Language Proficiencies:</strong>
          <span v-for="(language, index) in characterRace.languageProficiencies" :key="index">
            <span v-for="(lang, index) in Object.keys(language)">
              {{ index > 0 ? ', ' : '' }}
              <span
                v-if="lang !== 'anyStandard'"
                >
                {{ lang.charAt(0).toUpperCase() + lang.slice(1) }}
              </span>
              <span
                v-else
              >
                Pilih {{ language[lang] }} Standard Language
              </span>
            </span>
          </span>
        </p>
        <p v-if="characterRace.resist"><strong>Resist:</strong> {{ characterRace.resist.join(', ') }}</p>
        <p v-if="characterRace.additionalSpells">
        <strong>Additional Spells:</strong>
        <ul>
          <li v-for="(spell, index) in characterRace.additionalSpells">
            <div v-if="spell.ability">
              <span v-if="characterRace.additionalSpells.length > 1">
                <div v-if="index === 0" class="text-sky-500">Pilih salah satu spell, yaitu:</div>
                <div v-else class="text-sky-500">Atau</div>
              </span>
              <span v-if="spell.ability.choose">
                Pilih spellcasting ability dari <span v-for="(ability, index) in spell.ability.choose" :key="index">
                  {{ index > 0 ? ', ' : '' }}
                  {{ ability }}
                  </span>
              </span>
              <span v-else>
                Spellcasting anda dari {{ spell.ability }}
              </span>
            </div>
            <div v-if="spell.innate">
              Spell bawaan:
              <div v-for="(innate, level) in spell.innate" :key="level">
                <div v-for="inn in innate">
                  <p v-if="innate.daily" v-for="(lv, daily) in innate">
                  - {{lv[1][0]}} (Pada level {{ level }}) {{daily}}
                  </p>
                  <p v-else>
                    - {{ inn }} (Pada level {{ level }})
                  </p>
                </div>
              </div>
            </div>
            <div v-if="spell.known">
              Spell yang diketahui:
              <div v-for="(known, level) in spell.known" :key="level">
                <p v-if="known.daily" v-for="(lv, daily) in known">
                - {{lv[1][0]}} (Pada level {{ level }}) {{daily}}
                </p>
                <span v-for="(kn,ix) in known">
                  <p v-if="kn.choose">
                  Pilih {{kn.count}} spell {{kn.choose}} 
                  </p>
                  <p v-else-if="ix === 'rest'" v-for="i in kn[level]">
                    {{i}} (Pada level {{ level }}) {{ix}}
                  </p>
                  <p v-else>
                    - {{ known[ix] }} (Pada level {{ level }})
                  </p>
                </span>
              </div>
            </div>
          </li>
        </ul>
        </p>
        <p v-if="characterRace.entries" ><strong><hr class="my-6"></strong> 
        <ul>
          <li v-for="entry in characterRace.entries">
            <p v-if="entry.name" class="mb-1">
              <b>{{entry.name}}</b>
            </p>
            <p v-else class="mb-4" v-html="renderAnnotatedText(entry)">
            </p>
            <!-- <span v-if="typeof entry.entries === 'string'" v-html="renderAnnotatedText(entry.entries)"></span> -->
            <span v-if="typeof entry.entries === 'string'" >{{entry.entries}}</span>
            <span v-else-if="typeof entry.entries === 'object'">
              <ul>
                <li v-for="e in entry.entries">
                  <p class="mb-3" v-html="renderAnnotatedText(e)"></p>
                  <div class="ml-10" v-if="e.type === 'list'">
                    <ul>
                      <li v-for="l in e.items">
                        <span>
                          <span class="mr-4  text-sky-900 font-bold">{{l.name}}</span>
                          <span v-html="renderAnnotatedText(l.entry)">
                          </span>
                          <span v-if="typeof l === 'string'" v-html="`- ${renderAnnotatedText(l)}`"></span>
                          <ul v-if="l.type === 'item'">
                            <li v-for="i in l.entries">
                              <span v-html="renderAnnotatedText(i)"></span>
                            </li>
                          </ul>
                        </span>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </span>
          </li>
        </ul>
        </p>
      </div>
      <div v-if="characterRace && subRace.length != 0" class="my-4">
        <label for="characterSubRace" class="block text-sm font-medium text-gray-700">Character Sub Race:</label>
        <select id="characterSubRace" v-model="characterSubRace" class="mt-1 p-2 border rounded w-full">
          <option value="">Pilih Sub Race</option>
          <option v-for="r in subRace" :value="r">{{r.name}} ({{r.source}})</option>
        </select>
      </div>
      <div v-if="characterSubRace">
        <h3 class="text-xl font-bold mb-2">{{ characterSubRace.name }} Details</h3>
        <p><strong>Source:</strong> {{ characterSubRace.source }}, Page {{ characterSubRace.page }}</p>
        <div v-if="characterSubRace.otherSources">
          <p><strong>Other Sources:</strong></p>
          <ul>
            <li v-for="source in characterSubRace.otherSources">{{ source.source }}, Page {{ source.page }}</li>
          </ul>
        </div>
        <p v-if="characterSubRace.size"><strong>Size:</strong> {{ characterSubRace.size[0] }}</p>
        <p v-if="typeof characterSubRace.speed === 'object'"><strong>Speed:</strong>
          {{ characterSubRace.speed.walk ? `Walk: ${characterSubRace.speed.walk} ft,` : '' }}
          {{ characterSubRace.speed.fly ? `Fly: ${characterSubRace.speed.fly} ft,` : '' }}
          {{ characterSubRace.speed.swim ? `Swim: ${characterSubRace.speed.swim } ft,` : ''}}
          {{ characterSubRace.speed.climb ? `Climb: ${characterSubRace.speed.climb } ft,` : ''}}</p>
        <p v-else-if="typeof characterSubRace.speed === 'number'"><strong>Speed:</strong> {{ characterSubRace.speed }} ft</p>
        <p v-if="characterSubRace.ability">
          <strong>Ability Scores:</strong>
          {{ formatAbilityScores(characterSubRace.ability[0]) }}
        </p>
        <p v-if="characterSubRace.age"><strong>Age:</strong> Mature at {{ characterSubRace.age.mature }} years, Max age is {{ characterSubRace.age.max }} years</p>
        <p v-if="characterSubRace.darkvision"><strong>Darkvision:</strong> {{ characterSubRace.darkvision }} ft</p>
        <p v-if="characterSubRace.heightAndWeight">
          <strong>Height and Weight:</strong>
          {{ characterSubRace.heightAndWeight.baseHeight }} (+ {{ characterSubRace.heightAndWeight.heightMod }}) inches, {{ characterSubRace.heightAndWeight.baseWeight }} (+ {{ characterSubRace.heightAndWeight.weightMod }}) lb
        </p>
        <p v-if="characterSubRace.traitTags"><strong>Trait Tags:</strong> {{ characterSubRace.traitTags.join(', ') }}</p>
        <p v-if="characterSubRace.languageProficiencies">
          <strong>Language Proficiencies:</strong>
          <span v-for="(language, index) in characterSubRace.languageProficiencies" :key="index">
            {{ index > 0 ? ', ' : '' }}
            {{ Object.keys(language)[0].charAt(0).toUpperCase() + Object.keys(language)[0].slice(1) }}
          </span>
        </p>
        <p v-if="characterSubRace.resist"><strong>Resist:</strong> {{ characterSubRace.resist.join(', ') }}</p>
        <p v-if="characterSubRace.additionalSpells">
        <strong>Additional Spells:</strong>
        <ul>
          <li v-for="(spell, index) in characterSubRace.additionalSpells">
            <div v-if="spell.ability">
              <span v-if="characterSubRace.additionalSpells.length > 1">
                <div v-if="index === 0" class="text-sky-500">Pilih salah satu spell, yaitu:</div>
                <div v-else class="text-sky-500">Atau</div>
              </span>
              <span v-if="spell.ability.choose">
                Pilih spellcasting ability dari <span v-for="(ability, index) in spell.ability.choose" :key="index">
                  {{ index > 0 ? ', ' : '' }}
                  {{ ability }}
                  </span>
              </span>
              <span v-else>
                Spellcasting anda dari {{ spell.ability }}
              </span>
            </div>
            <div v-if="spell.innate">
              Spell bawaan:
              <div v-for="(innate, level) in spell.innate" :key="level">
                <div v-for="inn in innate">
                  <p v-if="innate.daily" v-for="(lv, daily) in innate">
                  - {{lv[1][0]}} (Pada level {{ level }}) {{daily}}
                  </p>
                  <p v-else>
                    - {{ inn }} (Pada level {{ level }})
                  </p>
                </div>
              </div>
            </div>
            <div v-if="spell.known">
              Spell yang diketahui:
              <div v-for="(known, level) in spell.known" :key="level">
                <p v-if="known.daily" v-for="(lv, daily) in known">
                - {{lv[1][0]}} (Pada level {{ level }}) {{daily}}
                </p>
                <span v-for="(kn,ix) in known">
                  <p v-if="kn.choose">
                  Pilih {{kn.count}} spell {{kn.choose}} 
                  </p>
                  <p v-else-if="ix === 'rest'" v-for="i in kn[level]">
                    {{i}} (Pada level {{ level }}) {{ix}}
                  </p>
                  <p v-else>
                    - {{ known[ix] }} (Pada level {{ level }})
                  </p>
                </span>
              </div>
            </div>
          </li>
        </ul>
        </p>
        <p v-if="characterSubRace.entries" ><strong><hr class="my-6"></strong> 
        <ul>
          <li v-for="entry in characterSubRace.entries">
            <p v-if="entry.name" class="mb-1">
              <b>{{entry.name}}</b>
            </p>
            <p v-else class="mb-4">
              {{entry}}
            </p>
            <!-- <span v-if="typeof entry.entries === 'string'" v-html="renderAnnotatedText(entry.entries)"></span> -->
            <span v-if="typeof entry.entries === 'string'" >{{entry.entries}}</span>
            <span v-else-if="typeof entry.entries === 'object'">
              <ul>
                <li v-for="e in entry.entries">
                  <p class="mb-3" v-html="renderAnnotatedText(e)"></p>
                  <div class="ml-10" v-if="e.type === 'list'">
                    <ul>
                      <li v-for="l in e.items">
                        <span>
                          <span class="mr-4  text-sky-900 font-bold">{{l.name}}</span>
                          <span v-html="renderAnnotatedText(l.entry)"></span>
                          <span v-if="typeof l === 'string'" v-html="`- ${renderAnnotatedText(l)}`"></span>
                          <ul v-if="l.type === 'item'">
                            <li v-for="i in l.entries">
                              <span v-html="renderAnnotatedText(i)"></span>
                            </li>
                          </ul>
                        </span>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </span>
          </li>
        </ul>
        </p>
      </div>
      <div class="mt-4 flex justify-between">
        <button class="bg-blue-500 text-white px-4 py-2 rounded" @click="nextStep">Next</button>
      </div>
    </div>

    <div v-else-if="currentStep === 2">
      <!-- Step 2: Attributes -->
      <h2 class="text-2xl font-bold mb-4">Step 2: Attributes</h2>
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
      <div class="flex justify-between">
        <button class="bg-gray-300 text-gray-700 px-4 py-2 rounded" @click="prevStep">Previous</button>
        <button class="bg-blue-500 text-white px-4 py-2 rounded" @click="nextStep">Next</button>
      </div>
    </div>

    <div v-else-if="currentStep === 3">
      <!-- Step 3: Class and Race -->
      <h2 class="text-2xl font-bold mb-4">Step 3: Class and Race</h2>
      <div class="mb-4">
        <label for="characterClass" class="block text-sm font-medium text-gray-700">Character Class:</label>
        <input type="text" id="characterClass" v-model="characterClass" class="mt-1 p-2 border rounded w-full">
      </div>
      <div class="mb-4">
        <label for="alignment" class="block text-sm font-medium text-gray-700">Alignment:</label>
        <input type="text" id="alignment" v-model="alignment" class="mt-1 p-2 border rounded w-full">
      </div>
      <div class="flex justify-between">
        <button class="bg-gray-300 text-gray-700 px-4 py-2 rounded" @click="prevStep">Previous</button>
        <button class="bg-green-500 text-white px-4 py-2 rounded" @click="submitForm">Submit</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      currentStep: 1,
      characterName: "",
      characterRace: "",
      characterSubRace: "",
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
      characterClass: "",
      alignment: "",
      race: {},
      subRace: {},
      error: "",
    };
  },
  mounted() {
    axios.get('http://localhost:3001/race')
      .then((response) =>{
        this.race = response.data.data
      })
      .catch((error) => {
        console.log(error)
      })

    this.$nextTick(() => {
      this.attachClickHandlers();
    });
  },

  updated() {
    this.$nextTick(() => {
      this.attachClickHandlers();
    });
  },

  beforeDestroy() {
    this.removeClickHandlers();
  },

  watch: {
    currentStep() {
      this.removeClickHandlers();
      this.$nextTick(() => {
        this.attachClickHandlers();
      });
    },

    characterName() {
      this.error = "";
    },

    characterRace() {
      this.error = "";
    },

    strength() {
      this.error = "";
    },

    dexterity() {
      this.error = "";
    },

    constitution() {
      this.error = "";
    },

    intelligence() {
      this.error = "";
    },

    wisdom() {
      this.error = "";
    },

    charisma() {
      this.error = "";
    },

    error() {
      if (this.error) {
        this.$nextTick(() => {
          this.$el.scrollIntoView({ behavior: 'smooth' });
        });
      }
    },
  },

  methods: {
    nextStep() {
      switch (this.currentStep) {
        case 1:
          if (this.characterName === "" || this.characterRace === "") {
            this.error = "Please fill all the fields";
            return;
          }
          break;
        case 2:
          if (this.strength === 0 || this.dexterity === 0 || this.constitution === 0 || this.intelligence === 0 || this.wisdom === 0 || this.charisma === 0) {
            this.error = "Please fill all the fields";
            return;
          }
          break;
        case 3:
          if (this.characterClass === "" || this.alignment === "") {
            this.error = "Please fill all the fields";
            return;
          }
          break;
        default:
      }
      this.currentStep++;
    },

    prevStep() {
      this.currentStep--;
    },

    formatAbilityScores(ability) {
      const scores = [];

      if (ability.dex) scores.push(`+${ability.dex} Dexterity`);
      if (ability.wis) scores.push(`+${ability.wis} Wisdom`);
      if (ability.str) scores.push(`+${ability.str} Strength`);
      if (ability.int) scores.push(`+${ability.int} Intelligent`);
      if (ability.con) scores.push(`+${ability.con} Constitution`);
      if (ability.cha) scores.push(`+${ability.cha} Charisma`);

      if (ability.choose) {
        scores.push(`(Pilih ${ability.choose.count} dari ${this.loopChoose(ability.choose.from)})`);
      }

      return scores.join(', ');
    },

    loopChoose(arr) {
      let str = ''
      for (let i = 0; i < arr.length; i++) {
        str += arr[i]
        if (i !== arr.length - 1) {
          str += ', '
        }
      }
      return str
    },

    searchSubRace(race){
      this.characterSubRace = ""
      axios.get(`http://localhost:3001/sub-race/${race.name}/${race.source}/`)
        .then((response) =>{
          this.subRace = response.data.data
        })
        .catch((error) => {
          console.log(error)
        })
    },

    renderAnnotatedText(text) {
      if (typeof text !== 'string') {
        return '';
      }

      console.log(text)

      const annotationRegex = /\{@(\w+) ([^}]+(?:\{[^}]+\})*)\}/g;

      return text.replace(annotationRegex, (match, type, content) => {
        let cont = content.split('|')[0]
        return `<span class="clickable" @click="handleClick('${match}')">${cont}</span>`;
      });
    },

    attachClickHandlers() {
      const elements = document.getElementsByClassName('clickable');
      for (let i = 0; i < elements.length; i++) {
        elements[i].addEventListener('click', this.handleAnnotationClick);
      }
    },

    removeClickHandlers() {
      const elements = document.getElementsByClassName('clickable');
      for (let i = 0; i < elements.length; i++) {
        elements[i].removeEventListener('click', this.handleAnnotationClick);
      }
    },
  
    handleAnnotationClick(event) {

    },

    submitForm() {
      console.log("Form submitted!", {
        characterName: this.characterName,
        characterRace: this.characterRace,
        strength: this.strength,
        dexterity: this.dexterity,
        characterClass: this.characterClass,
        alignment: this.alignment,
      });
    },
  },
};
</script>

<style>
.clickable {
  color: #3182ce;
  cursor: pointer;
}
</style>

