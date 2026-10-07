import { ref } from 'vue'

const isCompendiumOpen = ref(false)
const compendiumCategory = ref('spells') // 'all' | 'spells' | 'items' | 'feats' | 'rules' | 'optionalfeatures'
const compendiumSearch = ref('')
const compendiumParams = ref({})
const compendiumSelectedItem = ref(null)

export function useCompendiumNav() {
  const openCompendium = ({ category = 'spells', search = '', params = {}, item = null, updateUrl = true } = {}) => {
    compendiumCategory.value = (category || 'spells').toLowerCase()
    compendiumSearch.value = search || ''
    compendiumParams.value = params || {}
    compendiumSelectedItem.value = item || null
    isCompendiumOpen.value = true

    if (updateUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.origin + window.location.pathname)
      url.searchParams.set('compendium', '1')
      if (category && category !== 'all') {
        url.searchParams.set('tab', category)
      }
      if (search) {
        url.searchParams.set('search', search)
      }
      window.history.pushState({ view: 'compendium', fromApp: true }, '', url.toString())
    }
  }

  const closeCompendium = (updateUrl = false) => {
    isCompendiumOpen.value = false
    if (updateUrl && typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.has('compendium')) {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          const url = new URL(window.location.origin + window.location.pathname)
          window.history.replaceState({ view: 'list' }, '', url.toString())
        }
      }
    }
  }

  return {
    isCompendiumOpen,
    compendiumCategory,
    compendiumSearch,
    compendiumParams,
    compendiumSelectedItem,
    openCompendium,
    closeCompendium
  }
}
