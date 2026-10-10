import { ref } from 'vue'
import axios from 'axios'

export function useCompendiumHomebrew({
  API_URL,
  currentEdition,
  activeTab,
  rawList,
  selectedItem,
  fetchData
}) {
  const showHomebrewModal = ref(false)
  const homebrewCategory = ref('spell')
  const isSavingHomebrew = ref(false)
  const homebrewError = ref('')
  const homebrewToast = ref('')

  const homebrewForm = ref({
    name: '',
    // spell
    level: 1,
    school: 'evocation',
    casting_time: '1 action',
    range: '60 ft.',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    damage_type: '',
    damage_dice: '',
    save_ability: '',
    classes: '',
    // item
    item_type: 'gear',
    rarity: 'none',
    cost_cp: 0,
    weight: '1',
    base_ac: 10,
    ac_dex_bonus: false,
    // monster
    cr: '1',
    size: 'M',
    type: 'humanoid',
    alignment: 'U',
    ac: 10,
    hp: 10,
    speed: 30,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    // feat
    category: 'G',
    prerequisite: '',
    repeatable: false,
    // subclass
    class_name: 'Fighter',
    short_name: '',
    spellcasting_ability: '',
    // subrace
    race_name: 'Elf',
    // common
    entries: ''
  })

  const openCreateHomebrew = () => {
    homebrewError.value = ''
    const catMap = {
      spells: 'spell',
      items: 'item',
      monsters: 'monster',
      feats: 'feat',
      classes: 'subclass',
      races: 'subrace'
    }
    homebrewCategory.value = catMap[activeTab.value] || 'spell'
    showHomebrewModal.value = true
  }

  const submitHomebrew = async () => {
    if (!homebrewForm.value.name.trim()) {
      homebrewError.value = 'Name is required'
      return
    }
    isSavingHomebrew.value = true
    homebrewError.value = ''
    try {
      const cat = homebrewCategory.value
      const f = homebrewForm.value
      const data = {
        name: f.name.trim(),
        source: 'Homebrew',
        edition: currentEdition.value,
        entries: f.entries ? f.entries.split('\n\n').filter(Boolean) : []
      }

      if (cat === 'spell') {
        data.level = Number(f.level) || 0
        data.school = f.school
        data.casting_time = f.casting_time
        data.range = f.range
        data.components = f.components
        data.duration = f.duration
        data.concentration = Boolean(f.concentration)
        data.ritual = Boolean(f.ritual)
        data.damage_type = f.damage_type || null
        data.damage_dice = f.damage_dice || null
        data.save_ability = f.save_ability || null
        data.classes = f.classes ? f.classes.split(',').map(s => s.trim()).filter(Boolean) : []
      } else if (cat === 'item') {
        data.item_type = f.item_type
        data.rarity = f.rarity
        data.cost_cp = Number(f.cost_cp) || 0
        data.weight = f.weight || null
        data.damage_dice = f.damage_dice || null
        data.damage_type = f.damage_type || null
        data.base_ac = Number(f.base_ac) || null
        data.ac_dex_bonus = Boolean(f.ac_dex_bonus)
        data.equip_type = f.item_type === 'weapon' ? 'weapon' : (f.item_type === 'armor' ? 'armor' : null)
      } else if (cat === 'monster') {
        data.cr = String(f.cr || '1')
        data.size = f.size || 'M'
        data.type = f.type || 'humanoid'
        data.alignment = f.alignment || 'U'
        data.ac = Number(f.ac) || 10
        data.hp = Number(f.hp) || 10
        data.speed = Number(f.speed) || 30
        data.str = Number(f.str) || 10
        data.dex = Number(f.dex) || 10
        data.con = Number(f.con) || 10
        data.int = Number(f.int) || 10
        data.wis = Number(f.wis) || 10
        data.cha = Number(f.cha) || 10
      } else if (cat === 'feat') {
        data.category = f.category || 'G'
        data.prerequisite = f.prerequisite || null
        data.repeatable = Boolean(f.repeatable)
      } else if (cat === 'subclass') {
        data.class_name = f.class_name
        data.short_name = f.short_name || f.name
        data.spellcasting_ability = f.spellcasting_ability || null
      } else if (cat === 'subrace') {
        data.race_name = f.race_name
      }

      await axios.post(`${API_URL}/compendium/homebrew`, {
        category: cat,
        data
      })

      showHomebrewModal.value = false
      homebrewToast.value = `${f.name} saved to Homebrew!`
      setTimeout(() => { homebrewToast.value = '' }, 3000)
      if (typeof fetchData === 'function') fetchData()
    } catch (err) {
      homebrewError.value = err.response?.data?.message || err.message
    } finally {
      isSavingHomebrew.value = false
    }
  }

  const deleteHomebrewItem = async (item) => {
    if (!item || item.source !== 'Homebrew' || !item.id) return
    if (!confirm(`Are you sure you want to delete homebrew "${item.name}"?`)) return
    try {
      const catMap = {
        spells: 'spell',
        items: 'item',
        monsters: 'monster',
        feats: 'feat',
        classes: 'subclass',
        races: 'subrace'
      }
      const cat = catMap[item._category] || item._category || activeTab.value.replace(/s$/, '')
      await axios.delete(`${API_URL}/compendium/homebrew/${cat}/${item.id}`)
      rawList.value = rawList.value.filter(i => i.id !== item.id)
      if (selectedItem.value?.id === item.id) {
        selectedItem.value = rawList.value[0] || null
      }
      homebrewToast.value = `Homebrew ${item.name} deleted`
      setTimeout(() => { homebrewToast.value = '' }, 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete homebrew')
    }
  }

  return {
    showHomebrewModal,
    homebrewCategory,
    isSavingHomebrew,
    homebrewError,
    homebrewToast,
    homebrewForm,
    openCreateHomebrew,
    submitHomebrew,
    deleteHomebrewItem
  }
}
