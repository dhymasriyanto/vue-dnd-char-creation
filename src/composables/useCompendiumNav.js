import { ref } from 'vue'

const isCompendiumOpen = ref(false)
const compendiumCategory = ref('spells') // 'all' | 'spells' | 'items' | 'feats' | 'rules' | 'optionalfeatures'
const compendiumSearch = ref('')
const compendiumParams = ref({})
const compendiumSelectedItem = ref(null)

export function useCompendiumNav() {
  const openCompendium = ({ category = 'spells', search = '', params = {}, item = null } = {}) => {
    compendiumCategory.value = (category || 'spells').toLowerCase()
    compendiumSearch.value = search || ''
    compendiumParams.value = params || {}
    compendiumSelectedItem.value = item || null
    isCompendiumOpen.value = true
  }

  const closeCompendium = () => {
    isCompendiumOpen.value = false
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
