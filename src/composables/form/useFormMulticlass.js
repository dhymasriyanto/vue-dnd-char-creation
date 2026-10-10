import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import {
  formatPrerequisitesText,
  getMulticlassProficiencies,
  checkMulticlassPrerequisites
} from '../../utils/multiclassRules'
import { ALL_SKILLS } from '../../constants/formConstants'

export function getUnlockedAsiTiersForClass(className, level) {
  const lvl = Number(level) || 1
  const cName = (className || '').toLowerCase()
  let standard = [4, 8, 12, 16, 19]
  if (cName.includes('fighter')) {
    standard = [4, 6, 8, 12, 14, 16, 19]
  } else if (cName.includes('rogue')) {
    standard = [4, 8, 10, 12, 16, 19]
  }
  return standard.filter(tier => lvl >= tier)
}

export function checkIsSpellcaster(className, classLevelVal, subClassName, edition) {
  if (!className) return false
  const cName = className.toLowerCase()
  const fullCasters = ['wizard', 'cleric', 'druid', 'sorcerer', 'bard', 'warlock', 'artificer']
  if (fullCasters.includes(cName)) return true
  if (cName === 'paladin' || cName === 'ranger') {
    if (edition === '2024') return true
    return Number(classLevelVal) >= 2
  }
  const scName = (subClassName || '').toLowerCase()
  if (cName === 'fighter' && scName.includes('eldritch knight') && Number(classLevelVal) >= 3) return true
  if (cName === 'rogue' && scName.includes('arcane trickster') && Number(classLevelVal) >= 3) return true
  return false
}

export function useFormMulticlass({
  classLevel,
  classSelected,
  filteredClasses,
  selectedEdition,
  selectedSources,
  API_URL,
  errors,
  recheckAbilitiesErrors,
  getPriorAndClassSkills,
  priorGrantedSkills,
  chosenClassSkills,
  characterClass,
  selectedSubClassItem,
  characterStore,
  unlockedAsiTiers,
  asiTierChoices,
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma
}) {
  const multiclasses = ref([])

  const totalCharacterLevel = computed(() => {
    const primaryLvl = Number(classLevel.value) || 1
    const mcLvlSum = multiclasses.value.reduce((sum, mc) => sum + (Number(mc.classLevel) || 1), 0)
    return Math.min(20, primaryLvl + mcLvlSum)
  })

  const maxPrimaryClassLevel = computed(() => {
    const mcLvlSum = multiclasses.value.reduce((sum, mc) => sum + (Number(mc.classLevel) || 1), 0)
    return Math.max(1, 20 - mcLvlSum)
  })

  const getMaxLevelForMc = (mcIndex) => {
    const primaryLvl = Number(classLevel.value) || 1
    const otherMcSum = multiclasses.value.reduce((sum, mc, idx) => {
      if (idx === mcIndex) return sum
      return sum + (Number(mc.classLevel) || 1)
    }, 0)
    return Math.max(1, 20 - primaryLvl - otherMcSum)
  }

  const availableClassesForMulticlass = computed(() => {
    const selected = new Set()
    if (classSelected.value) selected.add(classSelected.value.toLowerCase())
    for (const mc of multiclasses.value) {
      if (mc.classSelected) selected.add(mc.classSelected.toLowerCase())
    }
    const result = {}
    for (const [k, v] of Object.entries(filteredClasses.value || {})) {
      if (!selected.has(k.toLowerCase())) {
        result[k] = v
      }
    }
    return result
  })

  const addMulticlass = () => {
    if (totalCharacterLevel.value >= 20) return
    const newMc = {
      id: 'mc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      classSelected: '',
      classLevel: 1,
      characterClass: { class: null, classFeature: [] },
      subClassLists: [],
      selectedSubClassKey: '',
      selectedSubClassItem: null,
      asiTierChoices: {},
      chosenSpells: [],
      chosenSkills: [],
      classSubTab: 'features',
      isCollapsed: false
    }
    multiclasses.value.push(newMc)
    nextTick(() => {
      const el = document.getElementById(newMc.id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const removeMulticlass = (index) => {
    multiclasses.value.splice(index, 1)
    for (const k of Object.keys(errors)) {
      if (k.includes('_mc_')) {
        delete errors[k]
      }
    }
    if (typeof recheckAbilitiesErrors === 'function') recheckAbilitiesErrors()
  }

  const onMcClassChange = async (mc) => {
    mc.characterClass = { class: null, classFeature: [] }
    mc.subClassLists = []
    mc.selectedSubClassKey = ''
    mc.selectedSubClassItem = null
    mc.chosenSpells = []
    mc.chosenSkills = []
    mc.asiTierChoices = {}
    const mcIdx = multiclasses.value.indexOf(mc)
    if (mcIdx !== -1) {
      delete errors['class_mc_' + mcIdx]
      delete errors['subclass_mc_' + mcIdx]
      delete errors['classSpells_mc_' + mcIdx]
      delete errors['skills_mc_' + mcIdx]
    }

    if (!mc.classSelected) {
      if (typeof recheckAbilitiesErrors === 'function') recheckAbilitiesErrors()
      return
    }
    try {
      const res = await axios.get(`${API_URL}/class/${mc.classSelected}?edition=${selectedEdition.value}`)
      const data = res.data?.data
      if (data?.class?.length) {
        mc.characterClass.class = data.class[0]
        mc.characterClass.classFeature = data.classFeature || []
        let directSubclasses = data.subclass || data.subClass || []
        mc.subClassLists = directSubclasses
        const c = data.class[0]
        if (c?.name && c?.source) {
          try {
            const scRes = await axios.get(`${API_URL}/sub-class/${c.name.toLowerCase()}/${c.source.toLowerCase()}?edition=${selectedEdition.value}`)
            const scList = scRes.data?.data?.subClass || scRes.data?.data?.subclass || []
            if (scList.length > 0) {
              mc.subClassLists = scList
            }
          } catch (e) {
            console.warn('Multiclass subclass warning', e)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load multiclass data', err)
    } finally {
      if (typeof recheckAbilitiesErrors === 'function') recheckAbilitiesErrors()
    }
  }

  const onMcSubclassSelect = async (mc, key, mcIndex = -1) => {
    mc.selectedSubClassKey = key
    const mcIdx = mcIndex >= 0 ? mcIndex : multiclasses.value.findIndex(m => m.id === mc.id || m === mc)
    if (mcIdx !== -1 && key) {
      delete errors['subclass_mc_' + mcIdx]
    }
    if (!key) {
      mc.selectedSubClassItem = null
      return
    }

    const [name, source] = key.split('|')
    const cleanName = (name || '').trim().toLowerCase()
    const cleanSource = (source || '').trim().toLowerCase()

    const lists = Array.isArray(mc.subClassLists) ? mc.subClassLists : (typeof mc.subClassLists === 'object' ? Object.values(mc.subClassLists) : [])
    const found = lists.find(s => {
      const sName = (s.name || '').trim().toLowerCase()
      const sSource = (s.source || '').trim().toLowerCase()
      if (cleanSource && cleanSource !== 'undefined') {
        return sName === cleanName && sSource === cleanSource
      }
      return sName === cleanName
    }) || lists.find(s => (s.name || '').trim().toLowerCase() === cleanName)

    mc.selectedSubClassItem = found ? { ...found, subClassFeature: [] } : { name, source, subClassFeature: [] }

    if (found) {
      const className = (found.className || mc.classSelected || mc.characterClass?.class?.name || '').toLowerCase()
      const classSource = (found.classSource || mc.characterClass?.class?.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toLowerCase()
      const scName = encodeURIComponent(found.name)
      const scSource = encodeURIComponent(found.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB'))
      const shortName = encodeURIComponent(found.shortName || found.name)
      const page = encodeURIComponent(found.page || '0')

      try {
        const res = await axios.get(`${API_URL}/sub-class/${className}/${classSource}/${scName}/${scSource}/${shortName}/${page}?edition=${selectedEdition.value}`)
        if (res.data?.data) {
          mc.selectedSubClassItem = {
            ...found,
            ...(res.data.data.subClass?.[0] || {}),
            subClassFeature: res.data.data.subClassFeature || []
          }
        }
      } catch (e) {
        console.warn('Failed to load multiclass subclass features', e)
      }
    }
  }

  const getSubclassUnlockLevel = (className, edition) => {
    if (edition === '2024') return 3
    const cName = (className || '').toLowerCase()
    if (['cleric', 'sorcerer', 'warlock'].some(c => cName.includes(c))) return 1
    if (['druid', 'wizard'].some(c => cName.includes(c))) return 2
    return 3
  }

  const getMcAvailableSubClasses = (mc) => {
    const lists = mc?.subClassLists || []
    const arr = Array.isArray(lists) ? lists : (typeof lists === 'object' ? Object.values(lists) : [])
    const sources = (selectedSources?.value && selectedSources.value.length > 0)
      ? selectedSources.value.map(s => String(s).toUpperCase())
      : (selectedEdition.value === '2024' ? ['XPHB'] : ['PHB'])
    const filtered = arr.filter(sc => {
      const s = (sc.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
      return sources.includes(s)
    })
    return filtered.length > 0 ? filtered : arr
  }

  const getMcProficiencies = (mc) => {
    const className = mc.classSelected || mc.characterClass?.class?.name || ''
    return getMulticlassProficiencies(className, selectedEdition.value, mc.characterClass?.class)
  }

  const getMcSkillConfig = (mc) => {
    const prof = getMcProficiencies(mc)
    const skillsList = prof.skills || []
    if (skillsList.length === 0) return { count: 0, from: [] }
    const first = skillsList[0]
    let from = (first.from && first.from.length > 0)
      ? first.from
      : ALL_SKILLS.map(s => s.key)
    return { count: Number(first.count) || 1, from }
  }

  const getMcAvailableSkills = (mc) => {
    const cfg = getMcSkillConfig(mc)
    const prior = typeof getPriorAndClassSkills === 'function'
      ? getPriorAndClassSkills()
      : [...(priorGrantedSkills?.value || []), ...(chosenClassSkills?.value || [])]
    const otherMcSkills = multiclasses.value
      .filter(m => m !== mc)
      .flatMap(m => m.chosenSkills || [])
    const excluded = new Set([...prior, ...otherMcSkills])
    return cfg.from.filter(k => !excluded.has(k))
  }

  const isSkillPriorGranted = (skillKey, currentMc) => {
    const prior = typeof getPriorAndClassSkills === 'function'
      ? getPriorAndClassSkills()
      : [...(priorGrantedSkills?.value || []), ...(chosenClassSkills?.value || [])]
    if (prior.includes(skillKey)) return true
    const otherMc = multiclasses.value.find(m => m !== currentMc && (m.chosenSkills || []).includes(skillKey))
    return Boolean(otherMc)
  }

  const toggleMcSkill = (mc, skillKey, mcIdx) => {
    if (!mc.chosenSkills) mc.chosenSkills = []
    const cfg = getMcSkillConfig(mc)
    const idx = mc.chosenSkills.indexOf(skillKey)
    if (idx >= 0) {
      mc.chosenSkills.splice(idx, 1)
    } else {
      if (mc.chosenSkills.length < cfg.count) {
        mc.chosenSkills.push(skillKey)
      }
    }
    const available = getMcAvailableSkills(mc)
    const needed = Math.min(cfg.count, available.length)
    if (mc.chosenSkills.length >= needed) {
      delete errors['skills_mc_' + mcIdx]
    }
  }

  const currentAbilityScoresMap = computed(() => ({
    strength: strength?.value ?? 10,
    dexterity: dexterity?.value ?? 10,
    constitution: constitution?.value ?? 10,
    intelligence: intelligence?.value ?? 10,
    wisdom: wisdom?.value ?? 10,
    charisma: charisma?.value ?? 10
  }))

  const getMcPrereqStatus = (mc) => {
    if (!mc.classSelected) {
      return { met: true, reason: '', details: 'None', scoresAssigned: false }
    }
    return checkMulticlassPrerequisites(
      mc.classSelected,
      currentAbilityScoresMap.value,
      mc.characterClass?.class
    )
  }

  const isMcPrereqMet = (mc) => {
    if (!mc || !mc.classSelected) return false
    const mcStatus = getMcPrereqStatus(mc)
    return Boolean(mcStatus.met)
  }

  const isSpellcasterClass = computed(() => {
    return checkIsSpellcaster(
      characterClass?.value?.class?.name || classSelected.value,
      classLevel.value,
      selectedSubClassItem?.value?.name || characterStore?.characterSubClass?.name,
      selectedEdition.value
    )
  })

  const isMcSpellcaster = (mc) => {
    return checkIsSpellcaster(
      mc.characterClass?.class?.name || mc.classSelected,
      mc.classLevel,
      mc.selectedSubClassItem?.name,
      selectedEdition.value
    )
  }

  const allUnlockedAsiList = computed(() => {
    const list = []
    const pName = (classSelected.value || characterClass?.value?.class?.name || 'Primary Class')
    for (const tier of (unlockedAsiTiers?.value || [])) {
      if (asiTierChoices && !asiTierChoices[tier]) {
        asiTierChoices[tier] = {
          type: '',
          asiMode: '+2',
          plus2Stat: '',
          plus1StatA: '',
          plus1StatB: '',
          featName: '',
          featAbility: ''
        }
      }
      list.push({
        classKey: 'primary',
        className: pName.charAt(0).toUpperCase() + pName.slice(1),
        tier,
        errorKey: `asiTier_${tier}`,
        choice: asiTierChoices ? asiTierChoices[tier] : null
      })
    }
    for (let idx = 0; idx < multiclasses.value.length; idx++) {
      const mc = multiclasses.value[idx]
      if (!isMcPrereqMet(mc)) continue
      const mcName = mc.classSelected || mc.characterClass?.class?.name || `Class #${idx + 2}`
      const mcTiers = getUnlockedAsiTiersForClass(mc.classSelected, mc.classLevel)
      for (const tier of mcTiers) {
        if (!mc.asiTierChoices[tier]) {
          mc.asiTierChoices[tier] = {
            type: '',
            asiMode: '+2',
            plus2Stat: '',
            plus1StatA: '',
            plus1StatB: '',
            featName: '',
            featAbility: ''
          }
        }
        list.push({
          classKey: `mc_${idx}`,
          className: mcName.charAt(0).toUpperCase() + mcName.slice(1),
          tier,
          errorKey: `asiTier_mc_${idx}_${tier}`,
          choice: mc.asiTierChoices[tier]
        })
      }
    }
    return list
  })

  watch(maxPrimaryClassLevel, (newMax) => {
    if (Number(classLevel.value) > newMax) {
      classLevel.value = newMax
    }
  })

  watch(multiclasses, (mcs) => {
    mcs.forEach((mc, idx) => {
      const maxLvl = getMaxLevelForMc(idx)
      if (Number(mc.classLevel) > maxLvl) {
        mc.classLevel = maxLvl
      }
      if (mc.classSelected) {
        delete errors['class_mc_' + idx]
        const mcSubUnlock = getSubclassUnlockLevel(mc.classSelected, selectedEdition.value)
        if (Number(mc.classLevel) < mcSubUnlock) {
          mc.selectedSubClassKey = ''
          mc.selectedSubClassItem = null
          delete errors['subclass_mc_' + idx]
        } else if (mc.selectedSubClassKey) {
          delete errors['subclass_mc_' + idx]
        }
      }
    })
  }, { deep: true })

  return {
    multiclasses,
    totalCharacterLevel,
    maxPrimaryClassLevel,
    getMaxLevelForMc,
    availableClassesForMulticlass,
    addMulticlass,
    removeMulticlass,
    onMcClassChange,
    onMcSubclassSelect,
    getSubclassUnlockLevel,
    getUnlockedAsiTiersForClass,
    getMcAvailableSubClasses,
    getMcProficiencies,
    getMcSkillConfig,
    getMcAvailableSkills,
    isSkillPriorGranted,
    toggleMcSkill,
    currentAbilityScoresMap,
    getMcPrereqStatus,
    isMcPrereqMet,
    isSpellcasterClass,
    isMcSpellcaster,
    allUnlockedAsiList,
    formatPrerequisitesText
  }
}
