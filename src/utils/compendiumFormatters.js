import {
  clean5eToolsMarkup,
  formatItemPropertyNames,
  getItemCategoryAndRange
} from './textRenderer'
import { SIZE_NAMES } from './monsterFormatter'

export const FEATURE_TYPE_NAMES = {
  EI: 'Eldritch Invocation',
  MM: 'Metamagic',
  MV: 'Maneuver',
  'MV:B': 'Maneuver',
  AI: 'Artificer Infusion',
  AS: 'Arcane Shot',
  FS: 'Fighting Style',
  'FS:F': 'Fighting Style',
  'FS:B': 'Fighting Style',
  'FS:R': 'Fighting Style',
  'FS:P': 'Fighting Style',
  RN: 'Rune',
  PB: 'Pact Boon',
  OR: 'Onomancy Resonant',
  ED: 'Elemental Discipline'
}

export const ITEM_TYPE_MAP = {
  w: 'Weapon',
  weapon: 'Weapon',
  la: 'Light Armor',
  ma: 'Medium Armor',
  ha: 'Heavy Armor',
  s: 'Shield',
  armor: 'Armor',
  rg: 'Ring',
  rd: 'Rod',
  sc: 'Scroll',
  st: 'Staff',
  w_: 'Wand',
  wd: 'Wand',
  p: 'Potion',
  g: 'Adventuring Gear',
  gear: 'Adventuring Gear',
  t: 'Tool',
  tool: 'Tool',
  m: 'Melee Weapon',
  r: 'Ranged Weapon',
  vehicle: 'Vehicle',
  mount: 'Mount',
  ship: 'Ship'
}

export const CLASS_PRIMARY_FALLBACK = {
  barbarian: 'STR',
  bard: 'CHA',
  cleric: 'WIS',
  druid: 'WIS',
  fighter: 'STR or DEX',
  monk: 'DEX & WIS',
  paladin: 'STR & CHA',
  ranger: 'DEX & WIS',
  rogue: 'DEX',
  sorcerer: 'CHA',
  warlock: 'CHA',
  wizard: 'INT',
  artificer: 'INT',
  mystic: 'INT'
}

export const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const formatSkillChoices = (choices) => {
  if (!choices) return ''
  const arr = Array.isArray(choices) ? choices : [choices]
  return arr.map(c => {
    if (!c) return ''
    if (c.any) return `Choose any ${c.any} skills`
    if (c.choose) {
      const from = (c.choose.from || []).map(s => String(s).charAt(0).toUpperCase() + String(s).slice(1)).join(', ')
      return `Choose ${c.choose.count || 1} from ${from}`
    }
    return ''
  }).filter(Boolean).join('; ')
}

export const formatClassEquipment = (eq) => {
  if (!eq) return ''
  if (typeof eq === 'string') return eq
  if (Array.isArray(eq.entries)) return eq.entries.map(clean5eToolsMarkup).join(' ')
  return ''
}

export const formatSpellLevel = (level) => {
  const lvl = Number(level)
  if (lvl === 0) return 'Cantrip'
  if (lvl === 1) return '1st Level'
  if (lvl === 2) return '2nd Level'
  if (lvl === 3) return '3rd Level'
  return `${lvl}th Level`
}

export const formatFeatureType = (ft) => {
  if (!ft) return 'Optional Feature'
  const list = Array.isArray(ft) ? ft : [ft]
  const names = list.map(t => FEATURE_TYPE_NAMES[String(t).toUpperCase()] || String(t))
  return names.join(', ')
}

export const formatItemType = (item) => {
  if (!item) return 'Equipment'
  const cat = getItemCategoryAndRange(item)
  if (cat) return cat.replace(/\s*\(Range.*?\)/i, '')
  const t = item.itemType || (typeof item.type === 'string' ? item.type : '')
  if (!t) return 'Equipment'
  const key = t.toLowerCase().trim()
  return ITEM_TYPE_MAP[key] || t.charAt(0).toUpperCase() + t.slice(1)
}

export const formatItemProperties = (props, versatileDice = null, weaponName = '') => {
  if (!props) return '—'
  const formatted = formatItemPropertyNames(props, versatileDice, weaponName)
  if (formatted && formatted.length > 0) return formatted.join(', ')
  const arr = Array.isArray(props) ? props : [props]
  return arr.map(p => clean5eToolsMarkup(String(p))).filter(Boolean).join(', ') || '—'
}

export const formatRaceSize = (sz) => {
  if (!sz) return 'Medium'
  const list = Array.isArray(sz) ? sz : [sz]
  return list.map(s => SIZE_NAMES[String(s).toUpperCase()] || s).join(', ') || 'Medium'
}

export const formatRaceTraits = (traits) => {
  if (!traits) return ''
  const list = Array.isArray(traits) ? traits : [traits]
  return list.map(t => {
    if (typeof t === 'string') return clean5eToolsMarkup(t)
    if (typeof t === 'object' && t !== null) {
      return t.name || t.entry || Object.keys(t).join(', ')
    }
    return String(t)
  }).filter(Boolean).join(', ')
}

export const formatClassProf = (list) => {
  if (!list) return '—'
  const arr = Array.isArray(list) ? list : [list]
  return arr.map(item => {
    if (!item) return ''
    if (typeof item === 'object') {
      if (item.choose) {
        const from = (item.choose.from || []).map(formatClassProf).join(', ')
        return `Choose ${item.choose.count || 1} from ${from}`
      }
      return Object.keys(item).map(clean5eToolsMarkup).join(', ')
    }
    const cleaned = clean5eToolsMarkup(String(item))
    return cleaned.replace(/\b([a-zA-Z]+)\b/g, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
  }).filter(Boolean).join(', ') || '—'
}

export const formatMonsterLanguages = (langs) => {
  if (!langs) return '—'
  if (typeof langs === 'string') return langs
  if (Array.isArray(langs)) {
    return langs.map(l => {
      if (typeof l === 'string') return l
      if (typeof l === 'object' && l !== null) {
        return l.name || l.language || Object.keys(l).join(', ')
      }
      return String(l)
    }).filter(Boolean).join(', ') || '—'
  }
  return String(langs)
}

export const isItemCategory = (item) => {
  if (!item) return false
  return item._category === 'items' || !!item.itemType || !!item.crew || !!item.vehAc || !!item.damageDice || !!item.dmg1 || Number(item.ac || item.baseAc) > 0 || (Array.isArray(item.property) && item.property.length > 0)
}

export const getItemBadge = (item) => {
  if (!item) return ''
  if (item._category === 'classes') {
    return 'Class'
  }
  if (item._category === 'races') {
    return 'Species / Race'
  }
  if (item._category === 'backgrounds') {
    return 'Background'
  }
  if (item._category === 'monsters' || item.cr !== undefined) {
    return `CR ${item.cr ?? '—'}`
  }
  const featType = item.featureType || item.feature_type
  if (item._category === 'optionalfeatures' || featType) {
    return formatFeatureType(featType)
  }
  if (item._category === 'spells' || item.level !== undefined) {
    return formatSpellLevel(item.level)
  }
  if (item._category === 'items' || item.itemType || item.damageDice || item.ac || item.vehAc || item.vehHp || item.crew) {
    const typeStr = typeof item.type === 'object' && item.type !== null ? (item.type.type || '') : (item.type || '')
    const rawT = String(item.itemType || typeStr).toLowerCase()
    if (rawT === 'vehicle' || item.vehAc || item.vehHp || item.crew) return 'Vehicle'
    if (rawT === 'mount') return 'Mount'
    if (rawT === 'wondrous') return 'Wondrous Item'
    if (rawT === 'consumable') return 'Consumable'
    if (rawT === 'weapon') return 'Weapon'
    if (rawT === 'armor') return 'Armor'
    if (rawT === 'tool') return 'Tool'
    if (rawT === 'gear') return 'Gear'
    return item.itemType || typeStr || 'Item'
  }
  if (item._category === 'rules') {
    const rawC = String(item.category || item.type || '').toLowerCase()
    if (['ship', 'vehicle', 'spelljammer', 'elemental_airship', 'air', 'infwar'].includes(rawC) || item.vehAc || item.vehHp || item.crew) return 'Vehicle'
    return item.category || item.type || 'Rule'
  }
  if (item._category === 'feats') {
    const catMap = { O: 'Origin Feat', G: 'General Feat', FS: 'Fighting Style Feat', EB: 'Epic Boon Feat' }
    return catMap[item.category] || (item.category ? `${item.category} Feat` : 'Feat')
  }
  if (featType) {
    return formatFeatureType(featType)
  }
  if (item._category === 'optionalfeatures' || item._category === 'optfeatures') {
    return 'Feature'
  }
  if (item.prerequisite && item._category !== 'rules') {
    return 'Feat'
  }
  return item.type || item.category || 'Rule'
}

export const formatRaceSpeed = (item) => {
  if (!item) return '30 ft.'
  const parts = []
  if (item.speed) parts.push(`${item.speed} ft.`)
  if (Number(item.flySpeed) > 0) parts.push(`fly ${item.flySpeed} ft.`)
  if (Number(item.swimSpeed) > 0) parts.push(`swim ${item.swimSpeed} ft.`)
  if (Number(item.climbSpeed) > 0) parts.push(`climb ${item.climbSpeed} ft.`)
  return parts.join(', ') || '30 ft.'
}

export const formatPrimaryAbility = (pa, className = '') => {
  if (!pa || (Array.isArray(pa) && pa.length === 0)) {
    const cName = String(className || '').toLowerCase().trim()
    return CLASS_PRIMARY_FALLBACK[cName] || '—'
  }
  if (Array.isArray(pa)) {
    return pa.map(obj => {
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).map(k => k.toUpperCase()).join(' or ')
      }
      return String(obj).toUpperCase()
    }).join(' / ')
  }
  return String(pa)
}
