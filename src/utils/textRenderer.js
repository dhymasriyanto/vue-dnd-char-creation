// Utility to parse 5eTools markup annotations into styled interactive HTML elements

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
      if (lowerTag === 'classfeature') return parts[5] || parts[0]
      if (lowerTag === 'subclassfeature') return parts[7] || parts[0]
      if (lowerTag === 'optfeature' || lowerTag === 'optionalfeature') return parts[2] || parts[0]
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
  let result = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
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
        return `<span class="text-gray-900 font-bold">${parts[0]}</span>`
      }

      let target = parts[0]
      let source = parts[1] || ''
      let displayText = parts[0]

      if (lowerTag === 'classfeature') {
        displayText = parts[5] || parts[0]
        source = parts[4] || parts[2] || ''
      } else if (lowerTag === 'subclassfeature') {
        displayText = parts[7] || parts[0]
        source = parts[6] || parts[4] || ''
      } else if (lowerTag === 'optfeature' || lowerTag === 'optionalfeature') {
        displayText = parts[2] || parts[0]
        source = parts[1] || ''
      } else if (lowerTag === 'quickref' && parts[4]) {
        displayText = parts[4]
      } else if (lowerTag !== 'filter' && parts.length >= 3 && parts[2]) {
        displayText = parts[2]
      }

      if (lowerTag === 'filter') {
        const category = (parts[1] || '').toLowerCase().trim() || 'spells'
        const queryParams = parts.slice(2).join('&')

        return `<span class="dnd-tag-ref dnd-filter-link text-gray-900 font-bold underline decoration-gray-400 decoration-dotted hover:text-black hover:decoration-gray-700 cursor-pointer" data-tag="filter" data-filter-category="${escapeHtml(category)}" data-filter-query="${escapeHtml(queryParams)}" data-target="${escapeHtml(target)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
      }

      const refTags = [
        'spell', 'item', 'feat', 'condition', 'skill', 'sense', 'action',
        'race', 'subrace', 'class', 'background',
        'variantrule', 'rule', 'optfeature', 'optionalfeature', 'classfeature', 'subclassfeature',
        'monster', 'creature', 'hazard', 'status', 'deity'
      ]
      if (refTags.includes(lowerTag)) {
        return `<span class="dnd-tag-ref text-gray-900 font-bold underline decoration-gray-400 decoration-dotted hover:text-black hover:decoration-gray-700 cursor-pointer" data-tag="${lowerTag}" data-target="${escapeHtml(target)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
      }

      return `<span class="text-gray-900 font-bold">${displayText}</span>`
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
      let parsed = JSON.parse(prereq)
      while (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch (_) {
          break
        }
      }
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

function formatItemHeader(name) {
  if (!name) return ''
  const trimmed = String(name).trim()
  if (trimmed.endsWith(':') || trimmed.endsWith('.')) {
    return `<strong class="font-bold text-gray-900">${trimmed} </strong>`
  }
  return `<strong class="font-bold text-gray-900">${trimmed}: </strong>`
}

export function format5eEntries(entries) {
  if (!entries) return ''
  if (typeof entries === 'string') {
    const trimmed = entries.trim()
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed)
        return format5eEntries(parsed)
      } catch (_) {}
    }
    return `<p class="mb-2 leading-relaxed">${entries}</p>`
  }
  if (Array.isArray(entries)) {
    return entries.map(e => format5eEntries(e)).filter(Boolean).join('')
  }
  if (typeof entries === 'object' && entries !== null) {
    if (entries.type === 'section') {
      const header = entries.name ? `<h3 class="font-bold text-gray-900 text-sm mt-3 mb-1.5">${entries.name}</h3>` : ''
      return header + format5eEntries(entries.entries)
    }
    if (entries.type === 'quote') {
      const by = entries.by ? `<footer class="text-right text-xs text-gray-500 italic mt-1">— ${entries.by}</footer>` : ''
      return `<blockquote class="border-l-4 border-gray-300 pl-3 py-1 my-2 italic text-gray-600 bg-gray-50/50 rounded-r">${format5eEntries(entries.entries || entries.entry || '')}${by}</blockquote>`
    }
    if (entries.type === 'abilityDc') {
      const attrs = (entries.attributes || []).map(a => a.toUpperCase()).join(' or ')
      const prefix = entries.name ? `${entries.name} ` : ''
      return `<div class="p-2 bg-gray-50 border border-gray-200 rounded text-xs my-2 font-mono"><b>${prefix}save DC</b> = 8 + proficiency bonus + ${attrs} modifier</div>`
    }
    if (entries.type === 'abilityAttackMod') {
      const attrs = (entries.attributes || []).map(a => a.toUpperCase()).join(' or ')
      const prefix = entries.name ? `${entries.name} ` : ''
      return `<div class="p-2 bg-gray-50 border border-gray-200 rounded text-xs my-2 font-mono"><b>${prefix}attack modifier</b> = proficiency bonus + ${attrs} modifier</div>`
    }
    if (entries.type === 'refOptionalfeature') {
      return `<p class="mb-1 leading-relaxed">{@optfeature ${entries.optionalfeature}}</p>`
    }
    if (entries.type === 'refClassFeature') {
      return `<p class="mb-1 leading-relaxed">{@classFeature ${entries.classFeature}}</p>`
    }
    if (entries.type === 'refSubclassFeature') {
      return `<p class="mb-1 leading-relaxed">{@subclassFeature ${entries.subclassFeature}}</p>`
    }
    if (entries.type === 'refFeat') {
      return `<p class="mb-1 leading-relaxed">{@feat ${entries.feat}}</p>`
    }
    if (entries.type === 'options') {
      const countHeader = entries.count ? `<p class="mb-1 text-xs text-gray-500 italic">Choose ${entries.count}:</p>` : ''
      const subItems = entries.entries || entries.items || []
      const lis = subItems.map(it => {
        if (typeof it === 'string') return `<li>${it}</li>`
        if (typeof it === 'object' && it !== null) {
          if (it.type === 'refOptionalfeature') return `<li>{@optfeature ${it.optionalfeature}}</li>`
          if (it.type === 'refClassFeature') return `<li>{@classFeature ${it.classFeature}}</li>`
          if (it.type === 'refSubclassFeature') return `<li>{@subclassFeature ${it.subclassFeature}}</li>`
          if (it.type === 'refFeat') return `<li>{@feat ${it.feat}}</li>`
          const title = it.name ? formatItemHeader(it.name) : ''
          const body = it.entry !== undefined ? String(it.entry) : (it.entries ? format5eEntries(it.entries) : '')
          return `<li>${title}${body}</li>`
        }
        return `<li>${String(it)}</li>`
      }).join('')
      return `${countHeader}<ul class="list-disc pl-5 my-2 space-y-1 text-gray-700">${lis}</ul>`
    }
    if (entries.type === 'list' && Array.isArray(entries.items)) {
      const lis = entries.items.map(it => {
        if (typeof it === 'string') return `<li>${it}</li>`
        if (typeof it === 'object' && it !== null) {
          if (it.type === 'refOptionalfeature') return `<li>{@optfeature ${it.optionalfeature}}</li>`
          if (it.type === 'refClassFeature') return `<li>{@classFeature ${it.classFeature}}</li>`
          if (it.type === 'refSubclassFeature') return `<li>{@subclassFeature ${it.subclassFeature}}</li>`
          if (it.type === 'refFeat') return `<li>{@feat ${it.feat}}</li>`
          const title = it.name ? formatItemHeader(it.name) : ''
          const body = it.entry !== undefined ? String(it.entry) : (it.entries ? format5eEntries(it.entries) : '')
          return `<li>${title}${body}</li>`
        }
        return `<li>${String(it)}</li>`
      }).join('')
      return `<ul class="list-disc pl-5 space-y-1 my-2 text-gray-700">${lis}</ul>`
    }
    if (entries.type === 'item') {
      const title = entries.name ? formatItemHeader(entries.name) : ''
      const body = entries.entry !== undefined ? String(entries.entry) : (entries.entries ? format5eEntries(entries.entries) : '')
      return `<p class="mb-2 leading-relaxed">${title}${body}</p>`
    }
    if (entries.type === 'entries' || entries.type === 'inset') {
      if (entries.name) {
        return `<div class="my-2"><h4 class="font-bold text-gray-900 text-xs mb-0.5">${entries.name}</h4><div class="text-gray-700 space-y-1">${format5eEntries(entries.entries)}</div></div>`
      }
      return format5eEntries(entries.entries)
    }
    if (entries.type === 'table') {
      let html = '<div class="my-2.5 overflow-x-auto w-full border border-gray-200 rounded"><table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">'
      if (entries.caption) {
        html += `<caption class="p-2 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">${entries.caption}</caption>`
      }
      if (Array.isArray(entries.colLabels) && entries.colLabels.length) {
        html += '<thead class="bg-gray-50"><tr>' + entries.colLabels.map(c => `<th class="px-2.5 py-1.5 font-semibold text-gray-700">${renderTableCell(c)}</th>`).join('') + '</tr></thead>'
      }
      if (Array.isArray(entries.rows)) {
        html += '<tbody class="divide-y divide-gray-100 bg-white">' + entries.rows.map(r => '<tr class="hover:bg-gray-50/70">' + (Array.isArray(r) ? r.map(c => `<td class="px-2.5 py-1.5 text-gray-700">${renderTableCell(c)}</td>`).join('') : '') + '</tr>').join('') + '</tbody>'
      }
      html += '</table></div>'
      return html
    }
    if (entries.entries) {
      const header = entries.name ? formatItemHeader(entries.name) : ''
      return `<div class="mt-1.5">${header}${format5eEntries(entries.entries)}</div>`
    }
    if (entries.entry !== undefined) {
      const header = entries.name ? formatItemHeader(entries.name) : ''
      return `<p class="mb-2 leading-relaxed">${header}${format5eEntries(entries.entry)}</p>`
    }
  }
  return `<p class="mb-2 leading-relaxed">${String(entries)}</p>`
}

export const DAMAGE_TYPE_MAP = {
  B: 'Bludgeoning',
  P: 'Piercing',
  S: 'Slashing',
  A: 'Acid',
  C: 'Cold',
  F: 'Fire',
  O: 'Force',
  L: 'Lightning',
  N: 'Necrotic',
  I: 'Poison',
  Y: 'Psychic',
  R: 'Radiant',
  T: 'Thunder'
}

export const PROPERTY_DEFINITIONS = {
  '2H': {
    name: 'Two-Handed',
    desc: {
      '2024': 'A Two-Handed weapon requires two hands when you attack with it.',
      '2014': 'This weapon requires two hands to use. This property is relevant only when you attack with the weapon, not when you simply hold it.'
    }
  },
  'A': {
    name: 'Ammunition',
    desc: {
      '2024': 'You can use a weapon that has the Ammunition property to make a ranged attack only if you have ammunition to fire from it. Each attack expends one piece of ammunition. Drawing the ammunition is part of the attack. After a fight, you can spend 1 minute to recover half the ammunition used.',
      '2014': 'You can use a weapon that has the ammunition property to make a ranged attack only if you have ammunition to fire from the weapon. Each time you attack, you expend one piece of ammunition. You can recover half your expended ammunition after combat.'
    }
  },
  'AF': {
    name: 'Ammunition (Firearms)',
    desc: {
      '2024': 'Firearm Bullets are destroyed upon use in a modern firearm. Futuristic firearms use Energy Cells that become depleted but can possibly be recharged.',
      '2014': 'The ammunition of a firearm is destroyed upon use.'
    }
  },
  'BF': {
    name: 'Burst Fire',
    desc: {
      '2024': 'As an action, you can expend 10 pieces of ammunition to spray shots in a 10-foot Cube within normal range. Each creature in that area must succeed on a DC 15 Dexterity saving throw or take the weapon\'s normal damage.',
      '2014': 'A weapon with burst fire can spray a 10-foot-cube area within normal range. Each creature in the area must succeed on a DC 15 Dexterity saving throw or take the weapon\'s normal damage (uses 10 pieces of ammunition).'
    }
  },
  'F': {
    name: 'Finesse',
    desc: {
      '2024': 'When making an attack with a Finesse weapon, use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls.',
      '2014': 'When making an attack with a finesse weapon, you use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls.'
    }
  },
  'H': {
    name: 'Heavy',
    desc: {
      '2024': 'You have Disadvantage on attack rolls with a Heavy weapon if it\'s a Melee weapon and your Strength score isn\'t at least 13 or if it\'s a Ranged weapon and your Dexterity score isn\'t at least 13.',
      '2014': 'Small creatures have disadvantage on attack rolls with heavy weapons. A heavy weapon\'s size and bulk make it too large for a Small creature to use effectively.'
    }
  },
  'L': {
    name: 'Light',
    desc: {
      '2024': 'When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn. That extra attack must be made with a different Light weapon, and you don\'t add your ability modifier to the extra attack\'s damage unless that modifier is negative.',
      '2014': 'A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons.'
    }
  },
  'LD': {
    name: 'Loading',
    desc: {
      '2024': 'You can fire only one piece of ammunition from a Loading weapon when you use an action, a Bonus Action, or a Reaction to fire it, regardless of the number of attacks you can normally make.',
      '2014': 'Because of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make.'
    }
  },
  'R': {
    name: 'Reach',
    desc: {
      '2024': 'A Reach weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for Opportunity Attacks with it.',
      '2014': 'This weapon adds 5 feet to your reach when you attack with it. This property also determines your reach for opportunity attacks with a reach weapon.'
    }
  },
  'RLD': {
    name: 'Reload',
    desc: {
      '2024': 'You can make a limited number of shots with a Reload weapon. You must then reload the weapon as an action or a Bonus Action.',
      '2014': 'A limited number of shots can be made with a weapon that has the reload property. A character must then reload it using an action or a bonus action.'
    }
  },
  'S': {
    name: 'Special',
    desc: {
      '2024': 'A weapon with the Special property has unusual rules governing its use, explained in the weapon\'s description.',
      '2014': 'A weapon with the special property has unusual rules governing its use, explained in the weapon\'s description.'
    }
  },
  'T': {
    name: 'Thrown',
    desc: {
      '2024': 'If a weapon has the Thrown property, you can throw the weapon to make a ranged attack, and you can draw that weapon as part of the attack. If the weapon is a Melee weapon, use the same ability modifier for the attack and damage rolls that you use for a melee attack with that weapon.',
      '2014': 'If a weapon has the thrown property, you can throw the weapon to make a ranged attack. If the weapon is a melee weapon, use the same ability modifier for that attack roll and damage roll that you would use for a melee attack with the weapon.'
    }
  },
  'V': {
    name: 'Versatile',
    desc: {
      '2024': 'A Versatile weapon can be used with one or two hands. A damage value in parentheses appears with the property. The weapon deals that damage when used with two hands to make a melee attack.',
      '2014': 'This weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage when the weapon is used with two hands to make a melee attack.'
    }
  }
}

export const MASTERY_DEFINITIONS = {
  'Cleave': 'If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon\'s damage, but don\'t add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn.',
  'Graze': 'If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type dealt by the weapon, and the damage can be increased only by increasing the ability modifier.',
  'Nick': 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.',
  'Push': 'If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller.',
  'Sap': 'If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.',
  'Slow': 'If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn\'t exceed 10 feet.',
  'Topple': 'If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 + attack ability modifier + Proficiency Bonus). On a failed save, the creature has the Prone condition.',
  'Vex': 'If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.'
}

export const WEAPON_CATEGORY_MAP = {
  club: 'Simple Melee Weapon',
  dagger: 'Simple Melee Weapon',
  greatclub: 'Simple Melee Weapon',
  handaxe: 'Simple Melee Weapon',
  javelin: 'Simple Melee Weapon',
  'light hammer': 'Simple Melee Weapon',
  mace: 'Simple Melee Weapon',
  quarterstaff: 'Simple Melee Weapon',
  sickle: 'Simple Melee Weapon',
  spear: 'Simple Melee Weapon',
  'light crossbow': 'Simple Ranged Weapon',
  dart: 'Simple Ranged Weapon',
  shortbow: 'Simple Ranged Weapon',
  sling: 'Simple Ranged Weapon',
  battleaxe: 'Martial Melee Weapon',
  flail: 'Martial Melee Weapon',
  glaive: 'Martial Melee Weapon',
  greataxe: 'Martial Melee Weapon',
  greatsword: 'Martial Melee Weapon',
  halberd: 'Martial Melee Weapon',
  lance: 'Martial Melee Weapon',
  longsword: 'Martial Melee Weapon',
  maul: 'Martial Melee Weapon',
  morningstar: 'Martial Melee Weapon',
  pike: 'Martial Melee Weapon',
  rapier: 'Martial Melee Weapon',
  scimitar: 'Martial Melee Weapon',
  shortsword: 'Martial Melee Weapon',
  trident: 'Martial Melee Weapon',
  'war pick': 'Martial Melee Weapon',
  warhammer: 'Martial Melee Weapon',
  whip: 'Martial Melee Weapon',
  blowgun: 'Martial Ranged Weapon',
  'hand crossbow': 'Martial Ranged Weapon',
  'heavy crossbow': 'Martial Ranged Weapon',
  longbow: 'Martial Ranged Weapon',
  musket: 'Martial Ranged Weapon',
  pistol: 'Martial Ranged Weapon'
}

export const WEAPON_RANGE_MAP = {
  dagger: '20/60',
  handaxe: '20/60',
  javelin: '30/120',
  'light hammer': '20/60',
  spear: '20/60',
  dart: '20/60',
  shortbow: '80/320',
  sling: '30/120',
  'light crossbow': '80/320',
  blowgun: '25/100',
  'hand crossbow': '30/120',
  'heavy crossbow': '100/400',
  longbow: '150/600',
  trident: '20/60',
  net: '5/15',
  musket: '40/120',
  pistol: '30/90'
}

export const ARMOR_CATEGORY_MAP = {
  'padded armor': 'Light Armor',
  padded: 'Light Armor',
  'leather armor': 'Light Armor',
  leather: 'Light Armor',
  'studded leather armor': 'Light Armor',
  'studded leather': 'Light Armor',
  'hide armor': 'Medium Armor',
  hide: 'Medium Armor',
  'chain shirt': 'Medium Armor',
  'scale mail': 'Medium Armor',
  breastplate: 'Medium Armor',
  'half plate armor': 'Medium Armor',
  'half plate': 'Medium Armor',
  'ring mail': 'Heavy Armor',
  'chain mail': 'Heavy Armor',
  splint: 'Heavy Armor',
  'splint armor': 'Heavy Armor',
  plate: 'Heavy Armor',
  'plate armor': 'Heavy Armor',
  shield: 'Shield'
}

export function formatItemPropertyNames(props, versatileDice = null, weaponName = '') {
  if (!Array.isArray(props)) {
    if (typeof props === 'string') props = props.split(',').map(s => s.trim())
    else return []
  }
  const wName = (weaponName || '').toLowerCase()
  const defaultRange = WEAPON_RANGE_MAP[wName] || null

  return props.map(p => {
    if (typeof p !== 'string') return ''
    const code = p.split('|')[0].trim()
    const def = PROPERTY_DEFINITIONS[code]
    const name = def ? def.name : code
    if ((code === 'V' || name.toLowerCase() === 'versatile') && versatileDice) {
      return `${name} (${versatileDice})`
    }
    if ((code === 'T' || code === 'A') && defaultRange && !name.includes('(')) {
      return `${name} (Range ${defaultRange} ft.)`
    }
    return name
  }).filter(Boolean)
}

export function getItemCategoryAndRange(item) {
  if (!item) return ''
  const name = (item.name || '').toLowerCase()
  const cat = WEAPON_CATEGORY_MAP[name] || ARMOR_CATEGORY_MAP[name]
  const range = WEAPON_RANGE_MAP[name]
  if (cat && range && !cat.includes('Ranged')) {
    return `${cat} (Range ${range} ft.)`
  }
  if (cat) return cat
  if (item.weaponCategory) {
    const isRanged = item.type === 'R' || item.range
    return `${item.weaponCategory.charAt(0).toUpperCase() + item.weaponCategory.slice(1)} ${isRanged ? 'Ranged' : 'Melee'} Weapon`
  }
  if (item.type === 'weapon' || item.itemType === 'weapon' || item.damageDice || item.dmg1) return 'Weapon'
  if (item.type === 'armor' || item.itemType === 'armor' || Number(item.ac || item.baseAc) > 0) return 'Armor'
  return ''
}

export function getItemExpandedProperties(item) {
  if (!item) return []
  const edition = item.edition || '2024'
  const rawProps = Array.isArray(item.property || item.properties)
    ? (item.property || item.properties)
    : (typeof (item.property || item.properties) === 'string' ? (item.property || item.properties).split(',').map(s => s.trim()) : [])
  const versatileDice = item.dmg2 || item.versatileDice || null
  const wName = (item.name || '').toLowerCase()
  const defaultRange = WEAPON_RANGE_MAP[wName] || null

  const result = []
  for (const p of rawProps) {
    if (typeof p !== 'string') continue
    const code = p.split('|')[0].trim()
    const def = PROPERTY_DEFINITIONS[code] || Object.values(PROPERTY_DEFINITIONS).find(d => d.name.toLowerCase() === code.toLowerCase())
    if (def) {
      let title = def.name
      if ((code === 'V' || title.toLowerCase() === 'versatile') && versatileDice) {
        title += ` (${versatileDice})`
      } else if ((code === 'T' || code === 'A') && defaultRange) {
        title += ` (Range ${defaultRange} ft.)`
      }
      const desc = def.desc[edition] || def.desc['2024'] || def.desc['2014']
      result.push({ name: title, desc })
    } else if (p.trim()) {
      result.push({ name: p.trim(), desc: '' })
    }
  }
  return result
}

export function getItemMastery(item) {
  if (!item) return null
  const m = item.mastery
  let mName = ''
  if (typeof m === 'string') mName = m.split('|')[0].trim()
  else if (Array.isArray(m) && m.length > 0) mName = String(m[0]).split('|')[0].trim()
  if (!mName) return null
  return {
    name: mName,
    desc: MASTERY_DEFINITIONS[mName] || ''
  }
}

export function getItemArmorDetails(item) {
  if (!item) return []
  const ac = Number(item.ac || item.baseAc) || 0
  const str = Number(item.strength || item.strength_requirement) || 0
  const stealthDis = !!(item.stealth || item.stealth_disadvantage)
  const isShield = (item.name || '').toLowerCase().includes('shield')

  const details = []
  if (isShield) {
    details.push({
      name: 'Shield',
      desc: 'A shield increases your Armor Class by 2 while wielded. You can benefit from only one shield at a time.'
    })
  } else if (ac > 0) {
    let desc = `Armor Class: ${ac}.`
    if (item.dexMod || item.ac_dex_bonus === 'yes') {
      desc += ' Adds Dexterity modifier.'
    }
    details.push({ name: 'Armor Class', desc })
  }

  if (str > 0) {
    details.push({
      name: 'Strength Requirement',
      desc: `Requires Strength ${str}. If the wearer has a lower Strength score, their speed is reduced by 10 feet.`
    })
  }

  if (stealthDis) {
    details.push({
      name: 'Stealth',
      desc: 'The wearer has Disadvantage on Dexterity (Stealth) checks.'
    })
  }

  return details
}

export function synthesizeItemEntries(item) {
  if (!item) return []
  const entries = []

  const props = getItemExpandedProperties(item)
  for (const p of props) {
    entries.push(p.desc ? `<b>${p.name}.</b> ${p.desc}` : `<b>${p.name}</b>`)
  }

  const mastery = getItemMastery(item)
  if (mastery) {
    entries.push(mastery.desc ? `<b>Mastery: ${mastery.name}.</b> ${mastery.desc}` : `<b>Mastery: ${mastery.name}</b>`)
  }

  const armorDetails = getItemArmorDetails(item)
  for (const a of armorDetails) {
    entries.push(`<b>${a.name}.</b> ${a.desc}`)
  }

  return entries
}
