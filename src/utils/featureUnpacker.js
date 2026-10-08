// Utility to unpack nested feature entries into standalone cards

export const parseRawEntries = (entries) => {
  if (!entries) return []
  if (Array.isArray(entries)) return entries
  // ponytail: unwrap up to 5 levels of stringified JSON; upgrade to recursive parser if compendium nesting increases
  let current = entries
  let depth = 0
  while (typeof current === 'string' && depth < 5) {
    const trimmed = current.trim()
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        current = JSON.parse(trimmed)
        depth++
      } catch (_) {
        return [current]
      }
    } else {
      return [current]
    }
  }
  return Array.isArray(current) ? current : [current]
}

export const unpackFeatureEntries = (feat) => {
  if (!feat) return []
  const rawList = parseRawEntries(feat.entries)
  if (!rawList.length) return [feat]

  const extracted = []
  const remaining = []

  const processEntry = (entry) => {
    if (!entry) return
    if (typeof entry === 'string') {
      const parsed = parseRawEntries(entry)
      if (parsed.length > 0 && typeof parsed[0] === 'object') {
        for (const sub of parsed) {
          processEntry(sub)
        }
        return
      }
      remaining.push(entry)
      return
    }

    // Named sub-feature (e.g. Giant Power, Frenzy, Totem Spirit)
    if (
      entry.name &&
      typeof entry.name === 'string' &&
      (entry.type === 'entries' || Array.isArray(entry.entries)) &&
      entry.type !== 'options' &&
      entry.type !== 'table'
    ) {
      extracted.push({
        ...feat,
        ...entry,
        id: entry.id || `${feat.id || feat.name}_${entry.name}`,
        name: entry.name,
        level: feat.level || 1,
        isSubclass: feat.isSubclass || feat._fromSubclass || false,
        _fromSubclass: feat._fromSubclass || feat.isSubclass || false,
        _fromClass: feat._fromClass || false,
        subclassName: feat.subclassName || entry.subclassName,
        subclassShortName: feat.subclassShortName || entry.subclassShortName,
        source: entry.source || feat.source,
        entries: parseRawEntries(entry.entries)
      })
      return
    }

    // Unnamed container wrapper { type: 'entries', entries: [...] }
    if (!entry.name && (entry.type === 'entries' || (!entry.type && Array.isArray(entry.entries))) && Array.isArray(entry.entries)) {
      for (const sub of entry.entries) {
        processEntry(sub)
      }
      return
    }

    remaining.push(entry)
  }

  for (const item of rawList) {
    processEntry(item)
  }

  const result = []

  // Check if remaining entries have actual content beyond just a feature level tag
  const hasRealContent = remaining.some(e => {
    if (!e) return false
    if (typeof e === 'string') {
      const stripped = e.replace(/\{@i\s+[^}]+\}/gi, '').trim()
      return stripped.length > 0
    }
    return true
  })

  if (hasRealContent) {
    result.push({
      ...feat,
      entries: remaining
    })
  }

  for (const ext of extracted) {
    result.push(...unpackFeatureEntries(ext))
  }

  return result
}

export const unpackFeatureList = (list) => {
  if (!Array.isArray(list)) return []
  const allUnpacked = []
  for (const item of list) {
    allUnpacked.push(...unpackFeatureEntries(item))
  }

  const seen = new Set()
  const unique = []
  for (const f of allUnpacked) {
    if (!f || !f.name) continue
    const key = `${f.name.trim().toLowerCase()}_${Number(f.level) || 1}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(f)
  }

  return unique
}
