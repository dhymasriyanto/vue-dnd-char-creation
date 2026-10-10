import { ref } from 'vue'
import axios from 'axios'

export function useVttDice({
  char,
  props,
  activeCampaignId,
  isReadOnly,
  API_URL
}) {
  const lastRoll = ref(null)
  const rollHistory = ref([])
  const isDiceTrayOpen = ref(false)
  const diceMultiplier = ref(1)
  const diceMod = ref(0)
  const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100]
  const customModifier = ref(0)
  const diceRollMode = ref('normal') // 'normal' | 'adv' | 'dis'

  let rollDismissTimer = null

  const setRollResult = (result) => {
    lastRoll.value = result
    rollHistory.value.unshift(result)
    if (rollHistory.value.length > 20) rollHistory.value.pop()

    if (rollDismissTimer) clearTimeout(rollDismissTimer)
    rollDismissTimer = setTimeout(() => {
      lastRoll.value = null
    }, 12000)

    // Broadcast roll to campaign if character is linked to a campaign
    const broadcastCampaignId = activeCampaignId?.value || props?.character?.campaign_id || char.value?.campaign_id
    if (broadcastCampaignId && result && result.total !== undefined) {
      axios.post(`${API_URL}/campaign/${broadcastCampaignId}/rolls`, {
        character_id: char.value.id,
        roll_name: result.label || 'Dice Roll',
        roll_data: {
          label: result.label,
          total: result.total,
          formula: result.formula,
          breakdown: result.breakdown,
          isNat20: Boolean(result.isNat20),
          isNat1: Boolean(result.isNat1),
          timestamp: result.timestamp || new Date().toLocaleTimeString()
        }
      }).catch(err => {
        console.warn('Failed to broadcast roll to campaign', err)
      })
    }
  }

  const rollDice = (label, mod = 0, formula = null) => {
    if (isReadOnly?.value) return
    const modNum = Number(mod) || 0
    const isAdv = diceRollMode.value === 'adv'
    const isDis = diceRollMode.value === 'dis'

    let d20 = Math.floor(Math.random() * 20) + 1
    let breakdown = ''
    let formulaStr = formula

    if (isAdv || isDis) {
      const r1 = Math.floor(Math.random() * 20) + 1
      const r2 = Math.floor(Math.random() * 20) + 1
      d20 = isAdv ? Math.max(r1, r2) : Math.min(r1, r2)
      const modeLabel = isAdv ? 'ADV' : 'DIS'
      breakdown = `[${r1}, ${r2}] -> ${d20} ${modNum >= 0 ? '+' : ''}${modNum}`
      if (!formulaStr) {
        formulaStr = `2d20${isAdv ? 'kh1' : 'kl1'} ${modNum >= 0 ? '+' : ''}${modNum} (${modeLabel})`
      }
    } else {
      breakdown = `d20 (${d20}) ${modNum >= 0 ? '+' : ''}${modNum}`
      if (!formulaStr) {
        formulaStr = modNum >= 0 ? `1d20+${modNum}` : `1d20${modNum}`
      }
    }

    const total = d20 + modNum
    const isNat20 = d20 === 20
    const isNat1 = d20 === 1

    const result = {
      label: (isAdv || isDis) ? `${label} (${isAdv ? 'Adv' : 'Dis'})` : label,
      d20,
      mod: modNum,
      total,
      isNat20,
      isNat1,
      formula: formulaStr,
      breakdown,
      timestamp: new Date().toLocaleTimeString()
    }

    setRollResult(result)
  }

  const rollAnyDie = (faces) => {
    if (isReadOnly?.value) return
    const mod = Number(customModifier.value) || 0

    if (faces === 20 && diceRollMode.value !== 'normal') {
      const r1 = Math.floor(Math.random() * 20) + 1
      const r2 = Math.floor(Math.random() * 20) + 1
      const chosen = diceRollMode.value === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2)
      const isNat20 = chosen === 20
      const isNat1 = chosen === 1
      const total = chosen + mod

      setRollResult({
        label: `d20 with ${diceRollMode.value === 'adv' ? 'Advantage' : 'Disadvantage'}`,
        d20: chosen,
        mod,
        total,
        isNat20,
        isNat1,
        formula: `2d20kh1 ${mod >= 0 ? '+' : ''}${mod}`,
        breakdown: `(${r1}, ${r2}) -> ${chosen} ${mod >= 0 ? '+' : ''}${mod}`,
        timestamp: new Date().toLocaleTimeString()
      })
      isDiceTrayOpen.value = false
      return
    }

    const roll = Math.floor(Math.random() * faces) + 1
    const total = roll + mod
    const isNat20 = faces === 20 && roll === 20
    const isNat1 = faces === 20 && roll === 1

    setRollResult({
      label: `d${faces} Roll`,
      d20: faces === 20 ? roll : null,
      mod,
      total,
      isNat20,
      isNat1,
      formula: `1d${faces} ${mod >= 0 ? '+' : ''}${mod}`,
      breakdown: `d${faces} (${roll}) ${mod >= 0 ? '+' : ''}${mod}`,
      timestamp: new Date().toLocaleTimeString()
    })
    isDiceTrayOpen.value = false
  }

  const rollFormula = (label, formula, bonusMod = 0) => {
    if (!formula && bonusMod === 0) return

    let total = 0
    const breakdownParts = []

    if (formula) {
      const formulaClean = String(formula).replace(/\s+/g, '')
      const replacedFormula = formulaClean.replace(/(\d*)d(\d+)/gi, (m, countStr, sidesStr) => {
        const count = parseInt(countStr, 10) || 1
        const sides = parseInt(sidesStr, 10) || 6
        const rolls = []
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(Math.random() * sides) + 1)
        }
        const sum = rolls.reduce((a, b) => a + b, 0)
        breakdownParts.push(`${count}d${sides} (${rolls.join(', ')})`)
        return sum
      })

      try {
        const evalSum = Function(`'use strict'; return (${replacedFormula})`)()
        total = Number(evalSum) || 0
      } catch {
        total = 0
      }
    }

    if (bonusMod !== 0) {
      total += bonusMod
      breakdownParts.push(`${bonusMod >= 0 ? '+' : ''}${bonusMod}`)
    }

    const resultFormula = formula
      ? (bonusMod !== 0 ? `${formula} ${bonusMod >= 0 ? '+' : ''}${bonusMod}` : formula)
      : `${bonusMod >= 0 ? '+' : ''}${bonusMod}`

    setRollResult({
      label,
      d20: null,
      mod: bonusMod,
      total,
      isNat20: false,
      isNat1: false,
      formula: resultFormula,
      breakdown: breakdownParts.join(' ') || String(total),
      timestamp: new Date().toLocaleTimeString()
    })
  }

  return {
    lastRoll,
    rollHistory,
    isDiceTrayOpen,
    diceMultiplier,
    diceMod,
    STANDARD_DICE,
    customModifier,
    diceRollMode,
    setRollResult,
    rollDice,
    rollAnyDie,
    rollFormula
  }
}
