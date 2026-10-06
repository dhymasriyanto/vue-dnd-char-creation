// Utility to parse 5eTools markup annotations into styled interactive HTML elements

export const BUILTIN_RULES = {
  // --- Core Rules & Mechanics ---
  artisans_tools: {
    name: "Artisan's Tools",
    type: 'Item',
    badge: 'Tool',
    entries: [
      "These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan's tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.",
      "Each type of artisan's tools requires a separate proficiency (e.g. Alchemist's Supplies, Smith's Tools, Tinker's Tools, Brewer's Supplies, Woodcarver's Tools)."
    ]
  },
  artisan_tools: {
    name: "Artisan's Tools",
    type: 'Item',
    badge: 'Tool',
    entries: [
      "These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan's tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.",
      "Each type of artisan's tools requires a separate proficiency (e.g. Alchemist's Supplies, Smith's Tools, Tinker's Tools, Brewer's Supplies, Woodcarver's Tools)."
    ]
  },
  artisan_tool: {
    name: "Artisan's Tools",
    type: 'Item',
    badge: 'Tool',
    entries: [
      "These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan's tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.",
      "Each type of artisan's tools requires a separate proficiency (e.g. Alchemist's Supplies, Smith's Tools, Tinker's Tools, Brewer's Supplies, Woodcarver's Tools)."
    ]
  },
  artisans_tool: {
    name: "Artisan's Tools",
    type: 'Item',
    badge: 'Tool',
    entries: [
      "These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan's tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.",
      "Each type of artisan's tools requires a separate proficiency (e.g. Alchemist's Supplies, Smith's Tools, Tinker's Tools, Brewer's Supplies, Woodcarver's Tools)."
    ]
  },
  thieves_tools: {
    name: "Thieves' Tools",
    type: 'Item',
    badge: 'Tool',
    entries: [
      "This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers.",
      "Proficiency with these tools lets you add your proficiency bonus to any ability checks you make to disarm traps or open locks."
    ]
  },
  concentration: {
    name: 'Concentration',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Some spells require you to maintain concentration in order to keep their magic active.",
      "If you take damage while concentrating, you must make a Constitution saving throw (DC 10 or half the damage taken, whichever is higher). Taking another concentration spell ends the current one."
    ]
  },
  opportunity_attack: {
    name: 'Opportunity Attack',
    type: 'Rule',
    badge: 'Combat Reaction',
    entries: [
      "You can make an opportunity attack when a hostile creature that you can see moves out of your reach.",
      "Uses your reaction to make one melee attack against the provoking creature immediately before it leaves your reach."
    ]
  },
  attunement: {
    name: 'Attunement',
    type: 'Rule',
    badge: 'Magic Items',
    entries: [
      "Some magic items require a creature to form a bond with them before their magical properties can be used.",
      "Attuning requires a creature to spend a short rest focused on only that item. A creature can be attuned to no more than 3 magic items at once."
    ]
  },
  carrying_capacity: {
    name: 'Carrying Capacity',
    type: 'Rule',
    badge: 'Encumbrance',
    entries: [
      "Your carrying capacity is your Strength score multiplied by 15. This is the weight in pounds that you can carry.",
      "Push, Drag, or Lift: You can push, drag, or lift a weight in pounds up to twice your carrying capacity (Strength x 30)."
    ]
  },
  temporary_hit_points: {
    name: 'Temporary Hit Points',
    type: 'Rule',
    badge: 'Health',
    entries: [
      "Temporary hit points serve as a buffer against damage, protecting you from injury.",
      "If you take damage, that damage is subtracted from your temporary hit points first. Leftover damage carries over to normal hit points.",
      "Temporary hit points do not stack; if you receive new temporary hit points, you decide whether to keep the existing amount or take the new amount."
    ]
  },
  heroic_inspiration: {
    name: 'Heroic Inspiration',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "If you have Heroic Inspiration, you can expend it to reroll any one die roll and use the new result. You either have Heroic Inspiration or you do not; you cannot stockpile multiple instances."
    ]
  },
  inspiration: {
    name: 'Inspiration (Heroic Inspiration)',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "If you have Inspiration, you can expend it to reroll any one die roll and use the new result. You either have Inspiration or you do not; you cannot stockpile multiple instances."
    ]
  },
  spell_slot: {
    name: 'Spell Slots',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Spell slots represent the magical stamina available to cast spells. Casting a spell expends a slot of that spell's level or higher. Expended slots are regained after finishing a Long Rest (or Short Rest for Warlocks)."
    ]
  },
  spell_slots: {
    name: 'Spell Slots',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Spell slots represent the magical stamina available to cast spells. Casting a spell expends a slot of that spell's level or higher. Expended slots are regained after finishing a Long Rest (or Short Rest for Warlocks)."
    ]
  },
  cantrip: {
    name: 'Cantrip',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "A cantrip is a spell that can be cast at will, without using a spell slot and without being prepared in advance. It represents foundational magical knowledge."
    ]
  },
  cantrips: {
    name: 'Cantrips',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "A cantrip is a spell that can be cast at will, without using a spell slot and without being prepared in advance. It represents foundational magical knowledge."
    ]
  },
  ritual: {
    name: 'Ritual Casting',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Certain spells have the ritual tag. A ritual version takes 10 minutes longer to cast than normal, but does not expend a spell slot."
    ]
  },
  advantage: {
    name: 'Advantage',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "When you have advantage on a d20 roll (attack roll, ability check, or saving throw), roll two d20s and use the higher result."
    ]
  },
  disadvantage: {
    name: 'Disadvantage',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "When you have disadvantage on a d20 roll (attack roll, ability check, or saving throw), roll two d20s and use the lower result."
    ]
  },
  saving_throw: {
    name: 'Saving Throw',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "A saving throw represents an attempt to resist or endure a harmful effect (such as a spell or dragon's breath). Roll a d20, add the ability modifier, and add your proficiency bonus if proficient in that save."
    ]
  },
  saving_throws: {
    name: 'Saving Throws',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "A saving throw represents an attempt to resist or endure a harmful effect (such as a spell or dragon's breath). Roll a d20, add the ability modifier, and add your proficiency bonus if proficient in that save."
    ]
  },
  proficiency_bonus: {
    name: 'Proficiency Bonus',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "Your proficiency bonus is based on total character level (+2 at level 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20). It adds to attacks with proficient weapons, proficient skills, saving throws, and your spell save DC."
    ]
  },
  armor_class: {
    name: 'Armor Class (AC)',
    type: 'Rule',
    badge: 'Combat',
    entries: [
      "Armor Class represents how difficult it is for an attacker to land a harmful blow on you. An attack roll must meet or beat your AC to hit."
    ]
  },
  initiative: {
    name: 'Initiative',
    type: 'Rule',
    badge: 'Combat',
    entries: [
      "Initiative determines the order of turns during combat. Roll a d20 and add your Dexterity modifier when combat begins."
    ]
  },
  hit_dice: {
    name: 'Hit Dice',
    type: 'Rule',
    badge: 'Health',
    entries: [
      "You have a number of Hit Dice equal to your total character level. During a Short Rest, you can spend Hit Dice to regain lost Hit Points. You regain half your total Hit Dice at the end of a Long Rest."
    ]
  },
  short_rest: {
    name: 'Short Rest',
    type: 'Rule',
    badge: 'Rest',
    entries: [
      "A Short Rest is a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds.",
      "A character can spend one or more Hit Dice at the end of a Short Rest, up to the character's maximum number of Hit Dice, to regain Hit Points."
    ]
  },
  short_rests: {
    name: 'Short Rest',
    type: 'Rule',
    badge: 'Rest',
    entries: [
      "A Short Rest is a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds.",
      "A character can spend one or more Hit Dice at the end of a Short Rest, up to the character's maximum number of Hit Dice, to regain Hit Points."
    ]
  },
  long_rest: {
    name: 'Long Rest',
    type: 'Rule',
    badge: 'Rest',
    entries: [
      "A Long Rest is a period of extended downtime, at least 8 hours long, during which a character sleeps or performs light activity (reading, talking, eating, or standing watch for no more than 2 hours).",
      "At the end of a Long Rest, a character regains all lost Hit Points, all spent spell slots, and up to half of their total number of Hit Dice."
    ]
  },
  long_rests: {
    name: 'Long Rest',
    type: 'Rule',
    badge: 'Rest',
    entries: [
      "A Long Rest is a period of extended downtime, at least 8 hours long, during which a character sleeps or performs light activity (reading, talking, eating, or standing watch for no more than 2 hours).",
      "At the end of a Long Rest, a character regains all lost Hit Points, all spent spell slots, and up to half of their total number of Hit Dice."
    ]
  },

  // --- Damage Types ---
  acid: {
    name: 'Acid Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "The corrosive spray of a black dragon's breath and the dissolving enzymes secreted by a black pudding deal acid damage."
    ]
  },
  bludgeoning: {
    name: 'Bludgeoning Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Blunt force attacks—hammers, falling, constriction, and the like—deal bludgeoning damage."
    ]
  },
  cold: {
    name: 'Cold Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "The infernal chill radiating from an ice devil's spear and the frigid blast of a white dragon's breath deal cold damage."
    ]
  },
  fire: {
    name: 'Fire Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Red dragons breathe fire, and many spells conjure flames to deal fire damage."
    ]
  },
  force: {
    name: 'Force Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Force is pure magical energy focused into a damaging form. Most effects that deal force damage, including magic missile and spiritual weapon, are spells."
    ]
  },
  lightning: {
    name: 'Lightning Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "A lightning bolt spell and a blue dragon's breath deal lightning damage."
    ]
  },
  necrotic: {
    name: 'Necrotic Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Necrotic damage, dealt by certain undead and spells such as chill touch, withers matter and even the soul."
    ]
  },
  piercing: {
    name: 'Piercing Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Puncturing and impaling attacks, including spears and monsters' bites, deal piercing damage."
    ]
  },
  poison: {
    name: 'Poison Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Venomous stings and the toxic gas of a green dragon's breath deal poison damage."
    ]
  },
  psychic: {
    name: 'Psychic Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Mental abilities such as a psionic blast or vicious mockery deal psychic damage."
    ]
  },
  radiant: {
    name: 'Radiant Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Radiant damage, dealt by a cleric's flame strike spell or an angel's smiting weapon, sears the flesh like fire and overloads the spirit with power."
    ]
  },
  slashing: {
    name: 'Slashing Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Swords, axes, and monsters' claws deal slashing damage."
    ]
  },
  thunder: {
    name: 'Thunder Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "A concussive burst of sound, such as the effect of the Thunderwave spell, deals thunder damage."
    ]
  }
}

const escapeHtml = (str) => {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const formatRuleKey = (str) => {
  if (typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/['"“”]/g, '').replace(/[\s-]+/g, '_')
}

export const findBuiltinRule = (target, display) => {
  if (!target && !display) return null
  const k1 = formatRuleKey(target)
  const k2 = formatRuleKey(display)
  const candidates = [
    k1,
    k2,
    k1.replace(/_damage$/, ''),
    k2.replace(/_damage$/, ''),
    k1.replace(/s_tool$/, '_tool'),
    k2.replace(/s_tool$/, '_tool'),
    k1.replace(/_tools$/, '_tool'),
    k2.replace(/_tools$/, '_tool'),
    k1.endsWith('s') ? k1.slice(0, -1) : k1 + 's',
    k2.endsWith('s') ? k2.slice(0, -1) : k2 + 's'
  ].filter(Boolean)

  for (const key of candidates) {
    if (BUILTIN_RULES[key]) {
      return { key, rule: BUILTIN_RULES[key] }
    }
  }
  return null
}

export const clean5eToolsMarkup = (text) => {
  if (typeof text !== 'string') return ''
  let result = text
  let iterations = 0
  while (/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/.test(result) && iterations < 15) {
    result = result.replace(/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/g, (match, tag, content) => {
      if (!content) return ''
      const parts = content.split('|')
      const lowerTag = tag.toLowerCase()
      if (lowerTag === 'filter') return parts[0]
      if (lowerTag === 'b' || lowerTag === 'i' || lowerTag === 'strike' || lowerTag === 's' || lowerTag === 'u') return parts[0]
      if (lowerTag === 'dice' || lowerTag === 'damage' || lowerTag === 'd20') return parts[0]
      if (lowerTag === 'quickref' && parts[4]) return parts[4]
      if (parts.length >= 3 && parts[2]) return parts[2]
      return parts[0]
    })
    iterations++
  }
  return result.replace(/\s+/g, ' ').trim()
}

export const renderAnnotatedText = (text) => {
  if (typeof text !== 'string') return ''
  let result = text
  let iterations = 0

  while (/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/.test(result) && iterations < 15) {
    result = result.replace(/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/g, (match, tag, content) => {
      if (!content) return ''
      const parts = content.split('|')
      const lowerTag = tag.toLowerCase()

      if (lowerTag === 'b') return `<b>${parts[0]}</b>`
      if (lowerTag === 'i') return `<i>${parts[0]}</i>`
      if (lowerTag === 'strike' || lowerTag === 's') return `<s>${parts[0]}</s>`
      if (lowerTag === 'u') return `<u>${parts[0]}</u>`
      if (lowerTag === 'dice' || lowerTag === 'damage' || lowerTag === 'd20') {
        return `<span class="text-indigo-600 font-semibold">${parts[0]}</span>`
      }

      let target = parts[0]
      let source = parts[1] || ''
      let displayText = parts[0]

      if (lowerTag === 'quickref' && parts[4]) {
        displayText = parts[4]
      } else if (lowerTag !== 'filter' && parts.length >= 3 && parts[2]) {
        displayText = parts[2]
      }

      if (lowerTag === 'filter') {
        const category = (parts[1] || '').toLowerCase().trim() || 'spells'
        const queryParams = parts.slice(2).join('&')

        return `<span class="dnd-tag-ref dnd-filter-link text-blue-600 font-medium underline decoration-blue-300 decoration-dotted hover:text-indigo-700 hover:decoration-indigo-500 cursor-pointer" data-tag="filter" data-filter-category="${escapeHtml(category)}" data-filter-query="${escapeHtml(queryParams)}" data-target="${escapeHtml(target)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
      }

      const refTags = [
        'spell', 'item', 'feat', 'condition', 'skill', 'sense', 'action',
        'race', 'subrace', 'class', 'background',
        'variantrule', 'rule', 'optfeature', 'hazard', 'status', 'deity'
      ]
      if (refTags.includes(lowerTag)) {
        return `<span class="dnd-tag-ref text-blue-600 font-medium underline decoration-blue-300 decoration-dotted hover:text-indigo-700 hover:decoration-indigo-500 cursor-pointer" data-tag="${lowerTag}" data-target="${escapeHtml(target)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
      }

      return `<span class="text-blue-600 font-medium">${displayText}</span>`
    })
    iterations++
  }

  return result
}

export const renderTableCell = (cell) => {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'string') return renderAnnotatedText(cell)
  if (typeof cell === 'number') return String(cell)
  if (typeof cell === 'object') {
    if (cell.roll) {
      if (cell.roll.exact !== undefined) return String(cell.roll.exact)
      if (cell.roll.min !== undefined && cell.roll.max !== undefined) {
        return cell.roll.min === cell.roll.max ? String(cell.roll.min) : `${cell.roll.min}–${cell.roll.max}`
      }
    }
    if (cell.entry !== undefined) return renderTableCell(cell.entry)
    if (Array.isArray(cell.entries)) return cell.entries.map(renderTableCell).join('<br>')
    if (Array.isArray(cell)) return cell.map(renderTableCell).join(', ')
  }
  return renderAnnotatedText(String(cell))
}

export function formatPrerequisite(prereq) {
  if (!prereq) return null
  if (typeof prereq === 'string') {
    try {
      const parsed = JSON.parse(prereq)
      if (typeof parsed === 'object' && parsed !== null) {
        return formatPrerequisite(parsed)
      }
    } catch (_) {}
    return prereq
  }
  if (!Array.isArray(prereq)) prereq = [prereq]

  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const cleanItem = (str) => {
    if (typeof str !== 'string') return ''
    return str.split('|')[0].replace(/#c$/, ' cantrip').trim()
  }

  const parts = []
  for (const p of prereq) {
    if (!p) continue
    if (typeof p === 'string') {
      parts.push(cleanItem(p))
      continue
    }

    const sub = []

    if (p.level != null) {
      if (typeof p.level === 'number') {
        sub.push(`${ordinal(p.level)} Level`)
      } else if (typeof p.level === 'object') {
        const lvl = p.level.level ? `${ordinal(p.level.level)}-level` : ''
        const cls = p.level.class?.name || ''
        const subcls = p.level.subclass?.name ? ` (${p.level.subclass.name})` : ''
        sub.push(`${lvl} ${cls}${subcls}`.trim())
      }
    }

    if (p.ability && Array.isArray(p.ability)) {
      const abNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' }
      const abParts = []
      for (const abObj of p.ability) {
        const pairs = Object.entries(abObj).map(([k, val]) => `${abNames[k.toLowerCase()] || k.toUpperCase()} ${val}`)
        if (pairs.length) abParts.push(pairs.join(' or '))
      }
      if (abParts.length) sub.push(`${abParts.join(', ')} or higher`)
    }

    if (p.race && Array.isArray(p.race)) {
      const rNames = p.race.map(r => {
        let name = r.name || ''
        name = name.charAt(0).toUpperCase() + name.slice(1)
        if (r.subrace) name += ` (${r.subrace.charAt(0).toUpperCase() + r.subrace.slice(1)})`
        return name
      })
      if (rNames.length) sub.push(rNames.join(' or '))
    }

    if (p.spell && Array.isArray(p.spell)) {
      const spNames = p.spell.map(sp => {
        if (typeof sp === 'string') {
          const isCantrip = sp.endsWith('#c')
          const name = sp.replace(/#c$/, '').split('|')[0]
          const title = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          return isCantrip ? `${title} cantrip` : title
        }
        if (typeof sp === 'object' && sp !== null) {
          return sp.entry || sp.entrySummary || 'a Spell'
        }
        return String(sp)
      })
      if (spNames.length) sub.push(spNames.join(' or '))
    }

    if (p.feat && Array.isArray(p.feat)) {
      const fNames = p.feat.map(f => {
        const raw = String(f).split('|')[0]
        return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      })
      if (fNames.length) sub.push(fNames.join(' or '))
    }

    if (p.proficiency && Array.isArray(p.proficiency)) {
      const profs = p.proficiency.map(pr => {
        if (pr.armor) return `Proficiency with ${pr.armor} armor`
        if (pr.weapon) return `Proficiency with ${pr.weapon} weapons`
        return Object.entries(pr).map(([k, v]) => `Proficiency with ${v} ${k}`).join(', ')
      })
      if (profs.length) sub.push(profs.join(', '))
    }

    if (p.spellcasting || p.spellcastingFeature || p.spellcasting2020) {
      sub.push('Spellcasting or Pact Magic feature')
    }

    if (p.pact) sub.push(`Pact of the ${p.pact}`)
    if (p.patron) sub.push(`${p.patron} patron`)
    if (p.feature && Array.isArray(p.feature)) sub.push(p.feature.join(', '))
    if (p.item && Array.isArray(p.item)) sub.push(p.item.join(' or '))
    if (p.background && Array.isArray(p.background)) sub.push(p.background.map(b => b.name).filter(Boolean).join(' or '))
    if (p.campaign && Array.isArray(p.campaign)) sub.push(`${p.campaign.join('/')} campaign`)
    if (p.other) sub.push(p.other)
    if (p.otherSummary) sub.push(typeof p.otherSummary === 'object' ? (p.otherSummary.entry || p.otherSummary.entrySummary || '') : p.otherSummary)

    if (sub.length) parts.push(sub.join(', '))
  }

  return parts.filter(Boolean).join('; ')
}

export function format5eEntries(entries) {
  if (!entries) return ''
  if (typeof entries === 'string') return `<p class="mb-2 leading-relaxed">${entries}</p>`
  if (Array.isArray(entries)) {
    return entries.map(e => format5eEntries(e)).filter(Boolean).join('')
  }
  if (typeof entries === 'object' && entries !== null) {
    if (entries.type === 'list' && Array.isArray(entries.items)) {
      const lis = entries.items.map(it => {
        if (typeof it === 'string') return `<li>${it}</li>`
        if (typeof it === 'object' && it !== null) {
          const title = it.name ? `<strong class="text-gray-900">${it.name}: </strong>` : ''
          const body = it.entry !== undefined ? String(it.entry) : (it.entries ? format5eEntries(it.entries) : '')
          return `<li>${title}${body}</li>`
        }
        return `<li>${String(it)}</li>`
      }).join('')
      return `<ul class="list-disc pl-4 space-y-1 my-2">${lis}</ul>`
    }
    if (entries.type === 'item') {
      const title = entries.name ? `<strong class="text-gray-900">${entries.name}: </strong>` : ''
      const body = entries.entry !== undefined ? String(entries.entry) : (entries.entries ? format5eEntries(entries.entries) : '')
      return `<p class="mb-2 leading-relaxed">${title}${body}</p>`
    }
    if (entries.type === 'entries' || entries.type === 'inset') {
      const header = entries.name ? `<h4 class="font-bold text-gray-900 text-xs mt-2.5 mb-1">${entries.name}</h4>` : ''
      return header + format5eEntries(entries.entries)
    }
    if (entries.type === 'table') {
      let html = '<div class="my-2.5 overflow-x-auto w-full border border-gray-200 rounded"><table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">'
      if (entries.caption) {
        html += `<caption class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">${entries.caption}</caption>`
      }
      if (Array.isArray(entries.colLabels) && entries.colLabels.length) {
        html += '<thead class="bg-gray-50"><tr>' + entries.colLabels.map(c => `<th class="px-2.5 py-1.5 font-semibold text-gray-700">${c}</th>`).join('') + '</tr></thead>'
      }
      if (Array.isArray(entries.rows)) {
        html += '<tbody class="divide-y divide-gray-100 bg-white">' + entries.rows.map(r => '<tr class="hover:bg-gray-50/70">' + (Array.isArray(r) ? r.map(c => `<td class="px-2.5 py-1.5 text-gray-700">${typeof c === 'object' ? (c.entry || c.roll?.exact || '') : c}</td>`).join('') : '') + '</tr>').join('') + '</tbody>'
      }
      html += '</table></div>'
      return html
    }
    if (entries.entries) {
      const header = entries.name ? `<strong class="font-bold text-gray-900">${entries.name}: </strong>` : ''
      return `<div class="mt-1.5">${header}${format5eEntries(entries.entries)}</div>`
    }
    if (entries.entry) {
      const header = entries.name ? `<strong class="font-bold text-gray-900">${entries.name}: </strong>` : ''
      return `<p class="mb-2 leading-relaxed">${header}${String(entries.entry)}</p>`
    }
  }
  return `<p class="mb-2 leading-relaxed">${String(entries)}</p>`
}
