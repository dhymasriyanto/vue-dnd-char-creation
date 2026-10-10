export const SIZE_NAMES = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan'
}

export const formatMonsterSize = (sz) => {
  if (!sz) return 'Medium'
  const list = Array.isArray(sz) ? sz : [sz]
  return list.map(s => SIZE_NAMES[String(s).toUpperCase()] || s).join('/')
}

export const formatMonsterType = (t) => {
  if (!t) return 'humanoid'
  if (typeof t === 'string') return t
  if (Array.isArray(t)) return t.map(formatMonsterType).join(', ')
  if (typeof t === 'object') {
    let base = t.type || 'creature'
    if (typeof base === 'object' && base !== null) {
      if (Array.isArray(base.choose)) {
        base = base.choose.join(' or ')
      } else {
        base = 'creature'
      }
    }
    const tags = Array.isArray(t.tags) ? ` (${t.tags.join(', ')})` : ''
    return `${base}${tags}`
  }
  return String(t)
}

export const formatMonsterAlignment = (al) => {
  if (!al) return 'unaligned'
  if (Array.isArray(al)) {
    const map = { U: 'unaligned', A: 'any alignment', L: 'lawful', C: 'chaotic', G: 'good', E: 'evil', N: 'neutral' }
    return al.map(a => map[a] || a).join(' ')
  }
  return String(al)
}

export const formatMonsterAc = (ac) => {
  if (!ac) return '10'
  if (Array.isArray(ac)) {
    if (ac.length === 0) return '10'
    return ac.map(a => {
      if (typeof a === 'object' && a !== null) {
        if (a.special) return a.special
        const val = a.ac !== undefined ? a.ac : ''
        const from = Array.isArray(a.from) ? ` (${a.from.join(', ')})` : (a.from ? ` (${a.from})` : '')
        const cond = a.condition ? ` ${a.condition}` : ''
        const res = `${val}${from}${cond}`.trim()
        return a.braces ? `(${res})` : res
      }
      return String(a)
    }).filter(Boolean).join(', ')
  }
  if (typeof ac === 'object' && ac !== null) {
    if (ac.special) return ac.special
    const val = ac.ac !== undefined ? ac.ac : ''
    const from = Array.isArray(a.from) ? ` (${a.from.join(', ')})` : (a.from ? ` (${a.from})` : '')
    const cond = a.condition ? ` ${a.condition}` : ''
    const res = `${val}${from}${cond}`.trim()
    return ac.braces ? `(${res})` : res
  }
  return String(ac)
}

export const formatMonsterHp = (hp) => {
  if (!hp) return '10'
  if (typeof hp === 'object') {
    if (hp.special) return hp.special
    const avg = hp.average || ''
    const formula = hp.formula ? ` (${hp.formula})` : ''
    return `${avg}${formula}`.trim() || '10'
  }
  return String(hp)
}

export const formatMonsterSpeed = (spd) => {
  if (!spd) return '30 ft.'
  if (typeof spd === 'object') {
    const parts = []
    const canHover = spd.canHover
    for (const [k, v] of Object.entries(spd)) {
      if (k === 'canHover') continue
      if (typeof v === 'object' && v !== null) {
        let cond = v.condition ? ` ${v.condition}` : ''
        if (k === 'fly' && canHover && !cond.includes('hover')) {
          cond = cond ? `${cond} (hover)` : ' (hover)'
        }
        parts.push(`${k === 'walk' ? '' : `${k} `}${v.number || 30} ft.${cond}`.trim())
      } else if (typeof v === 'number' || typeof v === 'string') {
        let cond = ''
        if (k === 'fly' && canHover) {
          cond = ' (hover)'
        }
        parts.push(`${k === 'walk' ? '' : `${k} `}${v}${typeof v === 'number' ? ' ft.' : ''}${cond}`.trim())
      }
    }
    return parts.join(', ') || '30 ft.'
  }
  return String(spd)
}

export const abMod = (val) => {
  const n = Number(val) || 10
  const m = Math.floor((n - 10) / 2)
  return (m >= 0 ? '+' : '') + m
}

export const formatMonsterSaves = (saves) => {
  if (!saves || typeof saves !== 'object') return ''
  return Object.entries(saves).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
}

export const formatMonsterSkills = (skills) => {
  if (!skills || typeof skills !== 'object') return ''
  return Object.entries(skills).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`).join(', ')
}

export const XP_BY_CR = {
  '0': '10', '1/8': '25', '1/4': '50', '1/2': '100',
  '1': '200', '2': '450', '3': '700', '4': '1,100', '5': '1,800',
  '6': '2,300', '7': '2,900', '8': '3,900', '9': '5,000', '10': '5,900',
  '11': '7,200', '12': '8,400', '13': '10,000', '14': '11,500', '15': '13,000',
  '16': '15,000', '17': '18,000', '18': '20,000', '19': '22,000', '20': '25,000',
  '21': '33,000', '22': '41,000', '23': '50,000', '24': '62,000', '25': '75,000',
  '26': '90,000', '27': '105,000', '28': '120,000', '29': '135,000', '30': '155,000'
}

export const getMonsterXp = (cr) => {
  return XP_BY_CR[String(cr)] || '—'
}

export const formatMonsterDefenses = (def) => {
  if (!def) return ''
  if (typeof def === 'string') return def
  if (Array.isArray(def)) {
    return def.map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null) {
        if (item.special) return item.special
        const sub = item.resist || item.immune || item.vulnerable || item.conditionImmune || []
        const subStr = Array.isArray(sub) ? sub.join(', ') : String(sub)
        const note = item.note ? ` (${item.note})` : ''
        return `${subStr}${note}`.trim()
      }
      return String(item)
    }).filter(Boolean).join('; ')
  }
  return String(def)
}

export const formatMonsterSenses = (item) => {
  if (!item) return ''
  const parts = []
  if (item.senses) {
    if (Array.isArray(item.senses)) {
      parts.push(...item.senses.filter(Boolean))
    } else if (typeof item.senses === 'string' && item.senses.trim()) {
      parts.push(item.senses.trim())
    }
  }
  if (item.passive != null && !parts.some(p => p.toLowerCase().includes('passive perception'))) {
    parts.push(`passive Perception ${item.passive}`)
  }
  return parts.join(', ')
}
