// D&D 5e Multiclassing Rules Helper (2014 & 2024 rulesets)

export const MULTICLASS_REQUIREMENTS = {
  barbarian: { str: 13 },
  bard: { cha: 13 },
  cleric: { wis: 13 },
  druid: { wis: 13 },
  fighter: { or: [{ str: 13, dex: 13 }] },
  monk: { dex: 13, wis: 13 },
  paladin: { str: 13, cha: 13 },
  ranger: { dex: 13, wis: 13 },
  rogue: { dex: 13 },
  sorcerer: { cha: 13 },
  warlock: { cha: 13 },
  wizard: { int: 13 },
  artificer: { int: 13 }
}

const STAT_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
}

export function getMulticlassPrerequisites(className, rawClassData = null) {
  const c = (className || '').toLowerCase().trim()
  if (rawClassData?.multiclassing?.requirements) {
    return rawClassData.multiclassing.requirements
  }
  return MULTICLASS_REQUIREMENTS[c] || null
}

export function formatPrerequisitesText(className, rawClassData = null) {
  const req = getMulticlassPrerequisites(className, rawClassData)
  if (!req) return 'None'

  if (req.or && Array.isArray(req.or)) {
    const orParts = req.or.map(group => {
      return Object.entries(group)
        .map(([stat, val]) => `${STAT_LABELS[stat] || stat.toUpperCase()} ${val}`)
        .join(' or ')
    })
    return orParts.join(' or ')
  }

  const parts = Object.entries(req).map(([stat, val]) => {
    return `${STAT_LABELS[stat] || stat.toUpperCase()} ${val}`
  })
  return parts.join(' and ')
}

export function checkMulticlassPrerequisites(className, abilityScores = {}, rawClassData = null) {
  const req = getMulticlassPrerequisites(className, rawClassData)
  if (!req) {
    return { met: true, reason: 'No prerequisite', details: '', scoresAssigned: true }
  }

  const scores = {
    str: Number(abilityScores.strength || abilityScores.str || 0),
    dex: Number(abilityScores.dexterity || abilityScores.dex || 0),
    con: Number(abilityScores.constitution || abilityScores.con || 0),
    int: Number(abilityScores.intelligence || abilityScores.int || 0),
    wis: Number(abilityScores.wisdom || abilityScores.wis || 0),
    cha: Number(abilityScores.charisma || abilityScores.cha || 0)
  }

  const totalScore = scores.str + scores.dex + scores.con + scores.int + scores.wis + scores.cha
  const scoresAssigned = totalScore > 0

  if (!scoresAssigned) {
    return {
      met: false,
      reason: `Requires ${formatPrerequisitesText(className, rawClassData)} (assigned when configuring ability scores)`,
      details: formatPrerequisitesText(className, rawClassData),
      scoresAssigned: false
    }
  }

  if (req.or && Array.isArray(req.or)) {
    const orResults = req.or.map(group => {
      return Object.entries(group).some(([stat, val]) => {
        const cur = scores[stat] || 0
        return cur >= Number(val)
      })
    })

    const isMet = orResults.some(Boolean)
    const breakdown = req.or.map(group => {
      return Object.entries(group)
        .map(([stat, val]) => `${(STAT_LABELS[stat] || stat).toUpperCase()}: ${scores[stat]} (min ${val})`)
        .join(' or ')
    }).join(' or ')

    return {
      met: isMet,
      reason: isMet ? `Met (${breakdown})` : `Requires ${formatPrerequisitesText(className, rawClassData)} (${breakdown})`,
      details: breakdown,
      scoresAssigned: true
    }
  }

  const missing = []
  const currentSummary = []

  for (const [stat, val] of Object.entries(req)) {
    const cur = scores[stat] || 0
    const needed = Number(val)
    currentSummary.push(`${(STAT_LABELS[stat] || stat).toUpperCase()}: ${cur}/${needed}`)
    if (cur < needed) {
      missing.push(`${STAT_LABELS[stat] || stat} ${needed} (current: ${cur})`)
    }
  }

  const isMet = missing.length === 0
  return {
    met: isMet,
    reason: isMet
      ? `Met (${currentSummary.join(', ')})`
      : `Requires ${missing.join(', ')}`,
    details: currentSummary.join(', '),
    scoresAssigned: true
  }
}

export function getMulticlassProficiencies(className, edition = '2024', rawClassData = null) {
  const c = (className || '').toLowerCase().trim()
  const is2024 = edition === '2024'

  // If provided in 5etools raw data
  const pg = rawClassData?.multiclassing?.proficienciesGained
  if (pg) {
    const armor = []
    if (Array.isArray(pg.armor)) {
      pg.armor.forEach(a => {
        if (typeof a === 'string') {
          const lower = a.toLowerCase().trim()
          if (lower === 'shield' || lower === 'shields') {
            armor.push('Shields')
          } else if (lower.endsWith('armor')) {
            armor.push(a.charAt(0).toUpperCase() + a.slice(1))
          } else {
            armor.push(`${a.charAt(0).toUpperCase() + a.slice(1)} armor`)
          }
        } else if (a && a.full) {
          armor.push(a.full.replace(/\{@[^}]+ (.*?)\}/g, '$1'))
        }
      })
    }

    const weapons = []
    if (Array.isArray(pg.weapons)) {
      pg.weapons.forEach(w => {
        if (typeof w === 'string') {
          const clean = w.replace(/\{@item ([^|}]+)[^}]*\}/i, '$1').replace(/\|.*/, '').trim()
          const lower = clean.toLowerCase()
          if (lower === 'simple' || lower === 'martial') {
            weapons.push(`${clean.charAt(0).toUpperCase() + clean.slice(1)} weapons`)
          } else {
            weapons.push(clean.charAt(0).toUpperCase() + clean.slice(1))
          }
        }
      })
    }

    const tools = []
    if (Array.isArray(pg.tools)) {
      pg.tools.forEach(t => {
        if (typeof t === 'string') {
          const clean = t.replace(/\{@item ([^|}]+)[^}]*\}/i, '$1').replace(/\|.*/, '').trim()
          tools.push(clean.charAt(0).toUpperCase() + clean.slice(1))
        }
      })
    }

    const skills = []
    if (Array.isArray(pg.skills)) {
      pg.skills.forEach(s => {
        if (s.choose) {
          const from = Array.isArray(s.choose.from)
            ? s.choose.from.map(k => k.toLowerCase().replace(/[\s-]/g, '_'))
            : []
          skills.push({
            count: Number(s.choose.count) || 1,
            from
          })
        }
      })
    }

    const equipment = []
    const rawEq = pg.equipment || rawClassData?.multiclassing?.equipment
    if (Array.isArray(rawEq)) {
      rawEq.forEach(e => {
        if (typeof e === 'string') {
          equipment.push(e.replace(/\{@item ([^|}]+)[^}]*\}/i, '$1').replace(/\|.*/, '').trim())
        }
      })
    }

    if (armor.length || weapons.length || tools.length || skills.length || equipment.length) {
      return { armor, weapons, tools, skills, equipment }
    }
  }

  // Standard 5e multiclass proficiencies lookup
  const table = {
    barbarian: {
      armor: ['Shields'],
      weapons: ['Martial weapons', 'Simple weapons'],
      tools: [],
      skills: []
    },
    bard: {
      armor: ['Light armor'],
      weapons: [],
      tools: ['One musical instrument of your choice'],
      skills: [{ count: 1, from: [] }] // from all skills
    },
    cleric: {
      armor: ['Light armor', 'Medium armor', 'Shields'],
      weapons: [],
      tools: [],
      skills: []
    },
    druid: {
      armor: is2024
        ? ['Light armor', 'Shields']
        : ['Light armor', 'Medium armor', 'Shields (non-metal)'],
      weapons: [],
      tools: [],
      skills: []
    },
    fighter: {
      armor: ['Light armor', 'Medium armor', 'Shields'],
      weapons: ['Martial weapons', 'Simple weapons'],
      tools: [],
      skills: []
    },
    monk: {
      armor: [],
      weapons: is2024 ? [] : ['Simple weapons', 'Shortswords'],
      tools: [],
      skills: []
    },
    paladin: {
      armor: ['Light armor', 'Medium armor', 'Shields'],
      weapons: ['Martial weapons', 'Simple weapons'],
      tools: [],
      skills: []
    },
    ranger: {
      armor: ['Light armor', 'Medium armor', 'Shields'],
      weapons: ['Martial weapons', 'Simple weapons'],
      tools: [],
      skills: [{
        count: 1,
        from: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']
      }]
    },
    rogue: {
      armor: ['Light armor'],
      weapons: [],
      tools: ["Thieves' tools"],
      skills: [{
        count: 1,
        from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth']
      }]
    },
    sorcerer: {
      armor: [],
      weapons: [],
      tools: [],
      skills: []
    },
    warlock: {
      armor: ['Light armor'],
      weapons: is2024 ? [] : ['Simple weapons'],
      tools: [],
      skills: []
    },
    wizard: {
      armor: [],
      weapons: [],
      tools: [],
      skills: []
    },
    artificer: {
      armor: ['Light armor', 'Medium armor', 'Shields'],
      weapons: [],
      tools: ["Thieves' tools", "Tinker's tools"],
      skills: []
    }
  }

  return table[c] || { armor: [], weapons: [], tools: [], skills: [] }
}
