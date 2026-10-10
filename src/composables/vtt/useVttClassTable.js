import { ref, computed, watch } from 'vue'
import axios from 'axios'

export function useVttClassTable({
  char,
  API_URL,
  activeTab,
  charClassesList,
  charClassName,
  getCharClassLevel
}) {
  const classTableData = ref(null)
  const isLoadingClassTable = ref(false)
  const selectedClassTableClass = ref('')
  const inspectingFeature = ref(null)
  const fullSubclassFeatures = ref([])

  const availableClassNames = computed(() => {
    const list = []
    const classes = charClassesList?.value || []
    if (Array.isArray(classes) && classes.length > 0) {
      classes.forEach(c => {
        const name = c?.name || c?.class?.name || (typeof c === 'string' ? c : '')
        if (name && !list.includes(name)) list.push(name)
      })
    }
    const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    if (list.length === 0 && defClass) {
      list.push(defClass)
    }
    return list
  })

  const charSubClasses = computed(() => {
    if (!char.value) return []
    if (Array.isArray(char.value.sub_class)) return char.value.sub_class
    if (char.value.sub_class) return [char.value.sub_class]
    if (Array.isArray(char.value.sub_classes)) return char.value.sub_classes
    return []
  })

  const currentTableSubclass = computed(() => {
    const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    const currentClsName = (selectedClassTableClass.value || availableClassNames.value[0] || defClass || '').trim().toLowerCase()
    const classes = charClassesList?.value || []
    const subClasses = charSubClasses.value

    const matchingClass = classes.find(c => {
      const cName = (c?.name || c?.class?.name || (typeof c === 'string' ? c : '')).trim().toLowerCase()
      return cName === currentClsName
    })

    if (matchingClass && matchingClass.id) {
      const matchByClassId = subClasses.find(sc => String(sc.class_id) === String(matchingClass.id))
      if (matchByClassId) return matchByClassId
    }

    const cIdx = classes.findIndex(c => {
      const cName = (c?.name || c?.class?.name || (typeof c === 'string' ? c : '')).trim().toLowerCase()
      return cName === currentClsName
    })
    if (cIdx >= 0 && subClasses[cIdx]) {
      return subClasses[cIdx]
    }

    if (subClasses.length > 0) {
      return subClasses[0]
    }
    return null
  })

  const currentClassTableLevel = computed(() => {
    const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    const cls = selectedClassTableClass.value || availableClassNames.value[0] || defClass
    return typeof getCharClassLevel === 'function' ? getCharClassLevel(cls) : 1
  })

  const fetchSubclassProgression = async () => {
    const subClasses = charSubClasses.value
    if (!subClasses || subClasses.length === 0) return

    const edition = char.value?.edition || '2024'
    const classes = charClassesList?.value || []
    const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    const collected = []

    for (let idx = 0; idx < subClasses.length; idx++) {
      const sc = subClasses[idx]
      const scName = sc?.name || sc?.short_name || ''
      if (!scName) continue

      const parentClass = classes.find(c => {
        const cId = c?.id || c?.class?.id
        return cId && sc?.class_id && String(cId) === String(sc.class_id)
      }) || classes[idx]
      const className = parentClass?.name || parentClass?.class?.name || (typeof parentClass === 'string' ? parentClass : '') || defClass || ''

      try {
        const res = await axios.get(`${API_URL}/compendium/subclass-detail`, {
          params: {
            name: scName,
            class_name: className,
            edition
          }
        })
        if (res.data?.data?.features) {
          res.data.data.features.forEach(f => {
            collected.push({
              ...f,
              subclassName: scName,
              subclassId: sc.id || res.data.data.id,
              className: className
            })
          })
        }
      } catch (err) {
        console.warn('Failed to fetch subclass detail for', scName, err)
      }
    }

    if (collected.length > 0) {
      fullSubclassFeatures.value = collected
    }
  }

  const getSubclassFeaturesForLevel = (lvl) => {
    const sc = currentTableSubclass.value
    if (!sc) return []
    const scName = (sc.name || sc.short_name || '').trim().toLowerCase()

    let list = fullSubclassFeatures.value.filter(f => {
      const fScName = (f.subclassName || '').trim().toLowerCase()
      const matchesSc = !fScName || fScName === scName || (f.subclassId && sc.id && String(f.subclassId) === String(sc.id))
      return matchesSc && Number(f.level) === Number(lvl)
    })

    if (list.length === 0 && Array.isArray(char.value?.sub_class_feature)) {
      list = char.value.sub_class_feature.filter(f => {
        const matchesSc = !f.sub_class_id || !sc.id || String(f.sub_class_id) === String(sc.id)
        return matchesSc && Number(f.level) === Number(lvl)
      })
    }

    const seen = new Set()
    const result = []
    const hasSpecificFeatures = list.some(f => (f.name || '').trim().toLowerCase() !== scName)

    for (const f of list) {
      const name = (f.name || '').trim().toLowerCase()
      if (!name || seen.has(name)) continue
      if (name === scName && hasSpecificFeatures) continue
      seen.add(name)
      result.push(f)
    }

    return result
  }

  const isSubclassFeatureName = (name) => {
    if (!name || typeof name !== 'string') return false
    const lower = name.toLowerCase()
    return (
      lower.includes('subclass feature') ||
      lower.includes('tradition feature') ||
      lower.includes('path feature') ||
      lower.includes('archetype feature') ||
      lower.includes('domain feature') ||
      lower.includes('circle feature') ||
      lower.includes('college feature') ||
      lower.includes('oath feature') ||
      lower.includes('patron feature') ||
      lower.includes('origin feature') ||
      lower.includes('specialist feature') ||
      lower.includes('specialty feature') ||
      lower.includes('conclave feature') ||
      Boolean(classTableData.value?.subclassTitle && lower.includes(classTableData.value.subclassTitle.toLowerCase()))
    )
  }

  const fetchClassTable = async () => {
    const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
    const cls = selectedClassTableClass.value || availableClassNames.value[0] || defClass
    if (!cls) return
    isLoadingClassTable.value = true
    try {
      const edition = char.value?.edition || '2024'
      const res = await axios.get(`${API_URL}/compendium/class-table`, {
        params: { name: cls, edition }
      })
      if (res.data?.data) {
        classTableData.value = res.data.data
      }
    } catch (err) {
      console.error('Failed to fetch class table:', err)
    } finally {
      isLoadingClassTable.value = false
    }
  }

  const toggleFeatureDetail = (feat, level) => {
    const featLevel = level || feat.level
    if (inspectingFeature.value?.name === feat.name && inspectingFeature.value?.level === featLevel) {
      inspectingFeature.value = null
      return
    }

    const subFeaturesAtLevel = getSubclassFeaturesForLevel(featLevel)
    const isScPlaceholder = isSubclassFeatureName(feat.name)

    if (isScPlaceholder && subFeaturesAtLevel.length > 0) {
      const sc = currentTableSubclass.value
      inspectingFeature.value = {
        ...feat,
        name: feat.name,
        level: featLevel,
        isSubclass: true,
        subclassTitle: sc?.name || 'Subclass',
        subclassFeatures: subFeaturesAtLevel
      }
    } else {
      inspectingFeature.value = {
        ...feat,
        level: featLevel
      }
    }
  }

  const toggleSubclassFeatureDetail = (scf, level) => {
    const featLevel = level || scf.level
    if (inspectingFeature.value?.name === scf.name && inspectingFeature.value?.level === featLevel) {
      inspectingFeature.value = null
    } else {
      inspectingFeature.value = {
        ...scf,
        level: featLevel,
        isSubclass: true
      }
    }
  }

  if (activeTab) {
    watch(activeTab, (tab) => {
      const defClass = typeof charClassName === 'function' ? charClassName() : (charClassName?.value || '')
      if (tab === 'class_table') {
        if (!selectedClassTableClass.value) {
          selectedClassTableClass.value = availableClassNames.value[0] || defClass
        }
        fetchClassTable()
        fetchSubclassProgression()
      } else if (tab === 'features') {
        fetchSubclassProgression()
      }
    })
  }

  watch(selectedClassTableClass, (newVal) => {
    if (activeTab?.value === 'class_table' && newVal) {
      fetchClassTable()
      fetchSubclassProgression()
    }
  })

  watch(() => char.value?.sub_class, () => {
    fetchSubclassProgression()
  }, { deep: true })

  return {
    classTableData,
    isLoadingClassTable,
    selectedClassTableClass,
    inspectingFeature,
    fullSubclassFeatures,
    availableClassNames,
    charSubClasses,
    currentTableSubclass,
    currentClassTableLevel,
    fetchSubclassProgression,
    getSubclassFeaturesForLevel,
    isSubclassFeatureName,
    fetchClassTable,
    toggleFeatureDetail,
    toggleSubclassFeatureDetail
  }
}
