import { ref, computed } from 'vue'
import { WEAPON_DEFINITIONS } from '../../constants/weaponConstants'
import { parseRawEntries } from '../../utils/featureUnpacker'

export function useVttCombatActions({
  char,
  vtt,
  charClassName,
  charSubClassName = ref(''),
  getItemEquipType,
  liveEquipment,
  saveEquipment,
  activeClassStates = ref({}),
  rageBonusDamage = ref(0),
  charSpells = ref([]),
  charCasterMod = ref(0),
  extractSpellMechanics = () => ({}),
  isFeatSpell = () => false,
  getFeatName = () => '',
  getSpellRange = () => '',
  getSpellComponents = () => '',
  combinedClassFeatures = ref([]),
  unpackedTraits = ref([]),
  customActions,
  spentCustomActionUses,
  persistSheetState = () => {},
  rollDice = () => {},
  rollFormula = () => {},
  showToast = () => {},
  rogueSneakAttackFormula = null,
  charClassesList: passedCharClassesList,
  getCharClassLevel: passedGetCharClassLevel,
  hasCharClass: passedHasCharClass,
  monkLevel: passedMonkLevel,
  monkMartialArtsDie: passedMonkMartialArtsDie
}) {
  // Multiclass & Class Level helpers
  const charClassesList = passedCharClassesList || computed(() => {
    if (Array.isArray(char.value?.classes) && char.value.classes.length > 0) return char.value.classes
    if (Array.isArray(char.value?.class)) return char.value.class
    if (char.value?.class) return [char.value.class]
    return []
  })

  const getCharClassLevel = passedGetCharClassLevel || ((className) => {
    const target = (className || '').toLowerCase()
    const found = charClassesList.value.find(c => {
      const name = (c?.name || c?.class?.name || c?.class?.class?.name || '').toLowerCase()
      return name === target
    })
    if (found) return Number(found.level) || 1
    if ((charClassName.value || '').includes(target)) {
      return Number(char.value?.level) || 1
    }
    return 0
  })

  const hasCharClass = passedHasCharClass || ((className) => getCharClassLevel(className) > 0)

  const monkLevel = passedMonkLevel || computed(() => getCharClassLevel('monk'))

  const monkMartialArtsDie = passedMonkMartialArtsDie || computed(() => {
    const ml = monkLevel.value
    if (ml <= 0) return null
    const is2024 = (char.value?.edition || '2024') === '2024'
    if (is2024) {
      if (ml >= 17) return '1d12'
      if (ml >= 11) return '1d10'
      if (ml >= 5) return '1d8'
      return '1d6'
    } else {
      if (ml >= 17) return '1d10'
      if (ml >= 11) return '1d8'
      if (ml >= 5) return '1d6'
      return '1d4'
    }
  })

  // --- Custom Actions ---
  const showCustomActionModal = ref(false)
  const editingCustomActionId = ref(null)

  const newCustomActionForm = ref({
    name: '',
    type: 'action',
    range: '5 ft.',
    hasAttack: false,
    attackAbility: 'str',
    attackBonusFlat: 0,
    hasDc: false,
    dcAbility: 'str',
    dcBase: 8,
    hasDamage: false,
    damageDice: '1d6',
    damageAbility: 'str',
    damageBonusFlat: 0,
    damageType: 'slashing',
    hasResource: false,
    resourceMax: 1,
    resourceRecharge: 'short',
    notes: ''
  })

  const openAddCustomAction = (type = 'action') => {
    editingCustomActionId.value = null
    newCustomActionForm.value = {
      name: '',
      type,
      range: type === 'attack' ? '5 ft.' : (type === 'bonus' ? 'Self' : '5 ft.'),
      hasAttack: type === 'attack',
      attackAbility: 'str',
      attackBonusFlat: 0,
      hasDc: false,
      dcAbility: 'str',
      dcBase: 8,
      hasDamage: type === 'attack',
      damageDice: type === 'attack' ? '1d8' : '',
      damageAbility: 'str',
      damageBonusFlat: 0,
      damageType: type === 'attack' ? 'slashing' : '',
      hasResource: false,
      resourceMax: 1,
      resourceRecharge: 'short',
      notes: ''
    }
    showCustomActionModal.value = true
  }

  const saveCustomAction = () => {
    if (!newCustomActionForm.value.name.trim()) return
    const f = newCustomActionForm.value
    const act = {
      id: editingCustomActionId.value || ('cust_act_' + Date.now()),
      name: f.name.trim(),
      type: f.type,
      range: f.range || '5 ft.',
      hasAttack: Boolean(f.hasAttack),
      attackAbility: f.attackAbility || 'str',
      attackBonusFlat: Number(f.attackBonusFlat) || 0,
      hasDc: Boolean(f.hasDc),
      dcAbility: f.dcAbility || 'str',
      dcBase: Number(f.dcBase) || 8,
      hasDamage: Boolean(f.hasDamage),
      damageDice: f.damageDice || '',
      damageAbility: f.damageAbility || 'str',
      damageBonusFlat: Number(f.damageBonusFlat) || 0,
      damageType: f.damageType || '',
      resource: f.hasResource ? {
        max: Math.max(1, Number(f.resourceMax) || 1),
        recharge: f.resourceRecharge || 'short'
      } : null,
      notes: f.notes || ''
    }

    if (editingCustomActionId.value) {
      const idx = customActions.value.findIndex(a => a.id === editingCustomActionId.value)
      if (idx !== -1) customActions.value[idx] = act
    } else {
      customActions.value.push(act)
    }

    showCustomActionModal.value = false
    persistSheetState()
  }

  const deleteCustomAction = (id) => {
    const idx = customActions.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      customActions.value.splice(idx, 1)
      delete spentCustomActionUses.value[id]
      persistSheetState()
    }
  }

  const getCustomActionsByType = (type) => {
    return customActions.value.filter(a => a.type === type)
  }

  const getCustomActionSpent = (id) => spentCustomActionUses.value[id] || 0

  const getCustomActionAvailable = (act) => {
    if (!act?.resource) return 0
    return Math.max(0, act.resource.max - getCustomActionSpent(act.id))
  }

  const spendCustomAction = (act) => {
    if (!act?.resource) return
    if (getCustomActionAvailable(act) <= 0) {
      showToast(`No uses left for ${act.name}!`)
      return
    }
    spentCustomActionUses.value[act.id] = (spentCustomActionUses.value[act.id] || 0) + 1
    persistSheetState()
  }

  const restoreCustomActionUse = (act) => {
    if (!act?.resource) return
    const cur = spentCustomActionUses.value[act.id] || 0
    if (cur > 0) {
      spentCustomActionUses.value[act.id] = cur - 1
      persistSheetState()
    }
  }

  const getCustomActionAttackBonus = (act) => {
    const prof = vtt.value?.proficiency_bonus || 2
    const statMod = act.attackAbility && act.attackAbility !== 'none'
      ? (vtt.value?.abilities?.[act.attackAbility]?.modifier ?? 0)
      : 0
    return prof + statMod + (Number(act.attackBonusFlat) || 0)
  }

  const getCustomActionDamageLabel = (act) => {
    const statMod = act.damageAbility && act.damageAbility !== 'none'
      ? (vtt.value?.abilities?.[act.damageAbility]?.modifier ?? 0)
      : 0
    const totalMod = statMod + (Number(act.damageBonusFlat) || 0)
    if (!act.damageDice) return act.damageType || '—'
    return totalMod !== 0
      ? `${act.damageDice}${totalMod >= 0 ? '+' : ''}${totalMod} ${act.damageType || ''}`
      : `${act.damageDice} ${act.damageType || ''}`
  }

  const rollCustomActionAttack = (act) => {
    const bonus = getCustomActionAttackBonus(act)
    rollDice(`${act.name} (Attack)`, bonus)
  }

  const rollCustomActionDamage = (act) => {
    const statMod = act.damageAbility && act.damageAbility !== 'none'
      ? (vtt.value?.abilities?.[act.damageAbility]?.modifier ?? 0)
      : 0
    const totalMod = statMod + (Number(act.damageBonusFlat) || 0)
    rollFormula(`${act.name} Damage`, act.damageDice, totalMod)
  }

  // --- Custom Items ---
  const showCustomItemModal = ref(false)
  const newCustomItemForm = ref({
    name: '',
    item_type: 'gear',
    weight: 1,
    amount: 1,
    status: 'inventory',
    damage_dice: '',
    damage_type: '',
    range: '',
    base_ac: 10,
    dexMod: false
  })

  const openAddCustomItem = () => {
    newCustomItemForm.value = {
      name: '',
      item_type: 'gear',
      weight: 1,
      amount: 1,
      status: 'inventory',
      damage_dice: '',
      damage_type: '',
      range: '',
      base_ac: 10,
      dexMod: false
    }
    showCustomItemModal.value = true
  }

  const saveCustomItem = () => {
    if (!newCustomItemForm.value.name.trim()) return
    const f = newCustomItemForm.value
    const isArmor = f.item_type === 'armor'
    const isWeapon = f.item_type === 'weapon'

    liveEquipment.value.push({
      name: f.name.trim(),
      weight: String(f.weight || 0),
      amount: Number(f.amount) || 1,
      status: f.status || 'inventory',
      is_armor: isArmor,
      equip_type: f.item_type,
      damage_dice: isWeapon ? f.damage_dice : null,
      damage_type: isWeapon ? f.damage_type : null,
      range: isWeapon ? f.range : null,
      ac: isArmor ? (Number(f.base_ac) || 0) : 0,
      dexMod: isArmor ? Boolean(f.dexMod) : false
    })

    saveEquipment()
    showCustomItemModal.value = false
    showToast('Custom item added')
  }

  // Weapon calculations
  const getWeaponDetails = (item) => {
    if (!item) return null
    const eqType = typeof getItemEquipType === 'function' ? getItemEquipType(item) : item.equip_type
    if (eqType !== 'weapon') return null

    const key = (item.name || '').toLowerCase().replace(/['’]/g, '').replace(/[\s-]+/g, '_')
    const found = WEAPON_DEFINITIONS[key] || Object.entries(WEAPON_DEFINITIONS).find(([k]) => key.includes(k))?.[1]

    const is2024 = (char.value?.edition || '2024') === '2024'
    const isMelee = !found?.ranged
    const isSimpleOrShortsword = Boolean(found?.simple) || key.includes('shortsword')
    const isLightMartialMelee = Boolean(found?.light) && isMelee
    const isMonkWeapon = monkLevel.value >= 1 && isMelee && !found?.heavy && !found?.twoHanded && (
      isSimpleOrShortsword || (is2024 && isLightMartialMelee)
    )

    const strMod = vtt.value?.abilities?.str?.modifier || 0
    const dexMod = vtt.value?.abilities?.dex?.modifier || 0
    const prof = vtt.value?.proficiency_bonus || 2

    let statMod = strMod
    if (found?.ranged) {
      statMod = dexMod
    } else if (found?.finesse || isMonkWeapon) {
      statMod = Math.max(strMod, dexMod)
    }

    const toHit = prof + statMod
    let damageDice = found?.damage || item.damage_dice || item.damageDice || item.dmg1 || '1d6'
    const damageType = found?.type || item.damage_type || item.dmgType || 'slashing'

    if (isMonkWeapon && monkMartialArtsDie.value) {
      const parseSides = (d) => parseInt(String(d).replace(/^1d/, ''), 10) || 0
      if (parseSides(monkMartialArtsDie.value) > parseSides(damageDice)) {
        damageDice = monkMartialArtsDie.value
      }
    }

    const props = []
    if (found?.finesse) props.push('Finesse')
    if (found?.light) props.push('Light')
    if (found?.heavy) props.push('Heavy')
    if (found?.twoHanded) props.push('Two-Handed')
    if (found?.versatile) props.push(`Versatile (${found.versatile})`)
    if (found?.reach) props.push('Reach')
    if (found?.thrown) props.push('Thrown')
    if (isMonkWeapon) props.push('Monk Weapon')

    return {
      name: item.name,
      toHit,
      statMod,
      damageDice,
      damageType,
      range: found?.range || (found?.ranged ? 'Ranged' : '5 ft.'),
      properties: props
    }
  }

  const equippedWeapons = computed(() => {
    return (liveEquipment.value || [])
      .filter(it => (it.status === 'equipped' || it.equipped) && (typeof getItemEquipType === 'function' ? getItemEquipType(it) === 'weapon' : it.equip_type === 'weapon'))
      .map(it => getWeaponDetails(it))
      .filter(Boolean)
  })

  const unarmedStrikeDetails = computed(() => {
    const strMod = vtt.value?.abilities?.str?.modifier || 0
    const dexMod = vtt.value?.abilities?.dex?.modifier || 0
    const prof = vtt.value?.proficiency_bonus || 2

    let statMod = strMod
    let damageDice = '1'
    const properties = []

    const allFeaturesList = [
      ...(char.value?.class_feature || []),
      ...(char.value?.sub_class_feature || []),
      ...(char.value?.feat || []),
      ...(char.value?.trait || [])
    ]
    const hasUnarmedFighting = allFeaturesList.some(f => (f?.name || '').toLowerCase().includes('unarmed fighting'))
    const hasTavernBrawler = allFeaturesList.some(f => (f?.name || '').toLowerCase().includes('tavern brawler'))

    if (hasUnarmedFighting) damageDice = '1d8'
    else if (hasTavernBrawler) damageDice = '1d4'

    if (monkLevel.value >= 1) {
      statMod = Math.max(strMod, dexMod)
      const maDie = monkMartialArtsDie.value
      if (maDie) {
        const parseSides = (d) => parseInt(String(d).replace(/^1d/, ''), 10) || 0
        if (parseSides(maDie) >= parseSides(damageDice) || damageDice === '1') {
          damageDice = maDie
        }
      }
      properties.push('Martial Arts (DEX)')
    }

    const toHit = prof + statMod
    return {
      name: 'Unarmed Strike',
      toHit,
      damageDice,
      statMod,
      damageType: 'bludgeoning',
      range: '5 ft.',
      properties
    }
  })

  // D&D Beyond Style Attack Table calculation
  const attackTableEntries = computed(() => {
    const entries = []
    const isRaging = Boolean(activeClassStates.value?.barb_rage)
    const rageDmg = isRaging ? (rageBonusDamage.value || 0) : 0
    const lvl = Number(char.value?.level) || 1

    // 1. Equipped weapons
    for (const w of equippedWeapons.value) {
      const isRanged = w.properties.some(p => p && p.toLowerCase().includes('ranged')) || (w.range && w.range.includes('/'))
      const finalMod = w.statMod + (!isRanged ? rageDmg : 0)
      const dmgLabel = (!isRanged && isRaging)
        ? `${w.damageDice}${finalMod >= 0 ? '+' : ''}${finalMod} ${w.damageType} (Rage +${rageDmg})`
        : `${w.damageDice}${w.statMod >= 0 ? '+' : ''}${w.statMod} ${w.damageType}`

      entries.push({
        id: 'wpn_' + w.name,
        type: 'weapon',
        name: w.name,
        subtitle: isRanged ? 'Ranged Weapon' : 'Melee Weapon',
        range: w.range || (isRanged ? 'Ranged' : '5 ft. Reach'),
        toHit: w.toHit,
        toHitLabel: (w.toHit >= 0 ? '+' : '') + w.toHit,
        isDc: false,
        dcText: '',
        damageDice: w.damageDice,
        damageMod: finalMod,
        damageFormula: w.damageDice,
        damageType: w.damageType,
        damageLabel: dmgLabel,
        notes: w.properties.join(', ') || '—'
      })
    }

    // 2. Unarmed Strike
    const us = unarmedStrikeDetails.value
    const usMod = us.statMod + rageDmg
    const usLabel = isRaging
      ? `${us.damageDice}${usMod >= 0 ? '+' : ''}${usMod} bludgeoning (Rage +${rageDmg})`
      : `${us.damageDice}${us.statMod >= 0 ? '+' : ''}${us.statMod} bludgeoning`

    entries.push({
      id: 'unarmed_strike',
      type: 'unarmed',
      name: us.name,
      subtitle: 'Melee Attack',
      range: '5 ft. Reach',
      toHit: us.toHit,
      toHitLabel: (us.toHit >= 0 ? '+' : '') + us.toHit,
      isDc: false,
      dcText: '',
      damageDice: us.damageDice,
      damageMod: usMod,
      damageFormula: us.damageDice,
      damageType: us.damageType,
      damageLabel: usLabel,
      notes: 'Free hand'
    })

    // 3. Rogue Sneak Attack
    if (charClassName.value === 'rogue') {
      const saFormula = rogueSneakAttackFormula?.value || `${Math.ceil(lvl / 2)}d6`
      entries.push({
        id: 'rogue_sneak_attack',
        type: 'feature',
        name: 'Sneak Attack',
        subtitle: 'Once per turn with Finesse or Ranged',
        range: 'With Attack',
        toHit: null,
        toHitLabel: null,
        isDc: false,
        dcText: '',
        damageDice: saFormula,
        damageMod: 0,
        damageFormula: saFormula,
        damageType: 'Extra Damage',
        damageLabel: saFormula,
        notes: 'Advantage or adjacent ally required'
      })
    }

    // 4. Paladin Divine Smite
    if (charClassName.value === 'paladin' && lvl >= 2) {
      entries.push({
        id: 'paladin_divine_smite',
        type: 'feature',
        name: 'Divine Smite',
        subtitle: 'On melee hit (1st lvl slot base)',
        range: 'On Hit',
        toHit: null,
        toHitLabel: null,
        isDc: false,
        dcText: '',
        damageDice: '2d8',
        damageMod: 0,
        damageFormula: '2d8',
        damageType: 'Radiant',
        damageLabel: '2d8 (+1d8/slot > 1st)',
        notes: 'Expend spell slot on weapon hit (+1d8 vs Fiend/Undead)'
      })
    }

    // 5. Battle Master Superiority Die
    const subName = (charSubClassName.value || '').toLowerCase()
    if ((subName.includes('battle master') || subName.includes('battlemaster')) && lvl >= 3) {
      const die = lvl >= 18 ? 'd12' : (lvl >= 10 ? 'd10' : 'd8')
      entries.push({
        id: 'bm_superiority_die',
        type: 'feature',
        name: 'Superiority Die',
        subtitle: 'Battle Master Maneuver',
        range: 'Special',
        toHit: null,
        toHitLabel: null,
        isDc: false,
        dcText: '',
        damageDice: `1${die}`,
        damageMod: 0,
        damageFormula: `1${die}`,
        damageType: 'Maneuver',
        damageLabel: `1${die}`,
        notes: 'Add to damage roll or maneuver DC 8+PB+STR/DEX'
      })
    }

    // 6. Attack Spells & Cantrips (hasAttack or diceFormula)
    for (const sp of (charSpells.value || [])) {
      const mechanics = typeof extractSpellMechanics === 'function' ? extractSpellMechanics(sp, char.value?.level, charCasterMod.value) : {}
      if (mechanics.hasAttack || mechanics.diceFormula) {
        const isCantrip = Number(sp.level) === 0 || sp.is_cantrip
        const featTag = (typeof isFeatSpell === 'function' && isFeatSpell(sp)) ? ` (${typeof getFeatName === 'function' ? getFeatName(sp) : ''})` : ''
        const subtitle = `${isCantrip ? 'Cantrip' : 'Level ' + sp.level}${sp.school ? ' · ' + sp.school : ''}${featTag}`
        const range = typeof getSpellRange === 'function' ? getSpellRange(sp) : (sp.range || '—')
        const notesList = []
        const comp = typeof getSpellComponents === 'function' ? getSpellComponents(sp) : ''
        if (comp) notesList.push(comp)
        if (sp.concentration) notesList.push('Conc')
        if (sp.ritual) notesList.push('Ritual')

        entries.push({
          id: 'sp_atk_' + (sp.id || sp.name),
          type: 'spell',
          name: sp.name,
          subtitle,
          range,
          toHit: mechanics.hasAttack ? mechanics.toHit : null,
          toHitLabel: mechanics.hasAttack ? mechanics.toHitLabel : null,
          isDc: Boolean(mechanics.isDc),
          dcText: mechanics.isDc ? mechanics.dcText : '',
          damageDice: mechanics.diceFormula || '',
          damageMod: mechanics.damageMod || 0,
          damageFormula: mechanics.diceFormula || '',
          damageType: mechanics.damageType || '',
          damageLabel: mechanics.diceFormula ? (mechanics.damageType ? `${mechanics.diceFormula} ${mechanics.damageType}` : mechanics.diceFormula) : 'Special',
          notes: notesList.join(', ') || '—'
        })
      }
    }

    // 7. Custom Actions with attack/damage
    for (const act of (customActions.value || [])) {
      if (!act.hasAttack && !act.hasDamage && !act.hasDc) continue
      const prof = vtt.value?.proficiency_bonus || 2
      const statMod = act.attackAbility && act.attackAbility !== 'none'
        ? (vtt.value?.abilities?.[act.attackAbility]?.modifier ?? 0)
        : 0
      const toHit = prof + statMod + (Number(act.attackBonusFlat) || 0)
      const dmgMod = act.damageAbility && act.damageAbility !== 'none'
        ? (vtt.value?.abilities?.[act.damageAbility]?.modifier ?? 0)
        : 0
      const totalDmgMod = dmgMod + (Number(act.damageBonusFlat) || 0)
      const dmgFormula = act.damageDice ? (totalDmgMod !== 0 ? `${act.damageDice}${totalDmgMod >= 0 ? '+' : ''}${totalDmgMod}` : act.damageDice) : ''
      const dcStatMod = act.dcAbility && act.dcAbility !== 'none'
        ? (vtt.value?.abilities?.[act.dcAbility]?.modifier ?? 0)
        : 0
      const dcVal = (Number(act.dcBase) || 8) + prof + dcStatMod

      const usesText = act.resource
        ? ` (${Math.max(0, act.resource.max - (spentCustomActionUses.value[act.id] || 0))}/${act.resource.max})`
        : ''

      entries.push({
        id: act.id,
        type: 'custom',
        name: act.name,
        subtitle: `Custom Action${usesText}`,
        range: act.range || '5 ft.',
        toHit: act.hasAttack ? toHit : null,
        toHitLabel: act.hasAttack ? ((toHit >= 0 ? '+' : '') + toHit) : null,
        isDc: Boolean(act.hasDc),
        dcText: act.hasDc ? `DC ${dcVal} ${act.dcAbility?.toUpperCase() || ''}` : '',
        damageDice: act.damageDice || '',
        damageMod: totalDmgMod,
        damageFormula: dmgFormula,
        damageType: act.damageType || '',
        damageLabel: act.damageDice
          ? (totalDmgMod !== 0 ? `${act.damageDice}${totalDmgMod >= 0 ? '+' : ''}${totalDmgMod} ${act.damageType || ''}` : `${act.damageDice} ${act.damageType || ''}`)
          : (act.damageType || '—'),
        notes: act.notes || '—',
        customActionRef: act
      })
    }

    return entries
  })

  // Automated Feature Actions
  const automatedFeatureActions = computed(() => {
    const result = []
    const seenNames = new Set([
      'rage', 'reckless attack', 'second wind', 'action surge', 'indomitable',
      'tactical mind', 'flurry of blows', 'patient defense', 'step of the wind',
      'stunning strike', 'uncanny metabolism', 'cunning action', 'sneak attack',
      'channel divinity', 'lay on hands', 'wild shape', 'bardic inspiration',
      'font of magic', 'arcane recovery', 'deflect missiles', 'deflect attacks',
      'uncanny dodge', 'two-weapon off-hand attack', 'free object interaction',
      'short rest & hit dice', 'attack', 'dash', 'disengage', 'dodge', 'help',
      'hide', 'ready', 'search', 'shove', 'grapple', 'improvise', 'influence',
      'magic', 'study', 'utilize'
    ])

    const allFeatures = [
      ...(combinedClassFeatures.value || []),
      ...(unpackedTraits.value || []),
      ...(char.value?.feat || []).map(f => ({ ...f, _sourceCategory: 'Feat' })),
      ...(char.value?.feature || []).map(f => ({ ...f, _sourceCategory: 'Background' }))
    ]

    for (const f of allFeatures) {
      if (!f || !f.name) continue
      const lowerName = f.name.trim().toLowerCase()
      if (seenNames.has(lowerName)) continue

      const rawList = parseRawEntries(f.entries)
      const textParts = []
      const collectText = (items) => {
        if (!Array.isArray(items)) return
        for (const it of items) {
          if (!it) continue
          if (typeof it === 'string') textParts.push(it)
          else if (typeof it === 'object') {
            if (it.name) textParts.push(it.name)
            if (it.entry) textParts.push(it.entry)
            if (Array.isArray(it.entries)) collectText(it.entries)
            if (Array.isArray(it.items)) collectText(it.items)
          }
        }
      }
      collectText(rawList)
      const fullText = textParts.join(' ')
      if (!fullText) continue

      const lowerText = fullText.toLowerCase()

      let actionType = null
      if (/\bas a bonus action\b/i.test(fullText)) {
        actionType = 'bonus'
      } else if (/\bas a reaction\b/i.test(fullText)) {
        actionType = 'reaction'
      } else if (/\bas an action\b/i.test(fullText) || /\byou can use your action\b/i.test(fullText)) {
        actionType = 'action'
      }
      if (!actionType) continue

      let max = 0
      let recharge = 'short'
      if (/\bper long rest\b/i.test(lowerText) || /\bfinish a long rest\b/i.test(lowerText)) {
        recharge = 'long'
      }

      if (/\bequal to your proficiency bonus\b/i.test(lowerText)) {
        max = vtt.value?.proficiency_bonus || 2
      } else {
        const m = lowerText.match(/(\d+)\s+times?\s+per\s+(short|long)\s+rest/)
        if (m) {
          max = parseInt(m[1], 10) || 1
          recharge = m[2]
        } else if (/\bonce per (short|long) rest\b/i.test(lowerText)) {
          max = 1
          recharge = lowerText.includes('long') ? 'long' : 'short'
        } else {
          const timesMatch = lowerText.match(/can use this feature (\d+) times?/i)
          if (timesMatch) {
            max = parseInt(timesMatch[1], 10) || 1
          } else if (lowerText.includes('once you use this feature') || lowerText.includes('once per day')) {
            max = 1
            recharge = 'long'
          }
        }
      }

      seenNames.add(lowerName)
      const sourceLabel = f._sourceCategory || (f.isSubclass ? 'Subclass' : 'Class')
      const cleanId = 'auto_' + lowerName.replace(/[^a-z0-9]/g, '_')

      result.push({
        id: cleanId,
        name: f.name,
        source: sourceLabel,
        actionType,
        description: fullText.slice(0, 140) + (fullText.length > 140 ? '...' : ''),
        entries: f.entries,
        hasResource: max > 0,
        max,
        recharge
      })
    }
    return result
  })

  const expandedAutoActions = ref({})
  const toggleAutoAction = (id) => {
    expandedAutoActions.value[id] = !expandedAutoActions.value[id]
  }

  return {
    charClassesList,
    getCharClassLevel,
    hasCharClass,
    monkLevel,
    monkMartialArtsDie,
    showCustomActionModal,
    editingCustomActionId,
    newCustomActionForm,
    openAddCustomAction,
    saveCustomAction,
    deleteCustomAction,
    getCustomActionsByType,
    getCustomActionSpent,
    getCustomActionAvailable,
    spendCustomAction,
    restoreCustomActionUse,
    getCustomActionAttackBonus,
    getCustomActionDamageLabel,
    rollCustomActionAttack,
    rollCustomActionDamage,
    showCustomItemModal,
    newCustomItemForm,
    openAddCustomItem,
    saveCustomItem,
    getWeaponDetails,
    equippedWeapons,
    unarmedStrikeDetails,
    attackTableEntries,
    automatedFeatureActions,
    expandedAutoActions,
    toggleAutoAction
  }
}
