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
