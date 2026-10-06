<script setup>
import { computed, ref, watch } from 'vue';
import { renderAnnotatedText, renderTableCell } from '../utils/textRenderer';

const props = defineProps({
  selected: {
    type: Object,
    required: true
  },
  abilityChoices: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:abilityChoices'])

const ABIL_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
}

const SHORT_TO_KEY = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
  strength: 'strength',
  dexterity: 'dexterity',
  constitution: 'constitution',
  intelligence: 'intelligence',
  wisdom: 'wisdom',
  charisma: 'charisma'
}

const anySkills = ref([
  'acrobatics',
  'animal handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight of hand',
  'stealth',
  'survival'
])

const formatAbilityScores = (ability) => {
  if (!ability || typeof ability !== 'object') return ''
  const scores = []

  if (ability.dex) {
    if (ability.dex > 0)
      scores.push(`+${ability.dex} Dexterity`)
    else
      scores.push(`${ability.dex} Dexterity`)
  }

  if (ability.str) {
    if (ability.str > 0)
      scores.push(`+${ability.str} Strength`)
    else
      scores.push(`${ability.str} Strength`)
  }

  if (ability.con) {
    if (ability.con > 0)
      scores.push(`+${ability.con} Constitution`)
    else
      scores.push(`${ability.con} Constitution`)
  }

  if (ability.int) {
    if (ability.int > 0)
      scores.push(`+${ability.int} Intelligence`)
    else
      scores.push(`${ability.int} Intelligence`)
  }

  if (ability.wis) {
    if (ability.wis > 0)
      scores.push(`+${ability.wis} Wisdom`)
    else
      scores.push(`${ability.wis} Wisdom`)
  }

  if (ability.cha) {
    if (ability.cha > 0)
      scores.push(`+${ability.cha} Charisma`)
    else
      scores.push(`${ability.cha} Charisma`)
  }

  if (ability.choose) {
    const count = ability.choose.count || ability.choose.amount || 1
    scores.push(`(Choose ${count} from ${loopChoose(ability.choose.from)})`)
  }

  return scores.join(', ');
}

const loopChoose = (arr) => {
  if (!Array.isArray(arr)) return arr ? String(arr) : ''
  return arr.map(a => ABIL_NAMES[a.toLowerCase()] || a).join(', ')
}

const chooseConfig = computed(() => {
  const abList = props.selected?.ability || []
  for (const item of abList) {
    if (item.choose && (item.choose.count || item.choose.amount) && Array.isArray(item.choose.from)) {
      return {
        count: item.choose.count || item.choose.amount || 1,
        from: item.choose.from.map(k => SHORT_TO_KEY[String(k).toLowerCase()] || String(k).toLowerCase())
      }
    }
  }
  return null
})

const localChoices = ref([])
const selectedSpellAbilities = ref({})

watch(() => props.selected, (sel) => {
  if (sel?.additionalSpells && Array.isArray(sel.additionalSpells)) {
    sel.additionalSpells.forEach((sp, idx) => {
      if (sp?.ability?.choose && Array.isArray(sp.ability.choose) && !selectedSpellAbilities.value[idx]) {
        selectedSpellAbilities.value[idx] = sp.ability.choose[0]
      }
    })
  }
}, { immediate: true })

watch([chooseConfig, () => props.abilityChoices], ([cfg, extChoices]) => {
  if (!cfg) {
    localChoices.value = []
    return
  }
  if (Array.isArray(extChoices) && extChoices.length >= cfg.count) {
    localChoices.value = extChoices.slice(0, cfg.count).map(k => {
      const lower = String(k).toLowerCase()
      const normalized = SHORT_TO_KEY[lower] || lower
      return cfg.from.includes(normalized) ? normalized : cfg.from[0]
    })
  } else {
    const initial = []
    for (const opt of cfg.from) {
      if (initial.length >= cfg.count) break
      if (!initial.includes(opt)) initial.push(opt)
    }
    localChoices.value = initial
    emit('update:abilityChoices', [...initial])
  }
}, { immediate: true })

const onSelectStat = (slotIdx, val) => {
  if (!chooseConfig.value) return
  const next = [...localChoices.value]
  const prevVal = next[slotIdx]
  next[slotIdx] = val
  for (let i = 0; i < next.length; i++) {
    if (i !== slotIdx && next[i] === val) {
      if (prevVal && prevVal !== val && !next.some((v, idx) => idx !== i && v === prevVal)) {
        next[i] = prevVal
      } else {
        const unused = chooseConfig.value.from.find(f => !next.some((v, idx) => idx !== i && v === f))
        if (unused) next[i] = unused
      }
    }
  }
  localChoices.value = next
  emit('update:abilityChoices', [...next])
}

const getAvailableOptions = (slotIdx) => {
  if (!chooseConfig.value) return []
  return chooseConfig.value.from.map(opt => ({
    value: opt,
    label: `${ABIL_NAMES[opt] || opt.toUpperCase()} (+1)`
  }))
}
</script>

<template>
  <div v-if="Object.keys(selected).length != 0" class="text-xs text-gray-800 space-y-2 max-w-full overflow-hidden break-words">
    <h3 class="text-lg font-bold mb-2">{{ selected.name }} Details</h3>
    <p><strong>Source:</strong> {{ selected.source }}, Page {{ selected.page }}</p>
    <div class="flex flex-wrap gap-1" v-if="selected.otherSources">
      <strong>Other Sources:</strong>
      <ul class="flex flex-wrap gap-2">
        <li v-for="(source, sIdx) in selected.otherSources" :key="sIdx">
          {{ source.source }}, Page {{ source.page }}
        </li>
      </ul>
    </div>
    <p v-if="selected.size"><strong>Size:</strong> {{ Array.isArray(selected.size) ? selected.size.join(', ') : selected.size }}</p>
    <p v-if="selected.speed && typeof selected.speed === 'object'">
      <strong>Speed:</strong>
      {{ selected.speed.walk ? `Walk: ${selected.speed.walk} ft,` : '' }}
      {{ selected.speed.fly ? `Fly: ${selected.speed.fly} ft,` : '' }}
      {{ selected.speed.swim ? `Swim: ${selected.speed.swim} ft,` : '' }}
      {{ selected.speed.climb ? `Climb: ${selected.speed.climb} ft,` : '' }}
    </p>
    <p v-else-if="selected.speed"><strong>Speed:</strong> {{ selected.speed }} ft</p>
    <p v-if="selected.age"><strong>Age:</strong>
      {{ typeof selected.age === 'object' ? `Mature at ${selected.age.mature || 0} years, Max age is ${selected.age.max || 0} years` : selected.age }}
    </p>
    <p v-if="selected.darkvision"><strong>Darkvision:</strong> {{ selected.darkvision }} ft</p>
    <p v-if="selected.heightAndWeight">
      <strong>Height and Weight:</strong>
      {{ selected.heightAndWeight.baseHeight }} (+ {{ selected.heightAndWeight.heightMod }}) inches, {{
    selected.heightAndWeight.baseWeight }} (+ {{ selected.heightAndWeight.weightMod }}) lb
    </p>
    <p v-if="selected.traitTags && selected.traitTags.length"><strong>Trait Tags:</strong> {{ Array.isArray(selected.traitTags) ? selected.traitTags.join(', ') : selected.traitTags }}</p>
    <p v-if="selected.resist"><strong>Resist:</strong>
      <template v-if="Array.isArray(selected.resist)">
        <span v-for="(resist, index) in selected.resist" :key="index">
          {{ index > 0 ? ', ' : '' }}
          <span v-if="typeof resist === 'object' && resist?.choose">
            Choose {{ resist.choose.count }} from {{ loopChoose(resist.choose.from) }}
          </span>
          <span v-else>
            {{ resist }}
          </span>
        </span>
      </template>
      <template v-else>{{ selected.resist }}</template>
    </p>
    <p v-if="selected.conditionImmune">
      <strong>Condition Immune:</strong>
      <template v-if="Array.isArray(selected.conditionImmune)">
        <span v-for="(immune, index) in selected.conditionImmune" :key="index">
          {{ index > 0 ? ', ' : '' }}
          <span v-if="typeof immune === 'object' && immune?.choose">
            Choose {{ immune.choose.count }} from {{ loopChoose(immune.choose.from) }}
          </span>
          <span v-else>
            {{ immune }}
          </span>
        </span>
      </template>
      <template v-else>{{ selected.conditionImmune }}</template>
    </p>
    <p v-if="selected.creatureTypes">
      <strong>Creature Types:</strong>
      <template v-if="Array.isArray(selected.creatureTypes)">
        <span v-for="(type, index) in selected.creatureTypes" :key="index">
          {{ index > 0 ? ', ' : '' }}
          <span v-if="typeof type === 'object' && type?.choose">
            Choose {{ type.choose.count }} from {{ loopChoose(type.choose.from) }}
          </span>
          <span v-else>
            {{ type }}
          </span>
        </span>
      </template>
      <template v-else>{{ selected.creatureTypes }}</template>
    </p>
    <div v-if="selected.additionalSpells && Array.isArray(selected.additionalSpells)">
      <strong>Additional Spells:</strong>
      <ul>
        <li v-for="(spell, index) in selected.additionalSpells" :key="index">
          <div v-if="spell.ability">
            <span v-if="selected.additionalSpells.length > 1">
              <div v-if="index === 0" class="text-sky-500">Choose one of the spell, from:</div>
              <div v-else class="text-sky-500">or</div>
            </span>
            <span v-if="spell.ability.choose">
              Choose your spellcasting ability from:
              <select
                v-model="selectedSpellAbilities[index]"
                class="my-1 p-2 border border-gray-300 rounded w-full bg-white text-xs"
              >
                <option value="" disabled>Select spellcasting ability</option>
                <option
                  v-for="from in spell.ability.choose"
                  :key="from"
                  :value="from"
                >
                  {{ ABIL_NAMES[from.toLowerCase()] || from.toUpperCase() }}
                </option>
              </select>
            </span>
            <span v-else>
              Your spellcasting is from {{ spell.ability }}
            </span>
          </div>
          <div v-if="spell.innate">
            Innate spell:
            <div v-for="(innate, level) in spell.innate" :key="level">
              <template v-if="innate && innate.daily">
                <p v-for="(lv, daily) in innate" :key="daily">
                  - <span v-html="renderAnnotatedText(lv[1] ? lv[1][0] : lv)"></span> (On level {{ level }}) {{ daily }}
                </p>
              </template>
              <template v-else-if="Array.isArray(innate)">
                <p v-for="(inn, innIdx) in innate" :key="innIdx">
                  - <span v-html="renderAnnotatedText(inn)"></span> (On level {{ level }})
                </p>
              </template>
              <p v-else>- <span v-html="renderAnnotatedText(innate)"></span> (On level {{ level }})</p>
            </div>
          </div>
          <div v-if="spell.known">
            Known spell:
            <div v-for="(known, level) in spell.known" :key="level">
              <template v-if="known && known.daily">
                <p v-for="(lv, daily) in known" :key="daily">
                  - <span v-html="renderAnnotatedText(lv[1] ? lv[1][0] : lv)"></span> (On level {{ level }}) {{ daily }}
                </p>
              </template>
              <template v-else-if="typeof known === 'object'">
                <div v-for="(knVal, knKey) in known" :key="knKey">
                  <p v-if="knVal && knVal.choose">
                    Choose {{ knVal.count }} spell <span v-html="renderAnnotatedText(knVal.choose)"></span>
                  </p>
                  <template v-else-if="knKey === 'rest' && Array.isArray(knVal)">
                    <p v-for="i in knVal" :key="i">
                      <span v-html="renderAnnotatedText(i)"></span> (On level {{ level }}) {{ knKey }}
                    </p>
                  </template>
                  <p v-else>
                    - <span v-html="renderAnnotatedText(knVal)"></span> (On level {{ level }})
                  </p>
                </div>
              </template>
              <p v-else>- <span v-html="renderAnnotatedText(known)"></span> (On level {{ level }})</p>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="selected.ability && Array.isArray(selected.ability) && selected.ability.length > 0 && selected.ability[0]">
      <p class="mt-2">
        <strong>Ability Scores:</strong>
        {{ formatAbilityScores(selected.ability[0]) }}
      </p>
      <div v-if="chooseConfig" class="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
        <label class="block font-semibold text-gray-800 mb-1.5">
          Choose {{ chooseConfig.count }} Ability Score Bonus (+1 each):
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="slotIdx in chooseConfig.count" :key="'slot-' + slotIdx">
            <select
              :value="localChoices[slotIdx - 1]"
              @change="onSelectStat(slotIdx - 1, $event.target.value)"
              class="p-1.5 border border-gray-300 rounded w-full bg-white text-xs"
            >
              <option value="" disabled>Select Ability</option>
              <option
                v-for="opt in getAvailableOptions(slotIdx - 1)"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div v-if="selected.skillProficiencies && Array.isArray(selected.skillProficiencies)">
      <strong>Skill Proficiencies:</strong>
      <span v-for="(skill, index) in selected.skillProficiencies" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <template v-if="typeof skill === 'object' && skill !== null">
          <span v-if="skill.any">
            Choose {{ skill.any }} from any
          </span>
          <span v-else-if="skill.choose">
            Choose {{ skill.choose.count }} from {{ loopChoose(skill.choose.from) }}
          </span>
          <span v-else>
            {{ Object.keys(skill).join(', ') }}
          </span>
        </template>
        <template v-else>
          {{ skill }}
        </template>
      </span>
    </div>
    <p v-if="selected.toolProficiencies && Array.isArray(selected.toolProficiencies)">
      <strong>Tool Proficiencies:</strong>
      <span v-for="(tool, index) in selected.toolProficiencies" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <template v-if="typeof tool === 'object' && tool !== null">
          <span v-if="tool.any">
            Choose {{ tool.any }} from any
          </span>
          <span v-else-if="tool.choose">
            Choose {{ tool.choose.count }} from {{ loopChoose(tool.choose.from) }}
          </span>
          <span v-else>
            {{ Object.keys(tool).join(', ') }}
          </span>
        </template>
        <template v-else>
          {{ tool }}
        </template>
      </span>
    </p>
    <p v-if="selected.languageProficiencies && Array.isArray(selected.languageProficiencies)">
      <strong>Language Proficiencies:</strong>
      <span v-for="(language, langIdx) in selected.languageProficiencies" :key="langIdx">
        {{ langIdx > 0 ? ', ' : '' }}
        <template v-if="typeof language === 'object' && language !== null">
          <span v-for="(langKey, kIdx) in Object.keys(language)" :key="langKey">
            {{ kIdx > 0 ? ', ' : '' }}
            <span v-if="langKey !== 'anyStandard'">
              {{ langKey.charAt(0).toUpperCase() + langKey.slice(1) }}
            </span>
            <span v-else>
              Choose {{ language[langKey] }} standard language
            </span>
          </span>
        </template>
        <template v-else>
          {{ language }}
        </template>
      </span>
    </p>
    <div v-if="selected.entries && selected.entries.length">
      <hr class="my-4 border-gray-200">
      <ul class="space-y-3">
        <li v-for="(entry, entryIdx) in selected.entries" :key="entryIdx">
          <div v-if="entry.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
            <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
              <caption v-if="entry.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                {{ entry.caption }}
              </caption>
              <thead class="bg-gray-50">
                <tr>
                  <th
                    v-for="(h, hIdx) in (entry.colLabels || [])"
                    :key="hIdx"
                    class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                    v-html="renderTableCell(h)"
                  ></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="(r, rIdx) in (entry.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
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
          <p v-else-if="typeof entry === 'string'" class="mb-2 leading-relaxed" v-html="renderAnnotatedText(entry)"></p>
          <template v-else>
            <p v-if="entry.name" class="font-bold text-gray-900 mt-2 mb-1">
              {{ entry.name }}
            </p>
            <div v-if="typeof entry.entries === 'string'" class="mb-2 leading-relaxed">
              <p v-html="renderAnnotatedText(entry.entries)"></p>
            </div>
            <div v-else-if="Array.isArray(entry.entries)" class="space-y-2">
              <template v-for="(e, eIdx) in entry.entries" :key="eIdx">
                <p v-if="typeof e === 'string'" class="mb-2 leading-relaxed" v-html="renderAnnotatedText(e)"></p>

                <div v-else-if="e.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
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

                <div v-else-if="e.type === 'list'" class="ml-3 sm:ml-5 mb-2">
                  <ul class="space-y-1">
                    <li v-for="(l, lIdx) in e.items" :key="lIdx">
                      <span v-if="typeof l === 'string'" v-html="`- ${renderAnnotatedText(l)}`"></span>
                      <span v-else>
                        <span v-if="l.name" class="mr-2 text-sky-900 font-bold">{{ l.name }}</span>
                        <span v-if="l.entry" v-html="renderAnnotatedText(l.entry)"></span>
                        <ul v-if="l.type === 'item' && Array.isArray(l.entries)" class="ml-3 space-y-0.5">
                          <li v-for="(i, iIdx) in l.entries" :key="iIdx">
                            <span v-html="renderAnnotatedText(i)"></span>
                          </li>
                        </ul>
                      </span>
                    </li>
                  </ul>
                </div>

                <div v-else-if="e.type === 'entries'" class="mb-2">
                  <p v-if="e.name" class="font-bold text-gray-800 mb-1" v-html="renderAnnotatedText(e.name)"></p>
                  <template v-for="(subE, subIdx) in (e.entries || [])" :key="subIdx">
                    <p v-if="typeof subE === 'string'" class="mb-1 leading-relaxed" v-html="renderAnnotatedText(subE)"></p>
                    <div v-else-if="subE.type === 'table'" class="my-3 overflow-x-auto w-full border border-gray-200 rounded max-w-full">
                      <table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">
                        <caption v-if="subE.caption" class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">
                          {{ subE.caption }}
                        </caption>
                        <thead class="bg-gray-50">
                          <tr>
                            <th
                              v-for="(h, hIdx) in (subE.colLabels || [])"
                              :key="hIdx"
                              class="px-2.5 py-1.5 font-semibold text-gray-700 text-[11px] whitespace-nowrap"
                              v-html="renderTableCell(h)"
                            ></th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                          <tr v-for="(r, rIdx) in (subE.rows || [])" :key="rIdx" class="hover:bg-gray-50/80">
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
                  </template>
                </div>
              </template>
            </div>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.clickable {
  color: #3182ce;
  cursor: pointer;
}
</style>
