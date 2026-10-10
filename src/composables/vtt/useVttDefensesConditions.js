import { ref, computed, watch } from 'vue'

export function useVttDefensesConditions({
  char,
  vtt,
  saveVitals,
  showToast
}) {
  // Defenses state
  const rawDefenses = computed(() => vtt.value?.defenses || char.value?.defenses || { resistances: [], immunities: [], vulnerabilities: [] })
  const liveDefenses = ref({
    resistances: [...(rawDefenses.value.resistances || [])],
    immunities: [...(rawDefenses.value.immunities || [])],
    vulnerabilities: [...(rawDefenses.value.vulnerabilities || [])]
  })

  watch(rawDefenses, (val) => {
    if (val) {
      liveDefenses.value = {
        resistances: [...(val.resistances || [])],
        immunities: [...(val.immunities || [])],
        vulnerabilities: [...(val.vulnerabilities || [])]
      }
    }
  }, { deep: true, immediate: true })

  const showAddDefenseModal = ref(false)
  const newDefenseType = ref('resistances')
  const newDefenseDamage = ref('Poison')

  const DAMAGE_TYPES = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
  ]

  const openAddDefenseModal = () => {
    newDefenseType.value = 'resistances'
    newDefenseDamage.value = 'Poison'
    showAddDefenseModal.value = true
  }

  const addDefense = async () => {
    const type = newDefenseType.value
    const dmg = newDefenseDamage.value.trim()
    if (!dmg) return
    if (!liveDefenses.value[type].includes(dmg)) {
      liveDefenses.value[type].push(dmg)
      if (char.value) char.value.defenses = liveDefenses.value
      await saveVitals({ defenses: liveDefenses.value })
      if (typeof showToast === 'function') showToast(`Added ${dmg} defense`)
    }
    showAddDefenseModal.value = false
  }

  const removeDefense = async (type, dmg) => {
    liveDefenses.value[type] = liveDefenses.value[type].filter(d => d !== dmg)
    if (char.value) char.value.defenses = liveDefenses.value
    await saveVitals({ defenses: liveDefenses.value })
    if (typeof showToast === 'function') showToast(`Removed ${dmg} defense`)
  }

  // Conditions state
  const rawConditions = computed(() => vtt.value?.conditions || char.value?.conditions || [])
  const liveConditions = ref(Array.isArray(rawConditions.value) ? [...rawConditions.value] : [])

  watch(rawConditions, (val) => {
    liveConditions.value = Array.isArray(val) ? [...val] : []
  }, { deep: true, immediate: true })

  const showConditionModal = ref(false)

  const ALL_CONDITIONS = [
    'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
    'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
    'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
  ]

  const maxExhaustionLevel = computed(() => {
    return char.value?.edition === '2024' ? 10 : 6
  })

  const isConditionActive = (cond) => {
    if (cond === 'Exhaustion') {
      return exhaustionLevel.value !== null
    }
    return liveConditions.value.includes(cond)
  }

  const getExhaustionLevel = () => {
    const ex = liveConditions.value.find(c => typeof c === 'string' && c.toLowerCase().startsWith('exhaustion'))
    if (!ex) return null
    const m = ex.match(/level\s*(\d+)/i)
    return m ? Number(m[1]) : 1
  }

  const exhaustionLevel = computed(() => getExhaustionLevel())

  const setExhaustionLevel = async (lvl) => {
    const maxLvl = maxExhaustionLevel.value
    const clamped = Math.max(1, Math.min(maxLvl, Number(lvl) || 1))
    liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
    liveConditions.value.push(`Exhaustion (Level ${clamped})`)
    if (char.value) char.value.conditions = liveConditions.value
    await saveVitals({ conditions: liveConditions.value })
  }

  const toggleCondition = async (cond) => {
    if (cond === 'Exhaustion') {
      if (exhaustionLevel.value !== null) {
        liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
      } else {
        liveConditions.value.push('Exhaustion (Level 1)')
      }
    } else {
      const idx = liveConditions.value.indexOf(cond)
      if (idx >= 0) {
        liveConditions.value.splice(idx, 1)
      } else {
        liveConditions.value.push(cond)
      }
    }
    if (char.value) char.value.conditions = liveConditions.value
    await saveVitals({ conditions: liveConditions.value })
  }

  const removeCondition = async (cond) => {
    if (String(cond).toLowerCase().startsWith('exhaustion')) {
      liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
    } else {
      liveConditions.value.filter(c => c !== cond)
      liveConditions.value = liveConditions.value.filter(c => c !== cond)
    }
    if (char.value) char.value.conditions = liveConditions.value
    await saveVitals({ conditions: liveConditions.value })
  }

  const getExhaustionDescription = (lvl) => {
    if (!lvl) return ''
    if (char.value?.edition === '2024') {
      if (lvl >= 10) return 'Level 10: Death.'
      return `Level ${lvl}: -${lvl} penalty on all D20 Tests (attack rolls, ability checks, and saving throws), and Speed is reduced by ${lvl * 5} feet.`
    }
    const descriptions = {
      1: 'Level 1: Disadvantage on ability checks.',
      2: 'Level 2: Speed halved.',
      3: 'Level 3: Disadvantage on attack rolls and saving throws.',
      4: 'Level 4: Hit point maximum halved.',
      5: 'Level 5: Speed reduced to 0.',
      6: 'Level 6: Death.'
    }
    return descriptions[lvl] || `Level ${lvl}`
  }

  // Saving throw notes & advantages
  const showSaveNoteModal = ref(false)
  const customSaveNoteInput = ref(char.value?.saving_throw_notes || '')

  watch(() => char.value?.saving_throw_notes, (val) => {
    customSaveNoteInput.value = val || ''
  })

  const saveAdvantageNotes = computed(() => {
    const list = []
    const vNotes = vtt.value?.saving_throw_notes
    if (Array.isArray(vNotes)) {
      list.push(...vNotes)
    }
    const custom = customSaveNoteInput.value.trim()
    if (custom && !list.some(n => n.label === custom)) {
      list.push({ type: 'custom', label: custom })
    }
    return list
  })

  const saveCustomSaveNote = async () => {
    const val = customSaveNoteInput.value.trim()
    showSaveNoteModal.value = false
    if (char.value) char.value.saving_throw_notes = val
    await saveVitals({ saving_throw_notes: val })
    if (typeof showToast === 'function') showToast('Saving throw notes updated')
  }

  return {
    rawDefenses,
    liveDefenses,
    showAddDefenseModal,
    newDefenseType,
    newDefenseDamage,
    DAMAGE_TYPES,
    openAddDefenseModal,
    addDefense,
    removeDefense,
    rawConditions,
    liveConditions,
    showConditionModal,
    ALL_CONDITIONS,
    maxExhaustionLevel,
    isConditionActive,
    getExhaustionLevel,
    exhaustionLevel,
    setExhaustionLevel,
    toggleCondition,
    removeCondition,
    getExhaustionDescription,
    showSaveNoteModal,
    customSaveNoteInput,
    saveAdvantageNotes,
    saveCustomSaveNote
  }
}
