import { ref, computed } from 'vue'
import {
  CORE_SOURCES_2024,
  EXPANDED_SOURCES_2024,
  CORE_SOURCES_2014,
  EXPANDED_SOURCES_2014,
  SOURCE_LABELS
} from '../../constants/sourceConstants'

export function useCompendiumSources({ currentEdition }) {
  const getDefaultSources = (edition) => {
    return edition === '2024' ? [...CORE_SOURCES_2024] : [...CORE_SOURCES_2014]
  }

  const selectedSources = ref(getDefaultSources(currentEdition.value))
  const isSourceDropdownOpen = ref(false)
  const sourceDropdownRef = ref(null)

  const currentCoreSourceList = computed(() => {
    return currentEdition.value === '2024' ? CORE_SOURCES_2024 : CORE_SOURCES_2014
  })

  const currentExpandedSourceList = computed(() => {
    return currentEdition.value === '2024' ? EXPANDED_SOURCES_2024 : EXPANDED_SOURCES_2014
  })

  const currentAllSources = computed(() => {
    return [...currentCoreSourceList.value, ...currentExpandedSourceList.value]
  })

  const isSourceSelected = (code) => {
    return selectedSources.value.includes(code)
  }

  const toggleSource = (code) => {
    const idx = selectedSources.value.indexOf(code)
    if (idx !== -1) {
      if (selectedSources.value.length > 1) {
        selectedSources.value.splice(idx, 1)
      }
    } else {
      selectedSources.value.push(code)
    }
  }

  const setSourcesSelectAll = () => {
    selectedSources.value = [...currentAllSources.value]
  }

  const setSourcesCoreOnly = () => {
    selectedSources.value = [...currentCoreSourceList.value]
  }

  const clearAllSources = () => {
    selectedSources.value = [currentCoreSourceList.value[0]]
  }

  const sourceDropdownLabel = computed(() => {
    const total = currentAllSources.value.length
    const count = selectedSources.value.length
    if (count === total) return 'All Sources'
    const coreCount = currentCoreSourceList.value.length
    const isOnlyCore = count === coreCount && currentCoreSourceList.value.every(s => selectedSources.value.includes(s))
    if (isOnlyCore) return 'Core Only'
    if (count === 1) return selectedSources.value[0]
    return `${count} Sources`
  })

  return {
    selectedSources,
    isSourceDropdownOpen,
    sourceDropdownRef,
    currentCoreSourceList,
    currentExpandedSourceList,
    currentAllSources,
    isSourceSelected,
    toggleSource,
    setSourcesSelectAll,
    setSourcesCoreOnly,
    clearAllSources,
    sourceDropdownLabel,
    getDefaultSources,
    SOURCE_LABELS
  }
}
