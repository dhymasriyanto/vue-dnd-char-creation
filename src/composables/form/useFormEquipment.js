import { ref, reactive, computed, watch } from 'vue'
import {
  EQUIPMENT_PACK_CONTENTS,
  ITEM_WEIGHT_MAP,
  CLASS_STARTING_GOLD,
  CLASS_DEFAULT_EQUIPMENT
} from '../../constants/equipmentConstants'
import { clean5eToolsMarkup } from '../../utils/textRenderer'
import { parseBackgroundDetails as parseBgDetails } from '../../utils/backgroundParser'

export function useFormEquipment({
  characterClass,
  classSelected,
  selectedBackgroundObj,
  selectedEdition,
  isEditMode,
  strength,
  errors,
  chosenClassTools,
  chosenBgTools,
  parseBackgroundDetails,
  savedTreasure
}) {
  const equipmentChoiceMode = ref('package')
  const customStartingGold = ref(50)
  const chosenBgEquipmentChoices = reactive({})
  const chosenClassEquipmentChoices = reactive({})

  const unpackEquipmentItem = (item) => {
    if (!item || !item.name) return []
    const lowerName = item.name.toLowerCase().trim()
    for (const [packName, contents] of Object.entries(EQUIPMENT_PACK_CONTENTS)) {
      if (lowerName === packName || lowerName.includes(packName)) {
        return contents.map(c => ({ ...c }))
      }
    }
    return [item]
  }

  const consolidateItems = (itemList) => {
    const result = []
    const map = new Map()
    for (const it of itemList) {
      const key = `${it.name.toLowerCase().trim()}_${it.status}_${it.is_armor}`
      if (map.has(key)) {
        const existing = map.get(key)
        existing.amount = (Number(existing.amount) || 1) + (Number(it.amount) || 1)
      } else {
        const copy = { ...it, amount: Number(it.amount) || 1 }
        map.set(key, copy)
        result.push(copy)
      }
    }
    return result
  }

  const lookupItemWeight = (name) => {
    if (!name) return '1'
    const clean = name.toLowerCase().replace(/\s*\(\d+\)/, '').trim()
    if (ITEM_WEIGHT_MAP[clean] !== undefined) return String(ITEM_WEIGHT_MAP[clean])
    for (const [k, v] of Object.entries(ITEM_WEIGHT_MAP)) {
      if (clean.includes(k)) return String(v)
    }
    return '1'
  }

  const isLikelyArmor = (name) => {
    if (!name) return false
    const lower = name.toLowerCase()
    return lower.includes('armor') || lower.includes('mail') || lower.includes('shield') || lower.includes('breastplate')
  }

  const isLikelyWeapon = (name) => {
    if (!name) return false
    const lower = name.toLowerCase()
    return [
      'sword', 'axe', 'bow', 'dagger', 'mace', 'crossbow', 'spear', 'javelin',
      'staff', 'hammer', 'flail', 'scimitar', 'rapier', 'dart', 'halberd',
      'glaive', 'pike', 'trident', 'whip', 'club', 'weapon'
    ].some(w => lower.includes(w))
  }

  const resolveEquipmentType = (type, qty = 1) => {
    const prefix = qty > 1 ? `${qty}x ` : ''
    switch (type) {
      case 'weaponMartial':
        return qty > 1 ? '2 Martial Weapons (Longswords)' : 'Martial Weapon (Longsword)'
      case 'weaponMartialMelee':
        return qty > 1 ? '2 Martial Melee Weapons (Greataxes)' : 'Martial Melee Weapon (Greataxe)'
      case 'weaponSimple':
        return qty > 1 ? '2 Simple Weapons (Handaxes)' : 'Simple Weapon (Shortbow)'
      case 'weaponSimpleMelee':
        return qty > 1 ? '2 Simple Melee Weapons (Clubs)' : 'Simple Melee Weapon (Club)'
      case 'focusSpellcastingArcane':
        return 'Arcane Focus (Wand)'
      case 'focusSpellcastingHoly':
        return 'Holy Symbol'
      case 'focusSpellcastingDruid':
      case 'focusSpellcastingDruidic':
        return 'Druidic Focus'
      case 'instrumentMusical':
        return 'Musical Instrument (Lute)'
      case 'toolArtisan':
        return "Artisan's Tools"
      default:
        return `${prefix}${type}`
    }
  }

  const parseClassEquipmentList = (rawList) => {
    const items = []
    let gold = 0
    for (const entry of (rawList || [])) {
      if (typeof entry === 'string') {
        const clean = clean5eToolsMarkup(entry).split('|')[0].trim()
        const gpMatch = clean.match(/^(\d+)\s*gp$/i)
        if (gpMatch) {
          gold += parseInt(gpMatch[1], 10)
          continue
        }
        if (clean) {
          const name = clean.replace(/\b\w/g, l => l.toUpperCase())
          const isArmor = isLikelyArmor(name)
          const isWeapon = isLikelyWeapon(name)
          items.push({
            name,
            weight: lookupItemWeight(name),
            amount: 1,
            status: (isArmor || isWeapon) ? 'equipped' : 'inventory',
            is_armor: isArmor
          })
        }
      } else if (typeof entry === 'object' && entry) {
        if (entry.value != null || entry.containsValue != null) {
          gold += Math.floor((entry.value || entry.containsValue) / 100)
        } else {
          let name = ''
          let qty = Number(entry.quantity) || 1
          if (entry.equipmentType) {
            name = resolveEquipmentType(entry.equipmentType, qty)
          } else if (entry.item) {
            const clean = clean5eToolsMarkup(entry.displayName || entry.item).split('|')[0].trim()
            const gpMatch = clean.match(/^(\d+)\s*gp$/i)
            if (gpMatch) {
              gold += parseInt(gpMatch[1], 10) * qty
              continue
            }
            name = clean.replace(/\b\w/g, l => l.toUpperCase())
          } else if (entry.special) {
            const clean = clean5eToolsMarkup(entry.special).replace(/\b\w/g, l => l.toUpperCase()).trim()
            const gpMatch = clean.match(/^(\d+)\s*gp$/i)
            if (gpMatch) {
              gold += parseInt(gpMatch[1], 10) * qty
              continue
            }
            name = clean
          }
          if (name) {
            const isArmor = isLikelyArmor(name)
            const isWeapon = isLikelyWeapon(name)
            items.push({
              name,
              weight: lookupItemWeight(name),
              amount: qty,
              status: (isArmor || isWeapon) ? 'equipped' : 'inventory',
              is_armor: isArmor
            })
          }
        }
      }
    }
    return { items, gold }
  }

  const classEquipmentChoices = computed(() => {
    let startingEq = characterClass.value?.class?.startingEquipment
    if (!startingEq) return []
    if (typeof startingEq === 'string') {
      try { startingEq = JSON.parse(startingEq) } catch (e) { return [] }
    }
    const defaultData = startingEq.defaultData
    if (!Array.isArray(defaultData)) return []

    const choices = []
    defaultData.forEach((rowObj, rowIdx) => {
      if (!rowObj || typeof rowObj !== 'object') return
      const keys = Object.keys(rowObj).filter(k => k !== '_')
      if (keys.length === 0) return

      keys.sort((x, y) => x.localeCompare(y))

      const options = keys.map((key) => {
        const parsed = parseClassEquipmentList(rowObj[key])
        const itemDesc = parsed.items.map(it => (it.amount > 1 ? `${it.amount}x ` : '') + it.name).join(', ')
        let description = ''
        if (itemDesc && parsed.gold > 0) {
          description = `${itemDesc} + ${parsed.gold} GP`
        } else if (itemDesc) {
          description = itemDesc
        } else if (parsed.gold > 0) {
          description = `${parsed.gold} GP (Starting Gold)`
        } else {
          description = 'Standard Kit'
        }

        return {
          key: key.toLowerCase(),
          rawKey: key,
          title: description,
          description,
          items: parsed.items,
          gold: parsed.gold
        }
      })

      const choiceNumber = choices.length + 1
      let label = `Equipment Choice #${choiceNumber}`
      if (startingEq.default && Array.isArray(startingEq.default) && startingEq.default[rowIdx]) {
        const cleanDesc = clean5eToolsMarkup(startingEq.default[rowIdx])
        if (cleanDesc && cleanDesc.length < 80) {
          label = cleanDesc
        }
      } else if (defaultData.length === 1) {
        label = 'Class Equipment Package'
      }

      choices.push({
        id: `class_eq_choice_${rowIdx}`,
        rowIdx,
        label,
        options,
        defaultKey: options[0]?.key || 'a'
      })
    })

    return choices
  })

  const fixedClassItems = computed(() => {
    let startingEq = characterClass.value?.class?.startingEquipment
    if (!startingEq) return []
    if (typeof startingEq === 'string') {
      try { startingEq = JSON.parse(startingEq) } catch (e) { return [] }
    }
    if (!Array.isArray(startingEq.defaultData)) return []
    const fixed = []
    startingEq.defaultData.forEach((rowObj) => {
      if (rowObj && rowObj._) {
        const parsed = parseClassEquipmentList(rowObj._)
        if (parsed.items.length) {
          fixed.push(...parsed.items)
        }
      }
    })
    return fixed
  })

  watch(classEquipmentChoices, (choices) => {
    for (const ch of choices) {
      if (!chosenClassEquipmentChoices[ch.id]) {
        chosenClassEquipmentChoices[ch.id] = ch.defaultKey || 'a'
      }
    }
  }, { immediate: true })

  const bgEquipmentChoices = computed(() => {
    const bg = selectedBackgroundObj.value
    if (!bg) return []
    const choices = []

    if (Array.isArray(bg.startingEquipment)) {
      bg.startingEquipment.forEach((eqObj, idx) => {
        if (!eqObj) return
        const hasA = Boolean(eqObj.a || eqObj.A)
        const hasB = Boolean(eqObj.b || eqObj.B)
        if (hasA && hasB) {
          const parseList = (listRaw) => {
            const items = []
            let gold = 0
            for (const it of (listRaw || [])) {
              if (typeof it === 'string') {
                const clean = clean5eToolsMarkup(it).split('|')[0].trim()
                if (clean) items.push(clean)
              } else if (typeof it === 'object' && it) {
                if (it.item) {
                  const clean = clean5eToolsMarkup(it.displayName || it.item).split('|')[0].trim()
                  if (clean) items.push(clean)
                } else if (it.special) {
                  const qty = it.quantity ? `${it.quantity} ` : ''
                  items.push(`${qty}${it.special}`.trim())
                }
                if (it.value != null) gold = Math.floor(it.value / 100)
                else if (it.containsValue != null) gold = Math.floor(it.containsValue / 100)
              }
            }
            return { items, gold }
          }

          const optA = parseList(eqObj.a || eqObj.A)
          const optB = parseList(eqObj.b || eqObj.B)

          const formatOptLabel = (opt) => {
            const parts = []
            if (opt.items.length) parts.push(opt.items.join(', '))
            if (opt.gold) parts.push(`${opt.gold} GP`)
            return parts.join(' + ') || 'Default'
          }

          choices.push({
            id: `eq_choice_${idx}`,
            label: `Background Equipment Choice #${idx + 1}`,
            optionA: { key: 'a', label: formatOptLabel(optA), items: optA.items, gold: optA.gold },
            optionB: { key: 'b', label: formatOptLabel(optB), items: optB.items, gold: optB.gold }
          })
        }
      })
    }

    if (choices.length === 0) {
      const details = typeof parseBackgroundDetails === 'function' ? parseBackgroundDetails(bg) : parseBgDetails(bg, { chosenBgEquipmentChoices, selectedEdition: selectedEdition.value, bgEquipmentChoices: bgEquipmentChoices.value })
      const eqText = details?.equipmentText || ''
      const orMatch = eqText.match(/a\s+([a-zA-Z\s]+?)\s+or\s+([a-zA-Z\s]+?)(?:,|\s+stuffed|\s+and|\.|$)/i)
      if (choices.length === 0 && orMatch) {
        const item1 = orMatch[1].trim()
        const item2 = orMatch[2].trim()
        if (item1.length > 2 && item2.length > 2 && !item1.toLowerCase().includes('clothes')) {
          choices.push({
            id: 'eq_choice_text_or',
            label: 'Gear Choice',
            optionA: { key: 'a', label: item1, items: [item1], gold: 0 },
            optionB: { key: 'b', label: item2, items: [item2], gold: 0 }
          })
        }
      }
    }

    return choices
  })

  watch(bgEquipmentChoices, (choices) => {
    for (const ch of choices) {
      if (!chosenBgEquipmentChoices[ch.id]) {
        chosenBgEquipmentChoices[ch.id] = 'a'
      }
    }
  }, { immediate: true })

  const defaultStartingGold = computed(() => {
    const cName = (characterClass.value?.class?.name || classSelected.value || '').toLowerCase()
    if (selectedEdition.value === '2024') return 50
    return CLASS_STARTING_GOLD[cName] || 100
  })

  const resetStartingGold = () => {
    customStartingGold.value = defaultStartingGold.value
    if (errors) delete errors.equipmentGold
  }

  watch([() => characterClass.value?.class?.name, selectedEdition], () => {
    if (isEditMode.value) return
    customStartingGold.value = defaultStartingGold.value
  }, { immediate: true })

  const computedPackageEquipment = computed(() => {
    const cName = (characterClass.value?.class?.name || classSelected.value || '').toLowerCase()
    const rawList = []

    if (classEquipmentChoices.value.length > 0 || fixedClassItems.value.length > 0) {
      for (const ch of classEquipmentChoices.value) {
        const chosenKey = chosenClassEquipmentChoices[ch.id] || ch.defaultKey
        const opt = ch.options.find(o => o.key === chosenKey) || ch.options[0]
        if (opt?.items?.length) {
          rawList.push(...opt.items.map(it => ({ ...it })))
        }
      }
      if (fixedClassItems.value.length > 0) {
        rawList.push(...fixedClassItems.value.map(it => ({ ...it })))
      }
    } else {
      const baseItems = CLASS_DEFAULT_EQUIPMENT[cName] || [
        { name: 'Dagger', weight: '1', amount: 1, status: 'equipped', is_armor: false },
        { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false }
      ]
      rawList.push(...baseItems.map(it => ({ ...it })))
    }

    for (const t of (chosenClassTools?.value || []).filter(Boolean)) {
      rawList.push({ name: t, weight: '2', amount: 1, status: 'inventory', is_armor: false })
    }
    for (const t of (chosenBgTools?.value || []).filter(Boolean)) {
      rawList.push({ name: t, weight: '2', amount: 1, status: 'inventory', is_armor: false })
    }

    const bg = selectedBackgroundObj.value
    if (bg) {
      const bgDetails = typeof parseBackgroundDetails === 'function' ? parseBackgroundDetails(bg) : parseBgDetails(bg, { chosenBgEquipmentChoices, selectedEdition: selectedEdition.value, bgEquipmentChoices: bgEquipmentChoices.value })
      if (bgDetails?.bgStartingItems?.length) {
        for (const itName of bgDetails.bgStartingItems) {
          rawList.push({ name: itName, weight: lookupItemWeight(itName), amount: 1, status: 'inventory', is_armor: false })
        }
      }
    }

    rawList.push({ name: 'Clothes, Common', weight: '3', amount: 1, status: 'inventory', is_armor: false })
    rawList.push({ name: 'Pouch', weight: '1', amount: 1, status: 'inventory', is_armor: false })

    const unpackedList = []
    for (const item of rawList) {
      unpackedList.push(...unpackEquipmentItem(item))
    }

    return consolidateItems(unpackedList)
  })

  // User Custom Equipment State & Compendium Picker
  const userEquipmentList = ref([])

  const syncDefaultEquipment = (force = false) => {
    if (force || userEquipmentList.value.length === 0) {
      userEquipmentList.value = computedPackageEquipment.value.map(it => ({ ...it }))
    }
  }

  watch(computedPackageEquipment, () => {
    if (!isEditMode.value && userEquipmentList.value.length === 0) {
      syncDefaultEquipment(true)
    }
  }, { immediate: true })

  watch(equipmentChoiceMode, (newVal) => {
    if (isEditMode.value) return
    if (newVal === 'gold') {
      resetStartingGold()
    } else if (newVal === 'package') {
      if (userEquipmentList.value.length === 0) {
        syncDefaultEquipment(true)
      }
    }
  })

  const toggleWizardItemStatus = (idx) => {
    const item = userEquipmentList.value[idx]
    if (item) {
      item.status = item.status === 'equipped' ? 'inventory' : 'equipped'
    }
  }

  const changeWizardItemAmount = (idx, delta) => {
    const item = userEquipmentList.value[idx]
    if (item) {
      const cur = Number(item.amount) || 1
      item.amount = Math.max(1, cur + delta)
    }
  }

  const removeWizardItem = (idx) => {
    userEquipmentList.value.splice(idx, 1)
  }

  const isWizardCompendiumOpen = ref(false)

  const openWizardCompendium = () => {
    isWizardCompendiumOpen.value = true
  }

  const addWizardItemFromCompendium = (it) => {
    const isArmor = it.type === 'armor' || (it.name || '').toLowerCase().includes('armor') || (it.name || '').toLowerCase().includes('shield')
    const baseItem = {
      name: it.name,
      weight: String(it.weight || 0),
      amount: 1,
      status: 'inventory',
      is_armor: Boolean(isArmor),
      ac: it.ac || 0,
      dexMod: !!it.dexMod
    }
    const unpacked = unpackEquipmentItem(baseItem)
    for (const item of unpacked) {
      const existing = userEquipmentList.value.find(
        x => x.name.toLowerCase().trim() === item.name.toLowerCase().trim() && x.status === item.status
      )
      if (existing) {
        existing.amount = (Number(existing.amount) || 1) + (Number(item.amount) || 1)
      } else {
        userEquipmentList.value.push(item)
      }
    }
  }

  const computedTotalWeight = computed(() => {
    return userEquipmentList.value.reduce((acc, it) => {
      const wt = parseFloat(it.weight) || 0
      const amt = Number(it.amount) || 1
      return acc + (wt * amt)
    }, 0)
  })

  const formStrScore = computed(() => Number(strength.value) || 10)
  const computedCarryCapacity = computed(() => formStrScore.value * 15)
  const formEncumberedThreshold = computed(() => formStrScore.value * 5)
  const formHeavilyEncumberedThreshold = computed(() => formStrScore.value * 10)

  const formWeightPercent = computed(() => {
    const cap = computedCarryCapacity.value || 1
    return Math.min(100, Math.max(0, (computedTotalWeight.value / cap) * 100))
  })

  const formWeightStatus = computed(() => {
    const wt = computedTotalWeight.value
    const max = computedCarryCapacity.value
    const heavy = formHeavilyEncumberedThreshold.value
    const enc = formEncumberedThreshold.value

    if (wt > max) return 'over'
    if (wt > heavy) return 'heavy'
    if (wt > enc) return 'encumbered'
    return 'safe'
  })

  const formWeightStatusLabel = computed(() => {
    switch (formWeightStatus.value) {
      case 'over': return 'Over Capacity'
      case 'heavy': return 'Heavily Encumbered'
      case 'encumbered': return 'Encumbered'
      case 'safe':
      default: return 'Normal'
    }
  })

  const formWeightBarColor = computed(() => {
    switch (formWeightStatus.value) {
      case 'over': return 'bg-red-800'
      case 'heavy': return 'bg-amber-800'
      case 'encumbered': return 'bg-gray-700'
      case 'safe':
      default: return 'bg-gray-600'
    }
  })

  const formWeightStatusTextColor = computed(() => {
    switch (formWeightStatus.value) {
      case 'over': return 'text-red-700'
      case 'heavy': return 'text-amber-700'
      case 'encumbered': return 'text-gray-800'
      case 'safe':
      default: return 'text-gray-600'
    }
  })

  const backgroundStartingGold = computed(() => {
    const bg = selectedBackgroundObj.value
    if (!bg) return 0
    let gold = 0
    if (bg.startingEquipment) {
      for (const eqObj of (bg.startingEquipment || [])) {
        if (!eqObj) continue
        const choiceKey = chosenBgEquipmentChoices[eqObj.id] || 'a'
        const list = eqObj[choiceKey] || eqObj[choiceKey.toUpperCase()] || []
        for (const it of list) {
          if (typeof it === 'object' && it) {
            if (it.value != null) gold += Math.floor(it.value / 100)
            else if (it.containsValue != null) gold += Math.floor(it.containsValue / 100)
          }
        }
      }
    }
    if (gold === 0) {
      const bgDetails = typeof parseBackgroundDetails === 'function' ? parseBackgroundDetails(bg) : parseBgDetails(bg, { chosenBgEquipmentChoices, selectedEdition: selectedEdition.value, bgEquipmentChoices: bgEquipmentChoices.value })
      gold = bgDetails?.bgStartingGold || 0
    }
    return gold
  })

  const classStartingGold = computed(() => {
    let gold = 0
    for (const ch of classEquipmentChoices.value) {
      const chosenKey = chosenClassEquipmentChoices[ch.id] || ch.defaultKey
      const opt = ch.options.find(o => o.key === chosenKey) || ch.options[0]
      if (opt?.gold) {
        gold += opt.gold
      }
    }
    return gold
  })

  const computedTreasures = computed(() => {
    if (isEditMode.value) {
      return {
        gp: Number(customStartingGold.value != null ? customStartingGold.value : savedTreasure?.gp),
        pp: savedTreasure?.pp || 0,
        ep: savedTreasure?.ep || 0,
        sp: savedTreasure?.sp || 0,
        cp: savedTreasure?.cp || 0
      }
    }
    if (equipmentChoiceMode.value === 'gold') {
      return {
        gp: Math.max(0, Math.floor(Number(customStartingGold.value) || 0)),
        pp: 0,
        ep: 0,
        sp: 0,
        cp: 0
      }
    }

    return {
      gp: backgroundStartingGold.value + classStartingGold.value,
      pp: 0,
      ep: 0,
      sp: 0,
      cp: 0
    }
  })

  return {
    equipmentChoiceMode,
    customStartingGold,
    chosenBgEquipmentChoices,
    chosenClassEquipmentChoices,
    unpackEquipmentItem,
    consolidateItems,
    lookupItemWeight,
    isLikelyArmor,
    isLikelyWeapon,
    resolveEquipmentType,
    parseClassEquipmentList,
    classEquipmentChoices,
    fixedClassItems,
    bgEquipmentChoices,
    defaultStartingGold,
    resetStartingGold,
    computedPackageEquipment,
    userEquipmentList,
    syncDefaultEquipment,
    toggleWizardItemStatus,
    changeWizardItemAmount,
    removeWizardItem,
    isWizardCompendiumOpen,
    openWizardCompendium,
    addWizardItemFromCompendium,
    computedTotalWeight,
    formStrScore,
    computedCarryCapacity,
    formEncumberedThreshold,
    formHeavilyEncumberedThreshold,
    formWeightPercent,
    formWeightStatus,
    formWeightStatusLabel,
    formWeightBarColor,
    formWeightStatusTextColor,
    backgroundStartingGold,
    classStartingGold,
    computedTreasures,
    parseBackgroundDetails: (bg) => typeof parseBackgroundDetails === 'function' ? parseBackgroundDetails(bg) : parseBgDetails(bg, { chosenBgEquipmentChoices, selectedEdition: selectedEdition.value, bgEquipmentChoices: bgEquipmentChoices.value })
  }
}
