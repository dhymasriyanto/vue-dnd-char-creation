import { ref } from 'vue'

const isOpen = ref(false)
const modalTitle = ref('')
const modalCategory = ref('spells') // 'spells' | 'items' | 'feats'
const modalParams = ref({})
const modalDisplay = ref('')

export function useCompendiumModal() {
  const openCompendiumModal = ({ title = '', category = 'spells', params = {}, display = '' } = {}) => {
    modalTitle.value = title || display || 'Compendium Browser'
    modalCategory.value = (category || 'spells').toLowerCase()
    modalParams.value = params || {}
    modalDisplay.value = display || title || ''
    isOpen.value = true
  }

  const closeCompendiumModal = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    modalTitle,
    modalCategory,
    modalParams,
    modalDisplay,
    openCompendiumModal,
    closeCompendiumModal,
    closeModal: closeCompendiumModal
  }
}
