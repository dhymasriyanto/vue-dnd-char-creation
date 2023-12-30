<script setup>
  defineProps({
    selected: {
      type: Object,
      required: true
    }
  })

  const formatAbilityScores = (ability) => {
    const scores = []

    if (ability.dex){
      if(ability.dex >0)
        scores.push(`+${ability.dex} Dexterity`)
      else
        scores.push(`${ability.dex} Dexterity`)
    }

    if (ability.str){
      if(ability.str >0)
        scores.push(`+${ability.str} Strength`)
      else
        scores.push(`${ability.str} Strength`)
    }

    if (ability.con){
      if(ability.con >0)
        scores.push(`+${ability.con} Constitution`)
      else
        scores.push(`${ability.con} Constitution`)
    }
    
    if (ability.int){
      if(ability.int >0)
        scores.push(`+${ability.int} Intelligence`)
      else
        scores.push(`${ability.int} Intelligence`)
    }

    if (ability.wis){
      if(ability.wis >0)
        scores.push(`+${ability.wis} Wisdom`)
      else
        scores.push(`${ability.wis} Wisdom`)
    }
    
    if (ability.cha){
      if(ability.cha >0)
        scores.push(`+${ability.cha} Charisma`)
      else
        scores.push(`${ability.cha} Charisma`)
    }

    if (ability.choose) {
      if (ability.choose.amount) scores.push(`(Choose ${ability.choose.amount} from ${loopChoose(ability.choose.from)})`)
      else scores.push(`(Choose ${ability.choose.count} from ${loopChoose(ability.choose.from)})`)
    }

    return scores.join(', ');
  }

  const loopChoose = (arr) => {
    let str = ''
    for (let i = 0; i < arr.length; i++) {
      str += arr[i]
      if (i !== arr.length - 1) {
        str += ', '
      }
    }
    return str
  }

  const renderAnnotatedText = (text) => {
      if (typeof text !== 'string') {
        return '';
      }

      const annotationRegex = /\{@(\w+) ([^}]+(?:\{[^}]+\})*)\}/g;

      return text.replace(annotationRegex, (match, type, content) => {
        let cont = content.split('|')[0]
        return `<span class="clickable" @click="handleClick('${match}')">${cont}</span>`;
      });
  }
</script>

<template>
  <div v-if="Object.keys(selected).length != 0">
    <h3 class="text-xl font-bold mb-2">{{ selected.name }} Details</h3>
    <p><strong>Source:</strong> {{ selected.source }}, Page {{ selected.page }}</p>
    <div class="flex" v-if="selected.otherSources">
      <p><strong>Other Sources:</strong></p>
      <ul>
        <li class="ml-2" v-for="source in selected.otherSources">
          {{ source.source }}, Page {{ source.page }}
        </li>
      </ul>
    </div>
    <p v-if="selected.size"><strong>Size:</strong> {{ selected.size[0] }}</p>
    <p v-if="typeof selected.speed === 'object'">
      <strong>Speed:</strong>
      {{ selected.speed.walk ? `Walk: ${selected.speed.walk} ft,` : '' }}
      {{ selected.speed.fly ? `Fly: ${selected.speed.fly} ft,` : '' }}
      {{ selected.speed.swim ? `Swim: ${selected.speed.swim } ft,` : ''}}
      {{ selected.speed.climb ? `Climb: ${selected.speed.climb } ft,` : ''}}
    </p>
    <p v-else-if="typeof selected.speed === 'number'"><strong>Speed:</strong> {{ selected.speed }} ft</p>
    <p v-if="selected.ability">
      <strong>Ability Scores:</strong>
      {{ formatAbilityScores(selected.ability[0]) }}
    </p>
    <p v-if="selected.age"><strong>Age:</strong>
      Mature at {{ selected.age.mature }} years, Max age is {{ selected.age.max }} years
    </p>
    <p v-if="selected.darkvision"><strong>Darkvision:</strong> {{ selected.darkvision }} ft</p>
    <p v-if="selected.heightAndWeight">
      <strong>Height and Weight:</strong>
      {{ selected.heightAndWeight.baseHeight }} (+ {{ selected.heightAndWeight.heightMod }}) inches, {{ selected.heightAndWeight.baseWeight }} (+ {{ selected.heightAndWeight.weightMod }}) lb
    </p>
    <p v-if="selected.traitTags"><strong>Trait Tags:</strong> {{ selected.traitTags.join(', ') }}</p>
    <p v-if="selected.skillProficiencies">
      <strong>Skill Proficiencies:</strong>
      <span v-for="(skill, index, ix) in selected.skillProficiencies" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span v-if="Object.keys(skill)[index] === 'any'">
          Choose {{ skill.any }} from any
        </span>
        <span v-else-if="Object.keys(skill)[index] === 'choose'">
          Choose {{ skill.choose.count }} from {{ loopChoose(skill.choose.from) }}
        </span>
        <span v-else>
          {{ Object.keys(skill)[index] }}
        </span>
      </span>
    </p>
    <p v-if="selected.toolProficiencies">
      <strong>Tool Proficiencies:</strong>
      <span v-for="(tool, index, ix) in selected.toolProficiencies" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span v-if="Object.keys(tool)[index] === 'any'">
          Choose {{ tool.any }} from any
        </span>
        <span v-else-if="Object.keys(tool)[index] === 'choose'">
          Choose {{ tool.choose.count }} from {{ loopChoose(tool.choose.from) }}
        </span>
        <span v-else>
          {{ Object.keys(tool)[index] }}
        </span>
      </span>
    </p>
    <p v-if="selected.languageProficiencies">
      <strong>Language Proficiencies:</strong>
      <span v-for="(language, index) in selected.languageProficiencies" :key="index">
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
              Choose {{ language[lang] }} standard language
            </span>
        </span>
      </span>
    </p>
    <p v-if="selected.resist"><strong>Resist:</strong>
      <span v-for="(resist, index) in selected.resist" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span v-if="resist.choose">
          Choose {{ resist.choose.count }} from {{ loopChoose(resist.choose.from) }}
        </span>
        <span v-else>
          {{ resist }}
        </span>
      </span>
    </p>
    <p v-if="selected.conditionImmune">
      <strong>Condition Immune:</strong>
      <span v-for="(immune, index) in selected.conditionImmune" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span v-if="immune.choose">
          Choose {{ immune.choose.count }} from {{ loopChoose(immune.choose.from) }}
        </span>
        <span v-else>
          {{ immune }}
        </span>
      </span>
    </p>
    <p v-if="selected.creatureTypes">
      <strong>Creature Types:</strong>
      <span v-for="(type, index) in selected.creatureTypes" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span v-if="type.choose">
          Choose {{ type.choose.count }} from {{ loopChoose(type.choose.from) }}
        </span>
        <span v-else>
          {{ type }}
        </span>
      </span>
    </p>
    <p v-if="selected.additionalSpells">
      <strong>Additional Spells:</strong>
      <ul>
        <li v-for="(spell, index) in selected.additionalSpells">
          <div v-if="spell.ability">
            <span v-if="selected.additionalSpells.length > 1">
              <div v-if="index === 0" class="text-sky-500">Choose one of the spell, from:</div>
              <div v-else class="text-sky-500">or</div>
            </span>
            <span v-if="spell.ability.choose">
              Choose your spellcasting ability from:
              <span v-for="(ability, index) in spell.ability.choose" :key="index">
                {{ index > 0 ? ', ' : '' }}
                {{ ability }}
              </span>
            </span>
            <span v-else>
              Your spellcasting is from {{ spell.ability }}
            </span>
          </div>
          <div v-if="spell.innate">
            Innate spell:
            <div v-for="(innate, level) in spell.innate" :key="level">
              <div v-for="inn in innate">
                <p v-if="innate.daily" v-for="(lv, daily) in innate">
                - {{lv[1][0]}} (On level {{ level }}) {{daily}}
                </p>
                <p v-else>
                - {{ inn }} (On level {{ level }})
                </p>
              </div>
            </div>
          </div>
          <div v-if="spell.known">
            Known spell:
            <div v-for="(known, level) in spell.known" :key="level">
              <p v-if="known.daily" v-for="(lv, daily) in known">
              - {{lv[1][0]}} (On level {{ level }}) {{daily}}
              </p>
              <span v-for="(kn,ix) in known">
                <p v-if="kn.choose">
                Choose {{kn.count}} spell {{kn.choose}}
                </p>
                <p v-else-if="ix === 'rest'" v-for="i in kn[level]">
                {{i}} (On level {{ level }}) {{ix}}
                </p>
                <p v-else>
                - {{ known[ix] }} (On level {{ level }})
                </p>
              </span>
            </div>
          </div>
        </li>
      </ul>
    </p>
    <p v-if="selected.entries" ><strong><hr class="my-6"></strong> 
      <ul>
        <li v-for="entry in selected.entries">
          <p v-if="entry.name" class="mb-1">
            <b>{{entry.name}}</b>
          </p>
          <p v-else class="mb-4" v-html="renderAnnotatedText(entry)"></p>
          <span v-if="typeof entry.entries === 'string'" >{{entry.entries}}</span>
          <span v-else-if="typeof entry.entries === 'object'">
            <ul>
              <li v-for="e in entry.entries">
                <p class="mb-3" v-html="renderAnnotatedText(e)"></p>
                <div v-if="e.type === 'table'" class="mb-8">
                  <table class="table-auto">
                    <thead>
                      <tr>
                        <th v-for="h in e.colLabels" class="px-4 py-2">{{h}}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in e.rows">
                        <td v-for="c in r" class="border px-4 py-2" v-html="renderAnnotatedText(c)"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
</template>

<style>
.clickable {
  color: #3182ce;
  cursor: pointer;
}
</style>
