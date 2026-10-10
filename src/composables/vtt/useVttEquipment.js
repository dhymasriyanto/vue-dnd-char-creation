import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { WEAPON_DEFINITIONS } from '../../constants/weaponConstants'

export function useVttEquipment({ char, vtt, isReadOnly, API_URL, currentArmorClass }) {
  // --- Currency State & Logic ---
  const getInitialCurrency = () => {
    const tr = char.value?.treasure || char.value?.treasures || {}
    return {
      cp: Number(tr.cp ?? 0),
      sp: Number(tr.sp ?? 0),
      ep: Number(tr.ep ?? 0),
      gp: Number(tr.gp ?? 0),
      pp: Number(tr.pp ?? 0)
    }
  }

  const currency = ref(getInitialCurrency())

  watch(() => [char.value?.treasure, char.value?.treasures], () => {
    currency.value = getInitialCurrency()
  }, { deep: true, immediate: true })

  const isSavingCurrency = ref(false)
  const currencySavedToast = ref(false)

  const saveCurrency = async () => {
    if (isReadOnly.value) return
    if (!char.value?.id) return
    isSavingCurrency.value = true
    try {
      await axios.put(`${API_URL}/character/${char.value.id}`, {
        currency: currency.value
      })
      currencySavedToast.value = true
      setTimeout(() => { currencySavedToast.value = false }, 2000)
    } catch (err) {
      console.error('Failed to save currency', err)
    } finally {
      isSavingCurrency.value = false
    }
  }

  const adjustCurrency = (coin, delta) => {
    currency.value[coin] = Math.max(0, (Number(currency.value[coin]) || 0) + delta)
    saveCurrency()
  }

  // --- Equipment State & Container Management ---
  const liveEquipment = ref([])

  const DEFAULT_CONTAINER_CAPACITIES = {
    chest: 300,
    backpack: 30,
    sack: 30,
    pouch: 6,
    'bag of holding': 500,
    basket: 40,
    barrel: 400,
    saddlebag: 30,
    'component pouch': 4
  }

  const getContainerCapacity = (item) => {
    if (!item) return null
    if (item.container_capacity) return Number(item.container_capacity)
    const nameLower = (item.name || '').toLowerCase()
    for (const [key, cap] of Object.entries(DEFAULT_CONTAINER_CAPACITIES)) {
      if (nameLower.includes(key)) return cap
    }
    return null
  }

  const isContainerItem = (item) => {
    if (!item) return false
    if (item.equip_type === 'container') return true
    const nameLower = (item.name || '').toLowerCase()
    return Boolean(getContainerCapacity(item)) || ['chest', 'backpack', 'pouch', 'sack', 'bag of holding', 'barrel', 'basket'].some(k => nameLower.includes(k))
  }

  const getItemEquipType = (item) => {
    if (!item) return null
    if (item.equip_type) return item.equip_type

    const nameLower = (item.name || '').toLowerCase()
    const type = (item.item_type || item.type || '').toLowerCase()

    if (isContainerItem(item)) return 'container'
    if (nameLower.includes('shield')) return 'shield'
    if (item.is_armor || type === 'armor' || nameLower.includes('armor')) return 'armor'

    const key = nameLower.replace(/['’]/g, '').replace(/[\s-]+/g, '_')
    const isWeapon = type === 'weapon' || Boolean(item.damage_dice || item.damageDice || item.dmg1) || Boolean(WEAPON_DEFINITIONS[key]) || Object.keys(WEAPON_DEFINITIONS).some(k => nameLower.includes(k))
    if (isWeapon) return 'weapon'

    const wearableKeywords = ['ring', 'cloak', 'boots', 'bracers', 'robe', 'belt', 'helm', 'helmet', 'hat', 'circlet', 'goggles', 'amulet', 'necklace', 'gloves', 'gauntlets', 'clothes', 'suit']
    if (type === 'wondrous' || wearableKeywords.some(k => nameLower.includes(k))) return 'wearable'

    return null
  }

  const isItemEquippable = (item) => {
    const eqType = getItemEquipType(item)
    return eqType === 'weapon' || eqType === 'armor' || eqType === 'shield' || eqType === 'wearable'
  }

  const availableContainers = computed(() => {
    return liveEquipment.value.filter(eq => isContainerItem(eq) && (eq.name || '').toLowerCase() !== 'backpack')
  })

  const equippedCount = computed(() => {
    return liveEquipment.value.filter(eq => eq.status === 'equipped').length
  })

  const backpackCount = computed(() => {
    return liveEquipment.value.filter(eq => eq.status !== 'equipped' && (!eq.container_name || eq.container_name.toLowerCase() === 'backpack')).length
  })

  const getContainerCurrentWeight = (containerName) => {
    if (!containerName) return 0
    const nameLower = containerName.toLowerCase()
    return liveEquipment.value
      .filter(eq => (eq.container_name || '').toLowerCase() === nameLower)
      .reduce((sum, eq) => sum + ((parseFloat(eq.weight) || 0) * (parseInt(eq.amount) || 1)), 0)
  }

  const selectedContainerFilter = ref('all')

  const currentActiveContainer = computed(() => {
    if (selectedContainerFilter.value === 'all' || selectedContainerFilter.value === 'equipped' || selectedContainerFilter.value === 'backpack') return null
    return availableContainers.value.find(c => c.name.toLowerCase() === selectedContainerFilter.value.toLowerCase()) || null
  })

  const filteredEquipment = computed(() => {
    if (selectedContainerFilter.value === 'all') {
      return liveEquipment.value
    }
    if (selectedContainerFilter.value === 'equipped') {
      return liveEquipment.value.filter(eq => eq.status === 'equipped')
    }
    if (selectedContainerFilter.value === 'backpack') {
      return liveEquipment.value.filter(eq => eq.status !== 'equipped' && (!eq.container_name || eq.container_name.toLowerCase() === 'backpack'))
    }
    const target = selectedContainerFilter.value.toLowerCase()
    return liveEquipment.value.filter(eq => (eq.container_name || '').toLowerCase() === target)
  })

  const setItemContainer = (item, containerName) => {
    item.container_name = containerName || null
    if (containerName) {
      item.status = 'inventory'
    }
    saveEquipment()
  }

  const initEquipment = () => {
    const eq = char.value?.equipment || char.value?.equipments || []
    liveEquipment.value = Array.isArray(eq) ? JSON.parse(JSON.stringify(eq)) : []
  }

  initEquipment()
  watch(() => [char.value?.equipment, char.value?.equipments], () => {
    initEquipment()
  }, { deep: true })

  const isSavingEquipment = ref(false)
  const equipmentSavedToast = ref(false)

  const saveEquipment = async () => {
    if (isReadOnly.value) return
    if (!char.value?.id) return
    isSavingEquipment.value = true
    try {
      const acVal = typeof currentArmorClass === 'function' ? currentArmorClass() : (currentArmorClass?.value ?? 10)
      await axios.put(`${API_URL}/character/${char.value.id}`, {
        equipments: liveEquipment.value,
        ac: acVal
      })
      equipmentSavedToast.value = true
      setTimeout(() => { equipmentSavedToast.value = false }, 2000)
    } catch (err) {
      console.error('Failed to save equipment', err)
    } finally {
      isSavingEquipment.value = false
    }
  }

  const toggleEquipStatus = (itemOrIdx) => {
    const item = typeof itemOrIdx === 'number' ? liveEquipment.value[itemOrIdx] : itemOrIdx
    if (!item || !isItemEquippable(item)) return
    if (item.status === 'equipped') {
      item.status = 'inventory'
    } else {
      item.status = 'equipped'
      item.container_name = null
    }
    saveEquipment()
  }

  const changeItemAmount = (itemOrIdx, delta) => {
    const item = typeof itemOrIdx === 'number' ? liveEquipment.value[itemOrIdx] : itemOrIdx
    if (!item) return
    const cur = Number(item.amount) || 1
    const updated = Math.max(1, cur + delta)
    item.amount = updated
    saveEquipment()
  }

  const removeItem = (itemOrIdx) => {
    const idx = typeof itemOrIdx === 'number' ? itemOrIdx : liveEquipment.value.indexOf(itemOrIdx)
    if (idx !== -1) {
      liveEquipment.value.splice(idx, 1)
      saveEquipment()
    }
  }

  // --- Compendium Item Picker Modal ---
  const isCompendiumOpen = ref(false)

  const openCompendiumModal = () => {
    isCompendiumOpen.value = true
  }

  const addItemFromCompendium = (it) => {
    const isArmor = it.type === 'armor' || (it.name || '').toLowerCase().includes('armor') || (it.name || '').toLowerCase().includes('shield')
    const defaultContainer = (selectedContainerFilter.value !== 'all' && selectedContainerFilter.value !== 'equipped' && selectedContainerFilter.value !== 'backpack')
      ? selectedContainerFilter.value
      : null

    liveEquipment.value.push({
      name: it.name,
      weight: String(it.weight || 0),
      amount: 1,
      status: 'inventory',
      is_armor: Boolean(isArmor),
      equip_type: it.equip_type || null,
      container_capacity: it.container_capacity || null,
      container_name: defaultContainer,
      ac: it.ac || 0,
      dexMod: !!it.dexMod
    })
    saveEquipment()
    isCompendiumOpen.value = false
  }

  // --- Encumbrance Calculations ---
  const totalWeight = computed(() => {
    return liveEquipment.value.reduce((sum, item) => {
      if (item.container_name && item.container_name.toLowerCase().includes('bag of holding')) {
        return sum
      }
      const w = parseFloat(item.weight) || 0
      const amt = parseInt(item.amount) || 1
      return sum + (w * amt)
    }, 0)
  })

  const strScore = computed(() => {
    if (vtt.value?.abilities?.str?.score) return Number(vtt.value.abilities.str.score)
    return Number(char.value?.ability_score?.strength || 10)
  })

  const carryCapacity = computed(() => strScore.value * 15)
  const encumberedThreshold = computed(() => strScore.value * 5)
  const heavilyEncumberedThreshold = computed(() => strScore.value * 10)

  const weightPercent = computed(() => {
    const cap = carryCapacity.value || 1
    return Math.min(100, Math.max(0, (totalWeight.value / cap) * 100))
  })

  const weightStatus = computed(() => {
    const wt = totalWeight.value
    const max = carryCapacity.value
    const heavy = heavilyEncumberedThreshold.value
    const enc = encumberedThreshold.value

    if (wt > max) return 'over'
    if (wt > heavy) return 'heavy'
    if (wt > enc) return 'encumbered'
    return 'safe'
  })

  const weightStatusLabel = computed(() => {
    switch (weightStatus.value) {
      case 'over': return 'Over Capacity'
      case 'heavy': return 'Heavily Encumbered'
      case 'encumbered': return 'Encumbered'
      case 'safe':
      default: return 'Normal'
    }
  })

  const weightBarColor = computed(() => {
    switch (weightStatus.value) {
      case 'over': return 'bg-red-800'
      case 'heavy': return 'bg-amber-800'
      case 'encumbered': return 'bg-gray-700'
      case 'safe':
      default: return 'bg-gray-600'
    }
  })

  const weightStatusTextColor = computed(() => {
    switch (weightStatus.value) {
      case 'over': return 'text-red-700'
      case 'heavy': return 'text-amber-700'
      case 'encumbered': return 'text-gray-800'
      case 'safe':
      default: return 'text-gray-600'
    }
  })

  return {
    currency,
    isSavingCurrency,
    currencySavedToast,
    saveCurrency,
    adjustCurrency,
    liveEquipment,
    DEFAULT_CONTAINER_CAPACITIES,
    getContainerCapacity,
    isContainerItem,
    getItemEquipType,
    isItemEquippable,
    availableContainers,
    equippedCount,
    backpackCount,
    getContainerCurrentWeight,
    selectedContainerFilter,
    currentActiveContainer,
    filteredEquipment,
    setItemContainer,
    initEquipment,
    isSavingEquipment,
    equipmentSavedToast,
    saveEquipment,
    toggleEquipStatus,
    changeItemAmount,
    removeItem,
    isCompendiumOpen,
    openCompendiumModal,
    addItemFromCompendium,
    totalWeight,
    strScore,
    carryCapacity,
    encumberedThreshold,
    heavilyEncumberedThreshold,
    weightPercent,
    weightStatus,
    weightStatusLabel,
    weightBarColor,
    weightStatusTextColor
  }
}
