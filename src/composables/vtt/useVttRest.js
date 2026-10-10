import { ref, computed } from 'vue'

export function useVttRest({
  char,
  vtt,
  currentHp,
  maxHp,
  effectiveMaxHp,
  tempHp,
  tempHpInput,
  maxHpModifier,
  maxHpModifierInput,
  overrideMaxHp,
  overrideMaxHpInput,
  saveVitals,
  charClassName,
  restoreAllSlots,
  sheetSpellSlots,
  expendedSlots,
  allSpellLevels,
  classResourceTrackers,
  spentClassResources,
  getResourceSpent,
  spentHitDice: externalSpentHitDice,
  customActions,
  spentCustomActionUses,
  activeClassStates,
  persistSheetState,
  exhaustionLevel,
  setExhaustionLevel,
  toggleCondition,
  liveConditions,
  showToast
}) {
  // --- Hit Dice State & Computations ---
  const hitDieFaces = computed(() => {
    const str = char.value?.hit_dice || char.value?.class?.hit_dice || '1d8'
    const match = String(str).match(/d(\d+)/i)
    return match ? Number(match[1]) : 8
  })

  const maxHitDiceCount = computed(() => {
    const str = char.value?.hit_dice || char.value?.class?.hit_dice || '1d8'
    const match = String(str).match(/^(\d+)d(\d+)$/i)
    if (match) return Number(char.value?.level || match[1])
    return Number(char.value?.level || 1)
  })

  const totalHitDice = computed(() => {
    return `${char.value?.level || 1}d${hitDieFaces.value}`
  })

  const conMod = computed(() => {
    const cVal = char.value?.constitution
    if (cVal != null) return Math.floor((Number(cVal) - 10) / 2)
    return Number(vtt.value?.abilities?.constitution?.modifier || 0)
  })

  const spentHitDice = externalSpentHitDice || ref(0)
  const remainingHitDice = computed(() => Math.max(0, maxHitDiceCount.value - spentHitDice.value))

  // --- Short Rest ---
  const showShortRestModal = ref(false)
  const shortRestRollResult = ref(null)

  const openShortRestModal = () => {
    shortRestRollResult.value = null
    showShortRestModal.value = true
  }

  const rollHitDie = () => {
    if (remainingHitDice.value <= 0) return
    const die = hitDieFaces.value
    const roll = Math.floor(Math.random() * die) + 1
    const mod = conMod.value
    const total = Math.max(1, roll + mod)

    spentHitDice.value += 1
    const prevHp = currentHp.value
    currentHp.value = Math.min(maxHp.value, currentHp.value + total)
    const healed = currentHp.value - prevHp

    shortRestRollResult.value = {
      roll,
      mod,
      die,
      total,
      healed,
      timestamp: new Date().toLocaleTimeString()
    }

    if (typeof saveVitals === 'function') {
      saveVitals({ hp: currentHp.value })
    }
  }

  const completeShortRest = () => {
    // 1. Warlock: restore Pact Magic spell slots
    const clsName = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    if (clsName === 'warlock') {
      if (typeof restoreAllSlots === 'function') restoreAllSlots()
    } else {
      const pactSlots = (sheetSpellSlots?.value || []).filter(s => s.isPact)
      pactSlots.forEach(s => {
        for (let i = 1; i <= s.total; i++) {
          if (expendedSlots?.value) {
            delete expendedSlots.value[`${s.level}_${i}`]
          }
        }
      })
    }

    // 2. Class resources recharge
    const restoredNames = []
    const lvl = Number(char.value?.level) || 1

    for (const res of (classResourceTrackers?.value || [])) {
      const spent = typeof getResourceSpent === 'function' ? getResourceSpent(res.id) : (spentClassResources?.value?.[res.id] || 0)
      if (res.recharge === 'short') {
        if (spent > 0) {
          if (spentClassResources?.value) spentClassResources.value[res.id] = 0
          restoredNames.push(res.name)
        }
      } else if (res.recharge === 'long_regain1') {
        if (spent > 0) {
          if (spentClassResources?.value) {
            spentClassResources.value[res.id] = Math.max(0, (spentClassResources.value[res.id] || 0) - 1)
          }
          restoredNames.push(`${res.name} (+1 use)`)
        }
      } else if (res.id === 'bard_inspiration' && lvl >= 5) {
        if (spent > 0) {
          if (spentClassResources?.value) spentClassResources.value[res.id] = 0
          restoredNames.push(res.name)
        }
      }
    }

    // 3. Custom actions recharge on short rest
    for (const act of (customActions?.value || [])) {
      if (act.resource && act.resource.recharge === 'short') {
        if ((spentCustomActionUses?.value?.[act.id] || 0) > 0) {
          if (spentCustomActionUses?.value) spentCustomActionUses.value[act.id] = 0
          restoredNames.push(act.name)
        }
      }
    }

    if (activeClassStates?.value) {
      activeClassStates.value.barb_rage = false
    }

    if (typeof persistSheetState === 'function') persistSheetState(true)
    showShortRestModal.value = false
    const msg = restoredNames.length
      ? `Short rest completed! Restored: ${restoredNames.join(', ')}`
      : 'Short rest completed'
    if (typeof showToast === 'function') showToast(msg)
  }

  // --- Long Rest ---
  const showLongRestModal = ref(false)
  const longRestRule = ref(char.value?.edition === '2024' ? '5.5e' : '5e')
  const resetMaxHpOnRest = ref(true)

  const openLongRestModal = () => {
    longRestRule.value = char.value?.edition === '2024' ? '5.5e' : '5e'
    resetMaxHpOnRest.value = true
    showLongRestModal.value = true
  }

  const recoverSummaryText = computed(() => {
    const parts = []
    const missingHp = Math.max(0, effectiveMaxHp.value - currentHp.value)
    parts.push(missingHp > 0 ? `${missingHp} Hit Points` : `All Hit Points`)

    const maxHd = maxHitDiceCount.value
    const recoverHd = longRestRule.value === '5.5e'
      ? maxHd
      : Math.max(1, Math.floor(maxHd / 2))
    parts.push(`Up to ${recoverHd} Hit Dice`)

    let countSlots = 0
    for (const k of Object.keys(expendedSlots?.value || {})) {
      if (expendedSlots.value[k]) countSlots++
    }
    if (countSlots > 0) {
      parts.push(`${countSlots} Spell Slots`)
    } else if (allSpellLevels?.value?.length > 0) {
      parts.push(`All Spell Slots`)
    }
    let countRes = 0
    for (const k of Object.keys(spentClassResources?.value || {})) {
      if (spentClassResources.value[k] > 0) countRes++
    }
    if (countRes > 0) {
      parts.push(`All Class Resources`)
    }
    return parts.join(', ')
  })

  const executeLongRest = async () => {
    if (resetMaxHpOnRest.value) {
      maxHpModifier.value = 0
      maxHpModifierInput.value = ''
      overrideMaxHp.value = null
      overrideMaxHpInput.value = ''
    }

    currentHp.value = effectiveMaxHp.value
    maxHp.value = effectiveMaxHp.value
    tempHp.value = 0
    tempHpInput.value = ''

    if (longRestRule.value === '5.5e') {
      spentHitDice.value = 0
    } else {
      spentHitDice.value = Math.max(0, spentHitDice.value - Math.max(1, Math.floor(maxHitDiceCount.value / 2)))
    }

    if (typeof restoreAllSlots === 'function') restoreAllSlots()
    if (spentClassResources?.value) spentClassResources.value = {}
    if (spentCustomActionUses?.value) spentCustomActionUses.value = {}
    if (activeClassStates?.value) activeClassStates.value = {}
    if (typeof persistSheetState === 'function') persistSheetState(true)

    // Long rest removes 1 level of exhaustion
    if (exhaustionLevel?.value !== null && exhaustionLevel?.value !== undefined) {
      if (exhaustionLevel.value > 1) {
        if (typeof setExhaustionLevel === 'function') await setExhaustionLevel(exhaustionLevel.value - 1)
      } else {
        if (typeof toggleCondition === 'function') await toggleCondition('Exhaustion')
      }
    }

    showLongRestModal.value = false
    if (char.value) {
      char.value.hp = currentHp.value
      char.value.max_hp = maxHp.value
      char.value.temp_hp = 0
      char.value.max_hp_modifier = maxHpModifier.value
      char.value.override_max_hp = overrideMaxHp.value
    }

    if (typeof saveVitals === 'function') {
      await saveVitals({
        hp: currentHp.value,
        max_hp: maxHp.value,
        temp_hp: 0,
        max_hp_modifier: maxHpModifier.value,
        override_max_hp: overrideMaxHp.value,
        conditions: liveConditions?.value
      })
    }
  }

  return {
    hitDieFaces,
    maxHitDiceCount,
    totalHitDice,
    conMod,
    spentHitDice,
    remainingHitDice,
    showShortRestModal,
    shortRestRollResult,
    openShortRestModal,
    rollHitDie,
    completeShortRest,
    showLongRestModal,
    longRestRule,
    resetMaxHpOnRest,
    openLongRestModal,
    recoverSummaryText,
    executeLongRest
  }
}
