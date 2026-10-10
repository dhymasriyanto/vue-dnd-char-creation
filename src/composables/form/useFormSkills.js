import { ref, computed, watch } from 'vue'

export function useFormSkills({
  selectedBackgroundObj,
  characterRace,
  characterClass,
  characterSubClass,
  characterStore,
  ALL_SKILLS,
  errors
}) {
  const chosenBgSkills = ref([])

  const bgSkillConfig = computed(() => {
    const bg = selectedBackgroundObj.value
    if (!bg) return { count: 0, label: '', options: [] }
    const bgName = (bg.name || '').toLowerCase()

    const fixed = []
    if (Array.isArray(bg.skillProficiencies)) {
      for (const sp of bg.skillProficiencies) {
        for (const [k, v] of Object.entries(sp)) {
          if (v === true && k !== 'any' && k !== 'choose') {
            fixed.push(k.toLowerCase().replace(/[\s-]/g, '_'))
          }
        }
      }
    }

    let count = 0
    let options = ALL_SKILLS.map(s => s.key)

    if (Array.isArray(bg.skillProficiencies)) {
      for (const sp of bg.skillProficiencies) {
        if (sp.any) {
          count = Number(sp.any) || 2
        } else if (sp.choose) {
          count = Number(sp.choose.count) || 1
          if (Array.isArray(sp.choose.from)) {
            options = sp.choose.from.map(k => k.toLowerCase().replace(/[\s-]/g, '_'))
          }
        }
      }
    }

    if (count === 0 && (bgName === 'custom background' || bgName.includes('custom'))) {
      count = 2
    }

    return {
      fixed,
      count,
      label: count > 0 ? `Choose ${count} skill${count > 1 ? 's' : ''}` : '',
      options
    }
  })

  const raceSkillProficiencies = computed(() => {
    const r = characterRace.value
    if (!r) return []
    const list = []
    if (Array.isArray(r.skillProficiencies)) {
      for (const sp of r.skillProficiencies) {
        for (const [k, v] of Object.entries(sp)) {
          if (v === true && k !== 'any' && k !== 'choose') {
            list.push(k.toLowerCase().replace(/[\s-]/g, '_'))
          }
        }
      }
    }
    return list
  })

  const bgSkillProficiencies = computed(() => {
    const fixed = bgSkillConfig.value.fixed || []
    return [...fixed, ...chosenBgSkills.value]
  })

  const priorGrantedSkills = computed(() => {
    return Array.from(new Set([...raceSkillProficiencies.value, ...bgSkillProficiencies.value]))
  })

  const classSkillConfig = computed(() => {
    const c = characterClass.value
    if (!c) return { count: 0, label: '', options: [] }

    let count = 0
    let options = []

    if (Array.isArray(c.startingProficiencies?.skills)) {
      for (const sp of c.startingProficiencies.skills) {
        if (sp.choose) {
          count = Number(sp.choose.count) || 2
          if (Array.isArray(sp.choose.from)) {
            options = sp.choose.from.map(k => k.toLowerCase().replace(/[\s-]/g, '_'))
          }
        } else if (sp.any) {
          count = Number(sp.any) || 2
          options = ALL_SKILLS.map(s => s.key)
        }
      }
    }

    if (count === 0 && c.name) {
      count = 2
      options = ALL_SKILLS.map(s => s.key)
    }

    return {
      count,
      label: count > 0 ? `Choose ${count} skill${count > 1 ? 's' : ''}` : '',
      options
    }
  })

  const chosenClassSkills = ref([])

  const availableClassSkills = computed(() => {
    const opts = classSkillConfig.value.options || []
    return opts.filter(sk => !priorGrantedSkills.value.includes(sk))
  })

  const toggleClassSkill = (skillKey) => {
    const idx = chosenClassSkills.value.indexOf(skillKey)
    if (idx >= 0) {
      chosenClassSkills.value.splice(idx, 1)
    } else {
      if (chosenClassSkills.value.length < classSkillConfig.value.count) {
        chosenClassSkills.value.push(skillKey)
      }
    }
    if (chosenClassSkills.value.length >= classSkillConfig.value.count) {
      delete errors.classSkills
    }
  }

  const allProficientSkills = computed(() => {
    return Array.from(new Set([
      ...raceSkillProficiencies.value,
      ...bgSkillProficiencies.value,
      ...chosenClassSkills.value
    ]))
  })

  const expertiseConfig = computed(() => {
    const c = characterClass.value
    const sc = characterSubClass.value
    const cName = (c?.name || '').toLowerCase()
    const scName = (sc?.name || sc?.short_name || '').toLowerCase()

    let count = 0
    if (cName === 'rogue') count = 2
    else if (cName === 'bard' && Number(characterStore?.classLevel || 1) >= 3) count = 2
    else if (cName === 'ranger' && scName.includes('deft explorer')) count = 1

    return {
      count
    }
  })

  const chosenExpertiseSkills = ref([])

  watch(allProficientSkills, (newProfs) => {
    chosenExpertiseSkills.value = chosenExpertiseSkills.value.filter(s => newProfs.includes(s))
  })

  const toggleExpertiseSkill = (skillKey) => {
    if (!allProficientSkills.value.includes(skillKey)) return
    const idx = chosenExpertiseSkills.value.indexOf(skillKey)
    if (idx >= 0) {
      chosenExpertiseSkills.value.splice(idx, 1)
    } else {
      if (chosenExpertiseSkills.value.length < expertiseConfig.value.count) {
        chosenExpertiseSkills.value.push(skillKey)
      }
    }
    const expNeeded = Math.min(expertiseConfig.value.count, allProficientSkills.value.length)
    if (chosenExpertiseSkills.value.length >= expNeeded) {
      delete errors.expertises
    }
  }

  const getSkillLabel = (skillKey) => {
    const sk = ALL_SKILLS.find(s => s.key === skillKey)
    return sk ? `${sk.label} (${sk.ability})` : skillKey
  }

  return {
    chosenBgSkills,
    bgSkillConfig,
    raceSkillProficiencies,
    bgSkillProficiencies,
    priorGrantedSkills,
    classSkillConfig,
    chosenClassSkills,
    availableClassSkills,
    toggleClassSkill,
    allProficientSkills,
    expertiseConfig,
    chosenExpertiseSkills,
    toggleExpertiseSkill,
    getSkillLabel
  }
}
