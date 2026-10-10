import { clean5eToolsMarkup } from './textRenderer'

export const strip5eTags = (text) => {
  if (!text) return ''
  return text
    .replace(/\{@item ([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\{@filter ([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\{@skill ([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\{@feat ([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
}

export const parseBackgroundDetails = (
  bg,
  {
    chosenBgEquipmentChoices = {},
    selectedEdition = '2024',
    bgEquipmentChoices = []
  } = {}
) => {
  if (!bg) return null

  const safeEntries = Array.isArray(bg.entries)
    ? bg.entries
    : (typeof bg.entries === 'string' ? JSON.parse(bg.entries || '[]') : [])

  let featName = ''
  if (bg.feats && bg.feats.length > 0) {
    const f = bg.feats[0]
    const raw = typeof f === 'string' ? f : Object.keys(f)[0]
    const base = raw.split('|')[0].split(';')[0].trim()
    featName = base.replace(/\b\w/g, l => l.toUpperCase())
  }

  let listSkills = ''
  let listTools = ''
  let listLanguages = ''
  let listEquipment = ''
  let listAbility = ''
  let listFeat = ''

  const list = safeEntries.find(e => e && e.type === 'list')
  if (list && Array.isArray(list.items)) {
    for (const it of list.items) {
      const name = (it.name || '').toLowerCase()
      const entry = strip5eTags(it.entry || '')
      if (name.includes('skill')) listSkills = entry
      else if (name.includes('tool')) listTools = entry
      else if (name.includes('language')) listLanguages = entry
      else if (name.includes('equipment')) listEquipment = entry
      else if (name.includes('ability')) listAbility = entry
      else if (name.includes('feat')) listFeat = entry
    }
  }

  if (!featName && listFeat) featName = listFeat

  let abilityText = listAbility
  if (!abilityText && bg.ability && bg.ability.length > 0) {
    const fromAbils = bg.ability[0]?.choose?.weighted?.from || []
    if (fromAbils.length > 0) {
      abilityText = fromAbils.map(a => a.toUpperCase()).join(' / ')
    }
  }

  let featureName = ''
  let featureEntries = []
  const featEntry = safeEntries.find(e => e && (e.data?.isFeature || (typeof e.name === 'string' && /^feature:/i.test(e.name))))
  if (featEntry) {
    featureName = clean5eToolsMarkup((featEntry.name || '').replace(/^feature:\s*/i, 'Feature: '))
    if (Array.isArray(featEntry.entries)) {
      featureEntries = featEntry.entries
        .map(e => typeof e === 'string' ? e : (typeof e?.entry === 'string' ? e.entry : ''))
        .filter(Boolean)
    }
  }

  let skills = []
  if (listSkills) {
    skills = listSkills.split(/,\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean)
  } else if (bg.skillProficiencies && bg.skillProficiencies.length > 0) {
    const s = bg.skillProficiencies[0]
    skills = Object.keys(s).map(k => k.charAt(0).toUpperCase() + k.slice(1))
  }

  let toolsText = listTools
  if (!toolsText && Array.isArray(bg.toolProficiencies) && bg.toolProficiencies.length > 0) {
    const parts = []
    for (const tp of bg.toolProficiencies) {
      if (!tp || typeof tp !== 'object') continue
      if (tp.anyArtisansTool) {
        parts.push("One type of artisan's tools")
      } else if (tp.anyMusicalInstrument) {
        parts.push("One musical instrument")
      } else if (tp.anyGamingSet) {
        parts.push("One gaming set")
      } else if (tp.choose?.from) {
        const fromList = tp.choose.from.map(f => {
          const fl = f.toLowerCase()
          if (fl === 'anyartisanstool' || fl.includes('artisan')) return "artisan's tools"
          if (fl === 'anymusicalinstrument' || fl.includes('musical instrument')) return "musical instrument"
          if (fl === 'anygamingset' || fl.includes('gaming set')) return "gaming set"
          return f.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        })
        parts.push(`One of: ${fromList.join(', ')}`)
      } else {
        Object.keys(tp).forEach(k => {
          if (tp[k] === true) {
            parts.push(k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
          }
        })
      }
    }
    toolsText = parts.join(', ')
  }

  let languagesText = listLanguages
  if (!languagesText && bg.languageProficiencies && bg.languageProficiencies.length > 0) {
    const lp = bg.languageProficiencies[0]
    if (lp.anyStandard) languagesText = `${lp.anyStandard} of your choice`
  }

  let bgStartingItems = []
  let bgPackageGold = 0
  let foundGoldInStartingEquipment = false
  if (Array.isArray(bg.startingEquipment) && bg.startingEquipment.length > 0) {
    for (let eqIdx = 0; eqIdx < bg.startingEquipment.length; eqIdx++) {
      const eqObj = bg.startingEquipment[eqIdx]
      if (!eqObj) continue
      const choiceId = `eq_choice_${eqIdx}`
      const chosenKey = chosenBgEquipmentChoices[choiceId] || 'a'

      let listRaw = []
      if ((eqObj.a || eqObj.A) && (eqObj.b || eqObj.B)) {
        listRaw = chosenKey === 'b' ? (eqObj.b || eqObj.B) : (eqObj.a || eqObj.A)
      } else {
        listRaw = eqObj._ || eqObj.a || eqObj.A || []
      }

      for (const it of (listRaw || [])) {
        if (typeof it === 'string') {
          const clean = clean5eToolsMarkup(it).split('|')[0].trim()
          const gpMatch = clean.match(/^(\d+)\s*gp$/i)
          if (gpMatch) {
            bgPackageGold += parseInt(gpMatch[1], 10)
            foundGoldInStartingEquipment = true
            continue
          }
          if (clean) bgStartingItems.push(clean)
        } else if (typeof it === 'object' && it) {
          if (it.value != null || it.containsValue != null) {
            bgPackageGold += Math.floor((it.value || it.containsValue) / 100)
            foundGoldInStartingEquipment = true
          } else {
            let itemName = ''
            if (it.item) {
              const clean = clean5eToolsMarkup(it.displayName || it.item).split('|')[0].trim()
              const gpMatch = clean.match(/^(\d+)\s*gp$/i)
              if (gpMatch) {
                bgPackageGold += parseInt(gpMatch[1], 10) * (Number(it.quantity) || 1)
                foundGoldInStartingEquipment = true
                continue
              }
              itemName = clean
            } else if (it.special) {
              const clean = clean5eToolsMarkup(it.special).trim()
              const gpMatch = clean.match(/^(\d+)\s*gp$/i)
              if (gpMatch) {
                bgPackageGold += parseInt(gpMatch[1], 10) * (Number(it.quantity) || 1)
                foundGoldInStartingEquipment = true
                continue
              }
              const qty = it.quantity ? `${it.quantity} ` : ''
              itemName = `${qty}${clean}`.trim()
            }
            if (itemName) bgStartingItems.push(itemName)
          }
        }
      }
    }
  }

  if (!foundGoldInStartingEquipment) {
    const textGpMatch = (listEquipment || '').match(/(\d+)\s*gp/i)
    if (textGpMatch) {
      bgPackageGold += parseInt(textGpMatch[1], 10)
    } else {
      bgPackageGold = (selectedEdition === '2024' || selectedEdition?.value === '2024') ? 16 : 15
    }
  }

  const orChoiceKey = chosenBgEquipmentChoices['eq_choice_text_or']
  if (orChoiceKey === 'b') {
    const orChoice = (bgEquipmentChoices?.value || bgEquipmentChoices || []).find(c => c.id === 'eq_choice_text_or')
    if (orChoice?.optionB?.items) bgStartingItems.push(...orChoice.optionB.items)
  } else if (orChoiceKey === 'a') {
    const orChoice = (bgEquipmentChoices?.value || bgEquipmentChoices || []).find(c => c.id === 'eq_choice_text_or')
    if (orChoice?.optionA?.items) bgStartingItems.push(...orChoice.optionA.items)
  }

  return {
    featName,
    abilityText,
    featureName,
    featureEntries,
    skills,
    skillsText: listSkills || skills.join(', '),
    toolsText,
    languagesText,
    equipmentText: listEquipment,
    bgStartingItems,
    bgPackageGold
  }
}
