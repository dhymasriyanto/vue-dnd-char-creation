import { computed } from 'vue'

export function useVttClassResources({
  char,
  vtt,
  getCharClassLevel,
  hasCharClass,
  monkLevel,
  monkMartialArtsDie,
  currentHp,
  maxHp,
  saveVitals,
  spentClassResources,
  activeClassStates,
  persistSheetState,
  rollDice,
  rollFormula,
  showToast,
  getAbilityMod
}) {
  const getMod = (ab) => {
    if (typeof getAbilityMod === 'function') return getAbilityMod(ab)
    const norm = (ab || '').toLowerCase()
    const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }
    const full = map[norm] || norm
    if (vtt.value?.abilities?.[full]?.modifier != null) return Number(vtt.value.abilities[full].modifier)
    const val = Number(char.value?.ability_score?.[full] || char.value?.ability_score?.[norm] || 10)
    return Math.floor((val - 10) / 2)
  }

  const classResourceTrackers = computed(() => {
    const list = []
    const is2024 = (char.value?.edition || '2024') === '2024'
    const sc = Array.isArray(char.value?.sub_class) ? char.value.sub_class[0] : char.value?.sub_class
    const chaMod = Math.max(1, getMod('cha'))
    const wisMod = Math.max(1, getMod('wis'))
    const intMod = Math.max(1, getMod('int'))

    // 1. BARBARIAN: Rage
    const barbLvl = getCharClassLevel('barbarian')
    if (barbLvl > 0) {
      let maxRage = 2
      if (barbLvl >= 20) maxRage = 999
      else if (barbLvl >= 17) maxRage = 6
      else if (barbLvl >= 12) maxRage = 5
      else if (barbLvl >= 6) maxRage = 4
      else if (barbLvl >= 3) maxRage = 3

      list.push({
        id: 'barb_rage',
        name: 'Rage',
        subtitle: is2024 ? 'Bonus Action. Advantage STR checks/saves, bonus damage, resistance B/P/S' : 'Advantage STR checks/saves, bonus damage, resistance B/P/S',
        max: maxRage,
        displayMax: maxRage === 999 ? '∞' : maxRage,
        recharge: is2024 ? 'long_regain1' : 'long',
        rechargeLabel: is2024 ? 'Long Rest (Regains 1 on Short Rest)' : 'Long Rest',
        type: 'counter',
        hasActiveToggle: true,
        actionType: 'bonus'
      })
    }

    // 2. FIGHTER: Second Wind, Action Surge, Indomitable, Battle Master Superiority
    const fighterLvl = getCharClassLevel('fighter')
    if (fighterLvl > 0) {
      let swMax = 1
      if (is2024) {
        if (fighterLvl >= 10) swMax = 4
        else if (fighterLvl >= 4) swMax = 3
        else swMax = 2
      }
      list.push({
        id: 'fighter_second_wind',
        name: 'Second Wind',
        subtitle: `Heal 1d10 + ${fighterLvl} HP as Bonus Action`,
        max: swMax,
        displayMax: swMax,
        recharge: is2024 ? 'long_regain1' : 'short',
        rechargeLabel: is2024 ? 'Long Rest (Regains 1 on Short Rest)' : 'Short & Long Rest',
        type: 'counter',
        actionType: 'bonus',
        healFormula: '1d10',
        healBonus: fighterLvl
      })

      if (fighterLvl >= 2) {
        const asMax = fighterLvl >= 17 ? 2 : 1
        list.push({
          id: 'fighter_action_surge',
          name: 'Action Surge',
          subtitle: 'Take 1 additional Action on your turn',
          max: asMax,
          displayMax: asMax,
          recharge: 'short',
          rechargeLabel: 'Short & Long Rest',
          type: 'counter',
          actionType: 'action'
        })
      }

      if (fighterLvl >= 9) {
        let indomMax = 1
        if (is2024) {
          if (fighterLvl >= 17) indomMax = 3
          else if (fighterLvl >= 13) indomMax = 2
        }
        list.push({
          id: 'fighter_indomitable',
          name: 'Indomitable',
          subtitle: is2024 ? `Reroll failed save with +${fighterLvl} bonus` : 'Reroll a failed saving throw',
          max: indomMax,
          displayMax: indomMax,
          recharge: 'long',
          rechargeLabel: 'Long Rest',
          type: 'counter',
          actionType: 'reaction'
        })
      }

      const scName = (sc?.name || sc?.short_name || '').toLowerCase()
      if (scName.includes('battle master') && fighterLvl >= 3) {
        let sdCount = 4
        if (fighterLvl >= 15) sdCount = 6
        else if (fighterLvl >= 7) sdCount = 5

        let dieSize = 'd8'
        if (fighterLvl >= 18) dieSize = 'd12'
        else if (fighterLvl >= 10) dieSize = 'd10'

        list.push({
          id: 'fighter_superiority_dice',
          name: 'Superiority Dice',
          subtitle: `Maneuvers (${dieSize} dice pool)`,
          max: sdCount,
          displayMax: sdCount,
          die: dieSize,
          recharge: 'short',
          rechargeLabel: 'Short & Long Rest',
          type: 'counter',
          rollFormula: `1${dieSize}`,
          actionType: 'other'
        })
      }
    }

    // 3. MONK: Focus / Ki Points & Uncanny Metabolism
    const monkLvl = getCharClassLevel('monk')
    if (monkLvl >= 2) {
      const resourceName = is2024 ? 'Focus Points' : 'Ki Points'
      list.push({
        id: 'monk_ki',
        name: resourceName,
        subtitle: 'Flurry of Blows, Patient Defense, Step of the Wind, Stunning Strike',
        max: monkLvl,
        displayMax: monkLvl,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: 'other'
      })

      if (is2024) {
        list.push({
          id: 'monk_uncanny_metabolism',
          name: 'Uncanny Metabolism',
          subtitle: 'On Initiative roll, regain all Focus points & heal MA die + Monk lvl',
          max: 1,
          displayMax: 1,
          recharge: 'long',
          rechargeLabel: 'Long Rest',
          type: 'counter',
          actionType: 'other'
        })
      }
    }

    // 4. CLERIC: Channel Divinity
    const clericLvl = getCharClassLevel('cleric')
    if (clericLvl >= 2) {
      let cdMax = 1
      if (is2024) {
        if (clericLvl >= 18) cdMax = 4
        else if (clericLvl >= 6) cdMax = 3
        else cdMax = 2
      } else {
        if (clericLvl >= 18) cdMax = 3
        else if (clericLvl >= 6) cdMax = 2
      }
      list.push({
        id: 'cleric_channel_divinity',
        name: 'Channel Divinity',
        subtitle: 'Turn Undead, Divine Spark, Harness Divine Power',
        max: cdMax,
        displayMax: cdMax,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: 'action'
      })
    }

    // 5. PALADIN: Lay on Hands & Channel Divinity
    const paladinLvl = getCharClassLevel('paladin')
    if (paladinLvl > 0) {
      const lohPool = paladinLvl * 5
      list.push({
        id: 'paladin_lay_on_hands',
        name: 'Lay on Hands',
        subtitle: `Healing pool (${lohPool} HP total). ${is2024 ? 'Bonus Action' : 'Action'}`,
        max: lohPool,
        displayMax: lohPool,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'pool',
        actionType: is2024 ? 'bonus' : 'action'
      })

      if (paladinLvl >= 3) {
        const cdMax = is2024 && paladinLvl >= 11 ? 3 : (is2024 ? 2 : 1)
        list.push({
          id: 'paladin_channel_divinity',
          name: 'Channel Divinity (Paladin)',
          subtitle: 'Sacred Weapon, Abjure Foes, Harness Divine Power',
          max: cdMax,
          displayMax: cdMax,
          recharge: 'short',
          rechargeLabel: 'Short & Long Rest',
          type: 'counter',
          actionType: 'bonus'
        })
      }
    }

    // 6. DRUID: Wild Shape
    const druidLvl = getCharClassLevel('druid')
    if (druidLvl >= 2) {
      const wsMax = is2024 && druidLvl >= 17 ? 4 : (is2024 && druidLvl >= 6 ? 3 : 2)
      list.push({
        id: 'druid_wild_shape',
        name: 'Wild Shape',
        subtitle: is2024 ? 'Bonus Action transform or Wild Companion' : 'Action transform or Wild Companion',
        max: wsMax,
        displayMax: wsMax,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: is2024 ? 'bonus' : 'action'
      })
    }

    // 7. BARD: Bardic Inspiration
    const bardLvl = getCharClassLevel('bard')
    if (bardLvl > 0) {
      const biUses = chaMod
      let biDie = 'd6'
      if (bardLvl >= 15) biDie = 'd12'
      else if (bardLvl >= 10) biDie = 'd10'
      else if (bardLvl >= 5) biDie = 'd8'

      const biRecharge = bardLvl >= 5 ? 'short' : 'long'
      list.push({
        id: 'bard_inspiration',
        name: 'Bardic Inspiration',
        subtitle: `Grant ${biDie} to ally as Bonus Action`,
        max: biUses,
        displayMax: biUses,
        die: biDie,
        recharge: biRecharge,
        rechargeLabel: biRecharge === 'short' ? 'Short & Long Rest (Font of Inspiration)' : 'Long Rest',
        type: 'counter',
        rollFormula: `1${biDie}`,
        actionType: 'bonus'
      })
    }

    // 8. SORCERER: Sorcery Points & Innate Sorcery
    const sorcLvl = getCharClassLevel('sorcerer')
    if (sorcLvl >= 2) {
      list.push({
        id: 'sorcerer_points',
        name: 'Sorcery Points',
        subtitle: 'Metamagic, create spell slots',
        max: sorcLvl,
        displayMax: sorcLvl,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'bonus'
      })

      if (is2024) {
        list.push({
          id: 'sorcerer_innate_sorcery',
          name: 'Innate Sorcery',
          subtitle: 'Bonus Action for 1 min: +1 Spell Save DC, Advantage on spell attacks',
          max: 2,
          displayMax: 2,
          recharge: 'long',
          rechargeLabel: 'Long Rest',
          type: 'counter',
          hasActiveToggle: true,
          actionType: 'bonus'
        })
      }
    }

    // 9. WARLOCK: Mystic Arcanum
    const warlockLvl = getCharClassLevel('warlock')
    if (warlockLvl >= 11) {
      let arcanumCount = 1
      if (warlockLvl >= 17) arcanumCount = 4
      else if (warlockLvl >= 15) arcanumCount = 3
      else if (warlockLvl >= 13) arcanumCount = 2
      list.push({
        id: 'warlock_mystic_arcanum',
        name: 'Mystic Arcanum',
        subtitle: 'High-level daily spells (Level 6+)',
        max: arcanumCount,
        displayMax: arcanumCount,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'action'
      })
    }

    // 10. WIZARD: Arcane Recovery
    const wizardLvl = getCharClassLevel('wizard')
    if (wizardLvl > 0) {
      list.push({
        id: 'wizard_arcane_recovery',
        name: 'Arcane Recovery',
        subtitle: `Once per day on Short Rest, recover up to ${Math.ceil(wizardLvl / 2)} spell slot levels`,
        max: 1,
        displayMax: 1,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'other'
      })
    }

    // 11. RANGER: Hunter's Mark Free Casts (2024)
    const rangerLvl = getCharClassLevel('ranger')
    if (rangerLvl > 0 && is2024) {
      const hmMax = rangerLvl >= 17 ? 6 : (rangerLvl >= 9 ? 5 : (rangerLvl >= 5 ? 3 : 2))
      list.push({
        id: 'ranger_hunters_mark_free',
        name: "Hunter's Mark (Free)",
        subtitle: 'Cast without expending a spell slot',
        max: hmMax,
        displayMax: hmMax,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'bonus'
      })
    }

    // 12. ROGUE: Soulknife / Psi Energy Dice
    const rogueLvl = getCharClassLevel('rogue')
    const scName = (sc?.name || sc?.short_name || '').toLowerCase()
    if (rogueLvl >= 3 && scName.includes('soulknife')) {
      const psiMax = (Math.floor((Number(char.value?.level || 1) - 1) / 4) + 2) * 2
      let psiDie = 'd6'
      if (rogueLvl >= 17) psiDie = 'd12'
      else if (rogueLvl >= 13) psiDie = 'd10'
      else if (rogueLvl >= 5) psiDie = 'd8'

      list.push({
        id: 'rogue_psi_energy',
        name: 'Psionic Energy Dice',
        subtitle: `Psi-Bolster, Psionic Whispers (${psiDie})`,
        max: psiMax,
        displayMax: psiMax,
        die: psiDie,
        recharge: 'long_regain1',
        rechargeLabel: 'Long Rest (Regains 1 on Short Rest)',
        type: 'counter',
        rollFormula: `1${psiDie}`,
        actionType: 'other'
      })
    }

    // 13. SNEAK ATTACK REFERENCE
    if (rogueLvl > 0) {
      const dice = Math.ceil(rogueLvl / 2)
      list.push({
        id: 'rogue_sneak_attack',
        name: 'Sneak Attack',
        subtitle: `Once per turn on Finesse/Ranged attack with Advantage: ${dice}d6 extra damage`,
        max: 999,
        displayMax: `${dice}d6`,
        recharge: 'special',
        rechargeLabel: 'Once per Turn',
        type: 'counter',
        rollFormula: `${dice}d6`,
        actionType: 'other'
      })
    }

    // 14. DIVINE SMITE REFERENCE
    if (paladinLvl >= 2) {
      list.push({
        id: 'paladin_divine_smite',
        name: 'Divine Smite',
        subtitle: is2024 ? 'Bonus Action immediately after hit: 2d8 + 1d8/slot level over 1st' : 'Immediately after hit: 2d8 + 1d8/slot level over 1st',
        max: 999,
        displayMax: 'Spells',
        recharge: 'special',
        rechargeLabel: 'Expends Spell Slot',
        type: 'counter',
        actionType: is2024 ? 'bonus' : 'other'
      })
    }

    return list
  })

  const getResourceSpent = (id) => {
    return Number(spentClassResources?.value?.[id]) || 0
  }

  const getResourceAvailable = (res) => {
    if (!res) return 0
    if (res.max === 999) return 999
    return Math.max(0, res.max - getResourceSpent(res.id))
  }

  const isResourceSlotExpended = (res, slotIdx) => {
    if (!res) return false
    return slotIdx > getResourceAvailable(res)
  }

  const toggleResourceSlot = (res, slotIdx) => {
    if (!res) return
    const currentAvail = getResourceAvailable(res)
    if (currentAvail >= slotIdx) {
      if (spentClassResources?.value) spentClassResources.value[res.id] = res.max - slotIdx + 1
    } else {
      if (spentClassResources?.value) spentClassResources.value[res.id] = res.max - slotIdx
    }
  }

  const spendResource = (resOrId, amount = 1) => {
    const id = typeof resOrId === 'string' ? resOrId : resOrId.id
    const res = classResourceTrackers.value.find(r => r.id === id)
    if (!res) return
    if (res.max === 999) return
    const currentSpent = getResourceSpent(id)
    if (spentClassResources?.value) spentClassResources.value[id] = Math.min(res.max, currentSpent + amount)
  }

  const restoreResource = (resOrId, amount = 1) => {
    const id = typeof resOrId === 'string' ? resOrId : resOrId.id
    const currentSpent = getResourceSpent(id)
    if (spentClassResources?.value) spentClassResources.value[id] = Math.max(0, currentSpent - amount)
  }

  const isClassStateActive = (key) => {
    return Boolean(activeClassStates?.value?.[key])
  }

  const toggleClassState = (key, resId = null) => {
    const newState = !activeClassStates?.value?.[key]
    if (activeClassStates?.value) activeClassStates.value[key] = newState
    if (newState && resId) {
      spendResource(resId, 1)
    }
  }

  const activateSecondWind = () => {
    const res = classResourceTrackers.value.find(r => r.id === 'fighter_second_wind')
    if (res && getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast('No Second Wind uses remaining!')
      return
    }
    const lvl = Number(char.value?.level) || 1
    spendResource('fighter_second_wind', 1)
    if (typeof rollFormula === 'function') rollFormula('Second Wind Healing', '1d10', lvl)
  }

  const rollResourceDie = (res) => {
    if (!res || !res.rollFormula) return
    if (getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast(`No ${res.name} uses remaining!`)
      return
    }
    spendResource(res.id, 1)
    if (typeof rollFormula === 'function') rollFormula(`${res.name} Roll`, res.rollFormula)
  }

  const activateMonkKiAction = (actionName, cost = 1) => {
    const res = classResourceTrackers.value.find(r => r.id === 'monk_ki')
    if (res && getResourceAvailable(res) < cost) {
      if (typeof showToast === 'function') showToast(`Not enough ${res.name} remaining!`)
      return
    }
    if (res) spendResource('monk_ki', cost)
    if (typeof showToast === 'function') showToast(`${actionName} activated! (Spent ${cost} ${res?.name || 'Ki'})`)
  }

  const activateUncannyMetabolism = () => {
    const res = classResourceTrackers.value.find(r => r.id === 'monk_uncanny_metabolism')
    if (res && getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast('No Uncanny Metabolism uses remaining!')
      return
    }
    if (res) spendResource('monk_uncanny_metabolism', 1)
    if (spentClassResources?.value) spentClassResources.value['monk_ki'] = 0
    if (typeof persistSheetState === 'function') persistSheetState()

    const ml = monkLevel?.value || 1
    const maDie = monkMartialArtsDie?.value || '1d6'
    const dieSides = parseInt(maDie.replace(/^1d/, ''), 10) || 6
    const rolled = Math.floor(Math.random() * dieSides) + 1
    const totalHeal = ml + rolled

    const curHp = Number(char.value?.hp) || 0
    const mHp = Number(char.value?.max_hp) || curHp
    const newHp = Math.min(mHp, curHp + totalHeal)
    if (char.value) char.value.hp = newHp
    if (typeof saveVitals === 'function') saveVitals({ hp: newHp })

    if (typeof showToast === 'function') showToast(`Uncanny Metabolism! Restored all Focus points & healed ${totalHeal} HP (${rolled} + ${ml})`)
  }

  const deflectAttacksReaction = () => {
    const dexMod = getMod('dex')
    const ml = monkLevel?.value || 1
    const d10 = Math.floor(Math.random() * 10) + 1
    const totalReduction = d10 + dexMod + ml
    if (typeof showToast === 'function') showToast(`Deflect Attacks: Reduced damage by ${totalReduction} (${d10} + DEX ${dexMod} + Lvl ${ml})`)
    if (typeof rollDice === 'function') rollDice(`Deflect Attacks Reduction (${d10} + ${dexMod + ml})`, dexMod + ml, '1d10')
  }

  const activateActionSurge = () => {
    const res = classResourceTrackers.value.find(r => r.id === 'fighter_action_surge')
    if (res && getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast('No Action Surge uses remaining!')
      return
    }
    spendResource('fighter_action_surge', 1)
    if (typeof showToast === 'function') showToast('Action Surge activated! Take 1 additional Action on your turn.')
  }

  const activateIndomitable = () => {
    const res = classResourceTrackers.value.find(r => r.id === 'fighter_indomitable')
    if (res && getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast('No Indomitable uses remaining!')
      return
    }
    spendResource('fighter_indomitable', 1)
    const is2024 = (char.value?.edition || '2024') === '2024'
    const bonus = is2024 ? Number(char.value?.level || 1) : 0
    if (typeof rollDice === 'function') rollDice(`Indomitable Saving Throw Reroll${bonus ? ` (+${bonus})` : ''}`, bonus)
  }

  const activateLayOnHands = (amount) => {
    const res = classResourceTrackers.value.find(r => r.id === 'paladin_lay_on_hands')
    if (!res) return
    const available = getResourceAvailable(res)
    if (available < amount) {
      if (typeof showToast === 'function') showToast(`Not enough Lay on Hands points remaining! (Available: ${available})`)
      return
    }
    spendResource('paladin_lay_on_hands', amount)
    if (typeof showToast === 'function') showToast(`Lay on Hands: Expended ${amount} HP pool (Remaining: ${available - amount} HP).`)
  }

  const activateChannelDivinity = (featureName) => {
    const clericRes = classResourceTrackers.value.find(r => r.id === 'cleric_channel_divinity')
    const paladinRes = classResourceTrackers.value.find(r => r.id === 'paladin_channel_divinity')
    const res = clericRes || paladinRes
    if (res && getResourceAvailable(res) <= 0) {
      if (typeof showToast === 'function') showToast('No Channel Divinity uses remaining!')
      return
    }
    if (res) spendResource(res.id, 1)
    if (typeof showToast === 'function') showToast(`${featureName} activated! (Expended 1 Channel Divinity)`)
  }

  const rogueSneakAttackFormula = computed(() => {
    const lvl = Number(char.value?.level) || 1
    const diceCount = Math.ceil(lvl / 2)
    return `${diceCount}d6`
  })

  const rollSneakAttack = () => {
    if (typeof rollFormula === 'function') rollFormula('Sneak Attack Damage', rogueSneakAttackFormula.value)
  }

  const rollDivineSmite = (slotLvl = 1) => {
    const dice = 1 + slotLvl
    if (typeof rollFormula === 'function') rollFormula(`Divine Smite (Level ${slotLvl} Slot)`, `${dice}d8`)
  }

  return {
    classResourceTrackers,
    getResourceSpent,
    getResourceAvailable,
    isResourceSlotExpended,
    toggleResourceSlot,
    spendResource,
    restoreResource,
    isClassStateActive,
    toggleClassState,
    activateSecondWind,
    rollResourceDie,
    activateMonkKiAction,
    activateUncannyMetabolism,
    deflectAttacksReaction,
    activateActionSurge,
    activateIndomitable,
    activateLayOnHands,
    activateChannelDivinity,
    rogueSneakAttackFormula,
    rollSneakAttack,
    rollDivineSmite
  }
}
