import { ref, computed } from 'vue'

export const SKILL_ABILITY_MAP = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
}

export function useVttSkills({ char, vtt, dexMod, customSkills, persistSheetState }) {
  const hasJackOfAllTrades = computed(() => {
    const c = char.value
    if (!c) return false
    const cfs = c.class_feature || []
    if (Array.isArray(cfs) && cfs.some(f => (f?.name || '').toLowerCase().includes('jack of all trades'))) {
      return true
    }
    const classes = Array.isArray(c.classes)
      ? c.classes
      : (Array.isArray(c.class) ? c.class : (c.class ? [c.class] : []))

    for (const cl of classes) {
      const name = (typeof cl === 'string' ? cl : (cl?.name || cl?.class_name || '')).toLowerCase()
      const lvl = Number((typeof cl === 'object' && cl?.level) || c.level || 1)
      if (name.includes('bard') && lvl >= 2) return true
    }

    if (typeof c.class === 'string' && c.class.toLowerCase().includes('bard')) {
      const lvl = Number(c.level || 1)
      if (lvl >= 2) return true
    }
    return false
  })

  const hasRemarkableAthlete = computed(() => {
    const c = char.value
    if (!c) return false
    const scfs = c.sub_class_feature || []
    if (Array.isArray(scfs) && scfs.some(f => (f?.name || '').toLowerCase().includes('remarkable athlete'))) {
      return true
    }
    const subClasses = Array.isArray(c.sub_class)
      ? c.sub_class
      : (Array.isArray(c.sub_classes) ? c.sub_classes : (c.sub_class ? [c.sub_class] : []))
    for (const sc of subClasses) {
      const name = (typeof sc === 'string' ? sc : (sc?.name || sc?.subclass_name || '')).toLowerCase()
      const lvl = Number((typeof sc === 'object' && sc?.level) || c.level || 1)
      if (name.includes('champion') && lvl >= 7) return true
    }
    return false
  })

  const profBonus = computed(() => {
    if (vtt.value?.proficiency_bonus != null) return Number(vtt.value.proficiency_bonus)
    const lvl = Number(char.value?.level || 1)
    return Math.floor((lvl - 1) / 4) + 2
  })

  const joatBonus = computed(() => Math.floor(profBonus.value / 2))
  const raBonus = computed(() => Math.ceil(profBonus.value / 2))

  const computedSkills = computed(() => {
    const pb = profBonus.value
    const joat = hasJackOfAllTrades.value
    const hasRa = hasRemarkableAthlete.value
    const jBonus = joatBonus.value
    const rBonus = raBonus.value

    const sp = char.value?.skill_proficiency || {}
    const se = char.value?.skill_expertise || {}
    const vSkills = vtt.value?.skills || {}

    const result = {}
    for (const [skill, ability] of Object.entries(SKILL_ABILITY_MAP)) {
      const existing = vSkills[skill] || {}
      const isProf = Boolean(sp[skill] || existing.proficient)
      const isExp = Boolean(se[skill] || existing.expertise)
      let isJoat = false
      let isRa = false
      let bonus = 0

      if (isExp) {
        bonus = 2 * pb
      } else if (isProf) {
        bonus = pb
      } else if (joat) {
        bonus = jBonus
        isJoat = true
      } else if (hasRa && (ability === 'strength' || ability === 'dexterity' || ability === 'constitution')) {
        bonus = rBonus
        isRa = true
      }

      let mod = 0
      if (vtt.value?.abilities?.[ability]?.modifier != null) {
        mod = Number(vtt.value.abilities[ability].modifier)
      } else if (char.value?.ability_score?.[ability] != null) {
        mod = Math.floor((Number(char.value.ability_score[ability]) - 10) / 2)
      }

      const total = mod + bonus
      const passive = 10 + total

      result[skill] = {
        ability,
        proficient: isProf,
        expertise: isExp,
        jack_of_all_trades: isJoat || Boolean(existing.jack_of_all_trades),
        remarkable_athlete: isRa || Boolean(existing.remarkable_athlete),
        bonus,
        total,
        passive,
        modifier_string: total >= 0 ? `+${total}` : `${total}`,
        roll_formula: total >= 0 ? `1d20+${total}` : `1d20${total}`
      }
    }
    return result
  })

  const computedInitiative = computed(() => {
    const dMod = dexMod.value
    const bonus = hasJackOfAllTrades.value ? joatBonus.value : (hasRemarkableAthlete.value ? raBonus.value : 0)
    return dMod + bonus
  })

  // --- Custom Skills ---
  const showCustomSkillModal = ref(false)
  const newCustomSkillForm = ref({
    name: '',
    ability: 'str',
    proficient: true,
    expertise: false
  })

  const saveCustomSkill = () => {
    if (!newCustomSkillForm.value.name.trim()) return
    customSkills.value.push({
      id: 'cust_sk_' + Date.now(),
      name: newCustomSkillForm.value.name.trim(),
      ability: newCustomSkillForm.value.ability,
      proficient: Boolean(newCustomSkillForm.value.proficient),
      expertise: Boolean(newCustomSkillForm.value.expertise)
    })
    newCustomSkillForm.value = { name: '', ability: 'str', proficient: true, expertise: false }
    showCustomSkillModal.value = false
    if (typeof persistSheetState === 'function') persistSheetState()
  }

  const deleteCustomSkill = (id) => {
    const idx = customSkills.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      customSkills.value.splice(idx, 1)
      if (typeof persistSheetState === 'function') persistSheetState()
    }
  }

  const customSkillsList = computed(() => {
    const pb = profBonus.value
    return (customSkills.value || []).map(s => {
      const isExp = Boolean(s.expertise)
      const isProf = Boolean(s.proficient)
      const bonus = isExp ? 2 * pb : (isProf ? pb : 0)
      const mod = vtt.value?.abilities?.[s.ability]?.modifier ?? 0
      const total = mod + bonus
      return {
        id: s.id,
        name: s.name,
        ability: s.ability,
        proficient: isProf,
        expertise: isExp,
        bonus,
        total,
        passive: 10 + total,
        modifier_string: total >= 0 ? `+${total}` : `${total}`
      }
    })
  })

  return {
    SKILL_ABILITY_MAP,
    hasJackOfAllTrades,
    hasRemarkableAthlete,
    profBonus,
    joatBonus,
    raBonus,
    computedSkills,
    computedInitiative,
    showCustomSkillModal,
    newCustomSkillForm,
    saveCustomSkill,
    deleteCustomSkill,
    customSkillsList
  }
}
