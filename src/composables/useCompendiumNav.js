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
      const basePath = window.location.pathname.replace(/\/compendium.*$/i, '').replace(/\/character\/.*$/i, '').replace(/\/campaign\/.*$/i, '').replace(/\/$/, '')
      let targetPath = `${basePath}/compendium`
      if (category && category !== 'all') {
        targetPath += `/${category.toLowerCase()}`
        const itemName = item?.name || search
        if (itemName) {
          const slug = String(itemName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          if (slug) targetPath += `/${slug}`
        }
      }
      window.history.pushState({ view: 'compendium', fromApp: true }, '', `${window.location.origin}${targetPath}`)
    }
  }

  const closeCompendium = (updateUrl = false) => {
    isCompendiumOpen.value = false
    if (updateUrl && typeof window !== 'undefined') {
      if (window.location.pathname.includes('/compendium')) {
        const cleanPath = window.location.pathname.replace(/\/compendium.*$/i, '') || '/'
        window.history.pushState({ view: 'list' }, '', `${window.location.origin}${cleanPath}`)
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
