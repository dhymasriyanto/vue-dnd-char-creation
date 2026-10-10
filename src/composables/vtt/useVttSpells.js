import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { renderAnnotatedText, renderTableCell } from '../../utils/textRenderer'

export function useVttSpells({
  char,
  vtt,
  API_URL,
  activeTab,
  charClassName,
  hasCharClass,
  charSpells,
  classSpells,
  featSpells,
  sheetCantrips,
  sheetLeveledSpells,
  charCasterMod,
  charSpellAttackBonus,
  expendedSlots,
  expendedFeatFreeCasts,
  rollDice,
  rollFormula,
  setRollResult,
  toggleFeature,
  expandedFeatures
}) {
  const fullCasterTable = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]

  const halfCasterTable = [
    [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
    [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
  ]

  const sheetSpellSlots = computed(() => {
    const c = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    const lvl = Math.min(20, Math.max(1, Number(char.value?.level || 1)))

    const warlLvl = c === 'warlock' ? lvl : 0
    let pactEntry = null
    if (warlLvl > 0) {
      const pactSlots = warlLvl >= 17 ? 4 : (warlLvl >= 11 ? 3 : (warlLvl >= 2 ? 2 : 1))
      const pactLvl = Math.min(5, Math.ceil(warlLvl / 2))
      pactEntry = { level: pactLvl, total: pactSlots, isPact: true }
    }

    let arr = []
    const hasClass = (cn) => typeof hasCharClass === 'function' ? hasCharClass(cn) : false

    if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard'].includes(c) || hasClass('wizard') || hasClass('cleric') || hasClass('druid') || hasClass('sorcerer') || hasClass('bard')) {
      arr = fullCasterTable[lvl - 1] || []
    } else if (['paladin', 'ranger', 'artificer'].includes(c) || hasClass('paladin') || hasClass('ranger') || hasClass('artificer')) {
      if (char.value?.edition === '2014' && (c === 'paladin' || c === 'ranger') && lvl === 1) {
        arr = []
      } else {
        arr = halfCasterTable[lvl - 1] || []
      }
    }

    const standardSlots = arr.map((qty, idx) => ({ level: idx + 1, total: qty }))
    if (pactEntry) {
      const existing = standardSlots.find(s => s.level === pactEntry.level)
      if (existing) {
        existing.total += pactEntry.total
        existing.isPact = true
      } else {
        standardSlots.push(pactEntry)
        standardSlots.sort((a, b) => a.level - b.level)
      }
    }

    return standardSlots
  })

  const isSlotExpended = (lvl, slotIdx) => {
    return Boolean(expendedSlots?.value?.[`${lvl}_${slotIdx}`])
  }

  const isSlotDisabled = () => false

  const toggleSlot = (lvl, slotIdx) => {
    const key = `${lvl}_${slotIdx}`
    if (expendedSlots?.value) {
      expendedSlots.value[key] = !expendedSlots.value[key]
    }
  }
  const toggleSlotUse = toggleSlot

  const allSpellLevels = computed(() => {
    return (sheetSpellSlots.value || []).filter(s => s.total > 0).map(s => s.level)
  })

  const getMaxSlots = (lvl) => {
    const s = (sheetSpellSlots.value || []).find(slot => slot.level === Number(lvl))
    return s ? s.total : 0
  }

  const getAvailableSlots = (lvl) => {
    const max = getMaxSlots(lvl)
    let count = 0
    for (let i = 1; i <= max; i++) {
      if (!isSlotExpended(lvl, i)) count++
    }
    return count
  }

  const restoreAllSlots = () => {
    if (expendedSlots?.value) expendedSlots.value = {}
    if (expendedFeatFreeCasts?.value) expendedFeatFreeCasts.value = {}
  }

  const isFeatCastExpended = (sp) => {
    const key = sp?.name || sp?.id
    return Boolean(expendedFeatFreeCasts?.value?.[key])
  }

  const toggleFeatFreeCast = (sp) => {
    const key = sp?.name || sp?.id
    if (expendedFeatFreeCasts?.value) {
      expendedFeatFreeCasts.value[key] = !expendedFeatFreeCasts.value[key]
    }
  }

  const activeSpellsByLevel = computed(() => {
    const levels = new Set()
    const leveled = sheetLeveledSpells?.value || []
    leveled.forEach(s => {
      const l = Number(s.level)
      if (l > 0) levels.add(l)
    })
    allSpellLevels.value.forEach(l => levels.add(l))
    return Array.from(levels).sort((a, b) => a - b)
  })

  const getSpellsAtLevel = (lvl) => {
    const leveled = sheetLeveledSpells?.value || []
    return leveled.filter(s => Number(s.level) === Number(lvl))
  }

  const expandedSpells = ref({})
  const toggleSpell = (spell) => {
    const rawKey = spell?.id || spell?.name
    if (!rawKey) return
    expandedSpells.value[rawKey] = !expandedSpells.value[rawKey]
    if (expandedSpells.value[rawKey]) {
      fetchSpellDetailsIfNeeded(spell)
    }
  }

  // --- Caching and Fetching Spell Details ---
  const cachedSpellDetails = ref({})
  const isFetchingSpell = ref({})

  const fetchSpellDetailsIfNeeded = async (spell) => {
    const sName = spell?.name
    if (!sName) return
    const key = sName.trim().toLowerCase()
    if (cachedSpellDetails.value[key] || isFetchingSpell.value[key]) return

    const hasEntries = Array.isArray(spell.entries) && spell.entries.length > 0
    if (hasEntries) return

    isFetchingSpell.value[key] = true
    try {
      const edition = char.value?.edition || '2024'
      const res = await axios.get(`${API_URL}/compendium/spells?edition=${edition}&search=${encodeURIComponent(sName)}`)
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      const match = list.find(s => (s.name || '').trim().toLowerCase() === key) || list[0]
      if (match) {
        cachedSpellDetails.value[key] = {
          ...match,
          entries: typeof match.entries === 'string' ? JSON.parse(match.entries) : (match.entries || []),
          entriesHigherLevel: typeof match.higher_levels === 'string' ? JSON.parse(match.higher_levels) : (match.higher_levels || match.entriesHigherLevel || [])
        }
      }
    } catch (err) {
      console.error('Failed to fetch spell detail for', sName, err)
    } finally {
      isFetchingSpell.value[key] = false
    }
  }

  const getFullSpell = (sp) => {
    const key = (sp?.name || '').trim().toLowerCase()
    const fetched = cachedSpellDetails.value[key]
    if (fetched) {
      return { ...sp, ...fetched }
    }
    return sp || {}
  }

  const getSpellCastingTime = (sp) => {
    const full = getFullSpell(sp)
    if (full.time && Array.isArray(full.time) && full.time.length > 0) {
      const t = full.time[0]
      return `${t.number || 1} ${t.unit}${t.condition ? ` (${t.condition})` : ''}`
    }
    return sp.castingTime || sp.casting_time || '1 Action'
  }

  const getSpellRange = (sp) => {
    const full = getFullSpell(sp)
    if (full.range?.distance) {
      const d = full.range.distance
      return `${d.amount ? `${d.amount} ` : ''}${d.type}`
    }
    return sp.range || 'Self'
  }

  const getSpellDuration = (sp) => {
    const full = getFullSpell(sp)
    if (full.duration && Array.isArray(full.duration) && full.duration.length > 0) {
      const d = full.duration[0]
      if (d.type === 'instant') return 'Instantaneous'
      if (d.type === 'timed') {
        const conc = d.concentration ? 'Concentration, up to ' : ''
        return `${conc}${d.duration?.amount || ''} ${d.duration?.type || ''}`
      }
      return d.type
    }
    return 'Instantaneous'
  }

  const getSpellComponents = (sp) => {
    const full = getFullSpell(sp)
    if (full.components && typeof full.components === 'string') return full.components
    if (full.components && typeof full.components === 'object') {
      const parts = []
      if (full.components.v) parts.push('V')
      if (full.components.s) parts.push('S')
      if (full.components.m) parts.push('M')
      return parts.join(', ') || 'V, S'
    }
    return 'V, S'
  }

  const getSpellEntries = (sp) => {
    const full = getFullSpell(sp)
    if (Array.isArray(full.entries)) return full.entries
    if (typeof full.entries === 'string') {
      try {
        const parsed = JSON.parse(full.entries)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return [full.entries]
      }
    }
    return []
  }

  const getSpellHigherLevels = (sp) => {
    const full = getFullSpell(sp)
    const hl = full.entriesHigherLevel || full.higher_levels
    if (Array.isArray(hl)) return hl
    if (typeof hl === 'string') {
      try {
        const parsed = JSON.parse(hl)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return [hl]
      }
    }
    return []
  }

  const formatSpellEntry = (ent) => {
    if (ent == null) return ''
    if (typeof ent === 'string') return ent
    if (typeof ent === 'object') {
      if (ent.name && ent.entries) {
        return `<strong>${ent.name}.</strong> ` + (Array.isArray(ent.entries) ? ent.entries.map(formatSpellEntry).join(' ') : ent.entries)
      }
      if (ent.type === 'list' && Array.isArray(ent.items)) {
        return '• ' + ent.items.map(it => typeof it === 'string' ? it : (it.entry || '')).join('\n• ')
      }
      if (Array.isArray(ent.entries)) {
        return ent.entries.map(formatSpellEntry).join(' ')
      }
    }
    return String(ent)
  }

  const extractSpellMechanics = (sp, charLevel = 1, spellMod = 0) => {
    const full = getFullSpell(sp)
    const entries = getSpellEntries(sp)
    const textBody = entries.map(e => {
      if (typeof e === 'string') return e
      if (typeof e === 'object' && e.entries) return Array.isArray(e.entries) ? e.entries.join(' ') : String(e.entries)
      return ''
    }).join(' ')

    const hasAttack = /spell attack/i.test(textBody) ||
      (Array.isArray(full?.spellAttack) && full.spellAttack.length > 0) ||
      Boolean(sp?.hasAttack)

    let saveAbility = null
    const saveMatch = textBody.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throw/i)
    if (saveMatch) {
      saveAbility = saveMatch[1].toLowerCase()
    } else if (Array.isArray(full?.savingThrow) && full.savingThrow.length > 0) {
      const m = full.savingThrow[0]
      const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }
      saveAbility = map[m.toLowerCase()] || m.toLowerCase()
    }

    const isHeal = /regains?\s+(hit\s+points|\d+d\d+)/i.test(textBody) || /heals?/i.test(textBody)
    let diceFormula = null
    const diceObj = (full.damageInflicted || full.damageResist || full.damageImmunity || {})?.[0] || null

    if (diceObj?.scaling) {
      const lvl = Number(charLevel) || 1
      if (lvl >= 17 && diceObj.scaling['17']) diceFormula = diceObj.scaling['17']
      else if (lvl >= 11 && diceObj.scaling['11']) diceFormula = diceObj.scaling['11']
      else if (lvl >= 5 && diceObj.scaling['5']) diceFormula = diceObj.scaling['5']
      else diceFormula = diceObj.scaling['1'] || Object.values(diceObj.scaling)[0]
    }

    if (!diceFormula) {
      const dMatch = textBody.match(/\{@(damage|dice)\s+([^}]+)\}/i)
      if (dMatch) {
        diceFormula = dMatch[2].split('|')[0].trim()
      }
    }

    const addModToDice = isHeal && /plus\s+your\s+spellcasting\s+ability\s+modifier|\+\s*your\s+spellcasting/i.test(textBody)
    const isUtility = !hasAttack && !saveAbility && !isHeal && !diceFormula

    return {
      hasAttack,
      saveAbility,
      isHeal,
      diceFormula,
      addModToDice,
      isUtility
    }
  }

  const isFeatSpell = (sp) => {
    return Boolean(sp?.is_from_feat || sp?.is_feat || sp?.feat_name || (featSpells?.value || []).some(f => (f.name || '').toLowerCase() === (sp.name || '').toLowerCase()))
  }

  const castSpell = (sp, useSlot = false) => {
    const cMod = typeof charCasterMod === 'function' ? charCasterMod() : (charCasterMod?.value || 0)
    const mechanics = extractSpellMechanics(sp, char.value?.level, cMod)
    const lvl = Number(sp.level) || 0
    const isFeat = isFeatSpell(sp)

    if (lvl > 0) {
      if (isFeat && !useSlot) {
        const key = sp.name || sp.id
        if (expendedFeatFreeCasts?.value) expendedFeatFreeCasts.value[key] = true
      } else if (getMaxSlots(lvl) > 0) {
        const max = getMaxSlots(lvl)
        for (let i = 1; i <= max; i++) {
          if (!isSlotExpended(lvl, i)) {
            if (expendedSlots?.value) expendedSlots.value[`${lvl}_${i}`] = true
            break
          }
        }
      }
    }
    const atkBonus = typeof charSpellAttackBonus === 'function' ? charSpellAttackBonus() : (charSpellAttackBonus?.value || 0)
    if (mechanics.hasAttack) {
      if (typeof rollDice === 'function') rollDice(`${sp.name} Attack`, atkBonus)
    } else if (mechanics.diceFormula) {
      if (mechanics.isHeal) {
        if (typeof rollFormula === 'function') rollFormula(`${sp.name} Heal`, mechanics.diceFormula, mechanics.addModToDice ? cMod : 0)
      } else {
        if (typeof rollFormula === 'function') rollFormula(`${sp.name} Damage`, mechanics.diceFormula)
      }
    } else {
      logSpellCast(sp.name)
    }
  }

  const logSpellCast = (spellName) => {
    if (typeof setRollResult === 'function') {
      setRollResult({
        label: `${spellName} Cast`,
        d20: null,
        mod: 0,
        total: 'Active',
        isNat20: false,
        isNat1: false,
        formula: 'Utility / Effect',
        breakdown: 'Cast without roll',
        timestamp: new Date().toLocaleTimeString()
      })
    }
  }

  const toggleSpellCard = (sp) => {
    const key = 'sp_' + (sp.id || sp.name)
    if (typeof toggleFeature === 'function') toggleFeature(key)
    if (expandedFeatures?.value?.[key]) {
      fetchSpellDetailsIfNeeded(sp)
    }
  }

  const renderSpellEntryHtml = (entry) => {
    if (entry == null) return ''
    if (typeof entry === 'string') return `<p class="leading-relaxed mb-1">${renderAnnotatedText(entry)}</p>`
    if (typeof entry === 'object') {
      if (entry.name && entry.entries) {
        const sub = entry.entries.map(renderSpellEntryHtml).join('')
        return `<div class="mt-1"><span class="font-bold text-gray-900">${renderAnnotatedText(entry.name)}. </span>${sub}</div>`
      }
      if (entry.type === 'list' && Array.isArray(entry.items)) {
        const items = entry.items.map(it => `<li>${renderAnnotatedText(typeof it === 'string' ? it : (it.entry || ''))}</li>`).join('')
        return `<ul class="list-disc pl-4 space-y-0.5 my-1">${items}</ul>`
      }
      if (entry.type === 'table') {
        const headers = (entry.colLabels || []).map(h => `<th class="p-1.5 font-semibold text-gray-700">${renderAnnotatedText(h)}</th>`).join('')
        const rows = (entry.rows || []).map(r => `<tr>${r.map(c => `<td class="p-1.5 text-gray-600">${renderTableCell(c)}</td>`).join('')}</tr>`).join('')
        const caption = entry.caption ? `<caption class="p-1.5 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">${entry.caption}</caption>` : ''
        return `<div class="my-2 overflow-x-auto w-full border border-gray-200 rounded max-w-full"><table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">${caption}<thead class="bg-gray-50"><tr>${headers}</tr></thead><tbody class="divide-y divide-gray-100 bg-white">${rows}</tbody></table></div>`
      }
      if (entry.entries && Array.isArray(entry.entries)) {
        return entry.entries.map(renderSpellEntryHtml).join('')
      }
    }
    return `<p class="leading-relaxed mb-1">${renderAnnotatedText(String(entry))}</p>`
  }

  const featActionSpells = computed(() => {
    return (featSpells?.value || []).filter(s => {
      const full = getFullSpell(s)
      const time = full?.time?.[0]
      const unit = time?.unit || ''
      const ct = (s.castingTime || '').toLowerCase()
      return unit !== 'bonus' && unit !== 'reaction' && !ct.includes('bonus') && !ct.includes('reaction')
    })
  })

  const bonusActionSpells = computed(() => {
    return (charSpells?.value || []).filter(s => {
      const full = getFullSpell(s)
      const time = full?.time?.[0]
      return time?.unit === 'bonus' || (s.castingTime || '').toLowerCase().includes('bonus')
    })
  })

  const reactionSpells = computed(() => {
    return (charSpells?.value || []).filter(s => {
      const full = getFullSpell(s)
      const time = full?.time?.[0]
      return time?.unit === 'reaction' || (s.castingTime || '').toLowerCase().includes('reaction')
    })
  })

  if (activeTab) {
    watch(activeTab, (newTab) => {
      if (newTab === 'actions' || newTab === 'spells') {
        (charSpells?.value || []).forEach(sp => {
          fetchSpellDetailsIfNeeded(sp)
        })
      }
    })
  }

  watch(() => charSpells?.value, (list) => {
    if ((activeTab?.value === 'actions' || activeTab?.value === 'spells') && Array.isArray(list)) {
      list.forEach(sp => fetchSpellDetailsIfNeeded(sp))
    }
  }, { immediate: true })

  return {
    fullCasterTable,
    halfCasterTable,
    sheetSpellSlots,
    isSlotExpended,
    isSlotDisabled,
    toggleSlot,
    toggleSlotUse,
    allSpellLevels,
    getMaxSlots,
    getAvailableSlots,
    restoreAllSlots,
    isFeatCastExpended,
    toggleFeatFreeCast,
    activeSpellsByLevel,
    getSpellsAtLevel,
    expandedSpells,
    toggleSpell,
    cachedSpellDetails,
    isFetchingSpell,
    fetchSpellDetailsIfNeeded,
    getFullSpell,
    getSpellCastingTime,
    getSpellRange,
    getSpellDuration,
    getSpellComponents,
    getSpellEntries,
    getSpellHigherLevels,
    formatSpellEntry,
    extractSpellMechanics,
    isFeatSpell,
    castSpell,
    logSpellCast,
    toggleSpellCard,
    renderSpellEntryHtml,
    featActionSpells,
    bonusActionSpells,
    reactionSpells
  }
}
