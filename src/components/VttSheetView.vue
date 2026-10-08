<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import {
  renderAnnotatedText,
  renderTableCell,
  clean5eToolsMarkup,
  format5eEntries,
  formatBackgroundEquipment,
  formatBackgroundAbility,
  formatProficiencies
} from '../utils/textRenderer'
import { useConfig } from '../config'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import {
  IconArrowLeft,
  IconX,
  IconExternalLink,
  IconBook,
  IconUsers,
  IconEdit,
  IconBolt,
  IconHandStop,
  IconSword,
  IconStarFilled,
  IconStar,
  IconShield,
  IconMoon,
  IconBed,
  IconCampfire,
  IconPlus,
  IconCheck,
  IconWorld,
  IconPencil,
  IconMenu2,
  IconChevronDown,
  IconChevronUp,
  IconMinus,
  IconHome,
  IconCamera,
  IconDice,
  IconShare,
  IconPrinter,
  IconDownload,
  IconLink,
  IconCopy,
  IconBrandDiscord,
  IconFileTypePdf,
  IconLock
} from '@tabler/icons-vue'
import { useAuth } from '../composables/useAuth'
import { compressImage } from '../utils/imageCompressor'
import { LIFESTYLES } from '../utils/characteristicsHelper'
import { buildAvraeJson, buildAvraeAttackMacro } from '../utils/avraeExport'

const API_URL = useConfig().API_URL
const { openCompendium } = useCompendiumNav()

const props = defineProps({
  character: {
    type: Object,
    required: true
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back', 'create', 'edit', 'open-campaign'])

const openCompendiumInApp = () => {
  openCompendium({ category: 'all', updateUrl: true })
}

const openCompendiumWindow = () => {
  openCompendium({ category: 'all', updateUrl: true })
}

const vtt = computed(() => props.character?.vtt || {})
const char = computed(() => props.character || {})

// Avatar image interactive upload
const avatarFileInput = ref(null)
const isUploadingAvatar = ref(false)
const localImageUrl = ref('')

const resolvedImageUrl = computed(() => {
  const url = localImageUrl.value || char.value?.image_url
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_URL}${url}`
})

const triggerAvatarUpload = () => {
  if (props.readOnly) return
  if (isUploadingAvatar.value) return
  avatarFileInput.value?.click()
}

const handleAvatarFileChange = async (event) => {
  if (props.readOnly) return
  const file = event.target?.files?.[0]
  if (!file) return
  try {
    isUploadingAvatar.value = true
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2 MB limit')
      return
    }
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('image', compressed.blob, compressed.name)
    const res = await axios.post(`${API_URL}/character/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const uploadedUrl = res.data?.data?.url
    if (uploadedUrl && char.value?.id) {
      localImageUrl.value = uploadedUrl
      await axios.put(`${API_URL}/character/${char.value.id}`, {
        image_url: uploadedUrl
      })
      if (props.character) {
        props.character.image_url = uploadedUrl
      }
    }
  } catch (err) {
    console.error('Failed to update avatar:', err)
    alert(err.message || 'Failed to upload avatar')
  } finally {
    isUploadingAvatar.value = false
    if (event.target) event.target.value = ''
  }
}

// Characteristics state & sheet notes
const parsedCharacteristics = computed(() => {
  const c = char.value?.characteristics
  if (!c) return {}
  if (typeof c === 'string') {
    try { return JSON.parse(c) } catch (e) { return {} }
  }
  return c
})

const sheetNotesSubTab = ref('ALL') // 'ALL' | 'ORGS' | 'ALLIES' | 'ENEMIES' | 'BACKSTORY' | 'OTHER'
const sheetNotes = ref({
  organizations: '',
  allies: '',
  enemies: '',
  backstory: '',
  other: ''
})
const isSavingNotes = ref(false)
const notesSavedToast = ref(false)

watch(() => parsedCharacteristics.value, (val) => {
  if (val?.notes) {
    sheetNotes.value = {
      organizations: val.notes.organizations || '',
      allies: val.notes.allies || '',
      enemies: val.notes.enemies || '',
      backstory: val.notes.backstory || '',
      other: val.notes.other || ''
    }
  }
}, { immediate: true })

const saveSheetNotes = async () => {
  if (props.readOnly) return
  if (!char.value?.id) return
  try {
    isSavingNotes.value = true
    const updatedChars = {
      ...parsedCharacteristics.value,
      notes: { ...sheetNotes.value }
    }
    await axios.put(`${API_URL}/character/${char.value.id}`, {
      characteristics: updatedChars
    })
    if (props.character) {
      props.character.characteristics = updatedChars
    }
    notesSavedToast.value = true
    setTimeout(() => { notesSavedToast.value = false }, 2000)
  } catch (err) {
    console.error('Failed to save notes:', err)
  } finally {
    isSavingNotes.value = false
  }
}

const classSummary = computed(() => {
  const classes = Array.isArray(char.value.class) ? char.value.class : (char.value.class ? [char.value.class] : [])
  if (classes.length === 0) return 'Adventurer'
  const subClasses = Array.isArray(char.value.sub_class) ? char.value.sub_class : (char.value.sub_class ? [char.value.sub_class] : [])

  return classes.map((c, idx) => {
    const sc = subClasses[idx]?.name || ''
    const scStr = sc ? ` (${sc})` : ''
    const lvl = classes.length > 1 && c.level ? ` ${c.level}` : ''
    return `${c.name || 'Class'}${lvl}${scStr}`
  }).join(' / ')
})

// HP Tracker & Vitals interactive state
const baseMaxHp = computed(() => {
  return Number(char.value.base_max_hp || char.value.max_hp_base || char.value.max_hp || 10)
})

const maxHpModifier = ref(Number(char.value.max_hp_modifier != null ? char.value.max_hp_modifier : (vtt.value?.combat?.hp?.max_hp_modifier || 0)))
const overrideMaxHp = ref(char.value.override_max_hp != null ? Number(char.value.override_max_hp) : (vtt.value?.combat?.hp?.override_max_hp != null ? Number(vtt.value.combat.hp.override_max_hp) : null))

const effectiveMaxHp = computed(() => {
  if (overrideMaxHp.value != null && overrideMaxHp.value !== '' && !isNaN(Number(overrideMaxHp.value)) && Number(overrideMaxHp.value) > 0) {
    return Number(overrideMaxHp.value)
  }
  return Math.max(1, baseMaxHp.value + (Number(maxHpModifier.value) || 0))
})

const currentHp = ref(Number(char.value.hp != null ? char.value.hp : effectiveMaxHp.value))
const maxHp = ref(effectiveMaxHp.value)
const tempHp = ref(Number(char.value.temp_hp || 0))
const tempHpInput = ref(tempHp.value > 0 ? tempHp.value : '')
const hpInput = ref(1)

const showHpModal = ref(false)
const healModalInput = ref(0)
const damageModalInput = ref(0)
const maxHpModifierInput = ref(maxHpModifier.value !== 0 ? maxHpModifier.value : '')
const overrideMaxHpInput = ref(overrideMaxHp.value != null ? overrideMaxHp.value : '')

const openHpModal = () => {
  healModalInput.value = 0
  damageModalInput.value = 0
  maxHpModifierInput.value = maxHpModifier.value !== 0 ? maxHpModifier.value : ''
  overrideMaxHpInput.value = overrideMaxHp.value != null ? overrideMaxHp.value : ''
  showHpModal.value = true
}

const previewMaxHp = computed(() => {
  const oVal = overrideMaxHpInput.value === '' ? null : Number(overrideMaxHpInput.value)
  if (oVal != null && !isNaN(oVal) && oVal > 0) return oVal
  const modVal = maxHpModifierInput.value === '' ? 0 : Number(maxHpModifierInput.value) || 0
  return Math.max(1, baseMaxHp.value + modVal)
})

const newHpPreview = computed(() => {
  const targetMax = previewMaxHp.value
  const heal = Math.max(0, Number(healModalInput.value) || 0)
  const dmg = Math.max(0, Number(damageModalInput.value) || 0)
  if (heal > 0) {
    return Math.min(targetMax, currentHp.value + heal)
  }
  if (dmg > 0) {
    if (tempHp.value > 0) {
      const remDmg = Math.max(0, dmg - tempHp.value)
      return Math.max(0, currentHp.value - remDmg)
    }
    return Math.max(0, currentHp.value - dmg)
  }
  return currentHp.value
})

const isInspired = ref(Boolean(props.character?.inspiration != null ? props.character.inspiration : props.character?.vtt?.inspiration))
const activeCampaignId = ref(props.character?.campaign_id ? Number(props.character.campaign_id) : null)
const campaignName = ref(vtt.value?.campaign_name || char.value?.campaign_name || '')
const showCampaignModal = ref(false)
const campaignInput = ref(campaignName.value)
const isMobileMenuOpen = ref(false)

watch(() => props.character?.campaign_id, (newId) => {
  activeCampaignId.value = newId ? Number(newId) : null
})

const toastMessage = ref('')
let toastTimer = null
const showToast = (msg) => {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

const { user } = useAuth()

// Export & Share modal state
const showExportModal = ref(false)
const exportTab = ref('pdf') // 'pdf' | 'link' | 'avrae'
const copiedLink = ref(false)
const copiedAvraeJson = ref(false)
const copiedAvraeMacro = ref(false)
const copiedAvraeApiUrl = ref(false)

const charKey = computed(() => char.value?.public_id || char.value?.id)

const isPublicChar = ref(Boolean(char.value?.is_public))
watch(() => char.value?.is_public, (v) => {
  isPublicChar.value = Boolean(v)
})

const isUpdatingVisibility = ref(false)
const toggleVisibility = async () => {
  if (props.readOnly) return
  if (!char.value?.id) return
  const nextVal = !isPublicChar.value
  isUpdatingVisibility.value = true
  try {
    await axios.put(`${API_URL}/character/${char.value.id}`, { is_public: nextVal })
    isPublicChar.value = nextVal
    if (char.value) char.value.is_public = nextVal
    showToast(nextVal ? 'Character set to Public' : 'Character set to Private')
  } catch (err) {
    console.error('Failed to toggle visibility', err)
    showToast('Failed to update visibility')
  } finally {
    isUpdatingVisibility.value = false
  }
}

const resolvedPlayerName = computed(() => {
  return user.value?.username || user.value?.name || char.value?.player_name || char.value?.owner_username || ''
})

const openExportModal = (tab = 'pdf') => {
  exportTab.value = tab
  copiedLink.value = false
  copiedAvraeJson.value = false
  copiedAvraeMacro.value = false
  copiedAvraeApiUrl.value = false
  showExportModal.value = true
}

const publicShareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  const basePath = window.location.pathname.replace(/\/character\/[^/]+/i, '').replace(/\/$/, '')
  return `${window.location.origin}${basePath}/character/${charKey.value}`
})

const avraeApiUrl = computed(() => {
  if (!charKey.value) return ''
  return `${API_URL}/character/${charKey.value}/avrae`
})

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(publicShareUrl.value)
    copiedLink.value = true
    showToast('Public link copied to clipboard')
    setTimeout(() => { copiedLink.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy share link:', err)
  }
}

const copyAvraeApiUrl = async () => {
  try {
    await navigator.clipboard.writeText(avraeApiUrl.value)
    copiedAvraeApiUrl.value = true
    showToast('Avrae endpoint URL copied')
    setTimeout(() => { copiedAvraeApiUrl.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy avrae api url:', err)
  }
}

const copyAvraeJson = async () => {
  try {
    const data = buildAvraeJson(char.value, currency.value)
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    copiedAvraeJson.value = true
    showToast('Avrae character JSON copied')
    setTimeout(() => { copiedAvraeJson.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy Avrae JSON:', err)
  }
}

const copyAvraeMacro = async () => {
  try {
    const macro = buildAvraeAttackMacro(vtt.value?.attacks || [])
    await navigator.clipboard.writeText(macro)
    copiedAvraeMacro.value = true
    showToast('Avrae attack macro copied')
    setTimeout(() => { copiedAvraeMacro.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy Avrae macro:', err)
  }
}

const downloadAvraeJson = () => {
  try {
    const data = buildAvraeJson(char.value, currency.value)
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = (char.value?.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
    a.href = url
    a.download = `${safeName}-${charKey.value}-avrae.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Avrae JSON downloaded')
  } catch (err) {
    console.error('Failed to download Avrae JSON:', err)
  }
}

const printSheet = () => {
  showExportModal.value = false
  setTimeout(() => {
    window.print()
  }, 150)
}

watch(effectiveMaxHp, (newVal) => {
  maxHp.value = newVal
  if (currentHp.value > newVal) {
    currentHp.value = newVal
  }
})

watch(() => [char.value.hp, char.value.max_hp, char.value.temp_hp, char.value.max_hp_modifier, char.value.override_max_hp], () => {
  maxHpModifier.value = Number(char.value.max_hp_modifier != null ? char.value.max_hp_modifier : (vtt.value?.combat?.hp?.max_hp_modifier || 0))
  overrideMaxHp.value = char.value.override_max_hp != null ? Number(char.value.override_max_hp) : (vtt.value?.combat?.hp?.override_max_hp != null ? Number(vtt.value.combat.hp.override_max_hp) : null)
  maxHp.value = effectiveMaxHp.value
  currentHp.value = Number(char.value.hp != null ? char.value.hp : effectiveMaxHp.value)
  tempHp.value = Number(char.value.temp_hp || 0)
  tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''
})

watch(() => [props.character?.inspiration, props.character?.vtt?.inspiration], ([cInsp, vInsp]) => {
  if (cInsp !== undefined) {
    isInspired.value = Boolean(cInsp)
  } else if (vInsp !== undefined) {
    isInspired.value = Boolean(vInsp)
  }
})

watch(() => [vtt.value?.campaign_name, char.value?.campaign_name], () => {
  campaignName.value = vtt.value?.campaign_name || char.value?.campaign_name || ''
  campaignInput.value = campaignName.value
})

const saveVitals = async (updates) => {
  if (props.readOnly) return
  if (!char.value?.id) return
  try {
    await axios.put(`${API_URL}/character/${char.value.id}`, updates)
  } catch (err) {
    console.error('Failed to save vitals', err)
  }
}

const saveHpState = async () => {
  const modVal = maxHpModifierInput.value === '' ? 0 : Number(maxHpModifierInput.value) || 0
  maxHpModifier.value = modVal
  const oVal = overrideMaxHpInput.value === '' ? null : Number(overrideMaxHpInput.value)
  overrideMaxHp.value = oVal != null && !isNaN(oVal) && oVal > 0 ? oVal : null

  maxHp.value = effectiveMaxHp.value
  currentHp.value = Math.min(currentHp.value, maxHp.value)
  tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''

  if (char.value) {
    char.value.hp = currentHp.value
    char.value.max_hp = maxHp.value
    char.value.temp_hp = tempHp.value
    char.value.max_hp_modifier = maxHpModifier.value
    char.value.override_max_hp = overrideMaxHp.value
  }

  await saveVitals({
    hp: currentHp.value,
    max_hp: maxHp.value,
    temp_hp: tempHp.value,
    max_hp_modifier: maxHpModifier.value,
    override_max_hp: overrideMaxHp.value
  })
}

const applyModalHeal = async () => {
  const val = Math.max(0, Number(healModalInput.value) || 0)
  if (val > 0) {
    currentHp.value = Math.min(previewMaxHp.value, currentHp.value + val)
    healModalInput.value = 0
    await saveHpState()
  }
}

const applyModalDamage = async () => {
  const val = Math.max(0, Number(damageModalInput.value) || 0)
  if (val > 0) {
    if (tempHp.value > 0) {
      if (tempHp.value >= val) {
        tempHp.value -= val
        tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''
      } else {
        const rem = val - tempHp.value
        tempHp.value = 0
        tempHpInput.value = ''
        currentHp.value = Math.max(0, currentHp.value - rem)
      }
    } else {
      currentHp.value = Math.max(0, currentHp.value - val)
    }
    damageModalInput.value = 0
    await saveHpState()
  }
}

const closeHpModal = async () => {
  await saveHpState()
  showHpModal.value = false
}

const applyDamage = () => {
  const amount = Number(hpInput.value) || 0
  if (amount <= 0) return
  if (tempHp.value > 0) {
    if (tempHp.value >= amount) {
      tempHp.value -= amount
      tempHpInput.value = tempHp.value > 0 ? tempHp.value : ''
      saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
      return
    } else {
      const remaining = amount - tempHp.value
      tempHp.value = 0
      tempHpInput.value = ''
      currentHp.value = Math.max(0, currentHp.value - remaining)
      saveVitals({ hp: currentHp.value, temp_hp: 0 })
      return
    }
  }
  currentHp.value = Math.max(0, currentHp.value - amount)
  saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
}

const applyHeal = () => {
  const amount = Number(hpInput.value) || 0
  if (amount <= 0) return
  currentHp.value = Math.min(maxHp.value, currentHp.value + amount)
  saveVitals({ hp: currentHp.value, temp_hp: tempHp.value })
}

const updateTempHp = () => {
  const val = Math.max(0, Number(tempHpInput.value) || 0)
  tempHp.value = val
  tempHpInput.value = val > 0 ? val : ''
  saveVitals({ temp_hp: val })
}

const toggleInspiration = async () => {
  const nextVal = !isInspired.value
  isInspired.value = nextVal
  if (props.character) {
    props.character.inspiration = nextVal
    if (props.character.vtt) props.character.vtt.inspiration = nextVal
  }
  if (char.value) char.value.inspiration = nextVal
  if (vtt.value) vtt.value.inspiration = nextVal
  await saveVitals({ inspiration: nextVal })
  showToast(nextVal ? 'Heroic Inspiration gained!' : 'Inspiration expended')
}

const userCampaigns = ref([])
const selectedLinkCampaignId = ref('')
const isLinkingCampaign = ref(false)

const openCampaignModal = async () => {
  campaignInput.value = campaignName.value
  selectedLinkCampaignId.value = activeCampaignId.value ? String(activeCampaignId.value) : ''
  showCampaignModal.value = true
  try {
    const res = await axios.get(`${API_URL}/campaign`)
    userCampaigns.value = Array.isArray(res.data?.data) ? res.data.data : []
  } catch (err) {
    console.warn('Failed to load campaigns for sheet modal', err)
  }
}

const linkCharacterToCampaign = async () => {
  if (!selectedLinkCampaignId.value || !char.value?.id) return
  isLinkingCampaign.value = true
  try {
    const campId = Number(selectedLinkCampaignId.value)
    await axios.post(`${API_URL}/campaign/${campId}/link-character`, {
      character_id: char.value.id
    })
    const camp = userCampaigns.value.find(c => c.id === campId)
    activeCampaignId.value = campId
    campaignName.value = camp?.name || campaignName.value
    campaignInput.value = campaignName.value
    if (props.character) {
      props.character.campaign_id = campId
      props.character.campaign_name = campaignName.value
    }
    showToast('Character linked to campaign!')
  } catch (err) {
    console.error('Failed to link character', err)
    showToast(err.response?.data?.message || 'Failed to link character')
  } finally {
    isLinkingCampaign.value = false
  }
}

const unlinkCharacterFromCampaign = async () => {
  const campId = activeCampaignId.value || char.value?.campaign_id
  if (!campId || !char.value?.id) return
  try {
    await axios.post(`${API_URL}/campaign/${campId}/unlink-character`, {
      character_id: char.value.id
    })
    activeCampaignId.value = null
    campaignName.value = ''
    campaignInput.value = ''
    selectedLinkCampaignId.value = ''
    if (props.character) {
      props.character.campaign_id = null
      props.character.campaign_name = null
    }
    showToast('Character unlinked from campaign')
  } catch (err) {
    console.error('Failed to unlink character', err)
    showToast(err.response?.data?.message || 'Failed to unlink character')
  }
}

const goToCampaignRoom = () => {
  showCampaignModal.value = false
  const campId = activeCampaignId.value || char.value?.campaign_id
  emit('open-campaign', campId)
}

const saveCampaign = async () => {
  campaignName.value = campaignInput.value.trim()
  showCampaignModal.value = false
  if (char.value) char.value.campaign_name = campaignName.value
  await saveVitals({ campaign_name: campaignName.value })
  showToast('Campaign updated')
}

// Defenses state
const rawDefenses = computed(() => vtt.value?.defenses || char.value?.defenses || { resistances: [], immunities: [], vulnerabilities: [] })
const liveDefenses = ref({
  resistances: [...(rawDefenses.value.resistances || [])],
  immunities: [...(rawDefenses.value.immunities || [])],
  vulnerabilities: [...(rawDefenses.value.vulnerabilities || [])]
})

watch(rawDefenses, (val) => {
  if (val) {
    liveDefenses.value = {
      resistances: [...(val.resistances || [])],
      immunities: [...(val.immunities || [])],
      vulnerabilities: [...(val.vulnerabilities || [])]
    }
  }
}, { deep: true, immediate: true })

const showAddDefenseModal = ref(false)
const newDefenseType = ref('resistances')
const newDefenseDamage = ref('Poison')

const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
]

const openAddDefenseModal = () => {
  newDefenseType.value = 'resistances'
  newDefenseDamage.value = 'Poison'
  showAddDefenseModal.value = true
}

const addDefense = async () => {
  const type = newDefenseType.value
  const dmg = newDefenseDamage.value.trim()
  if (!dmg) return
  if (!liveDefenses.value[type].includes(dmg)) {
    liveDefenses.value[type].push(dmg)
    if (char.value) char.value.defenses = liveDefenses.value
    await saveVitals({ defenses: liveDefenses.value })
    showToast(`Added ${dmg} defense`)
  }
  showAddDefenseModal.value = false
}

const removeDefense = async (type, dmg) => {
  liveDefenses.value[type] = liveDefenses.value[type].filter(d => d !== dmg)
  if (char.value) char.value.defenses = liveDefenses.value
  await saveVitals({ defenses: liveDefenses.value })
  showToast(`Removed ${dmg} defense`)
}

// Conditions state
const rawConditions = computed(() => vtt.value?.conditions || char.value?.conditions || [])
const liveConditions = ref(Array.isArray(rawConditions.value) ? [...rawConditions.value] : [])

watch(rawConditions, (val) => {
  liveConditions.value = Array.isArray(val) ? [...val] : []
}, { deep: true, immediate: true })

const showConditionModal = ref(false)

const ALL_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
]

const maxExhaustionLevel = computed(() => {
  return char.value?.edition === '2024' ? 10 : 6
})

const isConditionActive = (cond) => {
  if (cond === 'Exhaustion') {
    return exhaustionLevel.value !== null
  }
  return liveConditions.value.includes(cond)
}

const getExhaustionLevel = () => {
  const ex = liveConditions.value.find(c => typeof c === 'string' && c.toLowerCase().startsWith('exhaustion'))
  if (!ex) return null
  const m = ex.match(/level\s*(\d+)/i)
  return m ? Number(m[1]) : 1
}

const exhaustionLevel = computed(() => getExhaustionLevel())

const setExhaustionLevel = async (lvl) => {
  const maxLvl = maxExhaustionLevel.value
  const clamped = Math.max(1, Math.min(maxLvl, Number(lvl) || 1))
  liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
  liveConditions.value.push(`Exhaustion (Level ${clamped})`)
  if (char.value) char.value.conditions = liveConditions.value
  await saveVitals({ conditions: liveConditions.value })
}

const toggleCondition = async (cond) => {
  if (cond === 'Exhaustion') {
    if (exhaustionLevel.value !== null) {
      liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
    } else {
      liveConditions.value.push('Exhaustion (Level 1)')
    }
  } else {
    const idx = liveConditions.value.indexOf(cond)
    if (idx >= 0) {
      liveConditions.value.splice(idx, 1)
    } else {
      liveConditions.value.push(cond)
    }
  }
  if (char.value) char.value.conditions = liveConditions.value
  await saveVitals({ conditions: liveConditions.value })
}

const removeCondition = async (cond) => {
  if (String(cond).toLowerCase().startsWith('exhaustion')) {
    liveConditions.value = liveConditions.value.filter(c => !String(c).toLowerCase().startsWith('exhaustion'))
  } else {
    liveConditions.value = liveConditions.value.filter(c => c !== cond)
  }
  if (char.value) char.value.conditions = liveConditions.value
  await saveVitals({ conditions: liveConditions.value })
}

const getExhaustionDescription = (lvl) => {
  if (!lvl) return ''
  if (char.value?.edition === '2024') {
    if (lvl >= 10) return 'Level 10: Death.'
    return `Level ${lvl}: -${lvl} penalty on all D20 Tests (attack rolls, ability checks, and saving throws), and Speed is reduced by ${lvl * 5} feet.`
  }
  const descriptions = {
    1: 'Level 1: Disadvantage on ability checks.',
    2: 'Level 2: Speed halved.',
    3: 'Level 3: Disadvantage on attack rolls and saving throws.',
    4: 'Level 4: Hit point maximum halved.',
    5: 'Level 5: Speed reduced to 0.',
    6: 'Level 6: Death.'
  }
  return descriptions[lvl] || `Level ${lvl}`
}

// Saving throw notes & advantages
const showSaveNoteModal = ref(false)
const customSaveNoteInput = ref(char.value?.saving_throw_notes || '')

watch(() => char.value?.saving_throw_notes, (val) => {
  customSaveNoteInput.value = val || ''
})

const saveAdvantageNotes = computed(() => {
  const list = []
  const vNotes = vtt.value?.saving_throw_notes
  if (Array.isArray(vNotes)) {
    list.push(...vNotes)
  }
  const custom = customSaveNoteInput.value.trim()
  if (custom && !list.some(n => n.label === custom)) {
    list.push({ type: 'custom', label: custom })
  }
  return list
})

const saveCustomSaveNote = async () => {
  const val = customSaveNoteInput.value.trim()
  showSaveNoteModal.value = false
  if (char.value) char.value.saving_throw_notes = val
  await saveVitals({ saving_throw_notes: val })
  showToast('Saving throw notes updated')
}

// Rest state & mechanics
const totalHitDice = computed(() => {
  return char.value.hit_dice || vtt.value?.combat?.hp?.hit_dice || `${char.value.level || 1}d8`
})

const maxHitDiceCount = computed(() => {
  const str = totalHitDice.value || '1d8'
  const match = str.match(/^(\d+)d/)
  return match ? Number(match[1]) : (Number(char.value.level) || 1)
})

const hitDieFaces = computed(() => {
  const str = totalHitDice.value || '1d8'
  const match = str.match(/d(\d+)/)
  return match ? Number(match[1]) : 8
})

const conMod = computed(() => {
  const cVal = char.value.ability_score?.constitution
  if (cVal != null) return Math.floor((Number(cVal) - 10) / 2)
  return Number(vtt.value?.abilities?.constitution?.modifier || 0)
})

const spentHitDice = ref(0)
const remainingHitDice = computed(() => Math.max(0, maxHitDiceCount.value - spentHitDice.value))

// Expended slots & class resources trackers in state
const expendedSlots = ref({})
const expendedFeatFreeCasts = ref({})
const spentClassResources = ref({})
const activeClassStates = ref({})

const restoreAllSlots = () => {
  expendedSlots.value = {}
  expendedFeatFreeCasts.value = {}
}

let isInitializingSheetResources = false
let persistDebounceTimer = null

const loadPersistedSheetState = () => {
  isInitializingSheetResources = true
  const raw = char.value?.sheet_resources
  let res = raw
  if (typeof res === 'string') {
    try { res = JSON.parse(res) } catch (_) { res = {} }
  }
  if (res && typeof res === 'object') {
    expendedSlots.value = res.expended_slots ? { ...res.expended_slots } : {}
    expendedFeatFreeCasts.value = res.expended_feat_free_casts ? { ...res.expended_feat_free_casts } : {}
    spentClassResources.value = res.spent_resources ? { ...res.spent_resources } : {}
    activeClassStates.value = res.active_states ? { ...res.active_states } : {}
    spentHitDice.value = Number(res.spent_hit_dice) || 0
  } else {
    expendedSlots.value = {}
    expendedFeatFreeCasts.value = {}
    spentClassResources.value = {}
    activeClassStates.value = {}
    spentHitDice.value = 0
  }

  // Clear legacy localStorage cache
  try {
    if (char.value?.id) {
      localStorage.removeItem(`dnd_sheet_slots_${char.value.id}`)
      localStorage.removeItem(`dnd_sheet_res_${char.value.id}`)
      localStorage.removeItem(`dnd_sheet_states_${char.value.id}`)
    }
  } catch (_) {}

  nextTick(() => {
    isInitializingSheetResources = false
  })
}

const persistSheetState = (immediate = false) => {
  if (props.readOnly || !char.value?.id || isInitializingSheetResources) return

  const payload = {
    expended_slots: { ...expendedSlots.value },
    expended_feat_free_casts: { ...expendedFeatFreeCasts.value },
    spent_resources: { ...spentClassResources.value },
    active_states: { ...activeClassStates.value },
    spent_hit_dice: spentHitDice.value
  }

  if (char.value) {
    char.value.sheet_resources = payload
  }
  if (props.character) {
    props.character.sheet_resources = payload
  }

  if (immediate) {
    if (persistDebounceTimer) clearTimeout(persistDebounceTimer)
    saveVitals({ sheet_resources: payload })
    return
  }

  if (persistDebounceTimer) clearTimeout(persistDebounceTimer)
  persistDebounceTimer = setTimeout(() => {
    saveVitals({ sheet_resources: payload })
  }, 400)
}

watch([expendedSlots, expendedFeatFreeCasts, spentClassResources, activeClassStates, spentHitDice], () => {
  if (isInitializingSheetResources) return
  persistSheetState()
}, { deep: true })

watch(() => char.value?.id, () => {
  loadPersistedSheetState()
}, { immediate: true })

const showShortRestModal = ref(false)
const shortRestRollResult = ref(null)

const openShortRestModal = () => {
  shortRestRollResult.value = null
  showShortRestModal.value = true
}

const rollHitDie = () => {
  if (remainingHitDice.value <= 0) return
  const die = hitDieFaces.value
  const roll = Math.floor(Math.random() * die) + 1
  const mod = conMod.value
  const total = Math.max(1, roll + mod)

  spentHitDice.value += 1
  const prevHp = currentHp.value
  currentHp.value = Math.min(maxHp.value, currentHp.value + total)
  const healed = currentHp.value - prevHp

  shortRestRollResult.value = {
    roll,
    mod,
    die,
    total,
    healed,
    timestamp: new Date().toLocaleTimeString()
  }

  saveVitals({ hp: currentHp.value })
}

const completeShortRest = () => {
  // 1. Warlock: restore Pact Magic spell slots!
  if (charClassName.value === 'warlock') {
    restoreAllSlots()
  } else {
    const pactSlots = (sheetSpellSlots.value || []).filter(s => s.isPact)
    pactSlots.forEach(s => {
      for (let i = 1; i <= s.total; i++) {
        delete expendedSlots.value[`${s.level}_${i}`]
      }
    })
  }

  // 2. Class resources recharge
  const restoredNames = []
  const lvl = Number(char.value?.level) || 1

  for (const res of (classResourceTrackers.value || [])) {
    if (res.recharge === 'short') {
      if (getResourceSpent(res.id) > 0) {
        spentClassResources.value[res.id] = 0
        restoredNames.push(res.name)
      }
    } else if (res.recharge === 'long_regain1') {
      if (getResourceSpent(res.id) > 0) {
        spentClassResources.value[res.id] = Math.max(0, (spentClassResources.value[res.id] || 0) - 1)
        restoredNames.push(`${res.name} (+1 use)`)
      }
    } else if (res.id === 'bard_inspiration' && lvl >= 5) {
      if (getResourceSpent(res.id) > 0) {
        spentClassResources.value[res.id] = 0
        restoredNames.push(res.name)
      }
    }
  }

  if (activeClassStates.value) {
    activeClassStates.value.barb_rage = false
  }

  persistSheetState(true)
  showShortRestModal.value = false
  const msg = restoredNames.length
    ? `Short rest completed! Restored: ${restoredNames.join(', ')}`
    : 'Short rest completed'
  showToast(msg)
}

const showLongRestModal = ref(false)
const longRestRule = ref(char.value?.edition === '2024' ? '5.5e' : '5e')
const resetMaxHpOnRest = ref(true)

const openLongRestModal = () => {
  longRestRule.value = char.value?.edition === '2024' ? '5.5e' : '5e'
  resetMaxHpOnRest.value = true
  showLongRestModal.value = true
}

const recoverSummaryText = computed(() => {
  const parts = []
  const missingHp = Math.max(0, effectiveMaxHp.value - currentHp.value)
  parts.push(missingHp > 0 ? `${missingHp} Hit Points` : `All Hit Points`)

  const maxHd = maxHitDiceCount.value
  const recoverHd = longRestRule.value === '5.5e'
    ? maxHd
    : Math.max(1, Math.floor(maxHd / 2))
  parts.push(`Up to ${recoverHd} Hit Dice`)

  let countSlots = 0
  for (const k of Object.keys(expendedSlots?.value || {})) {
    if (expendedSlots.value[k]) countSlots++
  }
  if (countSlots > 0) {
    parts.push(`${countSlots} Spell Slots`)
  } else if (allSpellLevels?.value?.length > 0) {
    parts.push(`All Spell Slots`)
  }
  let countRes = 0
  for (const k of Object.keys(spentClassResources?.value || {})) {
    if (spentClassResources.value[k] > 0) countRes++
  }
  if (countRes > 0) {
    parts.push(`All Class Resources`)
  }
  return parts.join(', ')
})

const executeLongRest = async () => {
  if (resetMaxHpOnRest.value) {
    maxHpModifier.value = 0
    maxHpModifierInput.value = ''
    overrideMaxHp.value = null
    overrideMaxHpInput.value = ''
  }

  currentHp.value = effectiveMaxHp.value
  maxHp.value = effectiveMaxHp.value
  tempHp.value = 0
  tempHpInput.value = ''

  if (longRestRule.value === '5.5e') {
    spentHitDice.value = 0
  } else {
    spentHitDice.value = Math.max(0, spentHitDice.value - Math.max(1, Math.floor(maxHitDiceCount.value / 2)))
  }

  restoreAllSlots()
  spentClassResources.value = {}
  activeClassStates.value = {}
  persistSheetState(true)

  // Long rest removes 1 level of exhaustion
  if (exhaustionLevel.value !== null) {
    if (exhaustionLevel.value > 1) {
      await setExhaustionLevel(exhaustionLevel.value - 1)
    } else {
      await toggleCondition('Exhaustion')
    }
  }

  showLongRestModal.value = false
  if (char.value) {
    char.value.hp = currentHp.value
    char.value.max_hp = maxHp.value
    char.value.temp_hp = 0
    char.value.max_hp_modifier = maxHpModifier.value
    char.value.override_max_hp = overrideMaxHp.value
  }

  await saveVitals({
    hp: currentHp.value,
    max_hp: maxHp.value,
    temp_hp: 0,
    max_hp_modifier: maxHpModifier.value,
    override_max_hp: overrideMaxHp.value,
    conditions: liveConditions.value
  })
  showToast('Long rest completed. HP and abilities restored.')
}

// Interactive Wealth / Currency state
const getInitialCurrency = () => {
  const tr = props.character?.treasure || props.character?.treasures || char.value?.treasure || char.value?.treasures || {}
  return {
    cp: Number(tr.cp ?? 0),
    sp: Number(tr.sp ?? 0),
    ep: Number(tr.ep ?? 0),
    gp: Number(tr.gp ?? 0),
    pp: Number(tr.pp ?? 0)
  }
}
const currency = ref(getInitialCurrency())

watch(() => [props.character?.treasure, props.character?.treasures, char.value?.treasure], () => {
  currency.value = getInitialCurrency()
}, { deep: true, immediate: true })

const isSavingCurrency = ref(false)
const currencySavedToast = ref(false)

const saveCurrency = async () => {
  if (props.readOnly) return
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

// Interactive Equipment & Inventory
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
  const eq = char.value.equipment || char.value.equipments || []
  liveEquipment.value = Array.isArray(eq) ? JSON.parse(JSON.stringify(eq)) : []
}

initEquipment()
watch(() => [char.value.equipment, char.value.equipments], () => {
  initEquipment()
}, { deep: true })

const dexMod = computed(() => {
  const dVal = char.value.ability_score?.dexterity
  if (dVal != null) return Math.floor((Number(dVal) - 10) / 2)
  return Number(vtt.value?.abilities?.dexterity?.modifier || 0)
})

// AC Customization, Breakdown & Calculations
const showAcModal = ref(false)
const isAcCustomizeOpen = ref(true)

const acCustom = ref({
  override_ac: char.value?.ac_custom?.override_ac ?? null,
  override_base: char.value?.ac_custom?.override_base ?? null,
  magic_bonus: char.value?.ac_custom?.magic_bonus ?? null,
  misc_bonus: char.value?.ac_custom?.misc_bonus ?? null,
  notes_override_ac: char.value?.ac_custom?.notes_override_ac ?? '',
  notes_override_base: char.value?.ac_custom?.notes_override_base ?? '',
  notes_magic: char.value?.ac_custom?.notes_magic ?? '',
  notes_misc: char.value?.ac_custom?.notes_misc ?? ''
})

watch(() => char.value?.ac_custom, (val) => {
  if (val) {
    acCustom.value = {
      override_ac: val.override_ac ?? null,
      override_base: val.override_base ?? null,
      magic_bonus: val.magic_bonus ?? null,
      misc_bonus: val.misc_bonus ?? null,
      notes_override_ac: val.notes_override_ac ?? '',
      notes_override_base: val.notes_override_base ?? '',
      notes_magic: val.notes_magic ?? '',
      notes_misc: val.notes_misc ?? ''
    }
  }
}, { deep: true })

const acBreakdown = computed(() => {
  let baseArmorAc = null
  let armorName = 'Armor (None)'
  let isHeavyArmor = false
  let isMediumArmor = false
  let hasShield = false
  const dMod = dexMod.value

  for (const eq of liveEquipment.value) {
    if (eq.status !== 'equipped') continue
    const nameLower = (eq.name || '').toLowerCase()
    if (nameLower.includes('shield')) {
      hasShield = true
    } else if (eq.is_armor || eq.item_type === 'armor') {
      armorName = eq.name || 'Armor'
      const itemAc = eq.base_ac != null ? Number(eq.base_ac) : (eq.ac ? Number(eq.ac) : null)
      if (itemAc !== null && itemAc > 0) {
        if (eq.ac_dex_bonus === false || itemAc >= 16) {
          baseArmorAc = itemAc
          isHeavyArmor = true
        } else if (itemAc >= 12 && itemAc <= 15) {
          baseArmorAc = itemAc
          isMediumArmor = true
        } else {
          baseArmorAc = itemAc
        }
      } else if (nameLower.includes('padded') || nameLower.includes('leather') || nameLower.includes('studded')) {
        baseArmorAc = nameLower.includes('studded') ? 12 : 11
      } else if (nameLower.includes('hide') || nameLower.includes('chain shirt') || nameLower.includes('scale mail') || nameLower.includes('breastplate') || nameLower.includes('half plate')) {
        let base = 14
        if (nameLower.includes('hide')) base = 12
        else if (nameLower.includes('chain shirt')) base = 13
        else if (nameLower.includes('scale mail') || nameLower.includes('breastplate')) base = 14
        else if (nameLower.includes('half plate')) base = 15
        baseArmorAc = base
        isMediumArmor = true
      } else if (nameLower.includes('ring mail') || nameLower.includes('chain mail') || nameLower.includes('splint') || nameLower.includes('plate')) {
        let base = 16
        if (nameLower.includes('ring mail')) base = 14
        else if (nameLower.includes('chain mail')) base = 16
        else if (nameLower.includes('splint')) base = 17
        else if (nameLower.includes('plate')) base = 18
        baseArmorAc = base
        isHeavyArmor = true
      }
    }
  }

  const baseArmorValue = baseArmorAc !== null ? baseArmorAc : 10
  let appliedDex = dMod
  let dexLabel = 'Dexterity Bonus'
  if (isHeavyArmor) {
    appliedDex = 0
    dexLabel = 'Dexterity Bonus (None - Heavy Armor)'
  } else if (isMediumArmor) {
    appliedDex = Math.min(2, Math.max(0, dMod))
    dexLabel = 'Dexterity Bonus (Max +2)'
  }

  const overrideAcVal = acCustom.value.override_ac !== null && acCustom.value.override_ac !== '' && !isNaN(Number(acCustom.value.override_ac))
    ? Number(acCustom.value.override_ac)
    : null

  const overrideBaseVal = acCustom.value.override_base !== null && acCustom.value.override_base !== '' && !isNaN(Number(acCustom.value.override_base))
    ? Number(acCustom.value.override_base)
    : null

  const magicBonus = Number(acCustom.value.magic_bonus) || 0
  const miscBonus = Number(acCustom.value.misc_bonus) || 0

  let totalAc = 10
  if (overrideAcVal !== null) {
    totalAc = overrideAcVal
  } else {
    const effectiveBaseAndDex = overrideBaseVal !== null ? overrideBaseVal : (baseArmorValue + appliedDex)
    totalAc = effectiveBaseAndDex + (hasShield ? 2 : 0) + magicBonus + miscBonus
  }

  return {
    armorName,
    baseArmorValue,
    dexBonus: appliedDex,
    dexBonusLabel: dexLabel,
    isHeavyArmor,
    isMediumArmor,
    hasShield,
    magicBonus,
    miscBonus,
    overrideBase: overrideBaseVal,
    overrideAc: overrideAcVal,
    totalAc
  }
})

const currentArmorClass = computed(() => {
  return acBreakdown.value.totalAc
})

const calculateLiveAc = (eqList) => {
  return currentArmorClass.value
}

const openAcModal = () => {
  showAcModal.value = true
}

const saveAcCustom = async () => {
  if (char.value) {
    char.value.ac = currentArmorClass.value
    char.value.ac_custom = { ...acCustom.value }
  }
  await saveVitals({
    ac: currentArmorClass.value,
    ac_custom: acCustom.value
  })
}

const closeAcModal = async () => {
  await saveAcCustom()
  showAcModal.value = false
}

// Speed & Movement state
const showSpeedModal = ref(false)

const customSpeeds = ref({
  walk: Number(char.value?.speeds?.walk ?? (char.value?.speed || char.value?.race?.speed || 30)),
  fly: Number(char.value?.speeds?.fly ?? (char.value?.race?.fly_speed || 0)),
  swim: Number(char.value?.speeds?.swim ?? (char.value?.race?.swim_speed || 0)),
  climb: Number(char.value?.speeds?.climb ?? (char.value?.race?.climb_speed || 0)),
  burrow: Number(char.value?.speeds?.burrow ?? 0),
  notes: char.value?.speeds?.notes || ''
})

watch(() => [char.value?.speed, char.value?.speeds, char.value?.race], () => {
  customSpeeds.value = {
    walk: Number(char.value?.speeds?.walk ?? (char.value?.speed || char.value?.race?.speed || 30)),
    fly: Number(char.value?.speeds?.fly ?? (char.value?.race?.fly_speed || 0)),
    swim: Number(char.value?.speeds?.swim ?? (char.value?.race?.swim_speed || 0)),
    climb: Number(char.value?.speeds?.climb ?? (char.value?.race?.climb_speed || 0)),
    burrow: Number(char.value?.speeds?.burrow ?? 0),
    notes: char.value?.speeds?.notes || ''
  }
}, { deep: true })

const otherSpeedsList = computed(() => {
  const list = []
  if (customSpeeds.value.fly > 0) list.push({ type: 'Fly', speed: customSpeeds.value.fly })
  if (customSpeeds.value.swim > 0) list.push({ type: 'Swim', speed: customSpeeds.value.swim })
  if (customSpeeds.value.climb > 0) list.push({ type: 'Climb', speed: customSpeeds.value.climb })
  if (customSpeeds.value.burrow > 0) list.push({ type: 'Burrow', speed: customSpeeds.value.burrow })
  return list
})

let speedSnapshot = null
const openSpeedModal = () => {
  speedSnapshot = { ...customSpeeds.value }
  showSpeedModal.value = true
}

const cancelSpeedModal = () => {
  if (speedSnapshot) {
    customSpeeds.value = { ...speedSnapshot }
  }
  showSpeedModal.value = false
}

const closeSpeedModal = async () => {
  showSpeedModal.value = false
  if (char.value) {
    char.value.speed = customSpeeds.value.walk
    char.value.speeds = { ...customSpeeds.value }
  }
  await saveVitals({
    speed: customSpeeds.value.walk,
    speeds: customSpeeds.value
  })
}

const isSavingEquipment = ref(false)
const equipmentSavedToast = ref(false)

const saveEquipment = async () => {
  if (props.readOnly) return
  if (!char.value?.id) return
  isSavingEquipment.value = true
  try {
    await axios.put(`${API_URL}/character/${char.value.id}`, {
      equipments: liveEquipment.value,
      ac: currentArmorClass.value
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

// Compendium Item Picker Modal
const isCompendiumOpen = ref(false)
const compendiumSearch = ref('')
const compendiumCategory = ref('all')
const compendiumLoading = ref(false)
const compendiumLoadingMore = ref(false)
const compendiumResults = ref([])
const compendiumOffset = ref(0)
const compendiumHasMore = ref(false)
const SHEET_PAGE_LIMIT = 40

const searchCompendiumItems = async (isLoadMore = false) => {
  if (isLoadMore) {
    if (compendiumLoading.value || compendiumLoadingMore.value || !compendiumHasMore.value) return
    compendiumLoadingMore.value = true
  } else {
    compendiumLoading.value = true
    compendiumOffset.value = 0
    compendiumResults.value = []
  }

  try {
    const params = new URLSearchParams()
    params.set('edition', char.value.edition || '2024')
    if (compendiumSearch.value.trim()) params.set('search', compendiumSearch.value.trim())
    if (compendiumCategory.value !== 'all') params.set('type', compendiumCategory.value)
    params.set('limit', String(SHEET_PAGE_LIMIT))
    params.set('offset', String(compendiumOffset.value))

    const res = await axios.get(`${API_URL}/compendium/items?${params.toString()}`)
    const newItems = Array.isArray(res.data?.data) ? res.data.data : []
    compendiumHasMore.value = newItems.length === SHEET_PAGE_LIMIT

    if (isLoadMore) {
      compendiumResults.value.push(...newItems)
    } else {
      compendiumResults.value = newItems
    }
    compendiumOffset.value += newItems.length
  } catch (err) {
    console.error('Failed to search compendium items', err)
    if (!isLoadMore) {
      compendiumResults.value = []
      compendiumHasMore.value = false
    }
  } finally {
    compendiumLoading.value = false
    compendiumLoadingMore.value = false
  }
}

const onCompendiumScroll = (e) => {
  const el = e.target
  if (!el || compendiumLoading.value || compendiumLoadingMore.value || !compendiumHasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    searchCompendiumItems(true)
  }
}

const openCompendiumModal = () => {
  isCompendiumOpen.value = true
  if (compendiumResults.value.length === 0) {
    searchCompendiumItems()
  }
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

const totalWeight = computed(() => {
  return liveEquipment.value.reduce((sum, item) => {
    // Items inside a Bag of Holding do not contribute to carried encumbrance
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
  return Number(char.value.ability_score?.strength || 10)
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
    case 'over':
      return 'Over Capacity'
    case 'heavy':
      return 'Heavily Encumbered'
    case 'encumbered':
      return 'Encumbered'
    case 'safe':
    default:
      return 'Normal'
  }
})

const weightBarColor = computed(() => {
  switch (weightStatus.value) {
    case 'over':
      return 'bg-red-800'
    case 'heavy':
      return 'bg-amber-800'
    case 'encumbered':
      return 'bg-gray-700'
    case 'safe':
    default:
      return 'bg-gray-600'
  }
})

const weightStatusTextColor = computed(() => {
  switch (weightStatus.value) {
    case 'over':
      return 'text-red-700'
    case 'heavy':
      return 'text-amber-700'
    case 'encumbered':
      return 'text-gray-800'
    case 'safe':
    default:
      return 'text-gray-600'
  }
})

// Jack of All Trades, Remarkable Athlete, Skills & Initiative Computations
const SKILL_ABILITY_MAP = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
}

const hasJackOfAllTrades = computed(() => {
  const c = char.value
  if (!c) return false
  const cfs = c.class_feature || []
  if (Array.isArray(cfs) && cfs.some(f => (f?.name || '').toLowerCase().includes('jack of all trades'))) {
    return true
  }
  const classes = Array.isArray(c.classes)
    ? c.classes
    : (Array.isArray(c.class) ? c.class : (c.class ? [c.class] : []))

  for (const cl of classes) {
    const name = (typeof cl === 'string' ? cl : (cl?.name || cl?.class_name || '')).toLowerCase()
    const lvl = Number((typeof cl === 'object' && cl?.level) || c.level || 1)
    if (name.includes('bard') && lvl >= 2) return true
  }

  if (typeof c.class === 'string' && c.class.toLowerCase().includes('bard')) {
    const lvl = Number(c.level || 1)
    if (lvl >= 2) return true
  }
  return false
})

const hasRemarkableAthlete = computed(() => {
  const c = char.value
  if (!c) return false
  const scfs = c.sub_class_feature || []
  if (Array.isArray(scfs) && scfs.some(f => (f?.name || '').toLowerCase().includes('remarkable athlete'))) {
    return true
  }
  const subClasses = Array.isArray(c.sub_class)
    ? c.sub_class
    : (Array.isArray(c.sub_classes) ? c.sub_classes : (c.sub_class ? [c.sub_class] : []))
  for (const sc of subClasses) {
    const name = (typeof sc === 'string' ? sc : (sc?.name || sc?.subclass_name || '')).toLowerCase()
    const lvl = Number((typeof sc === 'object' && sc?.level) || c.level || 1)
    if (name.includes('champion') && lvl >= 7) return true
  }
  return false
})

const profBonus = computed(() => {
  if (vtt.value?.proficiency_bonus != null) return Number(vtt.value.proficiency_bonus)
  const lvl = Number(char.value?.level || 1)
  return Math.floor((lvl - 1) / 4) + 2
})

const joatBonus = computed(() => Math.floor(profBonus.value / 2))
const raBonus = computed(() => Math.ceil(profBonus.value / 2))

const computedSkills = computed(() => {
  const pb = profBonus.value
  const joat = hasJackOfAllTrades.value
  const hasRa = hasRemarkableAthlete.value
  const jBonus = joatBonus.value
  const rBonus = raBonus.value

  const sp = char.value?.skill_proficiency || {}
  const se = char.value?.skill_expertise || {}
  const vSkills = vtt.value?.skills || {}

  const result = {}
  for (const [skill, ability] of Object.entries(SKILL_ABILITY_MAP)) {
    const existing = vSkills[skill] || {}
    const isProf = Boolean(sp[skill] || existing.proficient)
    const isExp = Boolean(se[skill] || existing.expertise)
    let isJoat = false
    let isRa = false
    let bonus = 0

    if (isExp) {
      bonus = 2 * pb
    } else if (isProf) {
      bonus = pb
    } else if (joat) {
      bonus = jBonus
      isJoat = true
    } else if (hasRa && (ability === 'strength' || ability === 'dexterity' || ability === 'constitution')) {
      bonus = rBonus
      isRa = true
    }

    let mod = 0
    if (vtt.value?.abilities?.[ability]?.modifier != null) {
      mod = Number(vtt.value.abilities[ability].modifier)
    } else if (char.value?.ability_score?.[ability] != null) {
      mod = Math.floor((Number(char.value.ability_score[ability]) - 10) / 2)
    }

    const total = mod + bonus
    const passive = 10 + total

    result[skill] = {
      ability,
      proficient: isProf,
      expertise: isExp,
      jack_of_all_trades: isJoat || Boolean(existing.jack_of_all_trades),
      remarkable_athlete: isRa || Boolean(existing.remarkable_athlete),
      bonus,
      total,
      passive,
      modifier_string: total >= 0 ? `+${total}` : `${total}`,
      roll_formula: total >= 0 ? `1d20+${total}` : `1d20${total}`
    }
  }
  return result
})

const computedInitiative = computed(() => {
  const dMod = dexMod.value
  const bonus = hasJackOfAllTrades.value ? joatBonus.value : (hasRemarkableAthlete.value ? raBonus.value : 0)
  return dMod + bonus
})

// Dice Rolling Engine
const lastRoll = ref(null)
const rollHistory = ref([])
const isDiceTrayOpen = ref(false)
const diceMultiplier = ref(1)
const diceMod = ref(0)
const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100]
const customModifier = ref(0)
const diceRollMode = ref('normal') // 'normal' | 'adv' | 'dis'

let rollDismissTimer = null

const setRollResult = (result) => {
  lastRoll.value = result
  rollHistory.value.unshift(result)
  if (rollHistory.value.length > 20) rollHistory.value.pop()

  if (rollDismissTimer) clearTimeout(rollDismissTimer)
  rollDismissTimer = setTimeout(() => {
    lastRoll.value = null
  }, 12000)

  // Broadcast roll to campaign if character is linked to a campaign
  const broadcastCampaignId = activeCampaignId.value || props.character?.campaign_id || char.value?.campaign_id
  if (broadcastCampaignId && result && result.total !== undefined) {
    axios.post(`${API_URL}/campaign/${broadcastCampaignId}/rolls`, {
      character_id: char.value.id,
      roll_name: result.label || 'Dice Roll',
      roll_data: {
        label: result.label,
        total: result.total,
        formula: result.formula,
        breakdown: result.breakdown,
        isNat20: Boolean(result.isNat20),
        isNat1: Boolean(result.isNat1),
        timestamp: result.timestamp || new Date().toLocaleTimeString()
      }
    }).catch(err => {
      console.warn('Failed to broadcast roll to campaign', err)
    })
  }
}

const rollDice = (label, mod = 0, formula = null) => {
  const modNum = Number(mod) || 0
  const isAdv = diceRollMode.value === 'adv'
  const isDis = diceRollMode.value === 'dis'

  let d20 = Math.floor(Math.random() * 20) + 1
  let breakdown = ''
  let formulaStr = formula

  if (isAdv || isDis) {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    d20 = isAdv ? Math.max(r1, r2) : Math.min(r1, r2)
    const modeLabel = isAdv ? 'ADV' : 'DIS'
    breakdown = `[${r1}, ${r2}] -> ${d20} ${modNum >= 0 ? '+' : ''}${modNum}`
    if (!formulaStr) {
      formulaStr = `2d20${isAdv ? 'kh1' : 'kl1'} ${modNum >= 0 ? '+' : ''}${modNum} (${modeLabel})`
    }
  } else {
    breakdown = `d20 (${d20}) ${modNum >= 0 ? '+' : ''}${modNum}`
    if (!formulaStr) {
      formulaStr = modNum >= 0 ? `1d20+${modNum}` : `1d20${modNum}`
    }
  }

  const total = d20 + modNum
  const isNat20 = d20 === 20
  const isNat1 = d20 === 1

  const result = {
    label: (isAdv || isDis) ? `${label} (${isAdv ? 'Adv' : 'Dis'})` : label,
    d20,
    mod: modNum,
    total,
    isNat20,
    isNat1,
    formula: formulaStr,
    breakdown,
    timestamp: new Date().toLocaleTimeString()
  }

  setRollResult(result)
}

const rollAnyDie = (faces) => {
  const mod = Number(customModifier.value) || 0
  const count = 1

  if (faces === 20 && diceRollMode.value !== 'normal') {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    const chosen = diceRollMode.value === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2)
    const isNat20 = chosen === 20
    const isNat1 = chosen === 1
    const total = chosen + mod

    setRollResult({
      label: `d20 with ${diceRollMode.value === 'adv' ? 'Advantage' : 'Disadvantage'}`,
      d20: chosen,
      mod,
      total,
      isNat20,
      isNat1,
      formula: `2d20kh1 ${mod >= 0 ? '+' : ''}${mod}`,
      breakdown: `(${r1}, ${r2}) -> ${chosen} ${mod >= 0 ? '+' : ''}${mod}`,
      timestamp: new Date().toLocaleTimeString()
    })
    isDiceTrayOpen.value = false
    return
  }

  const roll = Math.floor(Math.random() * faces) + 1
  const total = roll + mod
  const isNat20 = faces === 20 && roll === 20
  const isNat1 = faces === 20 && roll === 1

  setRollResult({
    label: `d${faces} Roll`,
    d20: faces === 20 ? roll : null,
    mod,
    total,
    isNat20,
    isNat1,
    formula: `1d${faces} ${mod >= 0 ? '+' : ''}${mod}`,
    breakdown: `d${faces} (${roll}) ${mod >= 0 ? '+' : ''}${mod}`,
    timestamp: new Date().toLocaleTimeString()
  })
  isDiceTrayOpen.value = false
}

const activeTab = ref('actions') // 'actions' | 'spells' | 'skills' | 'features' | 'equipment' | 'background' | 'history'
const actionSubFilter = ref('all') // 'all' | 'attack' | 'action' | 'bonus' | 'reaction' | 'other'

const bgCompendiumData = ref(null)
const isFetchingBg = ref(false)

const fetchBackgroundDetails = async () => {
  const bgName = char.value.background
  if (!bgName || bgCompendiumData.value || isFetchingBg.value) return
  isFetchingBg.value = true
  try {
    const res = await axios.get(`${API_URL}/compendium/backgrounds`, {
      params: {
        edition: char.value.edition || '2024',
        search: bgName
      }
    })
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const match = list.find(b => (b.name || '').toLowerCase() === bgName.toLowerCase()) || list[0]
    if (match) {
      bgCompendiumData.value = match
    }
  } catch (err) {
    console.warn('Failed to fetch background compendium data:', err.message)
  } finally {
    isFetchingBg.value = false
  }
}

const formatOriginFeatName = () => {
  if (bgCompendiumData.value?.feats?.length) {
    const f = bgCompendiumData.value.feats[0]
    const raw = typeof f === 'string' ? f : Object.keys(f)[0]
    return raw.split('|')[0].split(';')[0].trim().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (char.value.feat?.length) {
    const f = char.value.feat[0]
    return typeof f === 'string' ? f : (f.name || '')
  }
  return ''
}

const formatBgAbilityScores = () => {
  if (bgCompendiumData.value?.ability?.length || bgCompendiumData.value?.abilityBonuses?.length) {
    return formatBackgroundAbility(bgCompendiumData.value.ability || bgCompendiumData.value.abilityBonuses)
  }
  return 'Any 3 or +2/+1'
}

const formatBgSkills = () => {
  const list = []
  if (bgCompendiumData.value?.skillProficiencies?.length) {
    const res = formatProficiencies(bgCompendiumData.value.skillProficiencies)
    if (res && res !== '—') return res.split(', ')
  }
  if (!list.length && computedSkills.value) {
    Object.entries(computedSkills.value).forEach(([name, sk]) => {
      if (sk.proficient) list.push(name.charAt(0).toUpperCase() + name.slice(1))
    })
  }
  return Array.from(new Set(list))
}

const formatBgTools = () => {
  if (bgCompendiumData.value?.toolProficiencies?.length) {
    const res = formatProficiencies(bgCompendiumData.value.toolProficiencies)
    if (res && res !== '—') return res
  }
  const toolProfs = vtt.value.proficiencies?.tools || []
  return toolProfs.map(cleanProficiencyName).join(', ') || 'None'
}

const formatBgLanguages = () => {
  if (bgCompendiumData.value?.languageProficiencies?.length) {
    const res = formatProficiencies(bgCompendiumData.value.languageProficiencies)
    if (res && res !== '—') return res
  }
  const langs = vtt.value.proficiencies?.languages || []
  return langs.map(cleanProficiencyName).join(', ') || 'Common'
}

const formatBgEquipmentSummary = () => {
  if (bgCompendiumData.value?.startingEquipment || bgCompendiumData.value?.equipment) {
    return formatBackgroundEquipment(bgCompendiumData.value.startingEquipment || bgCompendiumData.value.equipment)
  }
  return 'Standard background items'
}

// D&D Beyond Style Attack Table calculation
const attackTableEntries = computed(() => {
  const entries = []
  const isRaging = Boolean(activeClassStates.value?.barb_rage)
  const rageDmg = isRaging ? rageBonusDamage.value : 0
  const lvl = Number(char.value?.level) || 1

  // 1. Equipped weapons
  for (const w of equippedWeapons.value) {
    const isRanged = w.properties.some(p => p && p.toLowerCase().includes('ranged')) || (w.range && w.range.includes('/'))
    const finalMod = w.statMod + (!isRanged ? rageDmg : 0)
    const dmgLabel = (!isRanged && isRaging)
      ? `${w.damageDice}${finalMod >= 0 ? '+' : ''}${finalMod} ${w.damageType} (Rage +${rageDmg})`
      : `${w.damageDice}${w.statMod >= 0 ? '+' : ''}${w.statMod} ${w.damageType}`

    entries.push({
      id: 'wpn_' + w.name,
      type: 'weapon',
      name: w.name,
      subtitle: isRanged ? 'Ranged Weapon' : 'Melee Weapon',
      range: w.range || (isRanged ? 'Ranged' : '5 ft. Reach'),
      toHit: w.toHit,
      toHitLabel: (w.toHit >= 0 ? '+' : '') + w.toHit,
      isDc: false,
      dcText: '',
      damageDice: w.damageDice,
      damageMod: finalMod,
      damageFormula: w.damageDice,
      damageType: w.damageType,
      damageLabel: dmgLabel,
      notes: w.properties.join(', ') || '—'
    })
  }

  // 2. Unarmed Strike
  const us = unarmedStrikeDetails.value
  const usMod = us.statMod + rageDmg
  const usLabel = isRaging
    ? `${us.damageDice}${usMod >= 0 ? '+' : ''}${usMod} bludgeoning (Rage +${rageDmg})`
    : `${us.damageDice}${us.statMod >= 0 ? '+' : ''}${us.statMod} bludgeoning`

  entries.push({
    id: 'unarmed_strike',
    type: 'unarmed',
    name: us.name,
    subtitle: 'Melee Attack',
    range: '5 ft. Reach',
    toHit: us.toHit,
    toHitLabel: (us.toHit >= 0 ? '+' : '') + us.toHit,
    isDc: false,
    dcText: '',
    damageDice: us.damageDice,
    damageMod: usMod,
    damageFormula: us.damageDice,
    damageType: us.damageType,
    damageLabel: usLabel,
    notes: 'Free hand'
  })

  // 3. Rogue Sneak Attack
  if (charClassName.value === 'rogue') {
    const saFormula = rogueSneakAttackFormula.value
    entries.push({
      id: 'rogue_sneak_attack',
      type: 'feature',
      name: 'Sneak Attack',
      subtitle: 'Once per turn with Finesse or Ranged',
      range: 'With Attack',
      toHit: null,
      toHitLabel: null,
      isDc: false,
      dcText: '',
      damageDice: saFormula,
      damageMod: 0,
      damageFormula: saFormula,
      damageType: 'Extra Damage',
      damageLabel: saFormula,
      notes: 'Advantage or adjacent ally required'
    })
  }

  // 4. Paladin Divine Smite
  if (charClassName.value === 'paladin' && lvl >= 2) {
    entries.push({
      id: 'paladin_divine_smite',
      type: 'feature',
      name: 'Divine Smite',
      subtitle: 'On melee hit (1st lvl slot base)',
      range: 'On Hit',
      toHit: null,
      toHitLabel: null,
      isDc: false,
      dcText: '',
      damageDice: '2d8',
      damageMod: 0,
      damageFormula: '2d8',
      damageType: 'Radiant',
      damageLabel: '2d8 (+1d8/slot > 1st)',
      notes: 'Expend spell slot on weapon hit (+1d8 vs Fiend/Undead)'
    })
  }

  // 5. Battle Master Superiority Die
  if ((charSubClassName.value.includes('battle master') || charSubClassName.value.includes('battlemaster')) && lvl >= 3) {
    const die = lvl >= 18 ? 'd12' : (lvl >= 10 ? 'd10' : 'd8')
    entries.push({
      id: 'bm_superiority_die',
      type: 'feature',
      name: 'Superiority Die',
      subtitle: 'Battle Master Maneuver',
      range: 'Special',
      toHit: null,
      toHitLabel: null,
      isDc: false,
      dcText: '',
      damageDice: `1${die}`,
      damageMod: 0,
      damageFormula: `1${die}`,
      damageType: 'Maneuver',
      damageLabel: `1${die}`,
      notes: 'Add to damage roll or maneuver DC 8+PB+STR/DEX'
    })
  }

  // 6. Attack Spells & Cantrips (hasAttack or diceFormula)
  for (const sp of charSpells.value) {
    const mechanics = extractSpellMechanics(sp, char.value.level, charCasterMod.value)
    if (mechanics.hasAttack || mechanics.diceFormula) {
      const isCantrip = Number(sp.level) === 0 || sp.is_cantrip
      const featTag = isFeatSpell(sp) ? ` (${getFeatName(sp)})` : ''
      const subtitle = `${isCantrip ? 'Cantrip' : 'Level ' + sp.level}${sp.school ? ' · ' + sp.school : ''}${featTag}`
      const range = getSpellRange(sp)
      const notesList = []
      const comp = getSpellComponents(sp)
      if (comp) notesList.push(comp)
      if (sp.concentration) notesList.push('Conc')
      if (sp.ritual) notesList.push('Ritual')

      entries.push({
        id: 'sp_atk_' + (sp.id || sp.name),
        type: 'spell',
        name: sp.name,
        subtitle,
        range: range || 'Self',
        toHit: mechanics.hasAttack ? charSpellAttackBonus.value : null,
        toHitLabel: mechanics.hasAttack ? `${charSpellAttackBonus.value >= 0 ? '+' : ''}${charSpellAttackBonus.value}` : null,
        isDc: Boolean(mechanics.saveAbility),
        dcText: mechanics.saveAbility ? `DC ${charSpellSaveDc.value} ${mechanics.saveAbility.slice(0, 3).toUpperCase()}` : '',
        damageDice: mechanics.diceFormula || '',
        damageMod: mechanics.addModToDice ? charCasterMod.value : 0,
        damageFormula: mechanics.diceFormula || '',
        damageType: sp.damage_type || (mechanics.isHeal ? 'healing' : ''),
        damageLabel: mechanics.diceFormula
          ? (mechanics.addModToDice && charCasterMod.value
              ? `${mechanics.diceFormula}${charCasterMod.value >= 0 ? '+' : ''}${charCasterMod.value}`
              : mechanics.diceFormula)
          : (mechanics.isHeal ? 'Heal' : '—'),
        notes: notesList.join(' • ') || '—'
      })
    }
  }

  return entries
})

// Multiclass & Class Level helpers
const charClassesList = computed(() => {
  if (Array.isArray(char.value?.classes) && char.value.classes.length > 0) return char.value.classes
  if (Array.isArray(char.value?.class)) return char.value.class
  if (char.value?.class) return [char.value.class]
  return []
})

const getCharClassLevel = (className) => {
  const target = (className || '').toLowerCase()
  const found = charClassesList.value.find(c => {
    const name = (c?.name || c?.class?.name || c?.class?.class?.name || '').toLowerCase()
    return name === target
  })
  if (found) return Number(found.level) || 1
  if ((charClassName.value || '').includes(target)) {
    return Number(char.value?.level) || 1
  }
  return 0
}

const hasCharClass = (className) => getCharClassLevel(className) > 0

const monkLevel = computed(() => getCharClassLevel('monk'))

const monkMartialArtsDie = computed(() => {
  const ml = monkLevel.value
  if (ml <= 0) return null
  const is2024 = (char.value?.edition || '2024') === '2024'
  if (is2024) {
    if (ml >= 17) return '1d12'
    if (ml >= 11) return '1d10'
    if (ml >= 5) return '1d8'
    return '1d6'
  } else {
    if (ml >= 17) return '1d10'
    if (ml >= 11) return '1d8'
    if (ml >= 5) return '1d6'
    return '1d4'
  }
})

// Weapon calculations & Combat Actions
const WEAPON_DEFINITIONS = {
  dagger: { damage: '1d4', type: 'piercing', finesse: true, light: true, simple: true, thrown: '20/60' },
  dart: { damage: '1d4', type: 'piercing', finesse: true, ranged: true, simple: true, range: '20/60' },
  shortsword: { damage: '1d6', type: 'piercing', finesse: true, light: true, martial: true },
  scimitar: { damage: '1d6', type: 'slashing', finesse: true, light: true, martial: true },
  rapier: { damage: '1d8', type: 'piercing', finesse: true, martial: true },
  whip: { damage: '1d4', type: 'slashing', finesse: true, reach: true, martial: true },
  club: { damage: '1d4', type: 'bludgeoning', light: true, simple: true },
  greatclub: { damage: '1d8', type: 'bludgeoning', twoHanded: true, simple: true },
  mace: { damage: '1d6', type: 'bludgeoning', simple: true },
  quarterstaff: { damage: '1d6', versatile: '1d8', type: 'bludgeoning', simple: true },
  spear: { damage: '1d6', versatile: '1d8', type: 'piercing', simple: true, thrown: '20/60' },
  javelin: { damage: '1d6', type: 'piercing', simple: true, thrown: '30/120' },
  handaxe: { damage: '1d6', type: 'slashing', light: true, simple: true, thrown: '20/60' },
  battleaxe: { damage: '1d8', versatile: '1d10', type: 'slashing', martial: true },
  flail: { damage: '1d8', type: 'bludgeoning', martial: true },
  glaive: { damage: '1d10', type: 'slashing', reach: true, heavy: true, twoHanded: true, martial: true },
  greataxe: { damage: '1d12', type: 'slashing', heavy: true, twoHanded: true, martial: true },
  greatsword: { damage: '2d6', type: 'slashing', heavy: true, twoHanded: true, martial: true },
  halberd: { damage: '1d10', type: 'slashing', reach: true, heavy: true, twoHanded: true, martial: true },
  lance: { damage: '1d12', type: 'piercing', reach: true, martial: true },
  longsword: { damage: '1d8', versatile: '1d10', type: 'slashing', martial: true },
  maul: { damage: '2d6', type: 'bludgeoning', heavy: true, twoHanded: true, martial: true },
  morningstar: { damage: '1d8', type: 'piercing', martial: true },
  pike: { damage: '1d10', type: 'piercing', reach: true, heavy: true, twoHanded: true, martial: true },
  trident: { damage: '1d6', versatile: '1d8', type: 'piercing', simple: true, thrown: '20/60' },
  war_pick: { damage: '1d8', type: 'piercing', martial: true },
  warhammer: { damage: '1d8', versatile: '1d10', type: 'bludgeoning', martial: true },
  light_crossbow: { damage: '1d8', type: 'piercing', ranged: true, range: '80/320', twoHanded: true, simple: true },
  shortbow: { damage: '1d6', type: 'piercing', ranged: true, range: '80/320', twoHanded: true, simple: true },
  sling: { damage: '1d4', type: 'bludgeoning', ranged: true, range: '30/120', simple: true },
  blowgun: { damage: '1', type: 'piercing', ranged: true, range: '25/100', martial: true },
  hand_crossbow: { damage: '1d6', type: 'piercing', ranged: true, range: '30/120', light: true, martial: true },
  heavy_crossbow: { damage: '1d10', type: 'piercing', ranged: true, range: '100/400', heavy: true, twoHanded: true, martial: true },
  longbow: { damage: '1d8', type: 'piercing', ranged: true, range: '150/600', heavy: true, twoHanded: true, martial: true }
}

const getWeaponDetails = (item) => {
  if (!item) return null
  const eqType = getItemEquipType(item)
  if (eqType !== 'weapon') return null

  const key = (item.name || '').toLowerCase().replace(/['’]/g, '').replace(/[\s-]+/g, '_')
  const found = WEAPON_DEFINITIONS[key] || Object.entries(WEAPON_DEFINITIONS).find(([k]) => key.includes(k))?.[1]

  const is2024 = (char.value?.edition || '2024') === '2024'
  const isMelee = !found?.ranged
  const isSimpleOrShortsword = Boolean(found?.simple) || key.includes('shortsword')
  const isLightMartialMelee = Boolean(found?.light) && isMelee
  const isMonkWeapon = monkLevel.value >= 1 && isMelee && !found?.heavy && !found?.twoHanded && (
    isSimpleOrShortsword || (is2024 && isLightMartialMelee)
  )

  const strMod = vtt.value.abilities?.str?.modifier || 0
  const dexMod = vtt.value.abilities?.dex?.modifier || 0
  const prof = vtt.value.proficiency_bonus || 2

  let statMod = strMod
  if (found?.ranged) {
    statMod = dexMod
  } else if (found?.finesse || isMonkWeapon) {
    statMod = Math.max(strMod, dexMod)
  }

  const toHit = prof + statMod
  let damageDice = found?.damage || item.damage_dice || item.damageDice || item.dmg1 || '1d6'
  const damageType = found?.type || item.damage_type || item.dmgType || 'slashing'

  if (isMonkWeapon && monkMartialArtsDie.value) {
    const parseSides = (d) => parseInt(String(d).replace(/^1d/, ''), 10) || 0
    if (parseSides(monkMartialArtsDie.value) > parseSides(damageDice)) {
      damageDice = monkMartialArtsDie.value
    }
  }

  const props = [
    found?.finesse ? 'Finesse' : null,
    found?.light ? 'Light' : null,
    found?.twoHanded ? 'Two-Handed' : null,
    found?.versatile ? `Versatile (${found.versatile})` : null,
    found?.reach ? 'Reach' : null,
    found?.thrown ? `Thrown (${found.thrown})` : null,
    isMonkWeapon ? 'Monk Weapon' : null
  ].filter(Boolean)

  return {
    name: item.name,
    toHit,
    damageDice,
    statMod,
    damageType,
    range: found?.range || found?.thrown || (found?.ranged ? 'Ranged' : '5 ft.'),
    properties: props
  }
}

const equippedWeapons = computed(() => {
  return liveEquipment.value
    .filter(eq => eq.status === 'equipped' && getItemEquipType(eq) === 'weapon')
    .map(eq => getWeaponDetails(eq))
    .filter(Boolean)
})

const unarmedStrikeDetails = computed(() => {
  const strMod = vtt.value.abilities?.str?.modifier || 0
  const dexMod = vtt.value.abilities?.dex?.modifier || 0
  const prof = vtt.value.proficiency_bonus || 2

  let statMod = strMod
  let damageDice = '1'
  const properties = []

  const allFeaturesList = [
    ...(char.value?.class_feature || []),
    ...(char.value?.sub_class_feature || []),
    ...(char.value?.feat || []),
    ...(char.value?.trait || [])
  ]
  const hasUnarmedFighting = allFeaturesList.some(f => (f.name || '').toLowerCase().includes('unarmed fighting'))
  const hasTavernBrawler = allFeaturesList.some(f => (f.name || '').toLowerCase().includes('tavern brawler'))

  if (hasUnarmedFighting) damageDice = '1d8'
  else if (hasTavernBrawler) damageDice = '1d4'

  if (monkLevel.value >= 1) {
    statMod = Math.max(strMod, dexMod)
    const maDie = monkMartialArtsDie.value
    if (maDie) {
      const parseSides = (d) => parseInt(String(d).replace(/^1d/, ''), 10) || 0
      if (parseSides(maDie) >= parseSides(damageDice) || damageDice === '1') {
        damageDice = maDie
      }
    }
    properties.push('Martial Arts (DEX)')
  }

  const toHit = prof + statMod
  return {
    name: 'Unarmed Strike',
    toHit,
    damageDice,
    statMod,
    damageType: 'bludgeoning',
    range: '5 ft.',
    properties
  }
})

// Feat details client enrichment
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
  if (char.value.edition === '2024') sources.add('XPHB')
  else sources.add('PHB')
  const classes = Array.isArray(char.value.class) ? char.value.class : (char.value.class ? [char.value.class] : [])
  classes.forEach(c => {
    if (c.source) sources.add(c.source.toUpperCase())
  })
  const subClasses = Array.isArray(char.value.sub_class) ? char.value.sub_class : (char.value.sub_class ? [char.value.sub_class] : [])
  subClasses.forEach(sc => {
    if (sc.source) sources.add(sc.source.toUpperCase())
  })
  if (char.value.race?.source) sources.add(char.value.race.source.toUpperCase())
  return sources
})

const embeddedFeatureNames = computed(() => {
  const set = new Set()
  const walk = (entries, parentName) => {
    if (!Array.isArray(entries)) return
    for (const it of entries) {
      if (!it || typeof it !== 'object') continue
      if (it.name && typeof it.name === 'string') {
        const n = it.name.trim().toLowerCase()
        if (n && n !== parentName) set.add(n)
      }
      if (Array.isArray(it.entries)) walk(it.entries, parentName)
    }
  }
  const all = [...(char.value?.class_feature || []), ...(char.value?.sub_class_feature || [])]
  for (const f of all) {
    const pName = (f?.name || '').trim().toLowerCase()
    if (Array.isArray(f?.entries)) walk(f.entries, pName)
  }
  return set
})

const filteredClassFeatures = computed(() => {
  const list = char.value.class_feature || []
  return list.filter(cf => {
    const name = (cf.name || '').trim().toLowerCase()
    if (name && embeddedFeatureNames.value.has(name)) return false
    if (!cf.source) return true
    const src = cf.source.toUpperCase()
    if (isOptionalFeature(cf) && !activeCharSources.value.has(src)) return false
    return true
  })
})

const filteredSubClassFeatures = computed(() => {
  const list = char.value.sub_class_feature || []
  return list.filter(scf => {
    const name = (scf.name || '').trim().toLowerCase()
    if (name && embeddedFeatureNames.value.has(name)) return false
    if (!scf.source) return true
    const src = scf.source.toUpperCase()
    if (isOptionalFeature(scf) && !activeCharSources.value.has(src)) return false
    return true
  })
})

// Features expand/collapse state
const expandedFeatures = ref({})
const toggleFeature = (id) => {
  expandedFeatures.value[id] = !expandedFeatures.value[id]
  if (expandedFeatures.value[id] && id.startsWith('ft_')) {
    const ft = (char.value.feat || []).find(f => 'ft_' + (f.id || f.name) === id)
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

// Collect all feature keys for expand all
const allFeatureKeys = computed(() => {
  const keys = []
  ;(char.value.class_feature || []).forEach(f => keys.push('cf_' + (f.id || f.name)))
  ;(char.value.sub_class_feature || []).forEach(f => keys.push('scf_' + (f.id || f.name)))
  ;(char.value.trait || []).forEach(f => keys.push('tr_' + (f.id || f.name)))
  ;(char.value.feature || []).forEach(f => keys.push('bf_' + (f.id || f.name)))
  ;(char.value.feat || []).forEach(f => keys.push('ft_' + (f.id || f.name)))
  return keys
})

// Spells in Sheet
const charSpells = computed(() => {
  const sp = char.value.spells || char.value.character_spells || []
  return Array.isArray(sp) ? sp : []
})

const isFeatSpell = (sp) => {
  return Boolean(sp?.is_feat_spell || sp?.isFeatSpell || sp?.source_feat || sp?.sourceFeat)
}

const getFeatName = (sp) => {
  return sp?.source_feat || sp?.sourceFeat || 'Feat'
}

const classSpells = computed(() => {
  return charSpells.value.filter(s => !isFeatSpell(s))
})

const featSpells = computed(() => {
  return charSpells.value.filter(s => isFeatSpell(s))
})

const sheetCantrips = computed(() => {
  return classSpells.value.filter(s => Number(s.level) === 0 || s.is_cantrip)
})

const sheetLeveledSpells = computed(() => {
  return classSpells.value.filter(s => Number(s.level) > 0 && !s.is_cantrip)
})

const charClassName = computed(() => {
  const cObj = Array.isArray(char.value.class) ? char.value.class[0] : char.value.class
  return (cObj?.name || '').toLowerCase()
})

const charSubClassName = computed(() => {
  const scObj = Array.isArray(char.value.sub_class) ? char.value.sub_class[0] : char.value.sub_class
  return (scObj?.name || scObj?.short_name || '').toLowerCase()
})

const isCaster = computed(() => {
  if (classSpells.value.length > 0) return true
  const c = charClassName.value
  const sc = charSubClassName.value
  if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard', 'warlock', 'artificer'].includes(c)) return true
  if (c === 'paladin' || c === 'ranger') {
    return (char.value.edition || '2024') === '2024' || Number(char.value.level || 1) >= 2
  }
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) {
    return Number(char.value.level || 1) >= 3
  }
  return false
})

const charCasterAbility = computed(() => {
  const c = charClassName.value
  const sc = charSubClassName.value
  if (sc.includes('eldritch knight') || sc.includes('arcane trickster')) return 'intelligence'
  if (c === 'wizard' || c === 'artificer') return 'intelligence'
  if (c === 'cleric' || c === 'druid' || c === 'ranger') return 'wisdom'
  if (c === 'bard' || c === 'sorcerer' || c === 'warlock' || c === 'paladin') return 'charisma'
  return 'intelligence'
})

const charCasterMod = computed(() => {
  const ab = charCasterAbility.value
  const val = Number(char.value.ability_score?.[ab]) || 10
  return Math.floor((val - 10) / 2)
})

const charProfBonus = computed(() => {
  const pb = char.value.proficiency_bonus
  if (pb != null) return Number(pb)
  return Math.floor((Number(char.value.level || 1) - 1) / 4) + 2
})

const charSpellSaveDc = computed(() => 8 + charProfBonus.value + charCasterMod.value)
const charSpellAttackBonus = computed(() => charProfBonus.value + charCasterMod.value)

// Helper to get ability modifiers
const getAbilityMod = (ab) => {
  const norm = ab.toLowerCase()
  const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }
  const full = map[norm] || norm
  if (vtt.value?.abilities?.[full]?.modifier != null) return Number(vtt.value.abilities[full].modifier)
  if (vtt.value?.abilities?.[norm]?.modifier != null) return Number(vtt.value.abilities[norm].modifier)
  const val = Number(char.value.ability_score?.[full] || char.value.ability_score?.[norm] || 10)
  return Math.floor((val - 10) / 2)
}

// Barbarian Rage damage bonus
const rageBonusDamage = computed(() => {
  const lvl = Number(char.value?.level) || 1
  if (lvl >= 16) return 4
  if (lvl >= 9) return 3
  return 2
})

// Comprehensive Class Resource Trackers
const classResourceTrackers = computed(() => {
  const list = []
  const is2024 = (char.value?.edition || '2024') === '2024'
  const sc = charSubClassName.value
  const chaMod = getAbilityMod('cha')
  const wisMod = getAbilityMod('wis')
  const intMod = getAbilityMod('int')

  // 1. BARBARIAN: Rage
  const barbLvl = getCharClassLevel('barbarian')
  if (barbLvl > 0) {
    let maxRage = 2
    if (barbLvl >= 20) maxRage = 999
    else if (barbLvl >= 17) maxRage = 6
    else if (barbLvl >= 12) maxRage = 5
    else if (barbLvl >= 6) maxRage = 4
    else if (barbLvl >= 3) maxRage = 3

    list.push({
      id: 'barb_rage',
      name: 'Rage',
      subtitle: `Bonus Damage: +${rageBonusDamage.value} · Adv on STR Checks/Saves · B/P/S Resistance`,
      max: maxRage,
      displayMax: maxRage === 999 ? '∞' : maxRage,
      recharge: is2024 ? 'long_regain1' : 'long',
      rechargeLabel: is2024 ? 'Long Rest (Regains 1 on Short Rest)' : 'Long Rest',
      type: 'counter',
      hasActiveToggle: true,
      actionType: 'bonus'
    })
  }

  // 2. FIGHTER: Second Wind, Action Surge, Indomitable, Battle Master Superiority
  const fighterLvl = getCharClassLevel('fighter')
  if (fighterLvl > 0) {
    let swMax = 1
    if (is2024) {
      if (fighterLvl >= 10) swMax = 4
      else if (fighterLvl >= 4) swMax = 3
      else swMax = 2
    }
    list.push({
      id: 'fighter_second_wind',
      name: 'Second Wind',
      subtitle: `Heal 1d10 + ${fighterLvl} HP as Bonus Action`,
      max: swMax,
      displayMax: swMax,
      recharge: is2024 ? 'long_regain1' : 'short',
      rechargeLabel: is2024 ? 'Long Rest (Regains 1 on Short Rest)' : 'Short & Long Rest',
      type: 'counter',
      actionType: 'bonus',
      healFormula: '1d10',
      healBonus: fighterLvl
    })

    if (fighterLvl >= 2) {
      const asMax = fighterLvl >= 17 ? 2 : 1
      list.push({
        id: 'fighter_action_surge',
        name: 'Action Surge',
        subtitle: 'Take 1 additional Action on your turn',
        max: asMax,
        displayMax: asMax,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: 'action'
      })
    }

    if (fighterLvl >= 9) {
      let indomMax = 1
      if (fighterLvl >= 17) indomMax = 3
      else if (fighterLvl >= 13) indomMax = 2
      list.push({
        id: 'fighter_indomitable',
        name: 'Indomitable',
        subtitle: is2024 ? `Reroll failed save with +${fighterLvl} bonus` : 'Reroll a failed saving throw',
        max: indomMax,
        displayMax: indomMax,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'reaction'
      })
    }

    if (sc.includes('battle master') || sc.includes('battlemaster')) {
      if (fighterLvl >= 3) {
        let sdCount = 4
        if (fighterLvl >= 15) sdCount = 6
        else if (fighterLvl >= 7) sdCount = 5

        let dieSize = 'd8'
        if (fighterLvl >= 18) dieSize = 'd12'
        else if (fighterLvl >= 10) dieSize = 'd10'

        list.push({
          id: 'fighter_superiority_dice',
          name: 'Superiority Dice',
          subtitle: `Die: 1${dieSize} (Maneuvers: Menacing, Trip, Riposte, etc.)`,
          max: sdCount,
          displayMax: sdCount,
          die: dieSize,
          recharge: 'short',
          rechargeLabel: 'Short & Long Rest',
          type: 'counter',
          rollFormula: `1${dieSize}`,
          actionType: 'other'
        })
      }
    }
  }

  // 3. MONK: Ki / Focus Points & Uncanny Metabolism
  const monkLvl = getCharClassLevel('monk')
  if (monkLvl >= 2) {
    const resourceName = is2024 ? 'Focus Points' : 'Ki Points'
    list.push({
      id: 'monk_ki',
      name: resourceName,
      subtitle: 'Flurry of Blows (1), Patient Defense (1), Step of the Wind (1), Stunning Strike (1)',
      max: monkLvl,
      displayMax: monkLvl,
      recharge: 'short',
      rechargeLabel: 'Short & Long Rest',
      type: 'points',
      actionType: 'bonus'
    })

    if (is2024) {
      list.push({
        id: 'monk_uncanny_metabolism',
        name: 'Uncanny Metabolism',
        subtitle: `Regain all Focus points + heal ${monkLvl} + ${monkMartialArtsDie.value || '1d6'} HP (1/Long Rest)`,
        max: 1,
        displayMax: 1,
        recharge: 'long',
        rechargeLabel: 'Long Rest',
        type: 'counter',
        actionType: 'bonus'
      })
    }
  }

  // 4. CLERIC: Channel Divinity
  const clericLvl = getCharClassLevel('cleric')
  if (clericLvl >= 2) {
    let cdMax = 1
    if (is2024) {
      if (clericLvl >= 18) cdMax = 4
      else if (clericLvl >= 6) cdMax = 3
      else cdMax = 2
    } else {
      if (clericLvl >= 18) cdMax = 3
      else if (clericLvl >= 6) cdMax = 2
      else cdMax = 1
    }
    list.push({
      id: 'cleric_channel_divinity',
      name: 'Channel Divinity',
      subtitle: 'Turn Undead, Divine Spark / Domain Feature, Harness Divine Power',
      max: cdMax,
      displayMax: cdMax,
      recharge: 'short',
      rechargeLabel: 'Short & Long Rest',
      type: 'counter',
      actionType: 'action'
    })
  }

  // 5. PALADIN: Lay on Hands & Channel Divinity
  const paladinLvl = getCharClassLevel('paladin')
  if (paladinLvl > 0) {
    const lohPool = 5 * paladinLvl
    list.push({
      id: 'paladin_lay_on_hands',
      name: 'Lay on Hands',
      subtitle: 'Healing Pool (Heal 1 HP per point, or 5 points to cure Poison/Disease)',
      max: lohPool,
      displayMax: `${lohPool} HP`,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'pool',
      actionType: 'action'
    })

    if (paladinLvl >= 3) {
      const cdMax = is2024 ? 2 : 1
      list.push({
        id: 'paladin_channel_divinity',
        name: 'Channel Divinity',
        subtitle: 'Sacred Weapon / Vow of Enmity / Subclass Channel Divinity',
        max: cdMax,
        displayMax: cdMax,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: 'action'
      })
    }
  }

  // 6. DRUID: Wild Shape
  const druidLvl = getCharClassLevel('druid')
  if (druidLvl >= 2) {
    const wsMax = druidLvl >= 20 ? 999 : 2
    list.push({
      id: 'druid_wild_shape',
      name: 'Wild Shape',
      subtitle: is2024 ? 'Assume Beast Shape (Bonus Action) · Regains 1 on Short Rest' : 'Assume Beast Shape (Action / Bonus Action for Moon)',
      max: wsMax,
      displayMax: wsMax === 999 ? '∞' : wsMax,
      recharge: is2024 ? 'long_regain1' : 'short',
      rechargeLabel: is2024 ? 'Long Rest (Regains 1 on Short Rest)' : 'Short & Long Rest',
      type: 'counter',
      actionType: 'action'
    })
  }

  // 7. BARD: Bardic Inspiration
  const bardLvl = getCharClassLevel('bard')
  if (bardLvl > 0) {
    const biUses = Math.max(1, chaMod)
    let biDie = 'd6'
    if (bardLvl >= 15) biDie = 'd12'
    else if (bardLvl >= 10) biDie = 'd10'
    else if (bardLvl >= 5) biDie = 'd8'

    const biRecharge = bardLvl >= 5 ? 'short' : 'long'
    list.push({
      id: 'bard_inspiration',
      name: 'Bardic Inspiration',
      subtitle: `Die: 1${biDie} · Range 60 ft. (Bonus Action to inspire ally)`,
      max: biUses,
      displayMax: biUses,
      die: biDie,
      recharge: biRecharge,
      rechargeLabel: bardLvl >= 5 ? 'Short & Long Rest (Font of Inspiration)' : 'Long Rest',
      type: 'counter',
      rollFormula: `1${biDie}`,
      actionType: 'bonus'
    })
  }

  // 8. SORCERER: Sorcery Points & Innate Sorcery
  const sorcLvl = getCharClassLevel('sorcerer')
  if (sorcLvl >= 2) {
    list.push({
      id: 'sorcerer_sorcery_points',
      name: 'Sorcery Points',
      subtitle: 'Font of Magic (Slot conversion) & Metamagic options',
      max: sorcLvl,
      displayMax: sorcLvl,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'points',
      actionType: 'bonus'
    })
  }
  if (is2024 && sorcLvl >= 1) {
    list.push({
      id: 'sorcerer_innate_sorcery',
      name: 'Innate Sorcery',
      subtitle: 'Bonus Action: 1 min buff (+1 Spell DC, Advantage on Sorcerer Spell Attacks)',
      max: 2,
      displayMax: 2,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'counter',
      hasActiveToggle: true,
      actionType: 'bonus'
    })
  }

  // 9. WARLOCK: Mystic Arcanum
  const warlockLvl = getCharClassLevel('warlock')
  if (warlockLvl >= 11) {
    let arcanumCount = 1
    if (warlockLvl >= 17) arcanumCount = 4
    else if (warlockLvl >= 15) arcanumCount = 3
    else if (warlockLvl >= 13) arcanumCount = 2
    list.push({
      id: 'warlock_mystic_arcanum',
      name: 'Mystic Arcanum',
      subtitle: `Free 6th${warlockLvl >= 13 ? '+7th' : ''}${warlockLvl >= 15 ? '+8th' : ''}${warlockLvl >= 17 ? '+9th' : ''} Level Spells (1 cast each / Long Rest)`,
      max: arcanumCount,
      displayMax: arcanumCount,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'counter',
      actionType: 'action'
    })
  }

  // 10. WIZARD: Arcane Recovery
  const wizardLvl = getCharClassLevel('wizard')
  if (wizardLvl >= 1) {
    list.push({
      id: 'wizard_arcane_recovery',
      name: 'Arcane Recovery',
      subtitle: `Recover up to ${Math.ceil(wizardLvl / 2)} total spell slot levels on Short Rest (1/Long Rest)`,
      max: 1,
      displayMax: 1,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'counter',
      actionType: 'other'
    })
  }

  // 11. RANGER: Hunter's Mark / Favored Foe
  const rangerLvl = getCharClassLevel('ranger')
  if (rangerLvl > 0) {
    const hmMax = is2024 ? Math.max(2, wisMod) : (charProfBonus.value || 2)
    list.push({
      id: 'ranger_hunters_mark',
      name: is2024 ? "Hunter's Mark" : "Favored Foe",
      subtitle: is2024 ? `Free casts without expending spell slots (${hmMax}/Long Rest)` : `Mark target on hit without spell slot (${hmMax}/Long Rest)`,
      max: hmMax,
      displayMax: hmMax,
      recharge: 'long',
      rechargeLabel: 'Long Rest',
      type: 'counter',
      actionType: 'bonus'
    })
  }

  // 12. ROGUE: Soulknife & Stroke of Luck
  const rogueLvl = getCharClassLevel('rogue')
  if (rogueLvl > 0) {
    if (sc.includes('soulknife')) {
      const psiMax = (charProfBonus.value || 2) * 2
      let psiDie = 'd6'
      if (rogueLvl >= 17) psiDie = 'd12'
      else if (rogueLvl >= 11) psiDie = 'd10'
      else if (rogueLvl >= 5) psiDie = 'd8'
      list.push({
        id: 'rogue_psionic_energy',
        name: 'Psionic Energy Dice',
        subtitle: `Die: 1${psiDie} · Psionic Power Pool`,
        max: psiMax,
        displayMax: psiMax,
        die: psiDie,
        recharge: 'long_regain1',
        rechargeLabel: 'Long Rest (Regains 1 on Short Rest)',
        type: 'counter',
        rollFormula: `1${psiDie}`,
        actionType: 'bonus'
      })
    }
    if (rogueLvl >= 20) {
      list.push({
        id: 'rogue_stroke_of_luck',
        name: 'Stroke of Luck',
        subtitle: 'Turn a miss into a hit, or a failed d20 test into a 20 (1/Rest)',
        max: 1,
        displayMax: 1,
        recharge: 'short',
        rechargeLabel: 'Short & Long Rest',
        type: 'counter',
        actionType: 'other'
      })
    }
  }

  return list
})

const getResourceSpent = (id) => {
  return Number(spentClassResources.value?.[id]) || 0
}

const getResourceAvailable = (res) => {
  if (!res) return 0
  if (res.max === 999) return 999
  return Math.max(0, res.max - getResourceSpent(res.id))
}

const isResourceSlotExpended = (res, slotIdx) => {
  if (!res) return false
  return slotIdx > getResourceAvailable(res)
}

const toggleResourceSlot = (res, slotIdx) => {
  if (!res) return
  const currentAvail = getResourceAvailable(res)
  if (currentAvail >= slotIdx) {
    spentClassResources.value[res.id] = res.max - slotIdx + 1
  } else {
    spentClassResources.value[res.id] = res.max - slotIdx
  }
}

const spendResource = (resOrId, amount = 1) => {
  const id = typeof resOrId === 'string' ? resOrId : resOrId.id
  const res = classResourceTrackers.value.find(r => r.id === id)
  if (!res) return
  if (res.max === 999) return
  const currentSpent = getResourceSpent(id)
  spentClassResources.value[id] = Math.min(res.max, currentSpent + amount)
}

const restoreResource = (resOrId, amount = 1) => {
  const id = typeof resOrId === 'string' ? resOrId : resOrId.id
  const currentSpent = getResourceSpent(id)
  spentClassResources.value[id] = Math.max(0, currentSpent - amount)
}

const isClassStateActive = (key) => {
  return Boolean(activeClassStates.value?.[key])
}

const toggleClassState = (key, resId = null) => {
  const newState = !activeClassStates.value[key]
  activeClassStates.value[key] = newState
  if (newState && resId) {
    spendResource(resId, 1)
  }
}

const activateSecondWind = () => {
  const res = classResourceTrackers.value.find(r => r.id === 'fighter_second_wind')
  if (res && getResourceAvailable(res) <= 0) {
    showToast('No Second Wind uses remaining!')
    return
  }
  const lvl = Number(char.value?.level) || 1
  spendResource('fighter_second_wind', 1)
  rollFormula('Second Wind Healing', '1d10', lvl)
}

const rollResourceDie = (res) => {
  if (!res || !res.rollFormula) return
  if (getResourceAvailable(res) <= 0) {
    showToast(`No ${res.name} uses remaining!`)
    return
  }
  spendResource(res.id, 1)
  rollFormula(`${res.name} Roll`, res.rollFormula)
}

const activateMonkKiAction = (actionName, cost = 1) => {
  const res = classResourceTrackers.value.find(r => r.id === 'monk_ki')
  if (res && getResourceAvailable(res) < cost) {
    showToast(`Not enough ${res.name} remaining!`)
    return
  }
  if (res) spendResource('monk_ki', cost)
  showToast(`${actionName} activated! (Spent ${cost} ${res?.name || 'Ki'})`)
}

const activateUncannyMetabolism = () => {
  const res = classResourceTrackers.value.find(r => r.id === 'monk_uncanny_metabolism')
  if (res && getResourceAvailable(res) <= 0) {
    showToast('No Uncanny Metabolism uses remaining!')
    return
  }
  if (res) spendResource('monk_uncanny_metabolism', 1)
  spentClassResources.value['monk_ki'] = 0
  persistSheetState()

  const ml = monkLevel.value || 1
  const maDie = monkMartialArtsDie.value || '1d6'
  const dieSides = parseInt(maDie.replace(/^1d/, ''), 10) || 6
  const rolled = Math.floor(Math.random() * dieSides) + 1
  const totalHeal = ml + rolled

  const currentHp = Number(char.value?.hp) || 0
  const maxHp = Number(char.value?.max_hp) || currentHp
  const newHp = Math.min(maxHp, currentHp + totalHeal)
  if (char.value) char.value.hp = newHp
  saveVitals({ hp: newHp })

  showToast(`Uncanny Metabolism! Restored all Focus points & healed ${totalHeal} HP (${rolled} + ${ml})`)
}

const deflectAttacksReaction = () => {
  const dexMod = getAbilityMod('dex')
  const ml = monkLevel.value || 1
  const d10 = Math.floor(Math.random() * 10) + 1
  const totalReduction = d10 + dexMod + ml
  showToast(`Deflect Attacks: Reduced damage by ${totalReduction} (${d10} + DEX ${dexMod} + Lvl ${ml})`)
  rollDice(`Deflect Attacks Reduction (${d10} + ${dexMod + ml})`, dexMod + ml, '1d10')
}

const activateActionSurge = () => {
  const res = classResourceTrackers.value.find(r => r.id === 'fighter_action_surge')
  if (res && getResourceAvailable(res) <= 0) {
    showToast('No Action Surge uses remaining!')
    return
  }
  spendResource('fighter_action_surge', 1)
  showToast('Action Surge activated! Take 1 additional Action on your turn.')
}

const activateIndomitable = () => {
  const res = classResourceTrackers.value.find(r => r.id === 'fighter_indomitable')
  if (res && getResourceAvailable(res) <= 0) {
    showToast('No Indomitable uses remaining!')
    return
  }
  spendResource('fighter_indomitable', 1)
  const is2024 = (char.value?.edition || '2024') === '2024'
  const bonus = is2024 ? Number(char.value?.level || 1) : 0
  rollDice(`Indomitable Saving Throw Reroll${bonus ? ` (+${bonus})` : ''}`, bonus)
}

const activateLayOnHands = (amount) => {
  const res = classResourceTrackers.value.find(r => r.id === 'paladin_lay_on_hands')
  if (!res) return
  const available = getResourceAvailable(res)
  if (available < amount) {
    showToast(`Not enough Lay on Hands points remaining! (Available: ${available})`)
    return
  }
  spendResource('paladin_lay_on_hands', amount)
  showToast(`Lay on Hands: Expended ${amount} HP pool (Remaining: ${available - amount} HP).`)
}

const activateChannelDivinity = (featureName) => {
  const clericRes = classResourceTrackers.value.find(r => r.id === 'cleric_channel_divinity')
  const paladinRes = classResourceTrackers.value.find(r => r.id === 'paladin_channel_divinity')
  const res = clericRes || paladinRes
  if (res && getResourceAvailable(res) <= 0) {
    showToast('No Channel Divinity uses remaining!')
    return
  }
  if (res) spendResource(res.id, 1)
  showToast(`${featureName} activated! (Expended 1 Channel Divinity)`)
}

const rogueSneakAttackFormula = computed(() => {
  const lvl = Number(char.value?.level) || 1
  const diceCount = Math.ceil(lvl / 2)
  return `${diceCount}d6`
})

const rollSneakAttack = () => {
  rollFormula('Sneak Attack Damage', rogueSneakAttackFormula.value)
}

const rollDivineSmite = (slotLvl = 1) => {
  const dice = 1 + slotLvl
  rollFormula(`Divine Smite (Level ${slotLvl} Slot)`, `${dice}d8`)
}

// Slots calculation for sheet
const sheetSpellSlots = computed(() => {
  const c = charClassName.value
  const lvl = Number(char.value.level) || 1

  const warlLvl = getCharClassLevel('warlock')
  let pactEntry = null
  if (warlLvl > 0) {
    const pactSlots = warlLvl === 1 ? 1 : (warlLvl >= 17 ? 4 : (warlLvl >= 11 ? 3 : 2))
    const pactLvl = Math.min(5, Math.ceil(warlLvl / 2))
    pactEntry = { level: pactLvl, total: pactSlots, isPact: true }
  }

  // Pure warlock
  if (warlLvl > 0 && !hasCharClass('wizard') && !hasCharClass('cleric') && !hasCharClass('druid') && !hasCharClass('sorcerer') && !hasCharClass('bard') && !hasCharClass('paladin') && !hasCharClass('ranger') && !hasCharClass('artificer')) {
    return [pactEntry]
  }

  const fullCasterTable = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3],
    [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]

  const halfCasterTable = [
    [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3],
    [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1],
    [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
  ]

  let arr = []
  if (['wizard', 'cleric', 'druid', 'sorcerer', 'bard'].includes(c) || hasCharClass('wizard') || hasCharClass('cleric') || hasCharClass('druid') || hasCharClass('sorcerer') || hasCharClass('bard')) {
    arr = fullCasterTable[lvl - 1] || []
  } else if (['paladin', 'ranger', 'artificer'].includes(c) || hasCharClass('paladin') || hasCharClass('ranger') || hasCharClass('artificer')) {
    if (char.value.edition === '2014' && (c === 'paladin' || c === 'ranger') && lvl === 1) {
      arr = []
    } else {
      arr = halfCasterTable[lvl - 1] || []
    }
  }

  const standardSlots = arr.map((qty, idx) => ({ level: idx + 1, total: qty }))
  if (pactEntry) {
    const existing = standardSlots.find(s => s.level === pactEntry.level)
    if (existing) {
      existing.total += pactEntry.total
      existing.isPact = true
    } else {
      standardSlots.push(pactEntry)
      standardSlots.sort((a, b) => a.level - b.level)
    }
  }

  return standardSlots
})

const isSlotExpended = (lvl, slotIdx) => {
  return Boolean(expendedSlots.value[`${lvl}_${slotIdx}`])
}

const isSlotDisabled = () => false

const toggleSlot = (lvl, slotIdx) => {
  const key = `${lvl}_${slotIdx}`
  expendedSlots.value[key] = !expendedSlots.value[key]
}
const toggleSlotUse = toggleSlot

const allSpellLevels = computed(() => {
  return (sheetSpellSlots.value || []).filter(s => s.total > 0).map(s => s.level)
})

const getMaxSlots = (lvl) => {
  const s = (sheetSpellSlots.value || []).find(slot => slot.level === Number(lvl))
  return s ? s.total : 0
}

const getAvailableSlots = (lvl) => {
  const max = getMaxSlots(lvl)
  let count = 0
  for (let i = 1; i <= max; i++) {
    if (!isSlotExpended(lvl, i)) count++
  }
  return count
}

const isFeatCastExpended = (sp) => {
  const key = sp?.name || sp?.id
  return Boolean(expendedFeatFreeCasts.value[key])
}

const toggleFeatFreeCast = (sp) => {
  const key = sp?.name || sp?.id
  expendedFeatFreeCasts.value[key] = !expendedFeatFreeCasts.value[key]
}

const activeSpellsByLevel = computed(() => {
  const levels = new Set()
  sheetLeveledSpells.value.forEach(s => {
    const l = Number(s.level)
    if (l > 0) levels.add(l)
  })
  allSpellLevels.value.forEach(l => levels.add(l))
  return Array.from(levels).sort((a, b) => a - b)
})

const getSpellsAtLevel = (lvl) => {
  return sheetLeveledSpells.value.filter(s => Number(s.level) === Number(lvl))
}

const expandedSpells = ref({})
const toggleSpell = (id) => {
  expandedSpells.value[id] = !expandedSpells.value[id]
  if (expandedSpells.value[id]) {
    const rawKey = id.replace(/^sp_/, '')
    const sp = charSpells.value.find(s => String(s.id || s.name) === rawKey)
    if (sp) fetchSpellDetailsIfNeeded(sp)
  }
}

const getSpellCastingTime = (sp) => {
  const full = getFullSpell(sp)
  if (full.casting_time) return full.casting_time
  if (Array.isArray(full.time) && full.time[0]) {
    const t = full.time[0]
    return `${t.number || 1} ${t.unit}`
  }
  return '1 action'
}

const getSpellRange = (sp) => {
  const full = getFullSpell(sp)
  if (full.range && typeof full.range === 'string') return full.range
  if (full.range?.distance) {
    const d = full.range.distance
    return `${d.amount ? d.amount + ' ' : ''}${d.type || 'feet'}`
  }
  return full.range?.type || 'Self'
}

const getSpellDuration = (sp) => {
  const full = getFullSpell(sp)
  if (full.duration && typeof full.duration === 'string') return full.duration
  if (Array.isArray(full.duration) && full.duration[0]) {
    const d = full.duration[0]
    if (d.type === 'instant') return 'Instantaneous'
    if (d.duration) return `${d.duration.amount} ${d.duration.type}`
    return d.type || 'Instantaneous'
  }
  return 'Instantaneous'
}

const getSpellComponents = (sp) => {
  const full = getFullSpell(sp)
  if (full.components && typeof full.components === 'string') return full.components
  if (full.components && typeof full.components === 'object') {
    const parts = []
    if (full.components.v) parts.push('V')
    if (full.components.s) parts.push('S')
    if (full.components.m) parts.push('M')
    return parts.join(', ') || 'V, S'
  }
  return 'V, S'
}

const getSpellEntries = (sp) => {
  const full = getFullSpell(sp)
  if (Array.isArray(full.entries)) return full.entries
  if (typeof full.entries === 'string') {
    try {
      const parsed = JSON.parse(full.entries)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return [full.entries]
    }
  }
  return []
}

const getSpellHigherLevels = (sp) => {
  const full = getFullSpell(sp)
  const hl = full.entriesHigherLevel || full.higher_levels
  if (Array.isArray(hl)) return hl
  if (typeof hl === 'string') {
    try {
      const parsed = JSON.parse(hl)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return [hl]
    }
  }
  return []
}

const formatSpellEntry = (ent) => {
  if (ent == null) return ''
  if (typeof ent === 'string') return ent
  if (typeof ent === 'object') {
    if (ent.name && ent.entries) {
      return `<strong>${ent.name}.</strong> ` + (Array.isArray(ent.entries) ? ent.entries.map(formatSpellEntry).join(' ') : ent.entries)
    }
    if (ent.type === 'list' && Array.isArray(ent.items)) {
      return '• ' + ent.items.map(it => typeof it === 'string' ? it : (it.entry || '')).join('\n• ')
    }
    if (Array.isArray(ent.entries)) {
      return ent.entries.map(formatSpellEntry).join(' ')
    }
  }
  return String(ent)
}

const castSpell = (sp, useSlot = false) => {
  const mechanics = extractSpellMechanics(sp, char.value.level, charCasterMod.value)
  const lvl = Number(sp.level) || 0
  const isFeat = isFeatSpell(sp)

  if (lvl > 0) {
    if (isFeat && !useSlot) {
      const key = sp.name || sp.id
      expendedFeatFreeCasts.value[key] = true
    } else if (getMaxSlots(lvl) > 0) {
      const max = getMaxSlots(lvl)
      for (let i = 1; i <= max; i++) {
        if (!expendedSlots.value[`${lvl}_${i}`]) {
          expendedSlots.value[`${lvl}_${i}`] = true
          break
        }
      }
    }
  }
  if (mechanics.hasAttack) {
    rollDice(`${sp.name} Attack`, charSpellAttackBonus.value)
  } else if (mechanics.diceFormula) {
    if (mechanics.isHeal) {
      rollFormula(`${sp.name} Heal`, mechanics.diceFormula, mechanics.addModToDice ? charCasterMod.value : 0)
    } else {
      rollFormula(`${sp.name} Damage`, mechanics.diceFormula)
    }
  } else {
    logSpellCast(sp.name)
  }
}

// Spell Details Resolution & Dynamic Capabilities
const cachedSpellDetails = ref({})
const isFetchingSpell = ref({})

const fetchSpellDetailsIfNeeded = async (spell) => {
  const sName = spell?.name
  if (!sName) return
  const key = sName.trim().toLowerCase()
  if (cachedSpellDetails.value[key] || isFetchingSpell.value[key]) return

  const hasEntries = Array.isArray(spell.entries) && spell.entries.length > 0
  if (hasEntries) return

  isFetchingSpell.value[key] = true
  try {
    const edition = char.value.edition || '2024'
    const res = await axios.get(`${API_URL}/compendium/spells?edition=${edition}&search=${encodeURIComponent(sName)}`)
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    const match = list.find(s => (s.name || '').trim().toLowerCase() === key) || list[0]
    if (match) {
      cachedSpellDetails.value[key] = {
        ...match,
        entries: typeof match.entries === 'string' ? JSON.parse(match.entries) : (match.entries || []),
        entriesHigherLevel: typeof match.higher_levels === 'string' ? JSON.parse(match.higher_levels) : (match.higher_levels || match.entriesHigherLevel || [])
      }
    }
  } catch (err) {
    console.error('Failed to fetch spell detail for', sName, err)
  } finally {
    isFetchingSpell.value[key] = false
  }
}

const getFullSpell = (sp) => {
  const key = (sp.name || '').trim().toLowerCase()
  const fetched = cachedSpellDetails.value[key]
  if (fetched) {
    return { ...sp, ...fetched }
  }
  return sp
}

const renderSpellEntryHtml = (entry) => {
  if (entry == null) return ''
  if (typeof entry === 'string') return `<p class="leading-relaxed mb-1">${renderAnnotatedText(entry)}</p>`
  if (typeof entry === 'object') {
    if (entry.name && entry.entries) {
      const sub = entry.entries.map(renderSpellEntryHtml).join('')
      return `<div class="mt-1"><span class="font-bold text-gray-900">${renderAnnotatedText(entry.name)}. </span>${sub}</div>`
    }
    if (entry.type === 'list' && Array.isArray(entry.items)) {
      const items = entry.items.map(it => `<li>${renderAnnotatedText(typeof it === 'string' ? it : (it.entry || ''))}</li>`).join('')
      return `<ul class="list-disc pl-4 space-y-0.5 my-1">${items}</ul>`
    }
    if (entry.type === 'table') {
      const headers = (entry.colLabels || []).map(h => `<th class="p-1.5 font-semibold text-gray-700">${renderAnnotatedText(h)}</th>`).join('')
      const rows = (entry.rows || []).map(r => `<tr>${r.map(c => `<td class="p-1.5 text-gray-600">${renderTableCell(c)}</td>`).join('')}</tr>`).join('')
      const caption = entry.caption ? `<caption class="p-1.5 text-xs font-bold text-gray-800 bg-gray-50 text-left border-b border-gray-200">${entry.caption}</caption>` : ''
      return `<div class="my-2 overflow-x-auto w-full border border-gray-200 rounded max-w-full"><table class="w-full min-w-full text-left text-xs divide-y divide-gray-200">${caption}<thead class="bg-gray-50"><tr>${headers}</tr></thead><tbody class="divide-y divide-gray-100 bg-white">${rows}</tbody></table></div>`
    }
    if (entry.entries && Array.isArray(entry.entries)) {
      return entry.entries.map(renderSpellEntryHtml).join('')
    }
  }
  return `<p class="leading-relaxed mb-1">${renderAnnotatedText(String(entry))}</p>`
}

const quickRollDie = (sides) => {
  isDiceTrayOpen.value = false
  const count = Math.max(1, Number(diceMultiplier.value) || 1)
  const mod = Number(diceMod.value) || 0
  const isAdv = sides === 20 && count === 1 && diceRollMode.value === 'adv'
  const isDis = sides === 20 && count === 1 && diceRollMode.value === 'dis'

  if (isAdv || isDis) {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    const chosen = isAdv ? Math.max(r1, r2) : Math.min(r1, r2)
    const total = chosen + mod
    const sign = mod >= 0 ? `+${mod}` : `${mod}`
    const formulaStr = `2d20${isAdv ? 'kh1' : 'kl1'}${mod !== 0 ? sign : ''}`
    const breakdownStr = `[${r1}, ${r2}] -> ${chosen}${mod !== 0 ? ` ${sign}` : ''} = ${total}`
    const isNat20 = chosen === 20
    const isNat1 = chosen === 1
    setRollResult({
      label: `d20 with ${isAdv ? 'Advantage' : 'Disadvantage'}`,
      total,
      d20: chosen,
      mod,
      formula: formulaStr,
      breakdown: breakdownStr,
      isNat20,
      isNat1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    })
    return
  }

  const rolls = []
  let total = 0
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1
    rolls.push(r)
    total += r
  }
  total += mod
  const sign = mod >= 0 ? `+${mod}` : `${mod}`
  const formulaStr = `${count}d${sides}${mod !== 0 ? sign : ''}`
  const breakdownStr = count > 1
    ? `[${rolls.join(', ')}]${mod !== 0 ? ` ${sign}` : ''} = ${total}`
    : `Rolled ${rolls[0]}${mod !== 0 ? ` ${sign}` : ''} = ${total}`

  const isNat20 = sides === 20 && count === 1 && rolls[0] === 20
  const isNat1 = sides === 20 && count === 1 && rolls[0] === 1

  setRollResult({
    label: `${formulaStr} Roll`,
    total,
    formula: formulaStr,
    breakdown: breakdownStr,
    isNat20,
    isNat1,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
}

const extractSpellMechanics = (sp, charLevel = 1, casterMod = 0) => {
  const full = getFullSpell(sp)
  const entries = full.entries || []
  const textBody = Array.isArray(entries)
    ? entries.map(e => {
        if (typeof e === 'string') return e
        if (e && Array.isArray(e.entries)) return e.entries.join(' ')
        return ''
      }).join(' ')
    : (typeof entries === 'string' ? entries : '')

  const hasAttack = (Array.isArray(full.spellAttack) && full.spellAttack.length > 0) ||
    Boolean(full.spell_attack) ||
    /\bmake a (?:melee|ranged) spell attack\b/i.test(textBody)

  let saveAbility = null
  if (Array.isArray(full.savingThrow) && full.savingThrow.length > 0) {
    saveAbility = full.savingThrow[0]
  } else if (full.save_ability) {
    saveAbility = full.save_ability.split(',')[0].trim()
  } else {
    const m = textBody.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i)
    if (m) saveAbility = m[1].toLowerCase()
  }

  const isHeal = /regains?\s+(?:a number of\s+)?(?:hit points|hp)/i.test(textBody) ||
    (Array.isArray(full.miscTags) && full.miscTags.includes('HL'))

  let diceFormula = null
  const diceObj = typeof full.damage_dice === 'string'
    ? (() => { try { return JSON.parse(full.damage_dice) } catch { return null } })()
    : (full.damage_dice || full.scalingLevelDice || null)

  if (diceObj?.scaling) {
    const lvl = Number(charLevel) || 1
    if (lvl >= 17 && diceObj.scaling['17']) diceFormula = diceObj.scaling['17']
    else if (lvl >= 11 && diceObj.scaling['11']) diceFormula = diceObj.scaling['11']
    else if (lvl >= 5 && diceObj.scaling['5']) diceFormula = diceObj.scaling['5']
    else diceFormula = diceObj.scaling['1'] || Object.values(diceObj.scaling)[0]
  }

  if (!diceFormula) {
    const dMatch = textBody.match(/\{@(damage|dice)\s+([^}]+)\}/i)
    if (dMatch) {
      diceFormula = dMatch[2].split('|')[0].trim()
    }
  }

  const addModToDice = isHeal && /plus\s+your\s+spellcasting\s+ability\s+modifier|\+\s*your\s+spellcasting/i.test(textBody)
  const isUtility = !hasAttack && !saveAbility && !isHeal && !diceFormula

  return {
    hasAttack,
    saveAbility,
    isHeal,
    diceFormula,
    addModToDice,
    isUtility
  }
}

const rollFormula = (label, formula, bonusMod = 0) => {
  if (!formula && bonusMod === 0) return

  let total = 0
  const breakdownParts = []

  if (formula) {
    const formulaClean = String(formula).replace(/\s+/g, '')
    const replacedFormula = formulaClean.replace(/(\d*)d(\d+)/gi, (m, countStr, sidesStr) => {
      const count = parseInt(countStr, 10) || 1
      const sides = parseInt(sidesStr, 10) || 6
      const rolls = []
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1)
      }
      const sum = rolls.reduce((a, b) => a + b, 0)
      breakdownParts.push(`${count}d${sides} (${rolls.join(', ')})`)
      return sum
    })

    try {
      const evalSum = Function(`'use strict'; return (${replacedFormula})`)()
      total = Number(evalSum) || 0
    } catch {
      total = 0
    }
  }

  if (bonusMod !== 0) {
    total += bonusMod
    breakdownParts.push(`${bonusMod >= 0 ? '+' : ''}${bonusMod}`)
  }

  const resultFormula = formula
    ? (bonusMod !== 0 ? `${formula} ${bonusMod >= 0 ? '+' : ''}${bonusMod}` : formula)
    : `${bonusMod >= 0 ? '+' : ''}${bonusMod}`

  setRollResult({
    label,
    d20: null,
    mod: bonusMod,
    total,
    isNat20: false,
    isNat1: false,
    formula: resultFormula,
    breakdown: breakdownParts.join(' ') || String(total),
    timestamp: new Date().toLocaleTimeString()
  })
}

const logSpellCast = (spellName) => {
  setRollResult({
    label: `${spellName} Cast`,
    d20: null,
    mod: 0,
    total: 'Active',
    isNat20: false,
    isNat1: false,
    formula: 'Utility / Effect',
    breakdown: 'Cast without roll',
    timestamp: new Date().toLocaleTimeString()
  })
}

const toggleSpellCard = (sp) => {
  const key = 'sp_' + (sp.id || sp.name)
  toggleFeature(key)
  if (expandedFeatures.value[key]) {
    fetchSpellDetailsIfNeeded(sp)
  }
}

const featActionSpells = computed(() => {
  return featSpells.value.filter(s => {
    const full = getFullSpell(s)
    const time = full?.time?.[0]
    const unit = time?.unit || ''
    const ct = (s.castingTime || '').toLowerCase()
    return unit !== 'bonus' && unit !== 'reaction' && !ct.includes('bonus') && !ct.includes('reaction')
  })
})

const bonusActionSpells = computed(() => {
  return charSpells.value.filter(s => {
    const full = getFullSpell(s)
    const time = full?.time?.[0]
    return time?.unit === 'bonus' || (s.castingTime || '').toLowerCase().includes('bonus')
  })
})

const reactionSpells = computed(() => {
  return charSpells.value.filter(s => {
    const full = getFullSpell(s)
    const time = full?.time?.[0]
    return time?.unit === 'reaction' || (s.castingTime || '').toLowerCase().includes('reaction')
  })
})

watch(() => char.value.feat, (list) => {
  if (Array.isArray(list)) {
    list.forEach(f => fetchFeatDetailsIfNeeded(f))
  }
}, { immediate: true })

watch(() => activeTab.value, (newTab) => {
  if (newTab === 'actions' || newTab === 'spells') {
    charSpells.value.forEach(sp => {
      fetchSpellDetailsIfNeeded(sp)
    })
  }
  if (newTab === 'background') {
    fetchBackgroundDetails()
  }
})

watch(() => char.value.background, () => {
  bgCompendiumData.value = null
  if (activeTab.value === 'background') {
    fetchBackgroundDetails()
  }
})

watch(() => charSpells.value, (list) => {
  if ((activeTab.value === 'actions' || activeTab.value === 'spells') && Array.isArray(list)) {
    list.forEach(sp => fetchSpellDetailsIfNeeded(sp))
  }
}, { immediate: true })
</script>

<template>
  <div class="max-w-4xl mx-2 sm:mx-auto my-4 sm:my-6 p-3.5 sm:p-6 bg-white text-gray-800 rounded border border-gray-200 shadow-sm font-sans pb-24 print:hidden">
    
    <!-- Top Header Bar -->
    <div class="flex flex-row justify-between items-start pb-4 border-b border-gray-200 gap-3 relative">
      <div class="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <!-- Avatar / Initial with interactive click to change -->
        <div
          @click="triggerAvatarUpload"
          :class="readOnly ? 'cursor-default' : 'cursor-pointer hover:border-gray-500'"
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-base sm:text-lg overflow-hidden shrink-0 shadow-xs relative group transition"
          :title="readOnly ? 'Character Portrait' : 'Click to change portrait (Max 2MB)'"
        >
          <img
            v-if="resolvedImageUrl"
            :src="resolvedImageUrl"
            :alt="char.name"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (char.name || 'H').charAt(0).toUpperCase() }}</span>

          <!-- Hover overlay -->
          <div v-if="!readOnly" class="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-[9px] font-semibold text-center leading-tight p-0.5">
            <span v-if="isUploadingAvatar">...</span>
            <template v-else>
              <IconCamera class="w-3.5 h-3.5 mb-0.5" />
              <span>Change</span>
            </template>
          </div>
        </div>
        <input
          ref="avatarFileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleAvatarFileChange"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{{ char.name || 'Hero' }}</h1>
            <span
              class="text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-semibold border bg-gray-100 border-gray-200 text-gray-700 whitespace-nowrap"
            >
              {{ char.edition === '2024' ? '2024 One D&D' : '2014 5e' }}
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug flex flex-wrap gap-x-1.5">
            <span class="whitespace-nowrap">Level {{ char.level || 1 }} <strong class="text-gray-900 font-semibold">{{ classSummary }}</strong></span>
            <span class="whitespace-nowrap">• {{ char.race?.name || 'Unknown Species' }}</span>
            <span class="whitespace-nowrap">• {{ char.background || 'No Background' }}</span>
            <span class="whitespace-nowrap">• {{ char.alignment || 'Neutral' }}</span>
          </p>
        </div>
      </div>

      <!-- Actions, Campaign & Rest in Header Toolbar (Desktop view) -->
      <div class="hidden sm:flex items-center gap-1 sm:gap-1.5 shrink-0 pt-0.5 flex-wrap justify-end">
        <!-- Campaign Trigger (Clean text, no icon) -->
        <button
          type="button"
          @click="openCampaignModal"
          class="bg-white hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded border border-gray-300 font-medium transition cursor-pointer shadow-xs text-xs max-w-[130px] truncate"
          title="Campaign Settings"
        >
          {{ campaignName || 'No Campaign' }}
        </button>

        <!-- Heroic Inspiration Toggle -->
        <button
          type="button"
          @click="toggleInspiration"
          class="p-1.5 rounded border transition cursor-pointer shadow-xs flex items-center justify-center"
          :class="isInspired ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-400'"
          :title="isInspired ? 'Heroic Inspiration (Active)' : 'Heroic Inspiration (Inactive)'"
          aria-label="Heroic Inspiration"
        >
          <IconStarFilled v-if="isInspired" class="w-4 h-4 text-amber-500" />
          <IconStar v-else class="w-4 h-4 text-gray-400" />
        </button>

        <!-- Short Rest (Icon only, no text) -->
        <button
          type="button"
          @click="openShortRestModal"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Short Rest"
          aria-label="Short Rest"
        >
          <IconCampfire class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Long Rest (Icon only, no text) -->
        <button
          type="button"
          @click="openLongRestModal"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Long Rest"
          aria-label="Long Rest"
        >
          <IconMoon class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Compendium -->
        <button
          type="button"
          @click="openCompendiumWindow"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Compendium"
          aria-label="Compendium"
        >
          <IconBook class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Export / Share -->
        <button
          type="button"
          @click="openExportModal('pdf')"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Export / Share Character (PDF, Link, Avrae)"
          aria-label="Export / Share Character"
        >
          <IconShare class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Home -->
        <button
          type="button"
          @click="emit('back')"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Home"
          aria-label="Home"
        >
          <IconHome class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Edit Character (hidden in read-only) -->
        <button
          v-if="!readOnly"
          type="button"
          @click="emit('edit', char.id)"
          class="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded border border-gray-300 transition cursor-pointer shadow-xs flex items-center justify-center"
          title="Edit Character"
          aria-label="Edit Character"
        >
          <IconEdit class="w-4 h-4 text-gray-700" />
        </button>

        <!-- Read Only Badge -->
        <span
          v-else
          class="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold select-none"
        >
          Read Only
        </span>
      </div>

      <!-- Mobile Hamburger Button & Dropdown Menu -->
      <div class="sm:hidden relative shrink-0">
        <button
          type="button"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded border border-gray-300 shadow-xs flex items-center justify-center transition cursor-pointer"
          aria-label="Menu"
        >
          <IconX v-if="isMobileMenuOpen" class="w-5 h-5 text-gray-700" />
          <IconMenu2 v-else class="w-5 h-5 text-gray-700" />
        </button>

        <div
          v-if="isMobileMenuOpen"
          class="fixed inset-0 z-30"
          @click="isMobileMenuOpen = false"
        ></div>

        <div
          v-if="isMobileMenuOpen"
          class="absolute right-0 top-11 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-40 text-xs divide-y divide-gray-100"
        >
          <!-- Campaign in Mobile Menu -->
          <div class="px-3 py-2 flex items-center justify-between">
            <span class="font-medium text-gray-600">Campaign</span>
            <button
              type="button"
              @click="openCampaignModal(); isMobileMenuOpen = false"
              class="font-semibold text-gray-900 hover:underline max-w-[110px] truncate"
            >
              {{ campaignName || 'No Campaign' }}
            </button>
          </div>

          <!-- Inspiration in Mobile Menu -->
          <div class="px-3 py-2 flex items-center justify-between">
            <span class="font-medium text-gray-600">Inspiration</span>
            <button
              type="button"
              @click="toggleInspiration"
              :class="isInspired ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-200'"
              class="px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1"
            >
              <IconStarFilled v-if="isInspired" class="w-3.5 h-3.5 text-amber-500" />
              <IconStar v-else class="w-3.5 h-3.5 text-gray-400" />
              <span>{{ isInspired ? 'Active' : 'Off' }}</span>
            </button>
          </div>

          <!-- Rests -->
          <div class="py-1">
            <button
              type="button"
              @click="openShortRestModal(); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconCampfire class="w-4 h-4 text-gray-600" />
              <span>Short Rest</span>
            </button>
            <button
              type="button"
              @click="openLongRestModal(); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconMoon class="w-4 h-4 text-gray-600" />
              <span>Long Rest</span>
            </button>
          </div>

          <!-- Export & Share -->
          <div class="py-1">
            <button
              type="button"
              @click="openExportModal('pdf'); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconShare class="w-4 h-4 text-gray-600" />
              <span>Export & Share</span>
            </button>
          </div>

          <!-- Navigation & Edit -->
          <div class="py-1">
            <button
              type="button"
              @click="openCompendiumWindow(); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconBook class="w-4 h-4 text-gray-600" />
              <span>Compendium</span>
            </button>
            <button
              v-if="!readOnly"
              type="button"
              @click="emit('edit', char.id); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconEdit class="w-4 h-4 text-gray-600" />
              <span>Edit Character</span>
            </button>
            <button
              type="button"
              @click="emit('back'); isMobileMenuOpen = false"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <IconHome class="w-4 h-4 text-gray-600" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Core Combat Vitals & HP Grid -->
    <div class="my-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 items-stretch">
      <!-- 4 Stats Group: 4 columns on mobile, contents on sm/md -->
      <div class="grid grid-cols-4 gap-1.5 sm:contents">
        <!-- Armor Class Shield Card Box -->
        <div class="sm:col-span-2 flex flex-col justify-center items-center h-[72px] sm:h-[76px]">
          <div
            @click="openAcModal"
            class="relative w-full max-w-[82px] h-[72px] sm:max-w-[88px] sm:h-[76px] flex flex-col items-center justify-center select-none cursor-pointer group hover:scale-[1.03] transition-transform"
            title="Configure Armor Class"
          >
            <svg
              class="absolute inset-0 w-full h-full drop-shadow-xs group-hover:drop-shadow-sm transition-all"
              viewBox="0 0 100 88"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="acShieldBg" x1="50" y1="4" x2="50" y2="84" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="100%" stop-color="#f1f5f9" />
                </linearGradient>
              </defs>
              <!-- Outer Shield Shape -->
              <path
                d="M 5 6 Q 50 10 95 6 C 96.5 42 85 66 50 84 C 15 66 3.5 42 5 6 Z"
                fill="url(#acShieldBg)"
                stroke="#94a3b8"
                stroke-width="2.2"
                stroke-linejoin="round"
              />
              <!-- Inner Inset Rim -->
              <path
                d="M 11 12 Q 50 15.5 89 12 C 90 42 80 63 50 78 C 20 63 10 42 11 12 Z"
                fill="none"
                stroke="#cbd5e1"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
            </svg>
            <div class="relative z-10 flex flex-col items-center justify-center text-center px-1 -mt-0.5 sm:-mt-1">
              <span class="text-[7.5px] sm:text-[8.5px] font-bold text-gray-500 uppercase tracking-tight leading-none group-hover:text-gray-900 transition-colors">ARMOR CLASS</span>
              <span class="text-xl sm:text-2xl font-black text-gray-900 leading-none mt-1 sm:mt-1.5">{{ currentArmorClass }}</span>
            </div>
          </div>
        </div>

        <!-- Initiative -->
        <button
          type="button"
          @click="rollDice('Initiative', computedInitiative)"
          class="sm:col-span-2 bg-gray-100/70 hover:bg-gray-200/80 p-1.5 sm:p-2 rounded border border-gray-300 text-center transition cursor-pointer group flex flex-col items-center justify-center h-[72px] sm:h-[76px]"
        >
          <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold group-hover:text-gray-900 leading-none">Initiative</span>
          <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1.5">
            {{ computedInitiative >= 0 ? '+' : '' }}{{ computedInitiative }}
          </span>
        </button>

        <!-- Speed -->
        <button
          type="button"
          @click="openSpeedModal"
          class="sm:col-span-2 bg-gray-100/70 hover:bg-gray-200/80 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px] cursor-pointer transition group"
          title="Configure Speeds & Movement"
        >
          <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none group-hover:text-gray-900 transition-colors">Speed</span>
          <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1">
            {{ customSpeeds.walk }} <span class="text-xs font-normal text-gray-500">ft</span>
          </span>
          <div v-if="otherSpeedsList.length > 0" class="text-[7.5px] sm:text-[8px] text-gray-500 font-medium truncate max-w-full px-0.5 mt-0.5 leading-tight">
            <span v-for="(s, idx) in otherSpeedsList" :key="s.type">
              {{ s.type }} {{ s.speed }}ft{{ idx < otherSpeedsList.length - 1 ? ' · ' : '' }}
            </span>
          </div>
        </button>

        <!-- Proficiency Bonus -->
        <div class="sm:col-span-1 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 text-center flex flex-col items-center justify-center h-[72px] sm:h-[76px]">
          <span class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold leading-none">Prof</span>
          <span class="text-lg sm:text-xl font-bold text-gray-900 leading-none mt-1.5">+{{ vtt.proficiency_bonus || char.proficiency_bonus || 2 }}</span>
        </div>
      </div>

      <!-- Hit Points, Temp HP & Hit Dice Combined Card -->
      <div class="sm:col-span-5 bg-gray-100/70 p-1.5 sm:p-2 rounded border border-gray-300 flex flex-col justify-between h-[72px] sm:h-[76px]">
        <div class="grid grid-cols-3 gap-1 items-start text-center">
          <!-- Current HP -->
          <div
            @click="openHpModal"
            class="flex flex-col items-center cursor-pointer group hover:bg-gray-200/60 rounded px-1 -mx-0.5 py-0.5 transition"
            title="Manage Hit Points"
          >
            <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none group-hover:text-gray-900 transition-colors">Hit Points</span>
            <div class="flex items-baseline gap-0.5 mt-0.5">
              <span class="text-base sm:text-lg font-bold leading-none" :class="currentHp <= (effectiveMaxHp/3) ? 'text-red-700' : 'text-gray-900'">
                {{ currentHp }}
              </span>
              <span class="text-[10px] text-gray-500 font-semibold leading-none">/{{ effectiveMaxHp }}</span>
            </div>
          </div>

          <!-- Temp HP -->
          <div class="flex flex-col items-center">
            <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none">Temp HP</span>
            <div class="mt-0.5">
              <input
                type="number"
                min="0"
                v-model.number="tempHpInput"
                @change="updateTempHp"
                @keydown.enter="updateTempHp"
                class="w-10 sm:w-11 text-center text-sm sm:text-base font-bold text-gray-900 bg-white border border-gray-300 rounded h-5 px-0.5 leading-none focus:border-gray-900 focus:outline-none"
                placeholder="0"
                title="Temporary Hit Points (click to edit)"
              />
            </div>
          </div>

          <!-- Hit Dice -->
          <div class="flex flex-col items-center">
            <span class="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none">Hit Dice</span>
            <div class="text-sm sm:text-base font-bold text-gray-900 mt-0.5 font-mono leading-none">
              {{ remainingHitDice }}<span class="text-[10px] font-normal text-gray-500 font-sans">/{{ totalHitDice }}</span>
            </div>
          </div>
        </div>

        <!-- Heal / Damage Controls -->
        <div class="flex items-center gap-1 sm:gap-1.5 pt-1 border-t border-gray-200/80">
          <button
            type="button"
            @click="applyHeal"
            class="flex-1 bg-gray-900 hover:bg-black text-white text-[10px] h-5 rounded font-semibold transition cursor-pointer flex items-center justify-center leading-none"
          >
            Heal
          </button>
          <input
            type="number"
            min="1"
            v-model.number="hpInput"
            class="w-10 bg-white border border-gray-300 rounded h-5 text-center text-[11px] font-semibold shrink-0"
          />
          <button
            type="button"
            @click="applyDamage"
            class="flex-1 bg-gray-900 hover:bg-black text-white text-[10px] h-5 rounded font-semibold transition cursor-pointer flex items-center justify-center leading-none"
          >
            Damage
          </button>
        </div>
      </div>
    </div>

    <!-- 6 Ability Scores Bar -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
      <div
        v-for="(stat, name) in vtt.abilities"
        :key="name"
        class="bg-white p-2.5 rounded border border-gray-200 text-center flex flex-col justify-between"
      >
        <span class="text-[10px] font-bold uppercase text-gray-500">{{ name.slice(0, 3) }}</span>
        
        <button
          type="button"
          @click="rollDice(`${name.toUpperCase()} Check`, stat.modifier)"
          class="text-xl font-bold text-gray-900 hover:text-gray-700 transition cursor-pointer my-0.5"
          title="Click to roll Ability Check"
        >
          {{ stat.modifier_string }}
        </button>

        <span class="text-[11px] text-gray-500 font-mono">{{ stat.score }}</span>

        <!-- Saving Throw Roll Button -->
        <button
          type="button"
          @click="rollDice(`${name.toUpperCase()} Save`, vtt.saving_throws?.[name]?.total || stat.modifier)"
          class="mt-1 text-[10px] px-1 py-0.5 rounded transition cursor-pointer border"
          :class="vtt.saving_throws?.[name]?.proficient ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
        >
          Save {{ vtt.saving_throws?.[name]?.modifier_string || stat.modifier_string }}
        </button>
      </div>
    </div>

    <!-- 2 Overview Cards: Defenses (with Saving Throw Notes) & Conditions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
      <!-- Defenses Card -->
      <div class="bg-white p-3 rounded border border-gray-200 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700">Defenses</span>
            <button
              type="button"
              @click="openAddDefenseModal"
              class="text-gray-600 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
            >
              + Add
            </button>
          </div>

          <div class="mt-2 space-y-2">
            <!-- Resistances -->
            <div v-if="liveDefenses.resistances?.length">
              <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Resistances</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="d in liveDefenses.resistances"
                  :key="d"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
                >
                  <span>{{ d }}</span>
                  <button type="button" @click.stop="removeDefense('resistances', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
                </span>
              </div>
            </div>

            <!-- Immunities -->
            <div v-if="liveDefenses.immunities?.length">
              <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Immunities</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="d in liveDefenses.immunities"
                  :key="d"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
                >
                  <span>{{ d }}</span>
                  <button type="button" @click.stop="removeDefense('immunities', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
                </span>
              </div>
            </div>

            <!-- Vulnerabilities -->
            <div v-if="liveDefenses.vulnerabilities?.length">
              <span class="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Vulnerabilities</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="d in liveDefenses.vulnerabilities"
                  :key="d"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
                >
                  <span>{{ d }}</span>
                  <button type="button" @click.stop="removeDefense('vulnerabilities', d)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
                </span>
              </div>
            </div>

            <div v-if="!liveDefenses.resistances?.length && !liveDefenses.immunities?.length && !liveDefenses.vulnerabilities?.length" class="text-xs text-gray-400 py-1 italic">
              No special damage defenses recorded
            </div>
          </div>
        </div>

        <!-- Saving Throw Advantages & Notes inside Defenses Card -->
        <div class="mt-3 pt-2 border-t border-gray-100">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[9px] uppercase font-bold text-gray-400">Saving Throw Advantages & Notes</span>
            <button
              type="button"
              @click="showSaveNoteModal = true"
              class="text-gray-500 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
            >
              Edit Note
            </button>
          </div>
          <div v-if="saveAdvantageNotes.length" class="space-y-1">
            <div
              v-for="(n, idx) in saveAdvantageNotes"
              :key="idx"
              class="text-[10px] leading-tight px-1.5 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300"
            >
              {{ n.label }}
            </div>
          </div>
          <div v-else class="text-xs text-gray-400 italic">
            No special saving throw advantages
          </div>
        </div>
      </div>

      <!-- Conditions Card -->
      <div class="bg-white p-3 rounded border border-gray-200 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700">Conditions</span>
            <button
              type="button"
              @click="showConditionModal = true"
              class="text-gray-600 hover:text-gray-900 text-[10px] font-semibold cursor-pointer"
            >
              + Manage
            </button>
          </div>

          <div class="mt-2">
            <div v-if="liveConditions.length" class="flex flex-wrap gap-1">
              <span
                v-for="c in liveConditions"
                :key="c"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800"
              >
                <span>{{ c }}</span>
                <button type="button" @click.stop="removeCondition(c)" class="hover:text-black font-bold leading-none cursor-pointer">×</button>
              </span>
            </div>
            <div v-else class="text-xs text-gray-400 py-2 italic text-center">
              No active conditions (Normal)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Senses Bar -->
    <div class="flex flex-wrap items-center gap-3 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-4 text-gray-600">
      <span class="font-bold text-gray-700 uppercase text-[10px] tracking-wider">Senses:</span>
      <span>Passive Perception: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_perception || 10 }}</strong></span>
      <span>Passive Investigation: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_investigation || 10 }}</strong></span>
      <span>Passive Insight: <strong class="text-gray-900 font-mono">{{ vtt.senses?.passive_insight || 10 }}</strong></span>
      <span v-if="vtt.senses?.darkvision">Darkvision: <strong class="text-gray-900">{{ vtt.senses.darkvision }}</strong></span>
    </div>

    <!-- Tabs Navigation -->
    <div class="flex gap-2 border-b border-gray-200 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
      <button
        type="button"
        @click="activeTab = 'actions'"
        :class="activeTab === 'actions' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        ACTIONS
      </button>
      <button
        type="button"
        @click="activeTab = 'spells'"
        :class="activeTab === 'spells' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SPELLS</span>
        <span v-if="charSpells.length" class="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ charSpells.length }}
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'skills'"
        :class="activeTab === 'skills' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>SKILLS</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          18
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'features'"
        :class="activeTab === 'features' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        FEATURES
      </button>
      <button
        type="button"
        @click="activeTab = 'equipment'"
        :class="activeTab === 'equipment' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>EQUIPMENT</span>
        <span v-if="liveEquipment.length" class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ liveEquipment.length }}
        </span>
      </button>
      <button
        type="button"
        @click="activeTab = 'characteristics'"
        :class="activeTab === 'characteristics' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        CHARACTERISTICS
      </button>
      <button
        type="button"
        @click="activeTab = 'background'"
        :class="activeTab === 'background' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap uppercase tracking-wider"
      >
        BACKGROUND
      </button>
      <button
        type="button"
        v-if="rollHistory.length"
        @click="activeTab = 'history'"
        :class="activeTab === 'history' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-800'"
        class="pb-1 transition px-2 cursor-pointer whitespace-nowrap flex items-center gap-1 uppercase tracking-wider"
      >
        <span>HISTORY</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
          {{ rollHistory.length }}
        </span>
      </button>
    </div>

    <!-- TAB: Actions (D&D Beyond Style) -->
    <div v-if="activeTab === 'actions'" class="space-y-4 text-xs">
      <!-- Actions Sub-filters Navigation -->
      <!-- Action Sub-Filters -->
      <div class="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold border-b border-gray-100">
        <button
          type="button"
          @click="actionSubFilter = 'all'"
          :class="actionSubFilter === 'all' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ALL
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'attack'"
          :class="actionSubFilter === 'attack' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ATTACK ({{ attackTableEntries.length }})
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'action'"
          :class="actionSubFilter === 'action' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          ACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'bonus'"
          :class="actionSubFilter === 'bonus' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          BONUS ACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'reaction'"
          :class="actionSubFilter === 'reaction' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          REACTION
        </button>
        <button
          type="button"
          @click="actionSubFilter = 'other'"
          :class="actionSubFilter === 'other' ? 'bg-gray-800 text-white font-bold shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-2.5 py-1 rounded transition cursor-pointer whitespace-nowrap uppercase tracking-wider"
        >
          OTHER
        </button>
      </div>

      <!-- Class Features & Resources Tracker Bar -->
      <div v-if="classResourceTrackers.length > 0" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
        <div class="flex items-center justify-between border-b border-gray-200 pb-1.5">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Class Resources & Trackers
            </h3>
            <span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-mono font-semibold">
              {{ classSummary }}
            </span>
          </div>
          <span class="text-[10px] text-gray-500 hidden sm:inline">
            Click bubbles to spend/restore
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <div
            v-for="res in classResourceTrackers"
            :key="res.id"
            class="p-2.5 bg-white border border-gray-200 rounded shadow-xs flex flex-col justify-between gap-2"
          >
            <!-- Title & Recharge -->
            <div class="flex items-start justify-between gap-1.5">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-gray-900 text-xs">{{ res.name }}</span>
                  <span
                    v-if="res.hasActiveToggle && isClassStateActive(res.id)"
                    class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse"
                  >
                    ACTIVE
                  </span>
                </div>
                <p class="text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2" :title="res.subtitle">{{ res.subtitle }}</p>
              </div>
              <span class="text-[9px] font-mono px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded shrink-0">
                {{ res.recharge === 'short' ? 'SHORT REST' : (res.recharge === 'long_regain1' ? 'SR+1 / LR' : 'LONG REST') }}
              </span>
            </div>

            <!-- Tracker Controls -->
            <div class="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
              <!-- Bubble Counter for small pools (<= 8) -->
              <div v-if="res.max <= 8 && res.type === 'counter'" class="flex items-center gap-1.5 flex-wrap">
                <button
                  v-for="idx in res.max"
                  :key="idx"
                  type="button"
                  @click="toggleResourceSlot(res, idx)"
                  class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                  :title="isResourceSlotExpended(res, idx) ? 'Click to restore use' : 'Click to spend use'"
                >
                  <span
                    v-if="!isResourceSlotExpended(res, idx)"
                    class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                  ></span>
                </button>
                <span class="font-mono text-[10px] font-semibold text-gray-700 ml-1">
                  {{ getResourceAvailable(res) }}/{{ res.max }}
                </span>
              </div>

              <!-- Number counter for pools or points (Ki, Lay on Hands, Sorcery Points) -->
              <div v-else class="flex items-center gap-1">
                <button
                  type="button"
                  @click="spendResource(res.id, res.type === 'pool' ? 5 : 1)"
                  :disabled="getResourceAvailable(res) <= 0"
                  class="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :title="res.type === 'pool' ? 'Spend 5' : 'Spend 1'"
                >
                  -
                </button>
                <span class="font-mono text-xs font-bold text-gray-900 px-1">
                  {{ getResourceAvailable(res) }} / {{ res.displayMax }}
                </span>
                <button
                  type="button"
                  @click="restoreResource(res.id, res.type === 'pool' ? 5 : 1)"
                  :disabled="getResourceSpent(res.id) <= 0"
                  class="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :title="res.type === 'pool' ? 'Restore 5' : 'Restore 1'"
                >
                  +
                </button>
              </div>

              <!-- Quick action button -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  v-if="res.id === 'barb_rage'"
                  type="button"
                  @click="toggleClassState('barb_rage', 'barb_rage')"
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  :class="isClassStateActive('barb_rage') ? 'bg-red-600 text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'"
                >
                  {{ isClassStateActive('barb_rage') ? 'End' : 'Rage' }}
                </button>

                <button
                  v-else-if="res.id === 'fighter_second_wind'"
                  type="button"
                  @click="activateSecondWind"
                  :disabled="getResourceAvailable(res) <= 0"
                  class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                  :class="getResourceAvailable(res) > 0 ? 'bg-gray-900 hover:bg-black text-white' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
                >
                  Heal
                </button>

                <button
                  v-else-if="res.rollFormula"
                  type="button"
                  @click="rollResourceDie(res)"
                  :disabled="getResourceAvailable(res) <= 0"
                  class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                  :class="getResourceAvailable(res) > 0 ? 'bg-gray-900 hover:bg-black text-white' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
                >
                  Roll
                </button>

                <button
                  v-else-if="res.hasActiveToggle"
                  type="button"
                  @click="toggleClassState(res.id, res.id)"
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  :class="isClassStateActive(res.id) ? 'bg-purple-600 text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'"
                >
                  {{ isClassStateActive(res.id) ? 'Active' : 'Activate' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Attacks Section (Structured Table) -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'attack'" class="space-y-2">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Attacks & Attack Spells
          </h3>
          <span class="text-[10px] text-gray-500 font-mono">{{ attackTableEntries.length }} Available</span>
        </div>

        <div v-if="attackTableEntries.length > 0" class="overflow-x-auto border border-gray-200 rounded shadow-xs bg-white">
          <table class="w-full text-left text-xs divide-y divide-gray-200">
            <thead class="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th class="py-2 px-3">Attack</th>
                <th class="py-2 px-3">Range</th>
                <th class="py-2 px-3 text-center">Hit / DC</th>
                <th class="py-2 px-3 text-center">Damage</th>
                <th class="py-2 px-3">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="entry in attackTableEntries"
                :key="entry.id"
                class="hover:bg-gray-50/80 transition"
              >
                <!-- ATTACK Column -->
                <td class="py-2.5 px-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-gray-600 bg-gray-100 border border-gray-200"
                      :title="entry.subtitle"
                    >
                      <IconBolt v-if="entry.type === 'spell'" class="w-3.5 h-3.5" />
                      <IconHandStop v-else-if="entry.type === 'unarmed'" class="w-3.5 h-3.5" />
                      <IconDice v-else-if="entry.type === 'feature'" class="w-3.5 h-3.5" />
                      <IconSword v-else class="w-3.5 h-3.5" />
                    </span>
                    <div class="min-w-0">
                      <div class="font-bold text-gray-900 truncate">{{ entry.name }}</div>
                      <div class="text-[10px] text-gray-500 truncate">{{ entry.subtitle }}</div>
                    </div>
                  </div>
                </td>

                <!-- RANGE Column -->
                <td class="py-2.5 px-3 whitespace-nowrap text-gray-600 text-[11px] font-mono">
                  {{ entry.range }}
                </td>

                <!-- HIT / DC Column -->
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                  <button
                    v-if="entry.toHit != null"
                    type="button"
                    @click="rollDice(`${entry.name} Attack`, entry.toHit)"
                    class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                    :title="`Roll ${entry.name} Attack (${entry.toHit >= 0 ? '+' : ''}${entry.toHit})`"
                  >
                    {{ entry.toHitLabel }}
                  </button>
                  <span
                    v-else-if="entry.isDc"
                    class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded font-bold text-[10px] font-mono whitespace-nowrap"
                    title="Target Saving Throw"
                  >
                    {{ entry.dcText }}
                  </span>
                  <span v-else class="text-gray-400 font-mono text-xs">—</span>
                </td>

                <!-- DAMAGE Column -->
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                  <button
                    v-if="entry.damageDice"
                    type="button"
                    @click="rollFormula(`${entry.name} Damage`, entry.damageFormula, entry.damageMod)"
                    class="px-2.5 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs transition cursor-pointer shadow-2xs font-mono"
                    :title="`Roll Damage: ${entry.damageLabel}`"
                  >
                    {{ entry.damageLabel }}
                  </button>
                  <span v-else class="text-gray-400 font-mono text-xs">—</span>
                </td>

                <!-- NOTES Column -->
                <td class="py-2.5 px-3 text-gray-500 text-[11px]">
                  <span class="line-clamp-1" :title="entry.notes">{{ entry.notes }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 italic">
          No equipped weapons or attack spells available.
        </div>
      </div>

      <!-- Actions in Combat Quick Reference Panel -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'action'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Actions in Combat
          </h3>
          <span class="text-[10px] text-gray-500">Standard 5e / 2024 combat actions</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
          <!-- Attack -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Attack</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make 1 or more weapon or unarmed attacks (Extra Attack applies).</p>
          </div>

          <!-- Dash -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Dash</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Gain extra movement equal to your speed ({{ char.speed || 30 }} ft.) for the turn.</p>
          </div>

          <!-- Disengage -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Disengage</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Your movement does not provoke opportunity attacks for the rest of this turn.</p>
          </div>

          <!-- Dodge -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Dodge</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attacks against you have Disadvantage; you make DEX saves with Advantage.</p>
          </div>

          <!-- Grapple -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Grapple</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use an attack to seize a creature within reach using 1 free hand.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Grapple Check (Athletics)', computedSkills.athletics?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Athletics ({{ (computedSkills.athletics?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.athletics?.total || 0 }})
            </button>
          </div>

          <!-- Help -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Help</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Grant Advantage to an ally's next ability check or attack roll within 5 ft.</p>
          </div>

          <!-- Hide -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Hide</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Make a Stealth check to conceal yourself.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Stealth Check (Hide)', computedSkills.stealth?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Stealth ({{ (computedSkills.stealth?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.stealth?.total || 0 }})
            </button>
          </div>

          <!-- Improvise -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Improvise</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attempt any creative action not covered by rules; DM adjudicates outcome.</p>
          </div>

          <!-- Influence -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Influence</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Attempt to alter the attitude of a creature through interaction.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button
                type="button"
                @click="rollDice('Persuasion Check (Influence)', computedSkills.persuasion?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Persuasion
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Deception Check (Influence)', computedSkills.deception?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Deception
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Intimidation Check (Influence)', computedSkills.intimidation?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Intimidation
              </button>
            </div>
          </div>

          <!-- Magic -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Magic</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Cast a spell with a casting time of 1 action, or activate a magic item.</p>
            </div>
            <button
              type="button"
              @click="activeTab = 'spells'"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Open Spells Tab ({{ charSpells.length }}) &rarr;
            </button>
          </div>

          <!-- Ready -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Ready</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Prepare an action to execute when a specific trigger occurs, using your Reaction.</p>
          </div>

          <!-- Search -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Search</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Devote attention to finding something hidden.</p>
            </div>
            <div class="flex items-center gap-1.5 text-[10px]">
              <button
                type="button"
                @click="rollDice('Perception Check (Search)', computedSkills.perception?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Perception
              </button>
              <span>•</span>
              <button
                type="button"
                @click="rollDice('Investigation Check (Search)', computedSkills.investigation?.total || 0)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Investigation
              </button>
            </div>
          </div>

          <!-- Shove -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Shove</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Push a creature 5 ft. away or knock it prone using the Attack action.</p>
            </div>
            <button
              type="button"
              @click="rollDice('Shove Check (Athletics)', computedSkills.athletics?.total || 0)"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer"
            >
              Roll Athletics ({{ (computedSkills.athletics?.total || 0) >= 0 ? '+' : '' }}{{ computedSkills.athletics?.total || 0 }})
            </button>
          </div>

          <!-- Study -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900">Study</div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Dedicate an action to recall lore or analyze a creature with an INT check.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button type="button" @click="rollDice('Arcana Check', computedSkills.arcana?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Arcana</button>
              <span>•</span>
              <button type="button" @click="rollDice('History Check', computedSkills.history?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">History</button>
              <span>•</span>
              <button type="button" @click="rollDice('Nature Check', computedSkills.nature?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Nature</button>
              <span>•</span>
              <button type="button" @click="rollDice('Religion Check', computedSkills.religion?.total || 0)" class="text-gray-700 hover:text-gray-900 underline cursor-pointer">Religion</button>
            </div>
          </div>

          <!-- Utilize -->
          <div class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition">
            <div class="font-bold text-gray-900">Utilize</div>
            <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Use an item, piece of equipment, or object that requires an Action.</p>
          </div>

          <!-- Fighter Action Surge -->
          <div v-if="hasCharClass('fighter') && getCharClassLevel('fighter') >= 2" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900 flex items-center justify-between">
                <span>Action Surge</span>
                <span class="text-[9px] font-mono text-gray-500">
                  {{ getResourceAvailable({ id: 'fighter_action_surge', max: getCharClassLevel('fighter') >= 17 ? 2 : 1 }) }} left
                </span>
              </div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Take 1 additional Action on your turn (Short Rest recharge).</p>
            </div>
            <button
              type="button"
              @click="activateActionSurge"
              :disabled="getResourceAvailable({ id: 'fighter_action_surge', max: getCharClassLevel('fighter') >= 17 ? 2 : 1 }) <= 0"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              Surge &rarr;
            </button>
          </div>

          <!-- Cleric / Paladin Channel Divinity -->
          <div v-if="(hasCharClass('cleric') && getCharClassLevel('cleric') >= 2) || (hasCharClass('paladin') && getCharClassLevel('paladin') >= 3)" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900 flex items-center justify-between">
                <span>Channel Divinity</span>
                <span class="text-[9px] font-mono text-gray-500">
                  {{ getResourceAvailable({ id: hasCharClass('cleric') ? 'cleric_channel_divinity' : 'paladin_channel_divinity', max: 2 }) }} left
                </span>
              </div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Turn Undead / Sacred Weapon / Harness Divine Power.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button
                v-if="hasCharClass('cleric')"
                type="button"
                @click="activateChannelDivinity('Turn Undead')"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Turn Undead
              </button>
              <button
                v-if="hasCharClass('cleric')"
                type="button"
                @click="activateChannelDivinity('Divine Spark / Domain')"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Divine Spark
              </button>
              <button
                v-if="hasCharClass('paladin')"
                type="button"
                @click="activateChannelDivinity('Paladin Sacred Power')"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Sacred Power
              </button>
            </div>
          </div>

          <!-- Paladin Lay on Hands -->
          <div v-if="hasCharClass('paladin')" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900 flex items-center justify-between">
                <span>Lay on Hands</span>
                <span class="text-[9px] font-mono text-gray-500">
                  {{ getResourceAvailable({ id: 'paladin_lay_on_hands', max: 5 * getCharClassLevel('paladin') }) }} HP left
                </span>
              </div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Heal damage from pool, or spend 5 HP to cure 1 poison or disease.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <button
                type="button"
                @click="activateLayOnHands(1)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Heal 1
              </button>
              <span>•</span>
              <button
                type="button"
                @click="activateLayOnHands(5)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Heal 5
              </button>
              <span>•</span>
              <button
                type="button"
                @click="activateLayOnHands(5)"
                class="text-gray-700 hover:text-gray-900 underline cursor-pointer"
              >
                Cure Disease (5)
              </button>
            </div>
          </div>

          <!-- Druid Wild Shape -->
          <div v-if="hasCharClass('druid') && getCharClassLevel('druid') >= 2" class="p-2 bg-white border border-gray-200 rounded hover:border-gray-300 transition flex flex-col justify-between gap-1">
            <div>
              <div class="font-bold text-gray-900 flex items-center justify-between">
                <span>Wild Shape</span>
                <span class="text-[9px] font-mono text-gray-500">
                  {{ getResourceAvailable({ id: 'druid_wild_shape', max: 2 }) }} left
                </span>
              </div>
              <p class="text-gray-600 text-[10px] mt-0.5 leading-tight">Magically assume the shape of a beast you have seen before.</p>
            </div>
            <button
              type="button"
              @click="spendResource('druid_wild_shape', 1); showToast('Wild Shape assumed! Expended 1 use.')"
              :disabled="getResourceAvailable({ id: 'druid_wild_shape', max: 2 }) <= 0"
              class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold text-left underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              Assume Form &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Feat Spells (Action) -->
      <div v-if="(actionSubFilter === 'all' || actionSubFilter === 'action') && featActionSpells.length > 0" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Feat Spells (Action)
            </h3>
            <span class="text-[10px] bg-gray-900 text-white px-1.5 py-0.2 rounded font-semibold font-mono">
              {{ featActionSpells.length }}
            </span>
          </div>
          <span class="text-[10px] text-gray-500">Innate & feat-granted magic (1 Action)</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="sp in featActionSpells"
            :key="sp.id || sp.name"
            class="p-2.5 bg-gray-50 border border-gray-200 rounded flex flex-col justify-between gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                  <span class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                    {{ getFeatName(sp) }}
                  </span>
                  <span v-if="Number(sp.level) === 0 || sp.is_cantrip" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                    Cantrip (At Will)
                  </span>
                  <span v-else class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                    Level {{ sp.level }} (1/LR)
                  </span>
                </div>
                <div class="text-[10px] text-gray-500 mt-0.5">
                  1 Action • Range: {{ getSpellRange(sp) }}
                  <span v-if="Number(sp.level) > 0" class="ml-1 font-mono">
                    • {{ isFeatCastExpended(sp) ? 'Free Cast Expended' : '1/LR Free Cast Ready' }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                @click="toggleSpell('sp_' + (sp.id || sp.name))"
                class="font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer shrink-0"
              >
                {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
              </button>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-200">
              <!-- Slot tracker bubble for leveled feat spell -->
              <div v-if="Number(sp.level) > 0" class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
                <span class="text-gray-500 font-medium">Slot:</span>
                <button
                  type="button"
                  @click.stop="toggleFeatFreeCast(sp)"
                  class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                  :title="isFeatCastExpended(sp) ? 'Click to restore slot' : 'Click to expend slot'"
                >
                  <span
                    v-if="!isFeatCastExpended(sp)"
                    class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                  ></span>
                </button>
                <span class="font-mono font-semibold text-gray-800">
                  {{ isFeatCastExpended(sp) ? '0' : '1' }} / 1
                </span>
              </div>

              <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                <button
                  type="button"
                  @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                  class="px-2 py-0.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                >
                  Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                </button>
              </template>
              <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
                <button
                  type="button"
                  @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                  class="px-2 py-0.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                >
                  Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                </button>
              </template>

              <!-- Cast Free / Cast Slot -->
              <template v-if="Number(sp.level) > 0">
                <button
                  type="button"
                  @click="castSpell(sp, false)"
                  :disabled="isFeatCastExpended(sp)"
                  :class="[
                    'px-2.5 py-0.5 rounded text-[10px] font-semibold transition ml-auto',
                    !isFeatCastExpended(sp)
                      ? 'bg-gray-900 hover:bg-black text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  ]"
                >
                  {{ isFeatCastExpended(sp) ? 'Free Expended' : 'Cast Free' }}
                </button>
                <button
                  v-if="allSpellLevels.length > 0"
                  type="button"
                  @click="castSpell(sp, true)"
                  :disabled="getAvailableSlots(sp.level) === 0"
                  :class="[
                    'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                    getAvailableSlots(sp.level) > 0
                      ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  ]"
                  title="Cast using a spell slot"
                >
                  Cast (Slot)
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  @click="castSpell(sp)"
                  class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer ml-auto"
                >
                  Cast
                </button>
              </template>
            </div>

            <!-- Expanded spell description -->
            <div
              v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
              class="p-2 border-t border-gray-200 bg-white text-gray-700 space-y-1 text-[11px] rounded"
            >
              <div v-if="getSpellEntries(sp).length" class="space-y-1">
                <div
                  v-for="(ent, eIdx) in getSpellEntries(sp)"
                  :key="eIdx"
                  v-html="renderAnnotatedText(formatSpellEntry(ent))"
                ></div>
              </div>
              <p v-else class="text-gray-400 italic">No rules text recorded.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bonus Actions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'bonus'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Bonus Actions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- Two-Weapon Off-Hand Attack -->
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Two-Weapon Off-Hand Attack</span>
              <p class="text-[10px] text-gray-500">Attack with second light melee weapon (no ability mod to damage)</p>
            </div>
            <button
              type="button"
              @click="rollDice('Off-Hand Attack', vtt.proficiency_bonus || 2)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Roll Off-Hand
            </button>
          </div>

          <!-- Barbarian Rage -->
          <div v-if="hasCharClass('barbarian')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">Rage</span>
                <span
                  v-if="isClassStateActive('barb_rage')"
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse"
                >
                  ACTIVE (+{{ rageBonusDamage }} DMG)
                </span>
              </div>
              <p class="text-[10px] text-gray-500">Bonus Damage +{{ rageBonusDamage }} · Adv on STR Checks/Saves · B/P/S Resistance</p>
            </div>
            <button
              type="button"
              @click="toggleClassState('barb_rage', 'barb_rage')"
              class="px-2.5 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              :class="isClassStateActive('barb_rage') ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs' : 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800'"
            >
              {{ isClassStateActive('barb_rage') ? 'End Rage' : 'Enter Rage' }}
            </button>
          </div>

          <!-- Second Wind (if Fighter) -->
          <div v-if="hasCharClass('fighter')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-gray-900 text-xs">Second Wind</span>
                <span class="text-[9px] font-mono text-gray-500">
                  ({{ getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) }} left)
                </span>
              </div>
              <p class="text-[10px] text-gray-500">Regain 1d10 + {{ getCharClassLevel('fighter') }} HP as a Bonus Action</p>
            </div>
            <button
              type="button"
              @click="activateSecondWind"
              :disabled="getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) <= 0"
              class="px-2 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              :class="getResourceAvailable({ id: 'fighter_second_wind', max: 2 }) > 0 ? 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
            >
              Heal (1d10+{{ getCharClassLevel('fighter') }})
            </button>
          </div>

          <!-- Monk Bonus Actions -->
          <template v-if="monkLevel >= 1">
            <!-- Bonus Unarmed Strike (Level 1+) -->
            <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
              <div>
                <span class="font-bold text-gray-900 text-xs">Bonus Unarmed Strike</span>
                <p class="text-[10px] text-gray-500">Make 1 Unarmed Strike as a Bonus Action (Martial Arts)</p>
              </div>
              <button
                type="button"
                @click="rollDice('Bonus Unarmed Strike', unarmedStrikeDetails.toHit)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Strike {{ unarmedStrikeDetails.toHit >= 0 ? '+' : '' }}{{ unarmedStrikeDetails.toHit }} ({{ unarmedStrikeDetails.damageDice }})
              </button>
            </div>

            <!-- Ki / Focus Options (Level 2+) -->
            <template v-if="monkLevel >= 2">
              <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
                <div>
                  <span class="font-bold text-gray-900 text-xs">Flurry of Blows</span>
                  <p class="text-[10px] text-gray-500">Make 2 Unarmed Strikes as a Bonus Action (Costs 1 Focus/Ki)</p>
                </div>
                <button
                  type="button"
                  @click="activateMonkKiAction('Flurry of Blows', 1)"
                  class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
                >
                  Flurry (1 Ki)
                </button>
              </div>
              <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
                <div>
                  <span class="font-bold text-gray-900 text-xs">Patient Defense</span>
                  <p class="text-[10px] text-gray-500">{{ (char.edition || '2024') === '2024' ? 'Disengage (Free) or spend 1 Focus to Disengage AND Dodge' : 'Take Dodge action as a Bonus Action (Costs 1 Ki)' }}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    v-if="(char.edition || '2024') === '2024'"
                    type="button"
                    @click="showToast('Patient Defense: Disengage activated (Free)!')"
                    class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
                  >
                    Disengage
                  </button>
                  <button
                    type="button"
                    @click="activateMonkKiAction('Patient Defense', 1)"
                    class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
                  >
                    Dodge (1 Ki)
                  </button>
                </div>
              </div>
              <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
                <div>
                  <span class="font-bold text-gray-900 text-xs">Step of the Wind</span>
                  <p class="text-[10px] text-gray-500">{{ (char.edition || '2024') === '2024' ? 'Dash (Free) or spend 1 Focus to Dash AND Disengage, double jump' : 'Disengage & Dash, jump distance doubled (Costs 1 Ki)' }}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    v-if="(char.edition || '2024') === '2024'"
                    type="button"
                    @click="showToast('Step of the Wind: Dash activated (Free)!')"
                    class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
                  >
                    Dash
                  </button>
                  <button
                    type="button"
                    @click="activateMonkKiAction('Step of the Wind', 1)"
                    class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer"
                  >
                    Dash+Disengage (1 Ki)
                  </button>
                </div>
              </div>

              <!-- Uncanny Metabolism (2024 Level 2+) -->
              <div v-if="(char.edition || '2024') === '2024'" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
                <div>
                  <span class="font-bold text-gray-900 text-xs">Uncanny Metabolism</span>
                  <p class="text-[10px] text-gray-500">Regain all Focus points + heal {{ monkLevel }} + {{ monkMartialArtsDie }} HP (1/Long Rest)</p>
                </div>
                <button
                  type="button"
                  @click="activateUncannyMetabolism"
                  :disabled="getResourceAvailable(classResourceTrackers.find(r => r.id === 'monk_uncanny_metabolism')) <= 0"
                  class="px-2 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
                  :class="getResourceAvailable(classResourceTrackers.find(r => r.id === 'monk_uncanny_metabolism')) > 0 ? 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
                >
                  Rest & Heal
                </button>
              </div>
            </template>
          </template>

          <!-- Rogue Cunning Action -->
          <div v-if="hasCharClass('rogue') && getCharClassLevel('rogue') >= 2" class="p-2 bg-gray-50 border border-gray-200 rounded flex flex-col justify-between gap-1.5">
            <div>
              <span class="font-bold text-gray-900 text-xs">Cunning Action</span>
              <p class="text-[10px] text-gray-500">Take Dash, Disengage, or Hide as a Bonus Action.</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button type="button" @click="showToast('Cunning Dash activated!')" class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold cursor-pointer">Dash</button>
              <button type="button" @click="showToast('Cunning Disengage activated!')" class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold cursor-pointer">Disengage</button>
              <button type="button" @click="rollDice('Stealth Check (Cunning Hide)', computedSkills.stealth?.total || 0)" class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold cursor-pointer">Hide</button>
            </div>
          </div>

          <!-- Bard Bardic Inspiration -->
          <div v-if="hasCharClass('bard')" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-gray-900 text-xs">Bardic Inspiration</span>
                <span class="text-[9px] font-mono text-gray-500">
                  ({{ getResourceAvailable({ id: 'bard_inspiration', max: Math.max(1, getAbilityMod('cha')) }) }} left)
                </span>
              </div>
              <p class="text-[10px] text-gray-500">Grant inspiration die to an ally within 60 ft</p>
            </div>
            <button
              type="button"
              @click="rollResourceDie(classResourceTrackers.find(r => r.id === 'bard_inspiration'))"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Roll Inspiration
            </button>
          </div>

          <!-- Bonus Action Spells if any -->
          <div v-for="sp in bonusActionSpells" :key="sp.name" class="p-2 bg-gray-50 border border-gray-200 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                <span v-if="isFeatSpell(sp)" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                  {{ getFeatName(sp) }}
                </span>
              </div>
              <div class="text-[10px] text-gray-500">
                Level {{ sp.level || 'Cantrip' }} • Bonus Action
                <span v-if="isFeatSpell(sp) && Number(sp.level) > 0" class="ml-1 font-mono">
                  • {{ isFeatCastExpended(sp) ? 'Free Cast Expended' : '1/LR Free Cast Ready' }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap shrink-0 justify-end pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
              <template v-if="isFeatSpell(sp) && Number(sp.level) > 0">
                <!-- Slot tracker bubble -->
                <div class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
                  <span class="text-gray-500 font-medium">Slot:</span>
                  <button
                    type="button"
                    @click.stop="toggleFeatFreeCast(sp)"
                    class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isFeatCastExpended(sp) ? 'Click to restore slot' : 'Click to expend slot'"
                  >
                    <span
                      v-if="!isFeatCastExpended(sp)"
                      class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                  <span class="font-mono font-semibold text-gray-800">
                    {{ isFeatCastExpended(sp) ? '0' : '1' }} / 1
                  </span>
                </div>
                <button
                  type="button"
                  @click="castSpell(sp, false)"
                  :disabled="isFeatCastExpended(sp)"
                  :class="[
                    'px-2 py-1 rounded font-semibold text-[10px] transition shrink-0',
                    !isFeatCastExpended(sp) ? 'bg-gray-900 hover:bg-black text-white cursor-pointer' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  ]"
                >
                  {{ isFeatCastExpended(sp) ? 'Free Expended' : 'Cast Free' }}
                </button>
                <button
                  v-if="allSpellLevels.length > 0"
                  type="button"
                  @click="castSpell(sp, true)"
                  :disabled="getAvailableSlots(sp.level) === 0"
                  :class="[
                    'px-2 py-1 rounded font-semibold text-[10px] transition shrink-0',
                    getAvailableSlots(sp.level) > 0 ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer' : 'bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed'
                  ]"
                  title="Cast with spell slot"
                >
                  Cast (Slot)
                </button>
              </template>
              <button
                v-else
                type="button"
                @click="castSpell(sp)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Cast Spell
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reactions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'reaction'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Reactions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- Fighter Indomitable -->
          <div v-if="hasCharClass('fighter') && getCharClassLevel('fighter') >= 9" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-gray-900 text-xs">Indomitable</span>
                <span class="text-[9px] font-mono text-gray-500">
                  ({{ getResourceAvailable({ id: 'fighter_indomitable', max: 1 }) }} left)
                </span>
              </div>
              <p class="text-[10px] text-gray-500">Reroll a failed saving throw as a reaction</p>
            </div>
            <button
              type="button"
              @click="activateIndomitable"
              :disabled="getResourceAvailable({ id: 'fighter_indomitable', max: 1 }) <= 0"
              class="px-2 py-1 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              :class="getResourceAvailable({ id: 'fighter_indomitable', max: 1 }) > 0 ? 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'"
            >
              Reroll Save
            </button>
          </div>

          <!-- Rogue Uncanny Dodge -->
          <div v-if="hasCharClass('rogue') && getCharClassLevel('rogue') >= 5" class="p-2 bg-gray-50 border border-gray-200 rounded">
            <span class="font-bold text-gray-900 text-xs">Uncanny Dodge</span>
            <p class="text-[10px] text-gray-500 mt-0.5">When hit by an attacker you can see, use your reaction to halve the attack's damage.</p>
          </div>

          <!-- Monk Reactions -->
          <template v-if="monkLevel >= 3">
            <!-- Deflect Attacks / Deflect Missiles -->
            <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
              <div>
                <span class="font-bold text-gray-900 text-xs">{{ (char.edition || '2024') === '2024' ? 'Deflect Attacks' : 'Deflect Missiles' }}</span>
                <p class="text-[10px] text-gray-500">Reduce damage from incoming attack by 1d10 + {{ getAbilityMod('dex') }} + {{ monkLevel }} (Reaction)</p>
              </div>
              <button
                type="button"
                @click="deflectAttacksReaction"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Deflect (1d10+{{ getAbilityMod('dex') + monkLevel }})
              </button>
            </div>

            <!-- Slow Fall (Level 4+) -->
            <div v-if="monkLevel >= 4" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
              <div>
                <span class="font-bold text-gray-900 text-xs">Slow Fall</span>
                <p class="text-[10px] text-gray-500">Reduce falling damage by {{ 5 * monkLevel }} HP (Reaction)</p>
              </div>
              <button
                type="button"
                @click="showToast(`Slow Fall activated! Reduced fall damage by ${5 * monkLevel} HP.`)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Slow Fall (-{{ 5 * monkLevel }})
              </button>
            </div>

            <!-- Stunning Strike (Level 5+) -->
            <div v-if="monkLevel >= 5" class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
              <div>
                <span class="font-bold text-gray-900 text-xs">Stunning Strike</span>
                <p class="text-[10px] text-gray-500">Target must make CON save or be Stunned until end of next turn (Costs 1 Ki)</p>
              </div>
              <button
                type="button"
                @click="activateMonkKiAction('Stunning Strike', 1)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Stun (DC {{ 8 + charProfBonus + getAbilityMod('wis') }})
              </button>
            </div>
          </template>

          <!-- Opportunity Attack -->
          <div class="p-2 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-gray-900 text-xs">Opportunity Attack</span>
              <p class="text-[10px] text-gray-500">Make 1 melee attack when a hostile creature leaves your reach</p>
            </div>
            <button
              type="button"
              @click="rollDice('Opportunity Attack', equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit)"
              class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
            >
              Strike {{ (equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit) >= 0 ? '+' : '' }}{{ equippedWeapons[0]?.toHit || unarmedStrikeDetails.toHit }}
            </button>
          </div>

          <!-- Reaction Spells if any -->
          <div v-for="sp in reactionSpells" :key="sp.name" class="p-2 bg-gray-50 border border-gray-200 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900 text-xs">{{ sp.name }}</span>
                <span v-if="isFeatSpell(sp)" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                  {{ getFeatName(sp) }}
                </span>
              </div>
              <div class="text-[10px] text-gray-500">
                Reaction Spell
                <span v-if="isFeatSpell(sp) && Number(sp.level) > 0" class="ml-1 font-mono">
                  • {{ isFeatCastExpended(sp) ? 'Free Cast Expended' : '1/LR Free Cast Ready' }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap shrink-0 justify-end pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
              <template v-if="isFeatSpell(sp) && Number(sp.level) > 0">
                <!-- Slot tracker bubble -->
                <div class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
                  <span class="text-gray-500 font-medium">Slot:</span>
                  <button
                    type="button"
                    @click.stop="toggleFeatFreeCast(sp)"
                    class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isFeatCastExpended(sp) ? 'Click to restore slot' : 'Click to expend slot'"
                  >
                    <span
                      v-if="!isFeatCastExpended(sp)"
                      class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                  <span class="font-mono font-semibold text-gray-800">
                    {{ isFeatCastExpended(sp) ? '0' : '1' }} / 1
                  </span>
                </div>
                <button
                  type="button"
                  @click="castSpell(sp, false)"
                  :disabled="isFeatCastExpended(sp)"
                  :class="[
                    'px-2 py-1 rounded font-semibold text-[10px] transition shrink-0',
                    !isFeatCastExpended(sp) ? 'bg-gray-900 hover:bg-black text-white cursor-pointer' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  ]"
                >
                  {{ isFeatCastExpended(sp) ? 'Free Expended' : 'Cast Free' }}
                </button>
                <button
                  v-if="allSpellLevels.length > 0"
                  type="button"
                  @click="castSpell(sp, true)"
                  :disabled="getAvailableSlots(sp.level) === 0"
                  :class="[
                    'px-2 py-1 rounded font-semibold text-[10px] transition shrink-0',
                    getAvailableSlots(sp.level) > 0 ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer' : 'bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed'
                  ]"
                  title="Cast with spell slot"
                >
                  Cast (Slot)
                </button>
              </template>
              <button
                v-else
                type="button"
                @click="castSpell(sp)"
                class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded font-semibold text-[10px] transition cursor-pointer shrink-0"
              >
                Cast Spell
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Other Actions Section -->
      <div v-if="actionSubFilter === 'all' || actionSubFilter === 'other'" class="space-y-2 pt-2 border-t border-gray-200">
        <div class="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            Other & Interactions
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="p-2 bg-gray-50 border border-gray-200 rounded">
            <span class="font-bold text-gray-900 text-xs">Free Object Interaction</span>
            <p class="text-[10px] text-gray-500 mt-0.5">Interact with 1 object or feature of the environment for free on your turn during movement or action.</p>
          </div>
          <div class="p-2 bg-gray-50 border border-gray-200 rounded">
            <span class="font-bold text-gray-900 text-xs">Short Rest & Hit Dice</span>
            <p class="text-[10px] text-gray-500 mt-0.5">Spend 1 or more Hit Dice to regain hit points during a 1-hour rest.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Spells & Spellcasting (Dedicated Spells Tab) -->
    <div v-else-if="activeTab === 'spells'" class="space-y-4 text-xs">
      <div v-if="charSpells.length > 0 || isCaster" class="space-y-4">
        <!-- Caster Stat Box -->
        <div v-if="classSpells.length > 0 || isCaster" class="bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-2.5">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <span class="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Spellcasting & Slots
            </span>
            <span class="text-[11px] text-gray-500 font-mono">
              Ability: {{ charCasterAbility.toUpperCase() }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spellcasting Modifier</div>
              <div class="text-sm font-bold text-gray-900 font-mono">
                {{ charCasterMod >= 0 ? '+' : '' }}{{ charCasterMod }}
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Save DC</div>
              <div class="text-sm font-bold text-gray-900 font-mono">{{ charSpellSaveDc }}</div>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Spell Attack Bonus</div>
              <button
                type="button"
                @click="rollDice('Spell Attack Roll', charSpellAttackBonus)"
                class="text-sm font-bold text-gray-900 hover:text-black transition font-mono cursor-pointer underline decoration-dotted"
                title="Click to roll spell attack"
              >
                {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
              </button>
            </div>

            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-[10px] text-gray-500 uppercase font-semibold">Known / Prepared</div>
              <div class="text-sm font-bold text-gray-900 font-mono">{{ classSpells.length }}</div>
            </div>
          </div>

          <!-- Interactive Spell Slots Tracker -->
          <div v-if="allSpellLevels.length > 0" class="pt-2 border-t border-gray-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Spell Slot Tracker</span>
              <button
                type="button"
                @click="restoreAllSlots"
                class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
              >
                Restore All (Long Rest)
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                v-for="lvl in allSpellLevels"
                :key="lvl"
                class="bg-white border border-gray-200 rounded p-2 flex flex-col justify-between"
              >
                <div class="flex justify-between items-center mb-1.5">
                  <span class="font-bold text-gray-800 text-[11px]">
                    Level {{ lvl }}
                    <span v-if="sheetSpellSlots.find(s => s.level === lvl)?.isPact" class="text-[9px] font-mono text-purple-700 ml-1 font-semibold">(Pact · Short Rest)</span>
                  </span>
                  <span class="font-mono text-[10px] text-gray-500">
                    {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="slotIdx in getMaxSlots(lvl)"
                    :key="slotIdx"
                    type="button"
                    @click="toggleSlot(lvl, slotIdx)"
                    class="w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                    :title="isSlotExpended(lvl, slotIdx) ? `Restore Level ${lvl} Slot ${slotIdx}` : `Expend Level ${lvl} Slot ${slotIdx}`"
                  >
                    <span
                      v-if="!isSlotExpended(lvl, slotIdx)"
                      class="w-2.5 h-2.5 rounded-full bg-gray-900 pointer-events-none"
                    ></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cantrips List -->
        <div v-if="sheetCantrips.length > 0" class="space-y-2">
          <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Cantrips (Level 0)</h3>
          <div class="space-y-1.5">
            <div
              v-for="sp in sheetCantrips"
              :key="sp.id || sp.name"
              class="border border-gray-200 rounded bg-white overflow-hidden"
            >
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                <div
                  @click="toggleSpell('sp_' + (sp.id || sp.name))"
                  class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
                >
                  <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <span class="font-bold text-gray-900">{{ sp.name }}</span>
                    <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                      {{ sp.school }}
                    </span>
                    <span v-if="sp.source" class="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                      {{ sp.source }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                    aria-label="Toggle details"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                  <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                    <button
                      type="button"
                      @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Spell Attack"
                    >
                      Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                    </button>
                    <button
                      v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                  </template>

                  <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                    <span
                      class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                      title="Target Saving Throw"
                    >
                      DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                    </span>
                    <button
                      v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                      type="button"
                      @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                      title="Roll Damage"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                  </template>

                  <button
                    type="button"
                    @click="castSpell(sp)"
                    class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                    title="Cast Cantrip"
                  >
                    Cast
                  </button>

                  <button
                    type="button"
                    @click="toggleSpell('sp_' + (sp.id || sp.name))"
                    class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>
              </div>

              <!-- Spell Expanded Detail -->
              <div
                v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
              >
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                  <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                  <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                  <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                  <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                </div>

                <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                  <div
                    v-for="(ent, eIdx) in getSpellEntries(sp)"
                    :key="eIdx"
                    v-html="renderAnnotatedText(formatSpellEntry(ent))"
                  ></div>
                </div>
                <p v-else class="text-gray-400 italic">No rules text recorded.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Leveled Spells List -->
        <div v-if="sheetLeveledSpells.length > 0" class="space-y-4">
          <div
            v-for="lvl in activeSpellsByLevel"
            :key="lvl"
            class="space-y-2"
          >
            <div class="flex items-center justify-between pb-1 border-b border-gray-200">
              <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                Level {{ lvl }} Spells
                <span v-if="sheetSpellSlots.find(s => s.level === lvl)?.isPact" class="text-[9px] font-mono text-purple-700 ml-1 font-semibold">(Pact Magic)</span>
              </h3>
              <span class="text-[10px] text-gray-500 font-mono">
                Slots Available: {{ getAvailableSlots(lvl) }} / {{ getMaxSlots(lvl) }}
              </span>
            </div>

            <div class="space-y-1.5">
              <div
                v-for="sp in getSpellsAtLevel(lvl)"
                :key="sp.id || sp.name"
                class="border border-gray-200 rounded bg-white overflow-hidden"
              >
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                  <div
                    @click="toggleSpell('sp_' + (sp.id || sp.name))"
                    class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
                  >
                    <div class="flex items-center gap-2 flex-wrap min-w-0">
                      <span class="font-bold text-gray-900">{{ sp.name }}</span>
                      <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                        {{ sp.school }}
                      </span>
                      <span v-if="sp.concentration" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold whitespace-nowrap">
                        Conc
                      </span>
                      <span v-if="sp.ritual" class="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1 py-0.2 rounded font-semibold whitespace-nowrap">
                        Ritual
                      </span>
                    </div>
                    <button
                      type="button"
                      class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                      aria-label="Toggle details"
                    >
                      {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                    </button>
                  </div>

                  <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                    <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                      <button
                        type="button"
                        @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Spell Attack"
                      >
                        Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                      </button>
                      <button
                        v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                        type="button"
                        @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Damage"
                      >
                        Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                      </button>
                    </template>

                    <template v-else-if="extractSpellMechanics(sp, char.level, charCasterMod).saveAbility">
                      <span
                        class="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px] font-semibold"
                        title="Target Saving Throw"
                      >
                        DC {{ charSpellSaveDc }} {{ extractSpellMechanics(sp, char.level, charCasterMod).saveAbility.slice(0, 3).toUpperCase() }} Save
                      </span>
                      <button
                        v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula"
                        type="button"
                        @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                        class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Roll Damage"
                      >
                        Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                      </button>
                    </template>

                    <button
                      type="button"
                      @click="castSpell(sp)"
                      :disabled="getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0"
                      :class="[
                        'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                        (getMaxSlots(lvl) === 0 || getAvailableSlots(lvl) > 0)
                          ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      ]"
                      :title="(getMaxSlots(lvl) > 0 && getAvailableSlots(lvl) === 0) ? 'No spell slots remaining at this level' : 'Cast Spell & Expend Slot'"
                    >
                      Cast
                    </button>

                    <button
                      type="button"
                      @click="toggleSpell('sp_' + (sp.id || sp.name))"
                      class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                    >
                      {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                    </button>
                  </div>
                </div>

                <!-- Spell Expanded Detail -->
                <div
                  v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                  class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
                >
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                    <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                    <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                    <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                    <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                  </div>

                  <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                    <div
                      v-for="(ent, eIdx) in getSpellEntries(sp)"
                      :key="eIdx"
                      v-html="renderAnnotatedText(formatSpellEntry(ent))"
                    ></div>
                  </div>
                  <p v-else class="text-gray-400 italic">No rules text recorded.</p>

                  <div v-if="getSpellHigherLevels(sp).length" class="pt-2 border-t border-gray-100">
                    <h5 class="font-bold text-gray-800 text-[11px] mb-1">Using Higher-Level Slots:</h5>
                    <div
                      v-for="(hl, hIdx) in getSpellHigherLevels(sp)"
                      :key="hIdx"
                      v-html="renderAnnotatedText(formatSpellEntry(hl))"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feat Spells Section (Free Cast / Innate Magic) -->
        <div v-if="featSpells.length > 0" class="space-y-2 pt-2 border-t border-gray-200">
          <div class="flex items-center justify-between pb-1 border-b border-gray-200">
            <div>
              <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                Feat Spells & Innate Magic
              </h3>
              <p class="text-[10px] text-gray-500">Granted by feats (e.g. Magic Initiate) • Does not consume class spell preparation slots</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="allSpellLevels.length === 0"
                type="button"
                @click="restoreAllSlots"
                class="text-[10px] text-gray-700 hover:text-gray-900 font-semibold cursor-pointer underline"
              >
                Restore Free Casts (Long Rest)
              </button>
              <span class="text-[10px] bg-gray-900 text-white px-1.5 py-0.2 rounded font-semibold font-mono">
                {{ featSpells.length }}
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <div
              v-for="sp in featSpells"
              :key="sp.id || sp.name"
              class="border border-gray-200 rounded bg-white overflow-hidden"
            >
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 transition gap-2">
                <div
                  @click="toggleSpell('sp_' + (sp.id || sp.name))"
                  class="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none min-w-0 w-full sm:w-auto"
                >
                  <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span class="font-bold text-gray-900">{{ sp.name }}</span>
                    <span class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-1 rounded whitespace-nowrap">
                      {{ getFeatName(sp) }}
                    </span>
                    <span v-if="Number(sp.level) === 0 || sp.is_cantrip" class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                      Cantrip (At Will)
                    </span>
                    <span v-else class="text-[9px] bg-gray-100 text-gray-700 border border-gray-200 px-1 rounded font-semibold whitespace-nowrap">
                      Level {{ sp.level }} (1/LR)
                    </span>
                    <span v-if="sp.school" class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded text-gray-600 whitespace-nowrap">
                      {{ sp.school }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="sm:hidden font-mono text-gray-400 font-bold text-xs p-1 shrink-0"
                    aria-label="Toggle details"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0 pt-1 sm:pt-0 border-t border-gray-200/50 sm:border-t-0">
                  <!-- Slot tracker bubble for leveled feat spell -->
                  <div v-if="Number(sp.level) > 0" class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] select-none">
                    <span class="text-gray-500 font-medium">Slot:</span>
                    <button
                      type="button"
                      @click.stop="toggleFeatFreeCast(sp)"
                      class="w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-white"
                      :title="isFeatCastExpended(sp) ? 'Click to restore slot' : 'Click to expend slot'"
                    >
                      <span
                        v-if="!isFeatCastExpended(sp)"
                        class="w-2 h-2 rounded-full bg-gray-900 pointer-events-none"
                      ></span>
                    </button>
                    <span class="font-mono font-semibold text-gray-800">
                      {{ isFeatCastExpended(sp) ? '0' : '1' }} / 1
                    </span>
                  </div>

                  <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).hasAttack">
                    <button
                      type="button"
                      @click="rollDice(`${sp.name} Attack`, charSpellAttackBonus)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      Attack {{ charSpellAttackBonus >= 0 ? '+' : '' }}{{ charSpellAttackBonus }}
                    </button>
                  </template>
                  <template v-if="extractSpellMechanics(sp, char.level, charCasterMod).diceFormula">
                    <button
                      type="button"
                      @click="rollFormula(`${sp.name} Damage`, extractSpellMechanics(sp, char.level, charCasterMod).diceFormula)"
                      class="px-2 py-0.5 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      Damage ({{ extractSpellMechanics(sp, char.level, charCasterMod).diceFormula }})
                    </button>
                  </template>

                  <!-- Cast buttons -->
                  <template v-if="Number(sp.level) > 0">
                    <button
                      type="button"
                      @click="castSpell(sp, false)"
                      :disabled="isFeatCastExpended(sp)"
                      :class="[
                        'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                        !isFeatCastExpended(sp)
                          ? 'bg-gray-900 hover:bg-black text-white cursor-pointer'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      ]"
                    >
                      {{ isFeatCastExpended(sp) ? 'Free Expended' : 'Cast Free' }}
                    </button>
                    <button
                      v-if="allSpellLevels.length > 0"
                      type="button"
                      @click="castSpell(sp, true)"
                      :disabled="getAvailableSlots(sp.level) === 0"
                      :class="[
                        'px-2.5 py-0.5 rounded text-[10px] font-semibold transition',
                        getAvailableSlots(sp.level) > 0
                          ? 'bg-gray-800 hover:bg-gray-900 text-white cursor-pointer'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      ]"
                      title="Cast using a spell slot"
                    >
                      Cast (Slot)
                    </button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      @click="castSpell(sp)"
                      class="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      Cast
                    </button>
                  </template>

                  <button
                    type="button"
                    @click="toggleSpell('sp_' + (sp.id || sp.name))"
                    class="hidden sm:inline-block font-mono text-gray-400 font-bold text-xs p-1 cursor-pointer"
                  >
                    {{ expandedSpells['sp_' + (sp.id || sp.name)] ? '-' : '+' }}
                  </button>
                </div>
              </div>

              <!-- Spell Expanded Detail -->
              <div
                v-show="expandedSpells['sp_' + (sp.id || sp.name)]"
                class="p-3 border-t border-gray-100 bg-white text-gray-700 space-y-2 text-xs"
              >
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-[11px]">
                  <div><strong class="text-gray-600">Cast Time:</strong> {{ getSpellCastingTime(sp) }}</div>
                  <div><strong class="text-gray-600">Range:</strong> {{ getSpellRange(sp) }}</div>
                  <div><strong class="text-gray-600">Duration:</strong> {{ getSpellDuration(sp) }}</div>
                  <div><strong class="text-gray-600">Components:</strong> {{ getSpellComponents(sp) }}</div>
                </div>

                <div v-if="getSpellEntries(sp).length" class="space-y-1.5 leading-relaxed">
                  <div
                    v-for="(ent, eIdx) in getSpellEntries(sp)"
                    :key="eIdx"
                    v-html="renderAnnotatedText(formatSpellEntry(ent))"
                  ></div>
                </div>
                <p v-else class="text-gray-400 italic">No rules text recorded.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-6 bg-gray-50 border border-gray-200 rounded text-center text-gray-500">
        <p class="font-bold text-gray-700 text-sm mb-1">No Spells Known</p>
        <p class="text-xs">This character does not currently have spells or spell slots recorded.</p>
      </div>
    </div>

    <!-- TAB: Skills -->
    <div v-else-if="activeTab === 'skills'" class="space-y-3 text-xs">
      <!-- Legend -->
      <div class="flex items-center gap-3 sm:gap-4 text-[11px] text-gray-500 pb-2 border-b border-gray-200 flex-wrap">
        <span class="font-semibold text-gray-700">Proficiency:</span>
        <span class="inline-flex items-center gap-1.5">
          <IconStarFilled class="w-3.5 h-3.5 text-gray-900" />
          <span>Expertise</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-gray-800 inline-block"></span>
          <span>Proficient</span>
        </span>
        <span v-if="hasJackOfAllTrades" class="inline-flex items-center gap-1.5" title="Bard: Jack of All Trades (+½ PB rounded down)">
          <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
          <span>Jack of All Trades</span>
        </span>
        <span v-else-if="hasRemarkableAthlete" class="inline-flex items-center gap-1.5" title="Champion: Remarkable Athlete (+½ PB rounded up)">
          <span class="font-mono font-bold text-xs text-gray-800 leading-none">½</span>
          <span>Remarkable Athlete</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"></span>
          <span>Not Proficient</span>
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="(sk, sName) in computedSkills"
          :key="sName"
          class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition"
        >
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 flex items-center justify-center shrink-0">
              <IconStarFilled
                v-if="sk.expertise"
                class="w-3.5 h-3.5 text-gray-900"
                title="Expertise"
              />
              <span
                v-else-if="sk.proficient"
                class="w-2.5 h-2.5 rounded-full bg-gray-800"
                title="Proficient"
              ></span>
              <span
                v-else-if="sk.jack_of_all_trades"
                class="font-mono font-bold text-[11px] text-gray-800"
                title="Jack of All Trades (+½ PB rounded down)"
              >½</span>
              <span
                v-else-if="sk.remarkable_athlete"
                class="font-mono font-bold text-[11px] text-gray-800"
                title="Remarkable Athlete (+½ PB rounded up)"
              >½</span>
              <span
                v-else
                class="w-2.5 h-2.5 rounded-full border border-gray-300"
                title="Not Proficient"
              ></span>
            </span>
            <span class="capitalize font-medium text-gray-800">{{ sName.replace(/_/g, ' ') }}</span>
            <span class="text-[10px] text-gray-400 uppercase">({{ sk.ability.slice(0, 3) }})</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-mono text-[11px]">Passive {{ sk.passive }}</span>
            <button
              type="button"
              @click="rollDice(`${sName.replace(/_/g, ' ').toUpperCase()} Check`, sk.total)"
              class="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-mono font-bold transition cursor-pointer text-xs"
            >
              {{ sk.modifier_string }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Features & Traits (Full Explanations) -->
    <div v-else-if="activeTab === 'features'" class="space-y-4 text-xs">
      <div class="flex items-center justify-end pb-1 border-b border-gray-100">
        <button
          type="button"
          @click="expandAllFeatures(allFeatureKeys)"
          class="text-xs text-gray-700 hover:text-gray-900 font-semibold cursor-pointer"
        >
          Toggle All
        </button>
      </div>

      <!-- Class Features -->
      <div v-if="filteredClassFeatures.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Class Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="cf in filteredClassFeatures"
            :key="cf.id || cf.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('cf_' + (cf.id || cf.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-gray-900">{{ cf.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                  Level {{ cf.level }}
                </span>
                <span v-if="isOptionalFeature(cf)" class="text-[11px] font-medium text-gray-600">
                  Optional Feature
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['cf_' + (cf.id || cf.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['cf_' + (cf.id || cf.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="cf.entries && cf.entries.length" v-html="renderAnnotatedText(format5eEntries(cf.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Subclass Features -->
      <div v-if="filteredSubClassFeatures.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Subclass Features</h3>
        <div class="space-y-1.5">
          <div
            v-for="scf in filteredSubClassFeatures"
            :key="scf.id || scf.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('scf_' + (scf.id || scf.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-gray-900">{{ scf.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                  Level {{ scf.level }}
                </span>
                <span class="text-[11px] font-medium text-gray-600">
                  Subclass Feature
                </span>
                <span v-if="isOptionalFeature(scf)" class="text-[11px] font-medium text-gray-600">
                  Optional Feature
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['scf_' + (scf.id || scf.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['scf_' + (scf.id || scf.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="scf.entries && scf.entries.length" v-html="renderAnnotatedText(format5eEntries(scf.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Species / Race Traits -->
      <div v-if="char.trait?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Species & Lineage Traits</h3>
        <div class="space-y-1.5">
          <div
            v-for="tr in char.trait"
            :key="tr.id || tr.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('tr_' + (tr.id || tr.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ tr.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Species Trait</span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['tr_' + (tr.id || tr.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['tr_' + (tr.id || tr.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="tr.entries && tr.entries.length" v-html="renderAnnotatedText(format5eEntries(tr.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Background Features -->
      <div v-if="char.feature?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Background Feature</h3>
        <div class="space-y-1.5">
          <div
            v-for="feat in char.feature"
            :key="feat.id || feat.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('bf_' + (feat.id || feat.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ feat.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Background</span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['bf_' + (feat.id || feat.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['bf_' + (feat.id || feat.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="feat.entries && feat.entries.length" v-html="renderAnnotatedText(format5eEntries(feat.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Feats -->
      <div v-if="char.feat?.length" class="space-y-2">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Feats</h3>
        <div class="space-y-1.5">
          <div
            v-for="ft in char.feat"
            :key="ft.id || ft.name"
            class="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <div
              @click="toggleFeature('ft_' + (ft.id || ft.name))"
              class="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer select-none"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900">{{ ft.name }}</span>
                <span class="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                  Feat
                </span>
              </div>
              <span class="font-mono text-gray-400 font-bold text-sm leading-none">
                {{ expandedFeatures['ft_' + (ft.id || ft.name)] ? '-' : '+' }}
              </span>
            </div>

            <div
              v-show="expandedFeatures['ft_' + (ft.id || ft.name)]"
              class="p-3 border-t border-gray-100 text-gray-700 space-y-2 leading-relaxed"
            >
              <div v-if="ft.entries && ft.entries.length" v-html="renderAnnotatedText(format5eEntries(ft.entries))"></div>
              <p v-else class="text-gray-400 italic">Rules text available in compendium.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Languages -->
      <div v-if="char.language?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Languages Known</h3>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="lang in char.language"
            :key="lang.id || lang.name"
            class="bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded font-medium"
          >
            {{ lang.name }}
          </span>
        </div>
      </div>

      <!-- Proficiencies (Tools, Armor, Weapons) -->
      <div v-if="char.proficiency?.length" class="p-3 bg-gray-50 rounded border border-gray-200">
        <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">Proficiencies & Training</h3>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="p in char.proficiency"
            :key="p.id || p.name"
            class="bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200"
          >
            {{ cleanProficiencyName(p.name) }}
          </span>
        </div>
      </div>
    </div>

    <!-- TAB 3: Equipment & Wealth -->
    <div v-else-if="activeTab === 'equipment'" class="space-y-4 text-xs">
      <!-- Currency Pouch (Interactive) -->
      <div class="bg-gray-50 p-3.5 rounded border border-gray-200">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Wealth & Currency</h3>
          <span v-if="currencySavedToast" class="text-[10px] text-green-600 font-semibold transition">Saved</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <!-- PP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">PP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('pp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.pp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('pp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- GP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">GP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('gp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.gp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
              />
              <button
                type="button"
                @click="adjustCurrency('gp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- EP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">EP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('ep', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.ep"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('ep', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- SP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">SP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('sp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.sp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5"
              />
              <button
                type="button"
                @click="adjustCurrency('sp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>

          <!-- CP -->
          <div class="bg-white p-2 border border-gray-200 rounded">
            <span class="text-[10px] text-gray-500 font-semibold uppercase block mb-1">CP</span>
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                @click="adjustCurrency('cp', -1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >-</button>
              <input
                type="number"
                min="0"
                v-model.number="currency.cp"
                @change="saveCurrency"
                class="w-12 text-center text-xs font-bold border border-gray-200 rounded py-0.5 text-gray-900"
              />
              <button
                type="button"
                @click="adjustCurrency('cp', 1)"
                class="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold leading-none cursor-pointer"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Encumbrance Bar Widget -->
      <div class="p-3 bg-gray-50 border border-gray-200 space-y-2">
        <div class="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>Weight / Carrying Capacity</span>
          <span class="text-[11px] font-normal text-gray-500">{{ Math.round((totalWeight / (carryCapacity || 1)) * 100) }}%</span>
        </div>

        <div class="relative w-full bg-gray-200 h-6 overflow-hidden border border-gray-300">
          <div
            class="h-full transition-all duration-300"
            :class="weightBarColor"
            :style="{ width: `${weightPercent}%` }"
          ></div>
          <div
            class="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none tracking-tight"
            :class="weightPercent > 55 ? 'text-white drop-shadow-xs' : 'text-gray-900'"
          >
            {{ totalWeight.toFixed(1) }} / {{ carryCapacity }} lbs
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px]">
          <span class="text-gray-500">
            Status: <span class="font-bold" :class="weightStatusTextColor">{{ weightStatusLabel }}</span>
          </span>
          <span class="text-gray-500">
            Max: <strong class="text-gray-800">{{ carryCapacity }} lbs</strong>
          </span>
        </div>
      </div>

      <!-- Equipment Table -->
      <div class="bg-white border border-gray-200 rounded overflow-hidden">
        <div class="p-2.5 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 uppercase tracking-wider text-[11px] flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span>Inventory Items</span>
            <span class="text-[10px] text-gray-500 font-normal">({{ liveEquipment.length }} items)</span>
            <span v-if="equipmentSavedToast" class="text-[10px] text-green-600 font-semibold">Saved</span>
          </div>
          <button
            type="button"
            @click="openCompendiumModal"
            class="bg-gray-800 hover:bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
          >
            Add Item
          </button>
        </div>

        <!-- Container & Storage View Pills -->
        <div class="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50/70 border-b border-gray-200">
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">View:</span>
          <button
            type="button"
            @click="selectedContainerFilter = 'all'"
            :class="selectedContainerFilter === 'all' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
          >
            All Items ({{ liveEquipment.length }})
          </button>
          <button
            type="button"
            @click="selectedContainerFilter = 'equipped'"
            :class="selectedContainerFilter === 'equipped' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
          >
            Equipped ({{ equippedCount }})
          </button>
          <button
            type="button"
            @click="selectedContainerFilter = 'backpack'"
            :class="selectedContainerFilter === 'backpack' ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer"
          >
            Backpack ({{ backpackCount }})
          </button>
          <button
            v-for="c in availableContainers"
            :key="c.name"
            type="button"
            @click="selectedContainerFilter = c.name"
            :class="selectedContainerFilter === c.name ? 'bg-gray-800 text-white font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-2 py-0.5 rounded text-[11px] transition cursor-pointer flex items-center gap-1"
          >
            <span>{{ c.name }}</span>
            <span class="text-[10px] opacity-75">
              ({{ getContainerCurrentWeight(c.name).toFixed(1) }}{{ getContainerCapacity(c) ? '/' + getContainerCapacity(c) : '' }} lb)
            </span>
          </button>
        </div>

        <!-- Container Capacity Banner (if viewing specific container) -->
        <div
          v-if="currentActiveContainer"
          class="p-2.5 bg-gray-100/70 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
        >
          <div>
            <span class="font-bold text-gray-900">{{ currentActiveContainer.name }}</span>
            <span class="text-gray-500 ml-2">Items inside: {{ filteredEquipment.length }}</span>
          </div>
          <div v-if="getContainerCapacity(currentActiveContainer)" class="flex items-center gap-2 w-full sm:w-auto">
            <div class="text-[11px] text-gray-600 font-medium">
              {{ getContainerCurrentWeight(currentActiveContainer.name).toFixed(1) }} / {{ getContainerCapacity(currentActiveContainer) }} lbs
            </div>
            <div class="w-24 bg-gray-200 h-2 rounded overflow-hidden border border-gray-300">
              <div
                class="h-full bg-gray-800 rounded transition-all"
                :style="{ width: Math.min(100, (getContainerCurrentWeight(currentActiveContainer.name) / getContainerCapacity(currentActiveContainer)) * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div v-if="filteredEquipment.length === 0" class="p-6 text-center text-gray-400 italic">
          {{ selectedContainerFilter === 'equipped' ? 'No items currently equipped.' : selectedContainerFilter === 'backpack' ? 'No items in backpack.' : selectedContainerFilter !== 'all' ? 'No items stored in this container yet.' : 'No equipment or gear recorded.' }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/50 text-[11px] text-gray-500 font-medium">
                <th class="py-2 px-3">Item Name</th>
                <th class="py-2 px-2 text-center">Location</th>
                <th class="py-2 px-2 text-center">Status</th>
                <th class="py-2 px-2 text-center">Qty</th>
                <th class="py-2 px-3 text-right">Weight</th>
                <th class="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(eq, eIdx) in filteredEquipment" :key="eIdx" class="hover:bg-gray-50">
                <td class="py-2 px-3 font-medium text-gray-800">
                  <span>{{ eq.name }}</span>
                  <span v-if="isContainerItem(eq)" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                    Container{{ getContainerCapacity(eq) ? ' (' + getContainerCapacity(eq) + ' lb)' : '' }}
                  </span>
                  <span v-else-if="getItemEquipType(eq) === 'armor' || getItemEquipType(eq) === 'shield'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                    {{ getItemEquipType(eq) === 'shield' ? 'Shield' : 'Armor' }}
                  </span>
                  <span v-else-if="getItemEquipType(eq) === 'weapon'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                    Weapon
                  </span>
                  <span v-else-if="getItemEquipType(eq) === 'wearable'" class="ml-1.5 text-[9px] bg-gray-100 text-gray-700 border border-gray-300 px-1 py-0.5 rounded font-mono">
                    Wearable
                  </span>
                  <span v-if="selectedContainerFilter === 'all' && eq.container_name" class="ml-1.5 text-[9px] text-gray-500 italic">
                    (in {{ eq.container_name }})
                  </span>
                </td>
                <td class="py-2 px-2 text-center">
                  <span
                    v-if="eq.status === 'equipped'"
                    class="text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded"
                  >
                    Equipped
                  </span>
                  <span v-else-if="isContainerItem(eq)" class="text-[10px] text-gray-400 font-mono">Container</span>
                  <select
                    v-else-if="availableContainers.length > 0"
                    :value="eq.container_name || ''"
                    @change="setItemContainer(eq, $event.target.value)"
                    class="text-[10px] p-1 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer"
                  >
                    <option value="">Backpack</option>
                    <option v-for="c in availableContainers.filter(cont => cont !== eq)" :key="c.name" :value="c.name">
                      {{ c.name }}
                    </option>
                  </select>
                  <span v-else class="text-[10px] text-gray-400">Backpack</span>
                </td>
                <td class="py-2 px-2 text-center">
                  <button
                    v-if="isItemEquippable(eq) && !eq.container_name"
                    type="button"
                    @click="toggleEquipStatus(eq)"
                    :class="eq.status === 'equipped' ? 'bg-gray-200 text-gray-800 border-gray-300 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200'"
                    class="px-2 py-0.5 text-[10px] rounded border transition cursor-pointer capitalize"
                  >
                    {{ eq.status === 'equipped' ? 'Equipped' : 'Equip' }}
                  </button>
                  <span v-else-if="isItemEquippable(eq) && eq.container_name" class="text-[10px] text-gray-400 select-none" :title="'Stored in ' + eq.container_name">—</span>
                  <span v-else class="text-[10px] text-gray-400 select-none">—</span>
                </td>
                <td class="py-2 px-2 text-center font-mono">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      @click="changeItemAmount(eq, -1)"
                      class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                    >-</button>
                    <span class="w-6 text-center text-xs font-semibold">{{ eq.amount || 1 }}</span>
                    <button
                      type="button"
                      @click="changeItemAmount(eq, 1)"
                      class="w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold leading-none cursor-pointer"
                    >+</button>
                  </div>
                </td>
                <td class="py-2 px-3 text-right font-mono text-gray-600">{{ eq.weight || '0' }} lb</td>
                <td class="py-2 px-3 text-right">
                  <button
                    type="button"
                    @click="removeItem(eq)"
                    class="text-gray-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer transition"
                    title="Remove Item"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Compendium Item Picker Modal -->
    <div
      v-if="isCompendiumOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 text-xs space-y-3 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 class="font-bold text-gray-900 text-sm">Add Item from Compendium</h3>
          <button
            type="button"
            @click="isCompendiumOpen = false"
            class="text-gray-400 hover:text-gray-700 leading-none p-1 cursor-pointer"
          >
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="compendiumSearch"
            @keyup.enter="searchCompendiumItems"
            placeholder="Search weapon, armor, potion..."
            class="flex-1 p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-500"
          />
          <div class="flex gap-2">
            <select
              v-model="compendiumCategory"
              @change="searchCompendiumItems"
              class="flex-1 sm:flex-initial p-2 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="all">All Types</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor & Shield</option>
            </select>
            <button
              type="button"
              @click="searchCompendiumItems"
              class="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        <!-- Results List -->
        <div
          @scroll="onCompendiumScroll"
          class="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[220px]"
        >
          <div v-if="compendiumLoading" class="py-10 text-center text-gray-400">
            Searching items...
          </div>
          <div v-else-if="compendiumResults.length === 0" class="py-10 text-center text-gray-400 italic">
            No items found. Try another search query.
          </div>
          <template v-else>
            <div
              v-for="it in compendiumResults"
              :key="it.id || it.name"
              class="py-2 px-1 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ it.name }}</div>
                <div class="text-[10px] text-gray-500">
                  <span class="capitalize">{{ it.type || 'Item' }}</span>
                  <span v-if="it.weight"> &bull; {{ it.weight }} lb</span>
                  <span v-if="it.ac"> &bull; AC {{ it.ac }}</span>
                  <span v-if="it.dmg1"> &bull; {{ it.dmg1 }} {{ it.dmgType }}</span>
                </div>
              </div>
              <button
                type="button"
                @click="addItemFromCompendium(it)"
                class="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
              >
                Add
              </button>
            </div>

            <div v-if="compendiumHasMore" class="p-2 text-center border-t border-gray-100">
              <button
                type="button"
                :disabled="compendiumLoadingMore"
                @click="searchCompendiumItems(true)"
                class="text-xs text-gray-700 hover:text-gray-900 font-medium py-1 px-3 border border-gray-300 rounded hover:bg-gray-100 cursor-pointer"
              >
                {{ compendiumLoadingMore ? 'Loading more...' : 'Load more items' }}
              </button>
            </div>
          </template>
        </div>

        <div class="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            @click="isCompendiumOpen = false"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Characteristics & Roleplay -->
    <div v-else-if="activeTab === 'characteristics'" class="space-y-4 text-xs">
      <!-- Characteristics Header Card -->
      <div class="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-gray-900 tracking-wider uppercase">CHARACTERISTICS & DETAILS</h2>
          <p class="text-[11px] text-gray-500 mt-0.5">Physical appearance, traits, lifestyle, and character notes.</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="emit('edit')"
            class="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-1 rounded text-xs font-medium cursor-pointer shadow-xs inline-flex items-center gap-1"
            title="Edit all characteristics in wizard"
          >
            <IconEdit class="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <!-- Top Characteristics Grid (10 fields matching user screenshot) -->
      <div class="p-3.5 bg-white border border-gray-200 rounded">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">ALIGNMENT</div>
            <div class="font-semibold text-gray-900">{{ char.alignment || parsedCharacteristics.alignment || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">GENDER</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.gender || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">EYES</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.eyes || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">SIZE</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.size || 'Medium' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">HEIGHT</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.height || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">FAITH</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.faith || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">HAIR</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.hair || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">SKIN</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.skin || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">AGE</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.age || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">WEIGHT</div>
            <div class="font-semibold text-gray-900">{{ parsedCharacteristics.weight || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Personality Traits, Ideals, Bonds, Flaws -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- Personality Traits -->
        <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
          <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
            <span>Personality Traits</span>
          </div>
          <div v-if="parsedCharacteristics.personalityTraits && parsedCharacteristics.personalityTraits.length" class="space-y-1">
            <p
              v-for="(tr, idx) in parsedCharacteristics.personalityTraits"
              :key="idx"
              class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
            >
              "{{ tr }}"
            </p>
          </div>
          <p v-else class="text-xs text-gray-400 italic">No personality traits recorded.</p>
        </div>

        <!-- Ideals -->
        <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
          <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
            <span>Ideals</span>
          </div>
          <div v-if="parsedCharacteristics.ideals && parsedCharacteristics.ideals.length" class="space-y-1">
            <p
              v-for="(idItem, idx) in parsedCharacteristics.ideals"
              :key="idx"
              class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
            >
              "{{ idItem }}"
            </p>
          </div>
          <p v-else class="text-xs text-gray-400 italic">No ideals recorded.</p>
        </div>

        <!-- Bonds -->
        <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
          <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
            <span>Bonds</span>
          </div>
          <div v-if="parsedCharacteristics.bonds && parsedCharacteristics.bonds.length" class="space-y-1">
            <p
              v-for="(bd, idx) in parsedCharacteristics.bonds"
              :key="idx"
              class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
            >
              "{{ bd }}"
            </p>
          </div>
          <p v-else class="text-xs text-gray-400 italic">No bonds recorded.</p>
        </div>

        <!-- Flaws -->
        <div class="p-3 bg-white border border-gray-200 rounded space-y-1.5">
          <div class="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1">
            <span>Flaws</span>
          </div>
          <div v-if="parsedCharacteristics.flaws && parsedCharacteristics.flaws.length" class="space-y-1">
            <p
              v-for="(fl, idx) in parsedCharacteristics.flaws"
              :key="idx"
              class="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic"
            >
              "{{ fl }}"
            </p>
          </div>
          <p v-else class="text-xs text-gray-400 italic">No flaws recorded.</p>
        </div>
      </div>

      <!-- Appearance -->
      <div class="p-3.5 bg-white border border-gray-200 rounded space-y-2">
        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">APPEARANCE</h3>
        <p v-if="parsedCharacteristics.appearance" class="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
          {{ parsedCharacteristics.appearance }}
        </p>
        <p v-else class="text-xs text-gray-400 italic">No appearance description provided.</p>
      </div>

      <!-- Lifestyle & Wealth -->
      <div class="p-3.5 bg-white border border-gray-200 rounded space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Lifestyle & Wealth</h3>
          <span class="text-[11px] font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
            {{ parsedCharacteristics.lifestyle || 'Modest' }} &bull; {{ LIFESTYLES.find(l => l.value === (parsedCharacteristics.lifestyle || 'Modest'))?.cost || '1 gp/day' }}
          </span>
        </div>
        <p class="text-xs text-gray-600">
          {{ LIFESTYLES.find(l => l.value === (parsedCharacteristics.lifestyle || 'Modest'))?.desc }}
        </p>
      </div>

      <!-- Notes & Organizations with interactive save (Screenshot 2) -->
      <div class="p-4 bg-white border border-gray-200 rounded space-y-3">
        <div class="flex items-center justify-between">
          <!-- Sub-tabs bar: ALL, ORGS, ALLIES, ENEMIES, BACKSTORY, OTHER -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
            <button
              v-for="st in ['ALL', 'ORGS', 'ALLIES', 'ENEMIES', 'BACKSTORY', 'OTHER']"
              :key="st"
              type="button"
              @click="sheetNotesSubTab = st"
              :class="sheetNotesSubTab === st ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'"
              class="px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition cursor-pointer"
            >
              {{ st }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="notesSavedToast" class="text-[11px] text-emerald-600 font-semibold animate-pulse">Saved!</span>
            <button
              type="button"
              :disabled="isSavingNotes"
              @click="saveSheetNotes"
              class="bg-gray-900 hover:bg-black text-white px-3 py-1 rounded text-xs font-medium cursor-pointer transition shadow-xs disabled:opacity-50"
            >
              {{ isSavingNotes ? 'Saving...' : 'Save Notes' }}
            </button>
          </div>
        </div>

        <div class="space-y-4 pt-2">
          <!-- ORGANIZATIONS -->
          <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ORGS'" class="space-y-1.5">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ORGANIZATIONS</h4>
            <textarea
              v-model="sheetNotes.organizations"
              rows="2"
              placeholder="+ Add Organizations"
              class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <!-- ALLIES -->
          <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ALLIES'" class="space-y-1.5">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ALLIES</h4>
            <textarea
              v-model="sheetNotes.allies"
              rows="2"
              placeholder="+ Add Allies"
              class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <!-- ENEMIES -->
          <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'ENEMIES'" class="space-y-1.5">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">ENEMIES</h4>
            <textarea
              v-model="sheetNotes.enemies"
              rows="2"
              placeholder="+ Add Enemies"
              class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <!-- BACKSTORY -->
          <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'BACKSTORY'" class="space-y-1.5">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">BACKSTORY</h4>
            <textarea
              v-model="sheetNotes.backstory"
              rows="4"
              placeholder="+ Add Backstory"
              class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>

          <!-- OTHER -->
          <div v-if="sheetNotesSubTab === 'ALL' || sheetNotesSubTab === 'OTHER'" class="space-y-1.5">
            <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wider">OTHER</h4>
            <textarea
              v-model="sheetNotes.other"
              rows="2"
              placeholder="+ Add Other"
              class="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Background -->
    <div v-else-if="activeTab === 'background'" class="space-y-4 text-xs">
      <!-- Background Header -->
      <div class="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-gray-900">{{ char.background || 'Custom Background' }}</h2>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-gray-100 text-gray-700 border border-gray-200">
            {{ char.edition || '2024' }} Edition
          </span>
          <span v-if="bgCompendiumData?.source" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-200 text-gray-700">
            {{ bgCompendiumData.source }}
          </span>
        </div>
      </div>

      <!-- Quick Background Benefits Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        <!-- Origin Feat -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Origin Feat</div>
          <div class="font-bold text-gray-900 text-sm">
            {{ formatOriginFeatName() || 'None' }}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5">Granted at 1st level by background</p>
        </div>

        <!-- Ability Score Increases -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Ability Scores</div>
          <div class="font-bold text-gray-900 text-sm">
            {{ formatBgAbilityScores() || 'Standard' }}
          </div>
          <p class="text-[10px] text-gray-500 mt-0.5">Key abilities associated with background</p>
        </div>

        <!-- Skill Proficiencies -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Skill Proficiencies</div>
          <div class="font-semibold text-gray-900 text-xs flex flex-wrap gap-1">
            <span
              v-for="sk in formatBgSkills()"
              :key="sk"
              class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[10px]"
            >
              {{ sk }}
            </span>
            <span v-if="!formatBgSkills().length" class="text-gray-400">—</span>
          </div>
        </div>

        <!-- Tool Proficiencies -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Tool Proficiencies</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgTools() || 'None' }}
          </div>
        </div>

        <!-- Languages -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Languages</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgLanguages() || 'Standard' }}
          </div>
        </div>

        <!-- Starting Equipment -->
        <div class="p-3 bg-white border border-gray-200 rounded">
          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Starting Gear Package</div>
          <div class="text-xs text-gray-800 font-medium">
            {{ formatBgEquipmentSummary() || 'Standard Background Package' }}
          </div>
        </div>
      </div>

      <!-- Narrative & Background Rules Entries -->
      <div class="p-4 bg-white border border-gray-200 rounded space-y-3">
        <h3 class="font-bold text-gray-900 uppercase tracking-wider text-[11px] pb-1 border-gray-200 flex items-center justify-between">
          <span>Background Rules & Description</span>
          <span v-if="isFetchingBg" class="text-gray-500 font-normal lowercase animate-pulse">Loading compendium details...</span>
        </h3>

        <!-- Compendium Entries -->
        <div v-if="bgCompendiumData?.entries && bgCompendiumData.entries.length" class="space-y-2 text-gray-700 leading-relaxed text-xs">
          <div v-html="renderAnnotatedText(format5eEntries(bgCompendiumData.entries))"></div>
        </div>
        <div v-else-if="!isFetchingBg" class="text-gray-500 italic">
          No detailed compendium text found for this background.
        </div>

        <!-- Background Features (e.g. 2014) -->
        <div v-if="char.feature && char.feature.length" class="pt-3 border-t border-gray-200 space-y-2">
          <h4 class="font-bold text-gray-900 text-xs">Background Features</h4>
          <div v-for="bf in char.feature" :key="bf.id || bf.name" class="p-2.5 bg-gray-50 rounded border border-gray-200">
            <div class="font-bold text-gray-900 text-xs">{{ bf.name }}</div>
            <div v-if="bf.entries && bf.entries.length" class="mt-1 text-gray-700 text-xs leading-relaxed" v-html="renderAnnotatedText(format5eEntries(bf.entries))"></div>
          </div>
        </div>

        <!-- Roleplay Characteristics -->
        <div v-if="char.alignment || char.traits || char.description" class="pt-3 border-t border-gray-200 space-y-2">
          <h4 class="font-bold text-gray-900 text-xs">Roleplay & Characteristics</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2 bg-gray-50 rounded border border-gray-200">
              <span class="text-gray-500 font-semibold block text-[10px] uppercase">Alignment</span>
              <span class="text-gray-900 font-medium">{{ char.alignment || 'Neutral' }}</span>
            </div>
            <div v-if="char.traits" class="p-2 bg-gray-50 rounded border border-gray-200">
              <span class="text-gray-500 font-semibold block text-[10px] uppercase">Personality</span>
              <span class="text-gray-900">{{ char.traits }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: Roll History -->
    <div v-else-if="activeTab === 'history'" class="space-y-1.5 text-xs">
      <div
        v-for="(h, idx) in rollHistory"
        :key="idx"
        class="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 font-mono"
      >
        <div>
          <span class="text-gray-400 mr-2 text-[11px]">{{ h.timestamp }}</span>
          <span class="text-gray-800 font-semibold">{{ h.label }}</span>
        </div>
        <div>
          <span class="text-gray-500 mr-2 text-[11px]">({{ h.breakdown || h.formula }})</span>
          <span
            class="text-xs font-bold"
            :class="h.isNat20 ? 'text-amber-600' : (h.isNat1 ? 'text-red-600' : 'text-gray-900')"
          >
            {{ h.total }}
          </span>
        </div>
      </div>
    </div>

    <!-- Floating Dice Roller FAB (Bottom-Right) -->
    <div class="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
      <!-- Popover Menu -->
      <transition name="fade">
        <div
          v-if="isDiceTrayOpen"
          class="absolute bottom-14 right-0 w-72 max-w-[calc(100vw-24px)] bg-white border border-gray-200 rounded-xl shadow-2xl p-3.5 text-xs space-y-3 z-50 select-none"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <span class="font-bold text-gray-800 text-[11px] uppercase tracking-wider">Quick Dice Roller</span>
            <button
              type="button"
              @click="isDiceTrayOpen = false"
              class="text-gray-400 hover:text-gray-700 font-bold text-sm cursor-pointer p-0.5 leading-none"
            >
              ×
            </button>
          </div>

          <!-- Roll Advantage/Disadvantage Mode for d20 -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-gray-600 font-medium">d20 Mode:</span>
            <div class="inline-flex rounded border border-gray-200 overflow-hidden text-[10px]">
              <button
                type="button"
                @click="diceRollMode = 'normal'"
                :class="diceRollMode === 'normal' ? 'bg-gray-800 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Normal
              </button>
              <button
                type="button"
                @click="diceRollMode = 'adv'"
                :class="diceRollMode === 'adv' ? 'bg-green-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer border-l border-r border-gray-200"
              >
                Adv
              </button>
              <button
                type="button"
                @click="diceRollMode = 'dis'"
                :class="diceRollMode === 'dis' ? 'bg-red-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'"
                class="px-2 py-0.5 cursor-pointer"
              >
                Dis
              </button>
            </div>
          </div>

          <!-- Multiplier & Modifier Row -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Quantity</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="diceMultiplier = Math.max(1, diceMultiplier - 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  v-model.number="diceMultiplier"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="diceMultiplier = Math.min(20, diceMultiplier + 1)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Modifier</label>
              <div class="flex items-center border border-gray-200 rounded">
                <button
                  type="button"
                  @click="diceMod--"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >-</button>
                <input
                  type="number"
                  v-model.number="diceMod"
                  class="w-full text-center text-xs font-semibold py-1 border-0 focus:ring-0"
                />
                <button
                  type="button"
                  @click="diceMod++"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold"
                >+</button>
              </div>
            </div>
          </div>

          <!-- Dice Buttons Grid -->
          <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-gray-100">
            <button
              v-for="d in STANDARD_DICE"
              :key="d"
              type="button"
              @click="quickRollDie(d)"
              class="py-2 px-1 bg-gray-50 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 rounded font-mono font-bold text-xs text-center transition cursor-pointer"
            >
              d{{ d }}
            </button>
          </div>
        </div>
      </transition>

      <!-- The FAB Circle Button -->
      <button
        type="button"
        @click="isDiceTrayOpen = !isDiceTrayOpen"
        class="w-12 h-12 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-95 border-2 border-white"
        title="Open Dice Roller"
      >
        <span v-if="!isDiceTrayOpen" class="font-mono text-xs font-bold">d20</span>
        <span v-else class="text-base font-bold leading-none">×</span>
      </button>
    </div>

    <!-- Floating Dice Roll Result Toast (Bottom-Left on Desktop, Centered on Mobile) -->
    <transition name="fade">
      <div
        v-if="lastRoll"
        class="fixed bottom-5 left-4 sm:left-6 z-50 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:bottom-5 max-sm:w-[92vw] sm:w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-3 text-xs"
        :class="lastRoll.isNat20 ? 'ring-2 ring-amber-400' : (lastRoll.isNat1 ? 'ring-2 ring-red-400' : '')"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-bold uppercase">ROLL</span>
            <span class="font-bold text-gray-900 text-xs truncate max-w-[170px]">{{ lastRoll.label }}</span>
          </div>
          <button
            type="button"
            @click="lastRoll = null"
            class="text-gray-400 hover:text-gray-700 text-sm font-bold leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div class="flex items-baseline justify-between mt-2 pt-1.5 border-t border-gray-100">
          <div>
            <div class="text-2xl font-bold text-gray-900 leading-none">{{ lastRoll.total }}</div>
            <div class="text-[11px] text-gray-500 font-mono mt-0.5">{{ lastRoll.breakdown || lastRoll.formula }}</div>
          </div>
          <div>
            <span v-if="lastRoll.isNat20" class="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded uppercase">Natural 20</span>
            <span v-else-if="lastRoll.isNat1" class="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded uppercase">Critical Miss</span>
            <span v-else class="text-[10px] text-gray-400 font-mono">{{ lastRoll.timestamp }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- Campaign Modal -->
    <div v-if="showCampaignModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3.5">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Campaign Settings</span>
          <button type="button" @click="showCampaignModal = false" class="text-gray-400 hover:text-gray-700 font-bold leading-none cursor-pointer">×</button>
        </div>

        <!-- Currently Linked to a Campaign -->
        <div v-if="activeCampaignId" class="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-gray-400">Linked Campaign</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Active</span>
          </div>
          <div class="text-sm font-bold text-gray-900">{{ campaignName || char.campaign_name }}</div>
          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              @click="goToCampaignRoom"
              class="flex-1 py-1.5 px-3 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer transition shadow-xs text-center"
            >
              Open Campaign Room
            </button>
            <button
              type="button"
              @click="unlinkCharacterFromCampaign"
              class="py-1.5 px-2.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer transition shadow-xs"
            >
              Unlink
            </button>
          </div>
        </div>

        <!-- Not linked or switch campaign -->
        <div v-else class="space-y-3">
          <div v-if="userCampaigns.length > 0" class="space-y-1.5">
            <label class="block text-xs font-semibold text-gray-700">Link to Existing Campaign</label>
            <div class="flex items-center gap-1.5">
              <select
                v-model="selectedLinkCampaignId"
                class="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              >
                <option value="">Select a Campaign...</option>
                <option v-for="c in userCampaigns" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.is_dm ? 'DM' : 'Player' }})
                </option>
              </select>
              <button
                type="button"
                @click="linkCharacterToCampaign"
                :disabled="!selectedLinkCampaignId || isLinkingCampaign"
                class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition shrink-0"
              >
                Link
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Custom Campaign Name</label>
            <input
              type="text"
              v-model="campaignInput"
              @keydown.enter="saveCampaign"
              placeholder="e.g. Curse of Strahd"
              class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div class="pt-1">
            <button
              type="button"
              @click="goToCampaignRoom"
              class="w-full py-2 px-3 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <span>Go to Campaigns Menu</span>
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            @click="showCampaignModal = false"
            class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="saveCampaign"
            class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Short Rest Modal -->
    <div v-if="showShortRestModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Short Rest</span>
          <button type="button" @click="completeShortRest" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <p class="text-xs text-gray-600">
          Spend Hit Dice to recover Hit Points. You regain 1d{{ hitDieFaces }} + CON modifier ({{ conMod >= 0 ? '+' : '' }}{{ conMod }}) per die rolled.
        </p>

        <div class="bg-gray-50 border border-gray-200 rounded p-3 flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase font-bold text-gray-500">Current HP</div>
            <div class="text-lg font-bold text-gray-900">{{ currentHp }} <span class="text-xs font-normal text-gray-500">/ {{ maxHp }}</span></div>
          </div>
          <div class="text-right">
            <div class="text-[10px] uppercase font-bold text-gray-500">Available Hit Dice</div>
            <div class="text-lg font-bold text-gray-900 font-mono">{{ remainingHitDice }} <span class="text-xs font-normal text-gray-500">/ {{ maxHitDiceCount }}d{{ hitDieFaces }}</span></div>
          </div>
        </div>

        <div v-if="shortRestRollResult" class="p-2.5 bg-gray-100 border border-gray-300 rounded text-xs space-y-1">
          <div class="font-bold text-gray-900">Hit Die Spent: +{{ shortRestRollResult.healed }} HP recovered!</div>
          <div class="text-gray-700 font-mono text-[11px]">
            Rolled {{ shortRestRollResult.roll }} on d{{ shortRestRollResult.die }} {{ shortRestRollResult.mod >= 0 ? '+' : '' }}{{ shortRestRollResult.mod }} (CON) = {{ shortRestRollResult.total }}
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button
            type="button"
            @click="rollHitDie"
            :disabled="remainingHitDice <= 0 || currentHp >= maxHp"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition"
          >
            Roll 1 Hit Die
          </button>
          <button
            type="button"
            @click="completeShortRest"
            class="px-3.5 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow-xs"
          >
            Finish Short Rest
          </button>
        </div>
      </div>
    </div>

    <!-- Long Rest Modal -->
    <div v-if="showLongRestModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Long Rest</h3>
          <button
            type="button"
            @click="showLongRestModal = false"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Flavor / Description -->
        <p class="text-xs text-gray-600 leading-relaxed">
          A long rest is a period of extended downtime, at least 8 hours long, during which a character sleeps for at least 6 hours and performs no more than 2 hours of light activity, such as reading, talking, eating, or standing watch.
        </p>

        <!-- Hit Dice Recovery Rule Selection -->
        <div class="space-y-2 pt-1">
          <label
            class="flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition"
            :class="longRestRule === '5e' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900/10' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="radio"
              name="longRestRule"
              value="5e"
              v-model="longRestRule"
              class="mt-0.5 text-gray-900 accent-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <div class="text-xs">
              <span class="font-bold text-gray-900 block">Recover 1/2 Hit Dice</span>
              <span class="text-gray-500 text-[11px]">Use 5e Rules (2014)</span>
            </div>
          </label>

          <label
            class="flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition"
            :class="longRestRule === '5.5e' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900/10' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="radio"
              name="longRestRule"
              value="5.5e"
              v-model="longRestRule"
              class="mt-0.5 text-gray-900 accent-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <div class="text-xs">
              <span class="font-bold text-gray-900 block">Recover all Hit Dice</span>
              <span class="text-gray-500 text-[11px]">Use 5.5e Rules (2024)</span>
            </div>
          </label>
        </div>

        <!-- RECOVER Summary Box -->
        <div class="border-t border-b border-gray-200 py-3">
          <span class="text-[10px] font-black uppercase text-gray-900 tracking-wider block mb-1">RECOVER</span>
          <p class="text-xs text-gray-800 font-medium">
            {{ recoverSummaryText }}
          </p>
        </div>

        <!-- Reset Maximum HP checkbox -->
        <div class="pt-0.5">
          <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
            <input
              type="checkbox"
              v-model="resetMaxHpOnRest"
              class="rounded text-gray-900 accent-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer"
            />
            <span>Reset Maximum HP changes during this rest</span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="longRestRule = char?.edition === '2024' ? '5.5e' : '5e'; resetMaxHpOnRest = true"
            class="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
          >
            Reset defaults
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="showLongRestModal = false"
              class="px-3.5 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="executeLongRest"
              class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition shadow-xs"
            >
              Take Long Rest
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- HP Management Modal -->
    <div v-if="showHpModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Hit Points</h3>
          <button
            type="button"
            @click="closeHpModal"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- 3 Boxes: Current / Max / Temp -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <!-- Current HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">CURRENT</span>
            <input
              type="number"
              min="0"
              :max="previewMaxHp"
              v-model.number="currentHp"
              class="w-full text-center text-lg font-black text-gray-900 bg-white border border-gray-300 rounded mt-1 py-0.5 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <!-- Max HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center justify-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">MAX</span>
            <span class="text-lg font-black text-gray-900 mt-1 py-0.5">{{ previewMaxHp }}</span>
          </div>

          <!-- Temp HP Box -->
          <div class="border border-gray-300 rounded p-2 bg-gray-50/50 flex flex-col items-center">
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">TEMP</span>
            <input
              type="number"
              min="0"
              v-model.number="tempHp"
              placeholder="0"
              class="w-full text-center text-lg font-black text-gray-900 bg-white border border-gray-300 rounded mt-1 py-0.5 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <!-- Heal & Damage Calculator Grid -->
        <div class="border border-gray-200 rounded-lg p-3 bg-gray-50/80">
          <div class="grid grid-cols-3 gap-2 items-center text-center">
            <!-- HEAL Section -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">HEALING</span>
              <div class="flex items-center gap-1 w-full justify-center">
                <input
                  type="number"
                  min="0"
                  v-model.number="healModalInput"
                  placeholder="0"
                  class="w-16 bg-white border border-gray-300 rounded text-center text-sm font-bold py-1 text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  @click="applyModalHeal"
                  class="w-7 h-7 bg-gray-900 hover:bg-black text-white font-bold rounded flex items-center justify-center text-sm cursor-pointer shadow-xs transition"
                  title="Apply Healing"
                >
                  +
                </button>
              </div>
            </div>

            <!-- NEW HP Preview Box -->
            <div class="flex flex-col items-center justify-center border-x border-gray-200 px-2">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">NEW HP</span>
              <span class="text-2xl font-black text-gray-900 my-0.5">{{ newHpPreview }}</span>
              <span class="text-[10px] text-gray-500">Preview</span>
            </div>

            <!-- DAMAGE Section -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">DAMAGE</span>
              <div class="flex items-center gap-1 w-full justify-center">
                <input
                  type="number"
                  min="0"
                  v-model.number="damageModalInput"
                  placeholder="0"
                  class="w-16 bg-white border border-gray-300 rounded text-center text-sm font-bold py-1 text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  @click="applyModalDamage"
                  class="w-7 h-7 bg-gray-900 hover:bg-black text-white font-bold rounded flex items-center justify-center text-sm cursor-pointer shadow-xs transition"
                  title="Apply Damage"
                >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Max HP Modifier & Override Max HP Fields -->
        <div class="space-y-3 pt-1">
          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex-1">
              <span class="font-bold text-gray-800 block text-[11px] uppercase tracking-wide">MAX HP MODIFIER</span>
              <span class="text-gray-500 text-[10px]">Adjusts maximum hit points by this amount.</span>
            </div>
            <input
              type="number"
              v-model="maxHpModifierInput"
              placeholder="--"
              class="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-center text-xs font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex-1">
              <span class="font-bold text-gray-800 block text-[11px] uppercase tracking-wide">OVERRIDE MAX HP</span>
              <span class="text-gray-500 text-[10px]">Overrides base hit points calculation.</span>
            </div>
            <input
              type="number"
              v-model="overrideMaxHpInput"
              placeholder="--"
              class="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-center text-xs font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="closeHpModal"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>

    <!-- Armor Class Modal -->
    <div v-if="showAcModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <div class="flex items-baseline gap-2">
            <h3 class="text-base font-bold text-gray-900 tracking-tight">Armor Class</h3>
            <span class="text-xl font-black text-gray-900 leading-none">{{ currentArmorClass }}</span>
          </div>
          <button
            type="button"
            @click="closeAcModal"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- AC Breakdown -->
        <div class="space-y-1.5 bg-gray-50 border border-gray-200 rounded p-3 text-xs">
          <div class="font-bold text-gray-700 uppercase text-[10px] tracking-wider mb-1">Base AC Breakdown</div>
          <div class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.baseArmorValue }} Armor ({{ acBreakdown.armorName }})</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.baseArmorValue }}</span>
          </div>
          <div class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.dexBonus >= 0 ? '+' : '' }}{{ acBreakdown.dexBonus }} {{ acBreakdown.dexBonusLabel }}</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.dexBonus >= 0 ? '+' : '' }}{{ acBreakdown.dexBonus }}</span>
          </div>
          <div v-if="acBreakdown.hasShield" class="flex justify-between items-center text-gray-800">
            <span>+2 Shield</span>
            <span class="font-bold text-gray-900">+2</span>
          </div>
          <div v-if="acBreakdown.magicBonus !== 0" class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.magicBonus > 0 ? '+' : '' }}{{ acBreakdown.magicBonus }} Magic Bonus</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.magicBonus > 0 ? '+' : '' }}{{ acBreakdown.magicBonus }}</span>
          </div>
          <div v-if="acBreakdown.miscBonus !== 0" class="flex justify-between items-center text-gray-800">
            <span>{{ acBreakdown.miscBonus > 0 ? '+' : '' }}{{ acBreakdown.miscBonus }} Misc Bonus</span>
            <span class="font-bold text-gray-900">{{ acBreakdown.miscBonus > 0 ? '+' : '' }}{{ acBreakdown.miscBonus }}</span>
          </div>
          <div v-if="acBreakdown.overrideAc !== null" class="pt-1.5 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
            <span>Total Overridden</span>
            <span class="font-black text-gray-900">{{ acBreakdown.overrideAc }}</span>
          </div>
        </div>

        <!-- Collapsible Customize Section -->
        <div class="border border-gray-200 rounded overflow-hidden">
          <button
            type="button"
            @click="isAcCustomizeOpen = !isAcCustomizeOpen"
            class="w-full flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200/70 text-xs font-bold text-gray-800 cursor-pointer transition select-none"
          >
            <span>Customize</span>
            <component :is="isAcCustomizeOpen ? IconChevronUp : IconChevronDown" class="w-4 h-4 text-gray-600" />
          </button>

          <div v-if="isAcCustomizeOpen" class="p-3 space-y-3 bg-white text-xs">
            <!-- 1. Override AC -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">OVERRIDE AC</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model="acCustom.override_ac"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_override_ac"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 2. Override Base Armor + DEX -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">OVERRIDE BASE ARMOR + DEX</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model="acCustom.override_base"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_override_base"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 3. Additional Magic Bonus -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">ADDITIONAL MAGIC BONUS</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model.number="acCustom.magic_bonus"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_magic"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <!-- 4. Additional Misc Bonus -->
            <div class="space-y-1">
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider">ADDITIONAL MISC BONUS</label>
              <div class="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  v-model.number="acCustom.misc_bonus"
                  placeholder="--"
                  class="col-span-1 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <input
                  type="text"
                  v-model="acCustom.notes_misc"
                  placeholder="Enter Source Notes..."
                  class="col-span-3 bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="closeAcModal"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded cursor-pointer transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>

    <!-- Speed & Movement Modal -->
    <div v-if="showSpeedModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md w-full p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900 tracking-tight">Speed & Movement</h3>
          <button
            type="button"
            @click="cancelSpeedModal"
            class="text-gray-400 hover:text-gray-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Speeds Grid -->
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Walking Speed</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.walk"
                  class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Flying Speed</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.fly"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Swimming</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.swim"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Climbing</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.climb"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Burrowing</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  v-model.number="customSpeeds.burrow"
                  placeholder="0"
                  class="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-center font-bold text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <span class="text-gray-500 font-semibold text-xs">ft</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Movement Notes</label>
            <textarea
              v-model="customSpeeds.notes"
              rows="2"
              placeholder="e.g. Hover, Mobile feat +10ft, difficult terrain ignores..."
              class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="cancelSpeedModal"
            class="px-3.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="closeSpeedModal"
            class="bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded cursor-pointer transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Add Defense Modal -->
    <div v-if="showAddDefenseModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Add Defense</span>
          <button type="button" @click="showAddDefenseModal = false" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Defense Type</label>
          <select
            v-model="newDefenseType"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
          >
            <option value="resistances">Resistance (Half damage)</option>
            <option value="immunities">Immunity (No damage)</option>
            <option value="vulnerabilities">Vulnerability (Double damage)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Damage Type</label>
          <select
            v-model="newDefenseDamage"
            class="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
          >
            <option v-for="d in DAMAGE_TYPES" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showAddDefenseModal = false"
            class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="addDefense"
            class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Conditions Modal -->
    <div v-if="showConditionModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Manage Active Conditions</span>
          <button type="button" @click="showConditionModal = false" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto p-1">
          <button
            v-for="cond in ALL_CONDITIONS"
            :key="cond"
            type="button"
            @click="toggleCondition(cond)"
            class="px-2 py-1.5 rounded border text-left text-xs font-medium transition cursor-pointer flex items-center justify-between"
            :class="isConditionActive(cond) ? 'bg-gray-900 border-gray-900 text-white font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'"
          >
            <span>{{ cond }}</span>
            <IconCheck v-if="isConditionActive(cond)" class="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <!-- Exhaustion Stepper & Details when active -->
        <div v-if="exhaustionLevel !== null" class="border border-gray-300 bg-gray-50 rounded p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-gray-900 uppercase tracking-wide">Exhaustion Level</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="exhaustionLevel > 1 ? setExhaustionLevel(exhaustionLevel - 1) : toggleCondition('Exhaustion')"
                class="w-6 h-6 rounded bg-gray-900 hover:bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition"
                title="Decrease Level"
              >
                -
              </button>
              <span class="font-black text-sm text-gray-900 w-16 text-center">Level {{ exhaustionLevel }}</span>
              <button
                type="button"
                @click="setExhaustionLevel(exhaustionLevel + 1)"
                :disabled="exhaustionLevel >= maxExhaustionLevel"
                class="w-6 h-6 rounded bg-gray-900 hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition"
                title="Increase Level"
              >
                +
              </button>
            </div>
          </div>
          <p class="text-[11px] text-gray-600 leading-tight">
            {{ getExhaustionDescription(exhaustionLevel) }}
          </p>
        </div>

        <div class="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            @click="showConditionModal = false"
            class="px-3.5 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Save Note Modal -->
    <div v-if="showSaveNoteModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <span class="font-bold text-gray-900 text-sm">Saving Throw Notes</span>
          <button type="button" @click="showSaveNoteModal = false" class="text-gray-400 hover:text-gray-700 font-bold">×</button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Additional Save Modifiers / Resistances</label>
          <textarea
            v-model="customSaveNoteInput"
            rows="3"
            placeholder="e.g. +2 against spells from Magic Resistance, Danger Sense on DEX saves..."
            class="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:outline-none focus:border-gray-500"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showSaveNoteModal = false"
            class="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="saveCustomSaveNote"
            class="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>

    <!-- Export / Share Modal -->
    <div v-if="showExportModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div class="flex items-center gap-2">
            <IconShare class="w-5 h-5 text-gray-800" />
            <h3 class="font-bold text-gray-900 text-sm">Export & Share Character</h3>
          </div>
          <button
            type="button"
            @click="showExportModal = false"
            class="text-gray-400 hover:text-gray-700 transition cursor-pointer p-1"
          >
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <!-- Tab Selector -->
        <div class="flex border-b border-gray-200 bg-gray-50/40 text-xs font-semibold px-4 pt-2 gap-2">
          <button
            type="button"
            @click="exportTab = 'pdf'"
            :class="exportTab === 'pdf' ? 'border-b-2 border-gray-900 text-gray-900 bg-white' : 'text-gray-500 hover:text-gray-800'"
            class="px-3 py-2 rounded-t transition cursor-pointer flex items-center gap-1.5"
          >
            <IconFileTypePdf class="w-4 h-4 text-red-600" />
            <span>Print / PDF</span>
          </button>
          <button
            type="button"
            @click="exportTab = 'link'"
            :class="exportTab === 'link' ? 'border-b-2 border-gray-900 text-gray-900 bg-white' : 'text-gray-500 hover:text-gray-800'"
            class="px-3 py-2 rounded-t transition cursor-pointer flex items-center gap-1.5"
          >
            <IconLink class="w-4 h-4 text-blue-600" />
            <span>Public Link</span>
          </button>
          <button
            type="button"
            @click="exportTab = 'avrae'"
            :class="exportTab === 'avrae' ? 'border-b-2 border-gray-900 text-gray-900 bg-white' : 'text-gray-500 hover:text-gray-800'"
            class="px-3 py-2 rounded-t transition cursor-pointer flex items-center gap-1.5"
          >
            <IconBrandDiscord class="w-4 h-4 text-indigo-600" />
            <span>Discord Avrae</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 overflow-y-auto space-y-4 text-xs">
          <!-- 1. PDF / Print Tab -->
          <div v-if="exportTab === 'pdf'" class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div class="font-bold text-gray-900 text-sm flex items-center gap-2">
                <IconPrinter class="w-4 h-4 text-gray-700" />
                <span>Print or Save as PDF</span>
              </div>
              <p class="text-xs text-gray-600 leading-relaxed">
                Generates a clean, print-optimized character sheet containing ability scores, combat stats, attacks, skills, traits, and characteristics. You can save directly as a PDF from your browser's print dialog.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                @click="printSheet"
                class="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <IconPrinter class="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
            <p class="text-[11px] text-gray-500 italic text-center">
              Tip: In the print dialog, select <b>Save as PDF</b> and ensure "Background graphics" is enabled.
            </p>
          </div>

          <!-- 2. Public Link Tab -->
          <div v-else-if="exportTab === 'link'" class="space-y-4">
            <!-- Visibility Setting Card -->
            <div
              class="p-3.5 border rounded-lg flex items-center justify-between gap-3"
              :class="isPublicChar ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="p-2 rounded-full shrink-0"
                  :class="isPublicChar ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                >
                  <IconWorld v-if="isPublicChar" class="w-4 h-4" />
                  <IconLock v-else class="w-4 h-4" />
                </span>
                <div class="min-w-0">
                  <div class="font-bold text-xs" :class="isPublicChar ? 'text-emerald-900' : 'text-amber-900'">
                    {{ isPublicChar ? 'Public Character' : 'Private Character' }}
                  </div>
                  <div class="text-[11px]" :class="isPublicChar ? 'text-emerald-700' : 'text-amber-700'">
                    {{ isPublicChar ? 'Anyone with this link can view this sheet' : 'Only you can view this sheet' }}
                  </div>
                </div>
              </div>
              <button
                v-if="!readOnly"
                type="button"
                @click="toggleVisibility"
                :disabled="isUpdatingVisibility"
                class="px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer shrink-0 disabled:opacity-50"
                :class="isPublicChar ? 'border-amber-300 bg-white hover:bg-amber-50 text-amber-800' : 'border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800'"
              >
                {{ isUpdatingVisibility ? 'Saving...' : (isPublicChar ? 'Make Private' : 'Make Public') }}
              </button>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Direct Public URL</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  readonly
                  :value="publicShareUrl"
                  class="flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none select-all"
                />
                <button
                  type="button"
                  @click="copyShareLink"
                  class="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <IconCheck v-if="copiedLink" class="w-4 h-4 text-emerald-400" />
                  <IconCopy v-else class="w-4 h-4" />
                  <span>{{ copiedLink ? 'Copied!' : 'Copy Link' }}</span>
                </button>
              </div>
              <p v-if="!isPublicChar" class="text-[11px] text-amber-700 mt-1.5 italic">
                * Note: This character is currently Private. Anyone opening this link without logging into your account will receive a private character notice.
              </p>
            </div>
          </div>

          <!-- 3. Discord Avrae Tab -->
          <div v-else-if="exportTab === 'avrae'" class="space-y-4">
            <div class="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3.5 space-y-1">
              <div class="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                <IconBrandDiscord class="w-4 h-4 text-indigo-700" />
                <span>Avrae Discord Bot Integration</span>
              </div>
              <p class="text-xs text-indigo-800 leading-relaxed">
                Export character stats, attacks, and spellbook into Avrae's character format or import combat attacks directly into your active character.
              </p>
            </div>

            <!-- Avrae Character JSON Box -->
            <div class="border border-gray-200 rounded-lg p-3.5 space-y-2.5">
              <div class="font-bold text-gray-900 text-xs">Full Character JSON</div>
              <p class="text-[11px] text-gray-600">
                Download the complete character JSON or copy the API endpoint URL for custom Avrae GVAR or bot integrations.
              </p>
              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  @click="downloadAvraeJson"
                  class="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IconDownload class="w-4 h-4" />
                  <span>Download .json</span>
                </button>
                <button
                  type="button"
                  @click="copyAvraeJson"
                  class="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IconCheck v-if="copiedAvraeJson" class="w-4 h-4 text-emerald-600" />
                  <IconCopy v-else class="w-4 h-4" />
                  <span>{{ copiedAvraeJson ? 'JSON Copied!' : 'Copy JSON' }}</span>
                </button>
                <button
                  type="button"
                  @click="copyAvraeApiUrl"
                  class="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IconCheck v-if="copiedAvraeApiUrl" class="w-4 h-4 text-emerald-600" />
                  <IconLink v-else class="w-4 h-4" />
                  <span>{{ copiedAvraeApiUrl ? 'URL Copied!' : 'Copy API URL' }}</span>
                </button>
              </div>
            </div>

            <!-- Attack Automation Macro (!a import) -->
            <div class="border border-gray-200 rounded-lg p-3.5 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="font-bold text-gray-900 text-xs">Attack Automation (<code class="font-mono text-indigo-700">!a import</code>)</div>
                <button
                  type="button"
                  @click="copyAvraeMacro"
                  class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <IconCheck v-if="copiedAvraeMacro" class="w-3.5 h-3.5 text-emerald-300" />
                  <IconCopy v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedAvraeMacro ? 'Macro Copied!' : 'Copy Command' }}</span>
                </button>
              </div>
              <p class="text-[11px] text-gray-600">
                Paste into your Discord channel to instantly register your weapon attacks with correct damage dice, bonuses, and damage types:
              </p>
              <div class="bg-gray-900 text-gray-100 p-2.5 rounded font-mono text-[10px] max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                {{ buildAvraeAttackMacro(vtt.attacks || []) || '!a import []' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            @click="showExportModal = false"
            class="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Action Feedback Toast -->
    <transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed top-5 right-5 z-50 bg-gray-900 text-white text-xs px-3.5 py-2 rounded shadow-lg flex items-center gap-2"
      >
        <IconCheck class="w-4 h-4 text-emerald-400" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

  </div>

  <!-- Dedicated Printable Character Sheet (Visible only when printing) -->
  <div class="hidden print:block printable-sheet w-full p-3 text-xs font-sans text-gray-900 bg-white">
    <!-- Header Block -->
    <div class="border-2 border-gray-800 rounded p-2.5 mb-2.5 bg-white">
      <div class="flex items-center justify-between gap-4">
        <!-- Character Name & Avatar -->
        <div class="flex items-center gap-3">
          <div v-if="resolvedImageUrl" class="w-14 h-14 rounded border border-gray-400 overflow-hidden shrink-0">
            <img :src="resolvedImageUrl" :alt="char.name" class="w-full h-full object-cover" />
          </div>
          <div>
            <input
              type="text"
              :value="char.name || 'Unnamed Character'"
              class="text-xl font-bold uppercase tracking-wide text-gray-900 leading-tight bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0"
            />
            <div class="text-[10px] text-gray-600 font-medium">Character Name</div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div class="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px] border-l border-gray-300 pl-4">
          <div>
            <input
              type="text"
              :value="classSummary"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Class & Level</div>
          </div>
          <div>
            <input
              type="text"
              :value="char.background || '—'"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Background</div>
          </div>
          <div>
            <input
              type="text"
              :value="resolvedPlayerName"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Player Name</div>
          </div>
          <div>
            <input
              type="text"
              :value="char.race?.name || (typeof char.race === 'string' ? char.race : '') || '—'"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Race</div>
          </div>
          <div>
            <input
              type="text"
              :value="parsedCharacteristics.alignment || char.alignment || '—'"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Alignment</div>
          </div>
          <div>
            <input
              type="text"
              :value="char.experience_points || '0'"
              class="font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none w-full p-0 text-[11px] leading-tight"
            />
            <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Experience Points</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Core Vitals Summary Bar -->
    <div class="grid grid-cols-6 gap-2 mb-2.5 text-center">
      <!-- Armor Class with SVG Shield -->
      <div class="flex flex-col items-center justify-center relative min-h-[54px]">
        <svg
          class="absolute inset-0 w-full h-full p-0.5"
          viewBox="0 0 100 95"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 6 5 Q 50 10 94 5 C 95 46 84 74 50 93 C 16 74 5 46 6 5 Z"
            fill="#ffffff"
            stroke="#1f2937"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <path
            d="M 12 11 Q 50 15 88 11 C 89 44 79 69 50 85 C 21 69 11 44 12 11 Z"
            fill="#f9fafb"
            stroke="#9ca3af"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
        <div class="relative z-10 flex flex-col items-center justify-center text-center px-1">
          <span class="text-[7.5px] font-black text-gray-700 uppercase tracking-wider leading-none">ARMOR CLASS</span>
          <input
            type="text"
            :value="vtt.combat?.armor_class || currentArmorClass || 10"
            class="w-10 text-center font-black text-base text-gray-900 bg-transparent border-0 focus:outline-none p-0 leading-none mt-1"
          />
        </div>
      </div>

      <!-- Initiative -->
      <div class="border border-gray-800 rounded p-1 bg-gray-50/50 flex flex-col items-center justify-center">
        <div class="text-[9px] font-bold uppercase text-gray-600 leading-none mb-1">Initiative</div>
        <input
          type="text"
          :value="(vtt.combat?.initiative >= 0 ? '+' : '') + (vtt.combat?.initiative || 0)"
          class="w-12 text-center text-base font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
        />
      </div>

      <!-- Speed -->
      <div class="border border-gray-800 rounded p-1 bg-gray-50/50 flex flex-col items-center justify-center">
        <div class="text-[9px] font-bold uppercase text-gray-600 leading-none mb-1">Speed</div>
        <div class="flex items-center justify-center text-base font-bold text-gray-900 leading-none">
          <input
            type="text"
            :value="vtt.combat?.speed || 30"
            class="w-8 text-center text-base font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
          />
          <span class="text-xs font-normal text-gray-600 ml-0.5">ft.</span>
        </div>
      </div>

      <!-- Prof Bonus -->
      <div class="border border-gray-800 rounded p-1 bg-gray-50/50 flex flex-col items-center justify-center">
        <div class="text-[9px] font-bold uppercase text-gray-600 leading-none mb-1">Prof. Bonus</div>
        <input
          type="text"
          :value="'+' + (vtt.proficiency_bonus || 2)"
          class="w-10 text-center text-base font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
        />
      </div>

      <!-- Hit Points -->
      <div class="border border-gray-800 rounded p-1 bg-gray-50/50 col-span-2 flex flex-col items-center justify-center">
        <div class="text-[9px] font-bold uppercase text-gray-600 leading-none mb-1">Hit Points (Current / Max)</div>
        <div class="flex items-center justify-center gap-1 text-base font-bold text-gray-900 leading-none">
          <input
            type="text"
            :value="char.hp != null ? char.hp : (vtt.combat?.hp?.max || 10)"
            class="w-9 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
          />
          <span class="text-gray-400">/</span>
          <input
            type="text"
            :value="vtt.combat?.hp?.max || 10"
            class="w-9 text-center font-bold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none"
          />
          <span class="text-[10px] font-normal text-gray-500 ml-1.5">Temp:</span>
          <input
            type="text"
            :value="char.temp_hp || 0"
            class="w-7 text-center text-xs font-semibold bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 leading-none text-gray-700"
          />
        </div>
      </div>
    </div>

    <!-- 3-Column Sheet Layout -->
    <div class="grid grid-cols-12 gap-2.5 mb-2.5">
      <!-- Left Column: Abilities & Saves, Senses, Proficiencies (span 4) -->
      <div class="col-span-4 space-y-2">
        <!-- Ability Scores & Saving Throws -->
        <div class="border border-gray-800 rounded p-2 break-inside-avoid">
          <div class="text-[10px] font-bold uppercase border-b border-gray-300 pb-1 mb-1.5 text-gray-800 tracking-wider">Abilities & Saving Throws</div>
          <div class="space-y-1">
            <div
              v-for="ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']"
              :key="ability"
              class="flex items-center justify-between p-1 border border-gray-200 rounded text-[11px]"
            >
              <div class="w-12 flex items-center">
                <span class="font-bold uppercase text-[10px] text-gray-700">{{ ability.slice(0, 3) }}</span>
                <input
                  type="text"
                  :value="vtt.abilities?.[ability]?.score || 10"
                  class="w-6 text-center text-xs font-semibold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 ml-1"
                />
              </div>
              <div class="font-bold text-xs px-1 py-0.5 rounded bg-gray-100 border border-gray-300">
                <input
                  type="text"
                  :value="(vtt.abilities?.[ability]?.modifier >= 0 ? '+' : '') + (vtt.abilities?.[ability]?.modifier || 0)"
                  class="w-7 text-center font-bold text-xs text-gray-900 bg-transparent border-0 focus:outline-none p-0"
                />
              </div>
              <div class="text-right text-[10px] flex items-center gap-1">
                <span class="text-gray-500 text-[9px]">SAVE</span>
                <span :class="vtt.saving_throws?.[ability]?.proficient ? 'font-bold text-gray-900' : 'text-gray-600'">
                  {{ vtt.saving_throws?.[ability]?.proficient ? '●' : '○' }}
                </span>
                <input
                  type="text"
                  :value="vtt.saving_throws?.[ability]?.modifier_string || '+0'"
                  class="w-6 text-right text-[10px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
                  :class="vtt.saving_throws?.[ability]?.proficient ? 'font-bold text-gray-900' : 'text-gray-600'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Passive Senses -->
        <div class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
          <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1 tracking-wider text-gray-800">Passive Senses</div>
          <div class="space-y-0.5">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Passive Perception (WIS)</span>
              <input
                type="text"
                :value="vtt.senses?.passive_perception || 10"
                class="w-6 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[10px]"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Passive Investigation (INT)</span>
              <input
                type="text"
                :value="vtt.senses?.passive_investigation || 10"
                class="w-6 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[10px]"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Passive Insight (WIS)</span>
              <input
                type="text"
                :value="vtt.senses?.passive_insight || 10"
                class="w-6 text-right font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[10px]"
              />
            </div>
          </div>
        </div>

        <!-- Proficiencies & Languages -->
        <div class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
          <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1 tracking-wider text-gray-800">Proficiencies & Languages</div>
          <div v-if="char.language?.length" class="mb-1.5">
            <span class="font-bold text-gray-700">Languages: </span>
            <span class="text-gray-600">{{ char.language.map(l => l.name).join(', ') }}</span>
          </div>
          <div v-if="char.proficiency?.length">
            <span class="font-bold text-gray-700">Proficiencies: </span>
            <span class="text-gray-600">{{ char.proficiency.map(p => cleanProficiencyName(p.name)).join(', ') }}</span>
          </div>
        </div>
      </div>

      <!-- Middle Column: Attacks, Spellcasting, Equipment & Currency (span 4) -->
      <div class="col-span-4 space-y-2">
        <!-- Attacks & Weapons -->
        <div class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
          <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1.5 tracking-wider text-gray-800">Attacks & Spellcasting</div>
          
          <!-- Spellcasting overview if caster -->
          <div v-if="isCaster" class="grid grid-cols-3 gap-1 mb-2 p-1.5 bg-gray-50 border border-gray-200 rounded text-center">
            <div>
              <div class="text-[8px] uppercase text-gray-500 font-bold">Ability</div>
              <div class="font-bold text-gray-900 uppercase text-[10px]">{{ (vtt.spellcasting?.ability || 'INT').slice(0, 3) }}</div>
            </div>
            <div>
              <div class="text-[8px] uppercase text-gray-500 font-bold">Save DC</div>
              <input
                type="text"
                :value="charSpellSaveDc"
                class="w-6 text-center font-bold text-gray-900 text-[10px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
              />
            </div>
            <div>
              <div class="text-[8px] uppercase text-gray-500 font-bold">Atk Bonus</div>
              <input
                type="text"
                :value="'+' + charSpellAttackBonus"
                class="w-6 text-center font-bold text-gray-900 text-[10px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
              />
            </div>
          </div>

          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-200 text-[8px] uppercase text-gray-500 font-bold">
                <th class="pb-1">Name</th>
                <th class="pb-1 text-center">Atk</th>
                <th class="pb-1 text-right">Damage / Type</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="atk in (vtt.attacks || [])" :key="atk.name" class="text-[10px]">
                <td class="py-1 font-semibold text-gray-900 truncate max-w-[85px]">{{ atk.name }}</td>
                <td class="py-1 text-center font-bold text-gray-800">
                  <input
                    type="text"
                    :value="(atk.attack_bonus >= 0 ? '+' : '') + atk.attack_bonus"
                    class="w-7 text-center font-bold text-gray-800 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[10px]"
                  />
                </td>
                <td class="py-1 text-right text-gray-700">
                  <input
                    type="text"
                    :value="atk.damage_roll + ' ' + (atk.damage_type || '')"
                    class="w-20 text-right text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[10px]"
                  />
                </td>
              </tr>
              <tr v-if="!vtt.attacks || vtt.attacks.length === 0" class="text-[10px] text-gray-400 italic">
                <td colspan="3" class="py-1">No equipped weapons</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Equipment & Coins -->
        <div class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
          <div class="flex justify-between items-center border-b border-gray-300 pb-1 mb-1.5">
            <span class="font-bold uppercase tracking-wider text-gray-800">Equipment & Coins</span>
          </div>

          <!-- Coin purse (Uses reactive currency state with editable inputs) -->
          <div class="grid grid-cols-5 gap-1 mb-2 text-center text-[9px] font-bold">
            <div class="border border-gray-200 rounded p-1 bg-amber-50/50 flex items-center justify-center gap-0.5">
              <span>CP:</span>
              <input type="text" :value="currency.cp ?? char.treasure?.cp ?? 0" class="w-6 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[9px]" />
            </div>
            <div class="border border-gray-200 rounded p-1 bg-gray-50 flex items-center justify-center gap-0.5">
              <span>SP:</span>
              <input type="text" :value="currency.sp ?? char.treasure?.sp ?? 0" class="w-6 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[9px]" />
            </div>
            <div class="border border-gray-200 rounded p-1 bg-blue-50/50 flex items-center justify-center gap-0.5">
              <span>EP:</span>
              <input type="text" :value="currency.ep ?? char.treasure?.ep ?? 0" class="w-6 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[9px]" />
            </div>
            <div class="border border-gray-200 rounded p-1 bg-yellow-50 flex items-center justify-center gap-0.5">
              <span>GP:</span>
              <input type="text" :value="currency.gp ?? char.treasure?.gp ?? 0" class="w-6 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[9px]" />
            </div>
            <div class="border border-gray-200 rounded p-1 bg-purple-50/50 flex items-center justify-center gap-0.5">
              <span>PP:</span>
              <input type="text" :value="currency.pp ?? char.treasure?.pp ?? 0" class="w-6 text-center font-bold bg-transparent border-0 focus:outline-none p-0 text-[9px]" />
            </div>
          </div>

          <div class="max-h-56 overflow-hidden space-y-0.5">
            <div
              v-for="eq in (liveEquipment || []).slice(0, 15)"
              :key="eq.id || eq.name"
              class="flex justify-between text-[10px] text-gray-700 border-b border-gray-50 py-0.5"
            >
              <span class="truncate max-w-[140px]">{{ eq.name }} <span v-if="eq.quantity > 1">({{ eq.quantity }}x)</span></span>
              <span class="text-gray-400 text-[9px] shrink-0">{{ eq.weight ? eq.weight + ' lb' : '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Skills & Characteristics (span 4) -->
      <div class="col-span-4 space-y-2">
        <!-- Skills List -->
        <div class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
          <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1 tracking-wider text-gray-800">Skills</div>
          <div class="space-y-0.5">
            <div
              v-for="(sData, sKey) in computedSkills"
              :key="sKey"
              class="flex items-center justify-between py-0.5 text-[10px]"
            >
              <div class="flex items-center gap-1 truncate max-w-[140px]">
                <span class="text-[9px] font-mono text-gray-800 w-3 text-center">
                  {{ sData.expertise ? '★' : (sData.proficient ? '●' : '○') }}
                </span>
                <span :class="sData.proficient ? 'font-bold text-gray-900' : 'text-gray-700'" class="capitalize truncate">
                  {{ sKey.replace(/_/g, ' ') }}
                </span>
                <span class="text-[8px] text-gray-400 uppercase font-semibold">({{ sData.ability.slice(0, 3) }})</span>
              </div>
              <input
                type="text"
                :value="(sData.total >= 0 ? '+' : '') + sData.total"
                class="w-6 text-right text-[10px] bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0"
                :class="sData.proficient ? 'font-bold text-gray-900' : 'text-gray-600'"
              />
            </div>
          </div>
        </div>

        <!-- Personality & Characteristics -->
        <div class="border border-gray-800 rounded p-2 text-[10px] space-y-1.5 break-inside-avoid">
          <div class="font-bold uppercase border-b border-gray-300 pb-1 tracking-wider text-gray-800">Characteristics</div>
          
          <!-- Details Grid -->
          <div class="grid grid-cols-3 gap-1 text-[9px] text-gray-600 border-b border-gray-100 pb-1.5">
            <div>
              <span class="font-bold text-gray-800">Gender: </span>
              <input type="text" :value="parsedCharacteristics.gender || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Age: </span>
              <input type="text" :value="parsedCharacteristics.age || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Size: </span>
              <input type="text" :value="parsedCharacteristics.size || 'Medium'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Height: </span>
              <input type="text" :value="parsedCharacteristics.height || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Weight: </span>
              <input type="text" :value="parsedCharacteristics.weight || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Faith: </span>
              <input type="text" :value="parsedCharacteristics.faith || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Eyes: </span>
              <input type="text" :value="parsedCharacteristics.eyes || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Skin: </span>
              <input type="text" :value="parsedCharacteristics.skin || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
            <div>
              <span class="font-bold text-gray-800">Hair: </span>
              <input type="text" :value="parsedCharacteristics.hair || '—'" class="w-10 font-medium text-gray-700 bg-transparent border-0 border-b border-gray-200 focus:outline-none p-0 text-[9px]" />
            </div>
          </div>

          <div v-if="parsedCharacteristics.personalityTraits?.length" class="text-[9px]">
            <div class="font-bold text-gray-800 uppercase text-[8px]">Personality Traits</div>
            <p class="text-gray-600 italic leading-snug">{{ parsedCharacteristics.personalityTraits.join(' ') }}</p>
          </div>

          <div v-if="parsedCharacteristics.ideals?.length" class="text-[9px]">
            <div class="font-bold text-gray-800 uppercase text-[8px]">Ideals</div>
            <p class="text-gray-600 italic leading-snug">{{ parsedCharacteristics.ideals.join(' ') }}</p>
          </div>

          <div v-if="parsedCharacteristics.bonds?.length" class="text-[9px]">
            <div class="font-bold text-gray-800 uppercase text-[8px]">Bonds</div>
            <p class="text-gray-600 italic leading-snug">{{ parsedCharacteristics.bonds.join(' ') }}</p>
          </div>

          <div v-if="parsedCharacteristics.flaws?.length" class="text-[9px]">
            <div class="font-bold text-gray-800 uppercase text-[8px]">Flaws</div>
            <p class="text-gray-600 italic leading-snug">{{ parsedCharacteristics.flaws.join(' ') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features, Traits, Spells Section (Natural flowing section to avoid awkward empty space on page 1) -->
    <div class="space-y-2 mt-2 pt-2 border-t border-gray-300">
      <!-- Features & Traits -->
      <div class="border border-gray-800 rounded p-2 text-[10px]">
        <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1.5 tracking-wider text-gray-800">Features & Traits</div>
        <div class="grid grid-cols-2 gap-3">
          <!-- Class & Subclass Features -->
          <div>
            <h4 class="font-bold text-gray-900 text-[10px] mb-1">Class Features</h4>
            <div class="space-y-1">
              <div v-for="cf in (filteredClassFeatures || [])" :key="cf.name" class="break-inside-avoid border-b border-gray-100 pb-0.5">
                <span class="font-semibold text-gray-900">{{ cf.name }}</span>
                <span v-if="cf.level" class="text-[9px] text-gray-500 ml-1">(Lvl {{ cf.level }})</span>
              </div>
              <div v-for="scf in (filteredSubClassFeatures || [])" :key="scf.name" class="break-inside-avoid border-b border-gray-100 pb-0.5">
                <span class="font-semibold text-gray-900">{{ scf.name }}</span>
                <span v-if="scf.level" class="text-[9px] text-gray-500 ml-1">(Lvl {{ scf.level }})</span>
              </div>
            </div>
          </div>

          <!-- Racial Traits & Feats -->
          <div>
            <h4 class="font-bold text-gray-900 text-[10px] mb-1">Racial Traits & Feats</h4>
            <div class="space-y-1">
              <div v-for="tr in (char.trait || [])" :key="tr.name" class="break-inside-avoid border-b border-gray-100 pb-0.5">
                <span class="font-semibold text-gray-900">{{ tr.name }}</span>
              </div>
              <div v-for="ft in (char.feat || [])" :key="ft.name" class="break-inside-avoid border-b border-gray-100 pb-0.5">
                <span class="font-semibold text-gray-900">{{ ft.name }}</span>
                <span class="text-[9px] text-gray-500 ml-1">(Feat)</span>
              </div>
              <div v-for="bf in (char.feature || [])" :key="bf.name" class="break-inside-avoid border-b border-gray-100 pb-0.5">
                <span class="font-semibold text-gray-900">{{ bf.name }}</span>
                <span class="text-[9px] text-gray-500 ml-1">(Background)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spells Section (if caster or has spells) -->
      <div v-if="charSpells?.length" class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
        <div class="flex justify-between items-center border-b border-gray-300 pb-1 mb-1.5">
          <span class="font-bold uppercase tracking-wider text-gray-800">Spells Known & Prepared</span>
          <span class="text-[9px] text-gray-600">DC {{ charSpellSaveDc }} &bull; Atk +{{ charSpellAttackBonus }}</span>
        </div>

        <!-- Cantrips -->
        <div v-if="sheetCantrips?.length" class="mb-2">
          <div class="font-bold text-gray-800 text-[9px] uppercase mb-1">Cantrips</div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="s in sheetCantrips"
              :key="s.name"
              class="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-800 font-medium"
            >
              {{ s.name }}
            </span>
          </div>
        </div>

        <!-- Leveled Spells -->
        <div v-if="sheetLeveledSpells?.length" class="space-y-1.5">
          <div v-for="lvl in activeSpellsByLevel" :key="lvl" class="border-t border-gray-100 pt-1">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-gray-800 text-[9px] uppercase">Level {{ lvl }} Spells</span>
              <div class="flex items-center gap-1 text-[9px] text-gray-500">
                <span>Slots:</span>
                <input
                  type="text"
                  :value="getMaxSlots(lvl)"
                  class="w-5 text-center font-bold text-gray-800 bg-transparent border-0 border-b border-gray-300 focus:outline-none p-0 text-[9px]"
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="s in getSpellsAtLevel(lvl)"
                :key="s.name"
                class="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-800 font-medium"
              >
                {{ s.name }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance & Backstory -->
      <div v-if="parsedCharacteristics.appearance || sheetNotes.backstory" class="border border-gray-800 rounded p-2 text-[10px] break-inside-avoid">
        <div class="font-bold uppercase border-b border-gray-300 pb-1 mb-1 tracking-wider text-gray-800">Appearance & Backstory</div>
        <div v-if="parsedCharacteristics.appearance" class="mb-1.5">
          <div class="font-semibold text-gray-800 text-[9px] uppercase mb-0.5">Physical Appearance</div>
          <p class="text-gray-600 leading-relaxed whitespace-pre-wrap text-[10px]">{{ parsedCharacteristics.appearance }}</p>
        </div>
        <div v-if="sheetNotes.backstory">
          <div class="font-semibold text-gray-800 text-[9px] uppercase mb-0.5">Backstory</div>
          <p class="text-gray-600 leading-relaxed whitespace-pre-wrap text-[10px]">{{ sheetNotes.backstory }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media print {
  @page {
    size: A4 portrait;
    margin: 5mm 6mm;
  }
  body, html {
    background: white !important;
    color: #111827 !important;
    font-size: 11px !important;
  }
  .printable-sheet {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    background: white !important;
    color: #111827 !important;
  }
  .break-inside-avoid {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  input {
    border-color: #cbd5e1 !important;
    color: #111827 !important;
    -moz-appearance: textfield;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}
</style>
