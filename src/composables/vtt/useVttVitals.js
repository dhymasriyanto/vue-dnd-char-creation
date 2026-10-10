import { ref, computed, watch } from 'vue'
import axios from 'axios'

export function useVttVitals({ char, vtt, isReadOnly, API_URL, liveEquipment }) {
  // --- Vitals API Saver ---
  const saveVitals = async (updates) => {
    if (isReadOnly.value) return
    if (!char.value?.id) return
    try {
      await axios.put(`${API_URL}/character/${char.value.id}`, updates)
    } catch (err) {
      console.error('Failed to save vitals', err)
    }
  }

  // --- HP State & Logic ---
  const baseMaxHp = computed(() => {
    return Number(char.value?.base_max_hp || char.value?.max_hp_base || char.value?.max_hp || 10)
  })

  const maxHpModifier = ref(Number(char.value?.max_hp_modifier != null ? char.value.max_hp_modifier : (vtt.value?.combat?.hp?.max_hp_modifier || 0)))
  const overrideMaxHp = ref(char.value?.override_max_hp != null ? Number(char.value.override_max_hp) : (vtt.value?.combat?.hp?.override_max_hp != null ? Number(vtt.value.combat.hp.override_max_hp) : null))

  const effectiveMaxHp = computed(() => {
    if (overrideMaxHp.value != null && overrideMaxHp.value !== '' && !isNaN(Number(overrideMaxHp.value)) && Number(overrideMaxHp.value) > 0) {
      return Number(overrideMaxHp.value)
    }
    return Math.max(1, baseMaxHp.value + (Number(maxHpModifier.value) || 0))
  })

  const currentHp = ref(Number(char.value?.hp != null ? char.value.hp : effectiveMaxHp.value))
  const maxHp = ref(effectiveMaxHp.value)
  const tempHp = ref(Number(char.value?.temp_hp || 0))
  const tempHpInput = ref(tempHp.value > 0 ? tempHp.value : '')
  const hpInput = ref(1)

  const showHpModal = ref(false)
  const healModalInput = ref(0)
  const damageModalInput = ref(0)
  const maxHpModifierInput = ref(maxHpModifier.value !== 0 ? maxHpModifier.value : '')
  const overrideMaxHpInput = ref(overrideMaxHp.value != null ? overrideMaxHp.value : '')

  const openHpModal = () => {
    healModalInput.value = 0
    damageModalInput.value = 0
    maxHpModifierInput.value = maxHpModifier.value !== 0 ? maxHpModifier.value : ''
    overrideMaxHpInput.value = overrideMaxHp.value != null ? overrideMaxHp.value : ''
    showHpModal.value = true
  }

  const previewMaxHp = computed(() => {
    const oVal = overrideMaxHpInput.value === '' ? null : Number(overrideMaxHpInput.value)
    if (oVal != null && !isNaN(oVal) && oVal > 0) return oVal
    const modVal = maxHpModifierInput.value === '' ? 0 : Number(maxHpModifierInput.value) || 0
    return Math.max(1, baseMaxHp.value + modVal)
  })

  const newHpPreview = computed(() => {
    const targetMax = previewMaxHp.value
    const heal = Math.max(0, Number(healModalInput.value) || 0)
    const dmg = Math.max(0, Number(damageModalInput.value) || 0)
    if (heal > 0) {
      return Math.min(targetMax, currentHp.value + heal)
    }
    if (dmg > 0) {
      if (tempHp.value > 0) {
        const remDmg = Math.max(0, dmg - tempHp.value)
        return Math.max(0, currentHp.value - remDmg)
      }
      return Math.max(0, currentHp.value - dmg)
    }
    return currentHp.value
  })

  const saveHpState = async () => {
    const modVal = maxHpModifierInput.value === '' ? 0 : Number(maxHpModifierInput.value) || 0
    maxHpModifier.value = modVal
    const oVal = overrideMaxHpInput.value === '' ? null : Number(overrideMaxHpInput.value)
    overrideMaxHp.value = oVal != null && !isNaN(oVal) && oVal > 0 ? oVal : null

    maxHp.value = effectiveMaxHp.value
    currentHp.value = Math.min(currentHp.value, maxHp.value)
    tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''

    if (char.value) {
      char.value.hp = currentHp.value
      char.value.max_hp = maxHp.value
      char.value.temp_hp = tempHp.value
      char.value.max_hp_modifier = maxHpModifier.value
      char.value.override_max_hp = overrideMaxHp.value
    }

    await saveVitals({
      hp: currentHp.value,
      max_hp: maxHp.value,
      temp_hp: tempHp.value,
      max_hp_modifier: maxHpModifier.value,
      override_max_hp: overrideMaxHp.value
    })
  }

  const applyModalHeal = async () => {
    const val = Math.max(0, Number(healModalInput.value) || 0)
    if (val > 0) {
      currentHp.value = Math.min(previewMaxHp.value, currentHp.value + val)
      healModalInput.value = 0
      await saveHpState()
    }
  }

  const applyModalDamage = async () => {
    const val = Math.max(0, Number(damageModalInput.value) || 0)
    if (val > 0) {
      if (tempHp.value > 0) {
        if (tempHp.value >= val) {
          tempHp.value -= val
          tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''
        } else {
          const rem = val - tempHp.value
          tempHp.value = 0
          tempHpInput.value = ''
          currentHp.value = Math.max(0, currentHp.value - rem)
        }
      } else {
        currentHp.value = Math.max(0, currentHp.value - val)
      }
      damageModalInput.value = 0
      await saveHpState()
    }
  }

  const closeHpModal = async () => {
    await saveHpState()
    showHpModal.value = false
  }

  const applyDamage = () => {
    const amount = Number(hpInput.value) || 0
    if (amount <= 0) return
    if (tempHp.value > 0) {
      if (tempHp.value >= amount) {
        tempHp.value -= amount
        tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''
        saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
        return
      } else {
        const remaining = amount - tempHp.value
        tempHp.value = 0
        tempHpInput.value = ''
        currentHp.value = Math.max(0, currentHp.value - remaining)
        saveVitals({ hp: currentHp.value, temp_hp: 0 })
        return
      }
    }
    currentHp.value = Math.max(0, currentHp.value - amount)
    saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
  }

  const applyHeal = () => {
    const amount = Number(hpInput.value) || 0
    if (amount <= 0) return
    currentHp.value = Math.min(maxHp.value, currentHp.value + amount)
    saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
  }

  const updateTempHp = () => {
    const val = Math.max(0, Number(tempHpInput.value) || 0)
    tempHp.value = val
    tempHpInput.value = val > 0 ? val : ''
    saveVitals({ temp_hp: val })
  }

  // --- AC & Dexterity Modifier ---
  const dexMod = computed(() => {
    const dVal = char.value?.dexterity
    if (dVal != null) return Math.floor((Number(dVal) - 10) / 2)
    return Number(vtt.value?.abilities?.dexterity?.modifier || 0)
  })

  const showAcModal = ref(false)
  const isAcCustomizeOpen = ref(true)

  const acCustom = ref({
    override_ac: char.value?.ac_custom?.override_ac ?? null,
    override_base: char.value?.ac_custom?.override_base ?? null,
    magic_bonus: char.value?.ac_custom?.magic_bonus ?? null,
    misc_bonus: char.value?.ac_custom?.misc_bonus ?? null,
    notes_override_ac: char.value?.ac_custom?.notes_override_ac ?? '',
    notes_override_base: char.value?.ac_custom?.notes_override_base ?? '',
    notes_magic: char.value?.ac_custom?.notes_magic ?? '',
    notes_misc: char.value?.ac_custom?.notes_misc ?? ''
  })

  watch(() => char.value?.ac_custom, (val) => {
    if (val) {
      acCustom.value = {
        override_ac: val.override_ac ?? null,
        override_base: val.override_base ?? null,
        magic_bonus: val.magic_bonus ?? null,
        misc_bonus: val.misc_bonus ?? null,
        notes_override_ac: val.notes_override_ac ?? '',
        notes_override_base: val.notes_override_base ?? '',
        notes_magic: val.notes_magic ?? '',
        notes_misc: val.notes_misc ?? ''
      }
    }
  }, { deep: true })

  const acBreakdown = computed(() => {
    let baseArmorAc = null
    let armorName = 'Armor (None)'
    let isHeavyArmor = false
    let isMediumArmor = false
    let hasShield = false
    const dMod = dexMod.value

    const eqItems = liveEquipment?.value || []
    for (const eq of eqItems) {
      if (eq.status !== 'equipped') continue
      const nameLower = (eq.name || '').toLowerCase()
      if (nameLower.includes('shield')) {
        hasShield = true
      } else if (eq.is_armor || eq.item_type === 'armor') {
        armorName = eq.name || 'Armor'
        const itemAc = eq.base_ac != null ? Number(eq.base_ac) : (eq.ac ? Number(eq.ac) : null)
        if (itemAc !== null && itemAc > 0) {
          if (eq.ac_dex_bonus === false || itemAc >= 16) {
            baseArmorAc = itemAc
            isHeavyArmor = true
          } else if (itemAc >= 12 && itemAc <= 15) {
            baseArmorAc = itemAc
            isMediumArmor = true
          } else {
            baseArmorAc = itemAc
          }
        } else if (nameLower.includes('padded') || nameLower.includes('leather') || nameLower.includes('studded')) {
          baseArmorAc = nameLower.includes('studded') ? 12 : 11
        } else if (nameLower.includes('hide') || nameLower.includes('chain shirt') || nameLower.includes('scale mail') || nameLower.includes('breastplate') || nameLower.includes('half plate')) {
          let base = 14
          if (nameLower.includes('hide')) base = 12
          else if (nameLower.includes('chain shirt')) base = 13
          else if (nameLower.includes('scale mail') || nameLower.includes('breastplate')) base = 14
          else if (nameLower.includes('half plate')) base = 15
          baseArmorAc = base
          isMediumArmor = true
        } else if (nameLower.includes('ring mail') || nameLower.includes('chain mail') || nameLower.includes('splint') || nameLower.includes('plate')) {
          let base = 16
          if (nameLower.includes('ring mail')) base = 14
          else if (nameLower.includes('chain mail')) base = 16
          else if (nameLower.includes('splint')) base = 17
          else if (nameLower.includes('plate')) base = 18
          baseArmorAc = base
          isHeavyArmor = true
        }
      }
    }

    const baseArmorValue = baseArmorAc !== null ? baseArmorAc : 10
    let appliedDex = dMod
    let dexLabel = 'Dexterity Bonus'
    if (isHeavyArmor) {
      appliedDex = 0
      dexLabel = 'Dexterity Bonus (None - Heavy Armor)'
    } else if (isMediumArmor) {
      appliedDex = Math.min(2, Math.max(0, dMod))
      dexLabel = 'Dexterity Bonus (Max +2)'
    }

    const overrideAcVal = acCustom.value.override_ac !== null && acCustom.value.override_ac !== '' && !isNaN(Number(acCustom.value.override_ac))
      ? Number(acCustom.value.override_ac)
      : null

    const overrideBaseVal = acCustom.value.override_base !== null && acCustom.value.override_base !== '' && !isNaN(Number(acCustom.value.override_base))
      ? Number(acCustom.value.override_base)
      : null

    const magicBonus = Number(acCustom.value.magic_bonus) || 0
    const miscBonus = Number(acCustom.value.misc_bonus) || 0

    let totalAc = 10
    if (overrideAcVal !== null) {
      totalAc = overrideAcVal
    } else {
      const effectiveBaseAndDex = overrideBaseVal !== null ? overrideBaseVal : (baseArmorValue + appliedDex)
      totalAc = effectiveBaseAndDex + (hasShield ? 2 : 0) + magicBonus + miscBonus
    }

    return {
      armorName,
      baseArmorValue,
      dexBonus: appliedDex,
      dexBonusLabel: dexLabel,
      isHeavyArmor,
      isMediumArmor,
      hasShield,
      magicBonus,
      miscBonus,
      overrideBase: overrideBaseVal,
      overrideAc: overrideAcVal,
      totalAc
    }
  })

  const currentArmorClass = computed(() => {
    return acBreakdown.value.totalAc
  })

  const calculateLiveAc = () => {
    return currentArmorClass.value
  }

  const openAcModal = () => {
    showAcModal.value = true
  }

  const saveAcCustom = async () => {
    if (char.value) {
      char.value.ac = currentArmorClass.value
      char.value.ac_custom = { ...acCustom.value }
    }
    await saveVitals({
      ac: currentArmorClass.value,
      ac_custom: acCustom.value
    })
  }

  const closeAcModal = async () => {
    await saveAcCustom()
    showAcModal.value = false
  }

  // --- Speeds & Movement ---
  const showSpeedModal = ref(false)

  const customSpeeds = ref({
    walk: Number(char.value?.speeds?.walk ?? (char.value?.speed || char.value?.race?.speed || 30)),
    fly: Number(char.value?.speeds?.fly ?? (char.value?.race?.fly_speed || 0)),
    swim: Number(char.value?.speeds?.swim ?? (char.value?.race?.swim_speed || 0)),
    climb: Number(char.value?.speeds?.climb ?? (char.value?.race?.climb_speed || 0)),
    burrow: Number(char.value?.speeds?.burrow ?? 0),
    notes: char.value?.speeds?.notes || ''
  })

  watch(() => [char.value?.speed, char.value?.speeds, char.value?.race], () => {
    customSpeeds.value = {
      walk: Number(char.value?.speeds?.walk ?? (char.value?.speed || char.value?.race?.speed || 30)),
      fly: Number(char.value?.speeds?.fly ?? (char.value?.race?.fly_speed || 0)),
      swim: Number(char.value?.speeds?.swim ?? (char.value?.race?.swim_speed || 0)),
      climb: Number(char.value?.speeds?.climb ?? (char.value?.race?.climb_speed || 0)),
      burrow: Number(char.value?.speeds?.burrow ?? 0),
      notes: char.value?.speeds?.notes || ''
    }
  }, { deep: true })

  const otherSpeedsList = computed(() => {
    const list = []
    if (customSpeeds.value.fly > 0) list.push({ type: 'Fly', speed: customSpeeds.value.fly })
    if (customSpeeds.value.swim > 0) list.push({ type: 'Swim', speed: customSpeeds.value.swim })
    if (customSpeeds.value.climb > 0) list.push({ type: 'Climb', speed: customSpeeds.value.climb })
    if (customSpeeds.value.burrow > 0) list.push({ type: 'Burrow', speed: customSpeeds.value.burrow })
    return list
  })

  let speedSnapshot = null
  const openSpeedModal = () => {
    speedSnapshot = { ...customSpeeds.value }
    showSpeedModal.value = true
  }

  const cancelSpeedModal = () => {
    if (speedSnapshot) {
      customSpeeds.value = { ...speedSnapshot }
    }
    showSpeedModal.value = false
  }

  const closeSpeedModal = async () => {
    showSpeedModal.value = false
    if (char.value) {
      char.value.speed = customSpeeds.value.walk
      char.value.speeds = { ...customSpeeds.value }
    }
    await saveVitals({
      speed: customSpeeds.value.walk,
      speeds: customSpeeds.value
    })
  }

  return {
    saveVitals,
    baseMaxHp,
    maxHpModifier,
    overrideMaxHp,
    effectiveMaxHp,
    currentHp,
    maxHp,
    tempHp,
    tempHpInput,
    hpInput,
    showHpModal,
    healModalInput,
    damageModalInput,
    maxHpModifierInput,
    overrideMaxHpInput,
    openHpModal,
    previewMaxHp,
    newHpPreview,
    saveHpState,
    applyModalHeal,
    applyModalDamage,
    closeHpModal,
    applyDamage,
    applyHeal,
    updateTempHp,
    dexMod,
    showAcModal,
    isAcCustomizeOpen,
    acCustom,
    acBreakdown,
    currentArmorClass,
    calculateLiveAc,
    openAcModal,
    saveAcCustom,
    closeAcModal,
    showSpeedModal,
    customSpeeds,
    otherSpeedsList,
    openSpeedModal,
    cancelSpeedModal,
    closeSpeedModal
  }
}
