import { ref, computed } from 'vue'
import axios from 'axios'
import { clean5eToolsMarkup } from '../../utils/textRenderer'
import { unpackFeatureList } from '../../utils/featureUnpacker'

export function useVttFeatures({
  char,
  API_URL,
  fullSubclassFeatures = ref([]),
  charClassName = ref(''),
  getCharClassLevel = () => 0,
  charSubClasses = ref([])
}) {
  const fetchFeatDetailsIfNeeded = async (ft) => {
    if (!ft || (ft.entries && ft.entries.length > 0)) return
    const rawName = ft.name || ''
    const baseName = rawName.split(/[-;(]/)[0].trim()
    if (!baseName) return
    try {
      const res = await axios.get(`${API_URL}/compendium/feats`, {
        params: {
          search: baseName,
          edition: char.value.edition || '2024'
        }
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      const match = list.find(f => (f.name || '').toLowerCase() === baseName.toLowerCase()) || list[0]
      if (match && match.entries) {
        ft.entries = match.entries
      }
    } catch (e) {
      console.warn('Could not auto-fetch feat details:', e.message)
    }
  }

  // Active character sources & optional features filtering
  const activeCharSources = computed(() => {
    const sources = new Set()
    if (char.value?.edition === '2024') sources.add('XPHB')
    else sources.add('PHB')
    const classes = Array.isArray(char.value?.class) ? char.value.class : (char.value?.class ? [char.value.class] : [])
    classes.forEach(c => {
      if (c?.source) sources.add(c.source.toUpperCase())
    })
    const subClasses = Array.isArray(char.value?.sub_class) ? char.value.sub_class : (char.value?.sub_class ? [char.value.sub_class] : [])
    subClasses.forEach(sc => {
      if (sc?.source) sources.add(sc.source.toUpperCase())
    })
    if (char.value?.race?.source) sources.add(char.value.race.source.toUpperCase())
    return sources
  })

  const isOptionalFeature = (feat) => {
    if (!feat) return false
    if (feat.isClassFeatureVariant || feat.isOptional || feat.optional) return true
    if (typeof feat.name === 'string' && /\boptional\b/i.test(feat.name)) return true
    const entriesStr = typeof feat.entries === 'string' ? feat.entries : JSON.stringify(feat.entries || [])
    const lower = entriesStr.toLowerCase()
    return (
      lower.includes('optional class feature') ||
      lower.includes('optional feature') ||
      lower.includes('variantrule optional') ||
      lower.includes('{@variantrule optional')
    )
  }

  const filteredClassFeatures = computed(() => {
    const list = char.value?.class_feature || []
    return list.filter(cf => {
      if (!cf?.source) return true
      const src = cf.source.toUpperCase()
      if (isOptionalFeature(cf) && !activeCharSources.value.has(src)) return false
      return true
    })
  })

  const filteredSubClassFeatures = computed(() => {
    let list = Array.isArray(char.value?.sub_class_feature) ? [...char.value.sub_class_feature] : []

    // Supplement with fullSubclassFeatures if available
    if (fullSubclassFeatures.value?.length > 0) {
      const existingNames = new Set(list.map(f => (f?.name || '').trim().toLowerCase()))
      for (const sf of fullSubclassFeatures.value) {
        const clsName = sf.className || charClassName.value
        const maxLvl = getCharClassLevel(clsName) || Number(char.value?.level) || 1
        const sfLvl = Number(sf.level || 1)
        if (sfLvl <= maxLvl) {
          const sName = (sf?.name || '').trim().toLowerCase()
          if (!existingNames.has(sName)) {
            list.push(sf)
            existingNames.add(sName)
          }
        }
      }
    }

    const seen = new Set()
    const scNames = new Set((charSubClasses.value || []).map(sc => (sc?.name || sc?.short_name || '').trim().toLowerCase()))

    const hasOtherAtLevel = (fName, fLevel) => {
      return list.some(other => {
        const oName = (other?.name || '').trim().toLowerCase()
        return oName !== fName && Number(other?.level) === Number(fLevel) && !scNames.has(oName)
      })
    }

    const result = []
    for (const scf of list) {
      const name = (scf?.name || '').trim().toLowerCase()
      if (!name || seen.has(name)) continue

      // Skip intro feature container if there are distinct specific features at this level
      if (scNames.has(name) && hasOtherAtLevel(name, scf.level)) {
        continue
      }

      if (scf?.source) {
        const src = scf.source.toUpperCase()
        if (isOptionalFeature(scf) && !activeCharSources.value.has(src)) continue
      }

      let scfEntries = scf.entries
      if (!scfEntries || scfEntries.length === 0) {
        const fallback = fullSubclassFeatures.value?.find(sf => (sf?.name || '').trim().toLowerCase() === name)
        if (fallback?.entries?.length) scfEntries = fallback.entries
      }

      seen.add(name)
      result.push({
        ...scf,
        entries: scfEntries
      })
    }
    return result
  })

  const combinedClassFeatures = computed(() => {
    const cFeats = (filteredClassFeatures.value || []).map(f => ({
      ...f,
      isSubclass: false
    }))
    const scFeats = (filteredSubClassFeatures.value || []).map(f => ({
      ...f,
      isSubclass: true
    }))

    const unpacked = unpackFeatureList([...cFeats, ...scFeats]).map(f => ({
      ...f,
      _key: (f.isSubclass ? 'scf_' : 'cf_') + (f.id || f.name)
    }))

    return unpacked.sort((a, b) => {
      const lvlA = Number(a.level) || 0
      const lvlB = Number(b.level) || 0
      if (lvlA !== lvlB) return lvlA - lvlB
      if (a.isSubclass !== b.isSubclass) return a.isSubclass ? 1 : -1
      return (a.name || '').localeCompare(b.name || '')
    })
  })

  const unpackedTraits = computed(() => {
    return unpackFeatureList(char.value?.trait || []).map(t => ({
      ...t,
      _key: 'tr_' + (t.id || t.name)
    }))
  })

  // Features expand/collapse state
  const expandedFeatures = ref({})
  const toggleFeature = (id) => {
    expandedFeatures.value[id] = !expandedFeatures.value[id]
    if (expandedFeatures.value[id] && id.startsWith('ft_')) {
      const ft = (char.value?.feat || []).find(f => 'ft_' + (f.id || f.name) === id)
      if (ft) fetchFeatDetailsIfNeeded(ft)
    }
  }
  const expandAllFeatures = (allKeys) => {
    const current = Object.values(expandedFeatures.value).some(Boolean)
    allKeys.forEach(k => {
      expandedFeatures.value[k] = !current
    })
  }

  const cleanProficiencyName = (raw) => {
    if (typeof raw !== 'string') return ''
    let cleaned = clean5eToolsMarkup(raw)
    cleaned = cleaned.replace(/s\s+Weapons$/i, 's').replace(/\s+Weapons$/i, '')
    if (/^horn$/i.test(cleaned)) return 'Horn (Musical Instrument)'
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  // Collect all feature keys for expand all
  const allFeatureKeys = computed(() => {
    const keys = []
    ;(combinedClassFeatures.value || []).forEach(f => keys.push(f._key))
    ;(unpackedTraits.value || []).forEach(f => keys.push(f._key || 'tr_' + (f.id || f.name)))
    ;(char.value?.feature || []).forEach(f => keys.push('bf_' + (f.id || f.name)))
    ;(char.value?.feat || []).forEach(f => keys.push('ft_' + (f.id || f.name)))
    return keys
  })

  return {
    fetchFeatDetailsIfNeeded,
    activeCharSources,
    isOptionalFeature,
    filteredClassFeatures,
    filteredSubClassFeatures,
    combinedClassFeatures,
    unpackedTraits,
    expandedFeatures,
    toggleFeature,
    expandAllFeatures,
    cleanProficiencyName,
    allFeatureKeys
  }
}
