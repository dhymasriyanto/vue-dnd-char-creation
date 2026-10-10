<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
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
import { parseRawEntries, unpackFeatureList } from '../utils/featureUnpacker'
import { useConfig } from '../config'
import { useCompendiumNav } from '../composables/useCompendiumNav'
import { useVttClassTable } from '../composables/vtt/useVttClassTable'
import { useVttSkills } from '../composables/vtt/useVttSkills'
import { useVttEquipment } from '../composables/vtt/useVttEquipment'
import { useVttVitals } from '../composables/vtt/useVttVitals'
import { useVttRest } from '../composables/vtt/useVttRest'
import { useVttSpells } from '../composables/vtt/useVttSpells'
import { useVttClassResources } from '../composables/vtt/useVttClassResources'
import { useVttDefensesConditions } from '../composables/vtt/useVttDefensesConditions'
import { useVttDice } from '../composables/vtt/useVttDice'
import { useVttFeatures } from '../composables/vtt/useVttFeatures'
import { useVttCombatActions } from '../composables/vtt/useVttCombatActions'
import VttPrintableSheet from './vtt/VttPrintableSheet.vue'
import VttExportModal from './vtt/modals/VttExportModal.vue'
import VttRestModals from './vtt/modals/VttRestModals.vue'
import VttCombatModals from './vtt/modals/VttCombatModals.vue'
import VttCampaignModal from './vtt/modals/VttCampaignModal.vue'
import VttCustomModals from './vtt/modals/VttCustomModals.vue'
import CompendiumItemPickerModal from './CompendiumItemPickerModal.vue'
import VttSkillsTab from './vtt/tabs/VttSkillsTab.vue'
import VttFeaturesTab from './vtt/tabs/VttFeaturesTab.vue'
import VttClassTableTab from './vtt/tabs/VttClassTableTab.vue'
import VttCharacteristicsTab from './vtt/tabs/VttCharacteristicsTab.vue'
import VttBackgroundTab from './vtt/tabs/VttBackgroundTab.vue'
import VttHistoryTab from './vtt/tabs/VttHistoryTab.vue'
import VttDiceTray from './vtt/VttDiceTray.vue'
import VttSpellsTab from './vtt/tabs/VttSpellsTab.vue'
import VttEquipmentTab from './vtt/tabs/VttEquipmentTab.vue'
import VttActionsTab from './vtt/tabs/VttActionsTab.vue'
import VttHeader from './vtt/VttHeader.vue'
import VttVitalsBar from './vtt/VttVitalsBar.vue'
import VttAbilityScoresGrid from './vtt/VttAbilityScoresGrid.vue'
import VttDefensesConditions from './vtt/VttDefensesConditions.vue'
import VttNavTabs from './vtt/VttNavTabs.vue'
import { WEAPON_DEFINITIONS } from '../constants/weaponConstants'
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
  IconLock,
  IconTrash,
  IconEye
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
  if (isReadOnly.value) return
  if (isUploadingAvatar.value) return
  avatarFileInput.value?.click()
}

const handleAvatarFileChange = async (event) => {
  if (isReadOnly.value) return
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
  if (isReadOnly.value) return
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

const charClassName = computed(() => {
  const cObj = Array.isArray(char.value.class) ? char.value.class[0] : char.value.class
  return (cObj?.name || '').toLowerCase()
})

const charSubClassName = computed(() => {
  const scObj = Array.isArray(char.value.sub_class) ? char.value.sub_class[0] : char.value.sub_class
  return (scObj?.name || scObj?.short_name || '').toLowerCase()
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

const { user, isAuthenticated } = useAuth()

const isReadOnly = computed(() => {
  return Boolean(
    props.readOnly ||
    !isAuthenticated.value ||
    (char.value?.user_id && user.value?.id !== char.value.user_id)
  )
})

// --- Interactive Equipment, Inventory & Currency ---
const {
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
} = useVttEquipment({
  char,
  vtt,
  isReadOnly,
  API_URL,
  currentArmorClass: () => currentArmorClass.value
})

// --- Combat Vitals, HP, AC & Speed ---
const {
  saveVitals,
  baseMaxHp,
  maxHpModifier,
  overrideMaxHp,
  effectiveMaxHp,
  currentHp,
  maxHp,
  tempHp,
  tempHpInput,
  hpInput,
  showHpModal,
  healModalInput,
  damageModalInput,
  maxHpModifierInput,
  overrideMaxHpInput,
  openHpModal,
  previewMaxHp,
  newHpPreview,
  saveHpState,
  applyModalHeal,
  applyModalDamage,
  closeHpModal,
  applyDamage,
  applyHeal,
  updateTempHp,
  dexMod,
  showAcModal,
  isAcCustomizeOpen,
  acCustom,
  acBreakdown,
  currentArmorClass,
  calculateLiveAc,
  openAcModal,
  saveAcCustom,
  closeAcModal,
  showSpeedModal,
  customSpeeds,
  otherSpeedsList,
  openSpeedModal,
  cancelSpeedModal,
  closeSpeedModal
} = useVttVitals({
  char,
  vtt,
  isReadOnly,
  API_URL,
  liveEquipment
})

// Export & Share modal state
const showExportModal = ref(false)
const exportTab = ref('pdf') // 'pdf' | 'link' | 'avrae'

const resolvedPlayerName = computed(() => {
  return user.value?.username || user.value?.name || char.value?.player_name || char.value?.owner_username || ''
})

const openExportModal = (tab = 'pdf') => {
  exportTab.value = tab
  showExportModal.value = true
}

const isPreviewingPrintSheet = ref(false)

const openPrintPreview = () => {
  showExportModal.value = false
  isPreviewingPrintSheet.value = true
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const closePrintPreview = () => {
  isPreviewingPrintSheet.value = false
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

// Defenses & Conditions
const {
  rawDefenses,
  liveDefenses,
  showAddDefenseModal,
  newDefenseType,
  newDefenseDamage,
  DAMAGE_TYPES,
  openAddDefenseModal,
  addDefense,
  removeDefense,
  rawConditions,
  liveConditions,
  showConditionModal,
  ALL_CONDITIONS,
  maxExhaustionLevel,
  isConditionActive,
  getExhaustionLevel,
  exhaustionLevel,
  setExhaustionLevel,
  toggleCondition,
  removeCondition,
  getExhaustionDescription,
  showSaveNoteModal,
  customSaveNoteInput,
  saveAdvantageNotes,
  saveCustomSaveNote
} = useVttDefensesConditions({
  char,
  vtt,
  saveVitals,
  showToast
})
const expendedSlots = ref({})
const expendedFeatFreeCasts = ref({})
const spentClassResources = ref({})
const activeClassStates = ref({})
const customActions = ref([])
const spentCustomActionUses = ref({})
const customSkills = ref([])
const spentHitDice = ref(0)

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
    customActions.value = Array.isArray(res.custom_actions) ? [...res.custom_actions] : []
    customSkills.value = Array.isArray(res.custom_skills) ? [...res.custom_skills] : []
    spentCustomActionUses.value = res.custom_action_uses ? { ...res.custom_action_uses } : {}
  } else {
    expendedSlots.value = {}
    expendedFeatFreeCasts.value = {}
    spentClassResources.value = {}
    activeClassStates.value = {}
    spentHitDice.value = 0
    customActions.value = []
    customSkills.value = []
    spentCustomActionUses.value = {}
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
  if (isReadOnly.value || !char.value?.id || isInitializingSheetResources) return

  const payload = {
    expended_slots: { ...expendedSlots.value },
    expended_feat_free_casts: { ...expendedFeatFreeCasts.value },
    spent_resources: { ...spentClassResources.value },
    active_states: { ...activeClassStates.value },
    spent_hit_dice: spentHitDice.value,
    custom_actions: [...customActions.value],
    custom_skills: [...customSkills.value],
    custom_action_uses: { ...spentCustomActionUses.value }
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

watch([expendedSlots, expendedFeatFreeCasts, spentClassResources, activeClassStates, spentHitDice, customActions, customSkills, spentCustomActionUses], () => {
  if (isInitializingSheetResources) return
  persistSheetState()
}, { deep: true })

watch(() => char.value?.id, () => {
  loadPersistedSheetState()
}, { immediate: true })

// Jack of All Trades, Remarkable Athlete, Skills & Initiative Computations
const {
  SKILL_ABILITY_MAP,
  hasJackOfAllTrades,
  hasRemarkableAthlete,
  profBonus,
  joatBonus,
  raBonus,
  computedSkills,
  computedInitiative,
  showCustomSkillModal,
  newCustomSkillForm,
  saveCustomSkill,
  deleteCustomSkill,
  customSkillsList
} = useVttSkills({
  char,
  vtt,
  dexMod,
  customSkills,
  persistSheetState
})

// Dice Rolling Engine
const {
  lastRoll,
  rollHistory,
  isDiceTrayOpen,
  diceMultiplier,
  diceMod,
  STANDARD_DICE,
  customModifier,
  diceRollMode,
  setRollResult,
  rollDice,
  rollAnyDie,
  rollFormula
} = useVttDice({
  char,
  props,
  activeCampaignId,
  isReadOnly,
  API_URL
})
const quickRollDie = rollAnyDie
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

// --- Class Table Progression & Subclass Features ---
const {
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
} = useVttClassTable({
  char,
  API_URL,
  activeTab,
  charClassesList,
  charClassName,
  getCharClassLevel
})

// --- Features & Traits Engine ---
const {
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
} = useVttFeatures({
  char,
  API_URL,
  fullSubclassFeatures,
  charClassName,
  getCharClassLevel,
  charSubClasses
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

// --- Combat Actions & Weapons Engine ---
const {
  showCustomActionModal,
  editingCustomActionId,
  newCustomActionForm,
  openAddCustomAction,
  saveCustomAction,
  deleteCustomAction,
  getCustomActionsByType,
  getCustomActionSpent,
  getCustomActionAvailable,
  spendCustomAction,
  restoreCustomActionUse,
  getCustomActionAttackBonus,
  getCustomActionDamageLabel,
  rollCustomActionAttack,
  rollCustomActionDamage,
  showCustomItemModal,
  newCustomItemForm,
  openAddCustomItem,
  saveCustomItem,
  getWeaponDetails,
  equippedWeapons,
  unarmedStrikeDetails,
  attackTableEntries,
  automatedFeatureActions,
  expandedAutoActions,
  toggleAutoAction
} = useVttCombatActions({
  char,
  vtt,
  charClassName,
  charSubClassName,
  getItemEquipType,
  liveEquipment,
  saveEquipment,
  activeClassStates,
  rageBonusDamage,
  charSpells,
  charCasterMod,
  extractSpellMechanics: (...args) => typeof extractSpellMechanics === 'function' ? extractSpellMechanics(...args) : {},
  isFeatSpell: (...args) => typeof isFeatSpell === 'function' ? isFeatSpell(...args) : false,
  getFeatName: (...args) => typeof getFeatName === 'function' ? getFeatName(...args) : '',
  getSpellRange: (...args) => typeof getSpellRange === 'function' ? getSpellRange(...args) : '',
  getSpellComponents: (...args) => typeof getSpellComponents === 'function' ? getSpellComponents(...args) : '',
  combinedClassFeatures,
  unpackedTraits,
  customActions,
  spentCustomActionUses,
  persistSheetState,
  rollDice,
  rollFormula,
  showToast,
  rogueSneakAttackFormula: () => rogueSneakAttackFormula?.value,
  charClassesList,
  getCharClassLevel,
  hasCharClass,
  monkLevel,
  monkMartialArtsDie
})
// Comprehensive Class Resource Trackers
// --- Class Resource Trackers & Specific Class Abilities ---
const {
  classResourceTrackers,
  getResourceSpent,
  getResourceAvailable,
  isResourceSlotExpended,
  toggleResourceSlot,
  spendResource,
  restoreResource,
  isClassStateActive,
  toggleClassState,
  activateSecondWind,
  rollResourceDie,
  activateMonkKiAction,
  activateUncannyMetabolism,
  deflectAttacksReaction,
  activateActionSurge,
  activateIndomitable,
  activateLayOnHands,
  activateChannelDivinity,
  rogueSneakAttackFormula,
  rollSneakAttack,
  rollDivineSmite
} = useVttClassResources({
  char,
  vtt,
  getCharClassLevel,
  hasCharClass,
  monkLevel,
  monkMartialArtsDie,
  currentHp,
  maxHp,
  saveVitals,
  spentClassResources,
  activeClassStates,
  persistSheetState,
  rollDice,
  rollFormula,
  showToast,
  getAbilityMod
})

// --- Spell Slots & Spellcasting Engine ---
const {
  sheetSpellSlots,
  isSlotExpended,
  isSlotDisabled,
  toggleSlot,
  toggleSlotUse,
  allSpellLevels,
  getMaxSlots,
  getAvailableSlots,
  isFeatCastExpended,
  toggleFeatFreeCast,
  activeSpellsByLevel,
  getSpellsAtLevel,
  expandedSpells,
  toggleSpell,
  cachedSpellDetails,
  isFetchingSpell,
  fetchSpellDetailsIfNeeded,
  getFullSpell,
  getSpellCastingTime,
  getSpellRange,
  getSpellDuration,
  getSpellComponents,
  getSpellEntries,
  getSpellHigherLevels,
  formatSpellEntry,
  extractSpellMechanics,
  castSpell,
  logSpellCast,
  toggleSpellCard,
  renderSpellEntryHtml,
  featActionSpells,
  bonusActionSpells,
  reactionSpells
} = useVttSpells({
  char,
  vtt,
  API_URL,
  activeTab,
  charClassName,
  hasCharClass,
  charSpells,
  classSpells,
  featSpells,
  sheetCantrips,
  sheetLeveledSpells,
  charCasterMod,
  charSpellAttackBonus,
  expendedSlots,
  expendedFeatFreeCasts,
  rollDice,
  rollFormula,
  setRollResult,
  toggleFeature,
  expandedFeatures
})

// --- Rest & Hit Dice System ---
const {
  hitDieFaces,
  maxHitDiceCount,
  totalHitDice,
  conMod,
  remainingHitDice,
  showShortRestModal,
  shortRestRollResult,
  openShortRestModal,
  rollHitDie,
  completeShortRest,
  showLongRestModal,
  longRestRule,
  resetMaxHpOnRest,
  openLongRestModal,
  recoverSummaryText,
  executeLongRest
} = useVttRest({
  char,
  vtt,
  currentHp,
  maxHp,
  effectiveMaxHp,
  tempHp,
  tempHpInput,
  maxHpModifier,
  maxHpModifierInput,
  overrideMaxHp,
  overrideMaxHpInput,
  saveVitals,
  charClassName,
  restoreAllSlots,
  sheetSpellSlots,
  expendedSlots,
  allSpellLevels,
  classResourceTrackers,
  spentClassResources,
  getResourceSpent,
  customActions,
  spentCustomActionUses,
  activeClassStates,
  persistSheetState,
  exhaustionLevel,
  setExhaustionLevel,
  toggleCondition,
  liveConditions,
  showToast,
  spentHitDice
})

const printAttackRows = computed(() => {
  const list = []
  if (Array.isArray(vtt.value?.attacks) && vtt.value.attacks.length > 0) {
    for (const atk of vtt.value.attacks) {
      list.push({
        name: atk.name || '',
        attack_bonus: (atk.attack_bonus >= 0 ? '+' : '') + (atk.attack_bonus ?? ''),
        damage: (atk.damage_roll || '') + (atk.damage_type ? ' ' + atk.damage_type : '')
      })
    }
  } else if (Array.isArray(attackTableEntries.value) && attackTableEntries.value.length > 0) {
    for (const atk of attackTableEntries.value.slice(0, 5)) {
      list.push({
        name: atk.name || '',
        attack_bonus: atk.toHitLabel || (atk.toHit != null ? (atk.toHit >= 0 ? '+' : '') + atk.toHit : ''),
        damage: (atk.damageLabel || atk.damageFormula || '') + (atk.damageType ? ' ' + atk.damageType : '')
      })
    }
  }
  while (list.length < 5) {
    list.push({ name: '', attack_bonus: '', damage: '' })
  }
  return list
})

const getPrintSpellRows = (lvl, minRows = 8) => {
  const spells = Number(lvl) === 0 ? (sheetCantrips.value || []) : getSpellsAtLevel(lvl)
  const count = Math.min(Math.max(minRows, spells.length), minRows + 2)
  const rows = []
  for (let i = 0; i < count; i++) {
    const sp = spells[i]
    rows.push({
      id: sp?.id || sp?.name || `lvl_${lvl}_slot_${i}`,
      name: sp?.name || '',
      prepared: sp ? Boolean(sp.prepared || sp.is_prepared) : false
    })
  }
  return rows
}

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
  <div v-show="!isPreviewingPrintSheet" class="max-w-4xl mx-2 sm:mx-auto my-4 sm:my-6 p-3.5 sm:p-6 bg-white text-gray-800 rounded border border-gray-200 shadow-sm font-sans pb-24 print:hidden">
    
    <!-- Top Header Bar -->
    <VttHeader
      :char="char"
      :class-summary="classSummary"
      :resolved-image-url="resolvedImageUrl"
      :is-uploading-avatar="isUploadingAvatar"
      :is-read-only="isReadOnly"
      :campaign-name="campaignName"
      :is-inspired="isInspired"
      @avatar-change="handleAvatarFileChange"
      @open-campaign="openCampaignModal"
      @toggle-inspiration="toggleInspiration"
      @open-short-rest="openShortRestModal"
      @open-long-rest="openLongRestModal"
      @open-compendium="openCompendiumWindow"
      @open-export="openExportModal('pdf')"
      @back="emit('back')"
      @edit="emit('edit', char.id)"
    />

    <!-- Core Combat Vitals & HP Grid -->
    <VttVitalsBar
      :current-armor-class="currentArmorClass"
      :computed-initiative="computedInitiative"
      :custom-speeds="customSpeeds"
      :other-speeds-list="otherSpeedsList"
      :proficiency-bonus="charProfBonus"
      :current-hp="currentHp"
      :effective-max-hp="effectiveMaxHp"
      v-model:temp-hp-input="tempHpInput"
      :remaining-hit-dice="remainingHitDice"
      :total-hit-dice="totalHitDice"
      v-model:hp-input="hpInput"
      :is-read-only="isReadOnly"
      @open-ac-modal="openAcModal"
      @roll-initiative="rollDice('Initiative', computedInitiative)"
      @open-speed-modal="openSpeedModal"
      @open-hp-modal="openHpModal"
      @update-temp-hp="updateTempHp"
      @apply-heal="applyHeal"
      @apply-damage="applyDamage"
    />

    <!-- 6 Ability Scores Bar -->
    <VttAbilityScoresGrid
      :abilities="vtt.abilities"
      :saving-throws="vtt.saving_throws"
      :is-read-only="isReadOnly"
      @roll-check="(label, mod) => rollDice(label, mod)"
      @roll-save="(label, mod) => rollDice(label, mod)"
    />

    <!-- 2 Overview Cards: Defenses & Conditions -->
    <VttDefensesConditions
      :live-defenses="liveDefenses"
      :save-advantage-notes="saveAdvantageNotes"
      :live-conditions="liveConditions"
      :is-read-only="isReadOnly"
      @open-add-defense="openAddDefenseModal"
      @remove-defense="removeDefense"
      @open-save-notes="showSaveNoteModal = true"
      @open-conditions="showConditionModal = true"
      @remove-condition="removeCondition"
    />

    <!-- Senses Bar & Tabs Navigation -->
    <VttNavTabs
      :vtt="vtt"
      v-model:active-tab="activeTab"
      :char-spells-count="charSpells.length"
      :live-equipment-count="liveEquipment.length"
      :roll-history-count="rollHistory.length"
    />

    <!-- TAB: Actions (D&D Beyond Style) -->
    <VttActionsTab
      v-if="activeTab === 'actions'"
      :char="char"
      :vtt="vtt"
      :is-read-only="isReadOnly"
      :class-resource-trackers="classResourceTrackers"
      :class-summary="classSummary"
      :attack-table-entries="attackTableEntries"
      :computed-skills="computedSkills"
      :feat-action-spells="featActionSpells"
      :bonus-action-spells="bonusActionSpells"
      :reaction-spells="reactionSpells"
      :automated-feature-actions="automatedFeatureActions"
      :unarmed-strike-details="unarmedStrikeDetails"
      :equipped-weapons="equippedWeapons"
      :monk-level="monkLevel"
      :monk-martial-arts-die="monkMartialArtsDie"
      :char-spells="charSpells"
      :expanded-spells="expandedSpells"
      :char-spell-attack-bonus="charSpellAttackBonus"
      :char-caster-mod="charCasterMod"
      :char-prof-bonus="charProfBonus"
      :all-spell-levels="allSpellLevels"
      :has-char-class="hasCharClass"
      :get-char-class-level="getCharClassLevel"
      :is-resource-slot-expended="isResourceSlotExpended"
      :get-resource-available="getResourceAvailable"
      :get-resource-spent="getResourceSpent"
      :is-class-state-active="isClassStateActive"
      :get-custom-actions-by-type="getCustomActionsByType"
      :get-custom-action-available="getCustomActionAvailable"
      :get-custom-action-spent="getCustomActionSpent"
      :get-custom-action-attack-bonus="getCustomActionAttackBonus"
      :get-custom-action-damage-label="getCustomActionDamageLabel"
      :get-feat-name="getFeatName"
      :is-feat-spell="isFeatSpell"
      :get-spell-range="getSpellRange"
      :is-feat-cast-expended="isFeatCastExpended"
      :extract-spell-mechanics="extractSpellMechanics"
      :get-spell-entries="getSpellEntries"
      :get-available-slots="getAvailableSlots"
      :format-spell-entry="formatSpellEntry"
      :rage-bonus-damage="rageBonusDamage"
      :get-ability-mod="getAbilityMod"
      :toggle-resource-slot="toggleResourceSlot"
      :spend-resource="spendResource"
      :restore-resource="restoreResource"
      :toggle-class-state="toggleClassState"
      :activate-second-wind="activateSecondWind"
      :roll-resource-die="rollResourceDie"
      :open-add-custom-action="openAddCustomAction"
      :roll-dice="rollDice"
      :roll-formula="rollFormula"
      :spend-custom-action="spendCustomAction"
      :delete-custom-action="deleteCustomAction"
      :activate-action-surge="activateActionSurge"
      :activate-channel-divinity="activateChannelDivinity"
      :activate-lay-on-hands="activateLayOnHands"
      :show-toast="showToast"
      :toggle-spell="toggleSpell"
      :toggle-feat-free-cast="toggleFeatFreeCast"
      :cast-spell="castSpell"
      :roll-custom-action-attack="rollCustomActionAttack"
      :roll-custom-action-damage="rollCustomActionDamage"
      :restore-custom-action-use="restoreCustomActionUse"
      :activate-monk-ki-action="activateMonkKiAction"
      :activate-uncanny-metabolism="activateUncannyMetabolism"
      :activate-indomitable="activateIndomitable"
      :deflect-attacks-reaction="deflectAttacksReaction"
      :select-tab="(tab) => activeTab = tab"
    />

    <!-- TAB: Spells & Spellcasting (Dedicated Spells Tab) -->
    <VttSpellsTab
      v-else-if="activeTab === 'spells'"
      :char="char"
      :char-spells="charSpells"
      :is-caster="isCaster"
      :class-spells="classSpells"
      :char-caster-ability="charCasterAbility"
      :char-caster-mod="charCasterMod"
      :char-spell-save-dc="charSpellSaveDc"
      :char-spell-attack-bonus="charSpellAttackBonus"
      :all-spell-levels="allSpellLevels"
      :sheet-spell-slots="sheetSpellSlots"
      :sheet-cantrips="sheetCantrips"
      :sheet-leveled-spells="sheetLeveledSpells"
      :active-spells-by-level="activeSpellsByLevel"
      :feat-spells="featSpells"
      :expanded-spells="expandedSpells"
      :is-read-only="isReadOnly"
      :get-max-slots="getMaxSlots"
      :get-available-slots="getAvailableSlots"
      :is-slot-expended="isSlotExpended"
      :get-spells-at-level="getSpellsAtLevel"
      :extract-spell-mechanics="extractSpellMechanics"
      :get-spell-casting-time="getSpellCastingTime"
      :get-spell-range="getSpellRange"
      :get-spell-duration="getSpellDuration"
      :get-spell-components="getSpellComponents"
      :get-spell-entries="getSpellEntries"
      :get-spell-higher-levels="getSpellHigherLevels"
      :get-feat-name="getFeatName"
      :is-feat-spell="isFeatSpell"
      :is-feat-cast-expended="isFeatCastExpended"
      :format-spell-entry="formatSpellEntry"
      :render-annotated-text="renderAnnotatedText"
      @roll-dice="rollDice"
      @roll-formula="rollFormula"
      @restore-all-slots="restoreAllSlots"
      @toggle-slot="toggleSlot"
      @cast-spell="castSpell"
      @toggle-spell="toggleSpell"
      @toggle-feat-free-cast="toggleFeatFreeCast"
    />

    <!-- TAB: Skills -->
    <VttSkillsTab
      v-else-if="activeTab === 'skills'"
      :computed-skills="computedSkills"
      :has-jack-of-all-trades="hasJackOfAllTrades"
      :has-remarkable-athlete="hasRemarkableAthlete"
      :custom-skills="customSkills"
      :custom-skills-list="customSkillsList"
      :is-read-only="isReadOnly"
      @roll-dice="rollDice"
      @open-add-custom-skill="showCustomSkillModal = true"
      @delete-custom-skill="deleteCustomSkill"
    />

    <!-- TAB: Features & Traits (Full Explanations) -->
    <VttFeaturesTab
      v-else-if="activeTab === 'features'"
      :combined-class-features="combinedClassFeatures"
      :unpacked-traits="unpackedTraits"
      :char="char"
      :all-feature-keys="allFeatureKeys"
      :expanded-features="expandedFeatures"
      :clean-proficiency-name="cleanProficiencyName"
      :is-optional-feature="isOptionalFeature"
      :render-annotated-text="renderAnnotatedText"
      :format5e-entries="format5eEntries"
      @toggle-feature="toggleFeature"
      @expand-all-features="expandAllFeatures"
    />

    <!-- TAB: Class Features Table -->
    <VttClassTableTab
      v-else-if="activeTab === 'class_table'"
      :available-class-names="availableClassNames"
      v-model:selected-class-table-class="selectedClassTableClass"
      :class-table-data="classTableData"
      :current-class-table-level="currentClassTableLevel"
      v-model:inspecting-feature="inspectingFeature"
      :current-table-subclass="currentTableSubclass"
      :is-loading-class-table="isLoadingClassTable"
      :get-char-class-level="getCharClassLevel"
      :get-subclass-features-for-level="getSubclassFeaturesForLevel"
      :render-annotated-text="renderAnnotatedText"
      :format5e-entries="format5eEntries"
      @toggle-feature-detail="toggleFeatureDetail"
      @toggle-subclass-feature-detail="toggleSubclassFeatureDetail"
    />

    <!-- TAB 3: Equipment & Wealth -->
    <VttEquipmentTab
      v-else-if="activeTab === 'equipment'"
      :currency="currency"
      :currency-saved-toast="currencySavedToast"
      :is-read-only="isReadOnly"
      :total-weight="totalWeight"
      :carry-capacity="carryCapacity"
      :weight-percent="weightPercent"
      :weight-bar-color="weightBarColor"
      :weight-status-text-color="weightStatusTextColor"
      :weight-status-label="weightStatusLabel"
      :live-equipment="liveEquipment"
      :equipment-saved-toast="equipmentSavedToast"
      v-model:selected-container-filter="selectedContainerFilter"
      :equipped-count="equippedCount"
      :backpack-count="backpackCount"
      :available-containers="availableContainers"
      :current-active-container="currentActiveContainer"
      :filtered-equipment="filteredEquipment"
      :get-container-current-weight="getContainerCurrentWeight"
      :get-container-capacity="getContainerCapacity"
      :is-container-item="isContainerItem"
      :get-item-equip-type="getItemEquipType"
      :is-item-equippable="isItemEquippable"
      @adjust-currency="adjustCurrency"
      @save-currency="saveCurrency"
      @open-add-custom-item="openAddCustomItem"
      @open-compendium-modal="openCompendiumModal"
      @set-item-container="({ item, containerName }) => setItemContainer(item, containerName)"
      @toggle-equip-status="toggleEquipStatus"
      @change-item-amount="({ item, delta }) => changeItemAmount(item, delta)"
      @remove-item="removeItem"
    />

    <!-- TAB: Characteristics & Roleplay -->
    <VttCharacteristicsTab
      v-else-if="activeTab === 'characteristics'"
      :char="char"
      :parsed-characteristics="parsedCharacteristics"
      :is-read-only="isReadOnly"
      :sheet-notes="sheetNotes"
      v-model:sheet-notes-sub-tab="sheetNotesSubTab"
      :is-saving-notes="isSavingNotes"
      :notes-saved-toast="notesSavedToast"
      @edit="emit('edit')"
      @save-sheet-notes="saveSheetNotes"
    />

    <!-- TAB: Background -->
    <VttBackgroundTab
      v-else-if="activeTab === 'background'"
      :char="char"
      :bg-compendium-data="bgCompendiumData"
      :is-fetching-bg="isFetchingBg"
      :format-origin-feat-name="formatOriginFeatName"
      :format-bg-ability-scores="formatBgAbilityScores"
      :format-bg-skills="formatBgSkills"
      :format-bg-tools="formatBgTools"
      :format-bg-languages="formatBgLanguages"
      :format-bg-equipment-summary="formatBgEquipmentSummary"
      :render-annotated-text="renderAnnotatedText"
      :format5e-entries="format5eEntries"
    />

    <!-- TAB 4: Roll History -->
    <VttHistoryTab
      v-else-if="activeTab === 'history'"
      :roll-history="rollHistory"
    />

    <!-- Floating Dice Roller Tray & Roll Result Toast -->
    <VttDiceTray
      v-model:is-dice-tray-open="isDiceTrayOpen"
      v-model:dice-roll-mode="diceRollMode"
      v-model:dice-multiplier="diceMultiplier"
      v-model:dice-mod="diceMod"
      :standard-dice="STANDARD_DICE"
      :last-roll="lastRoll"
      :is-read-only="isReadOnly"
      @quick-roll-die="quickRollDie"
      @close-last-roll="lastRoll = null"
    />

    <!-- Campaign Modal -->
    <VttCampaignModal
      :is-open="showCampaignModal"
      :active-campaign-id="activeCampaignId"
      :campaign-name="campaignName"
      :char-campaign-name="char.campaign_name"
      :user-campaigns="userCampaigns"
      v-model:selected-link-campaign-id="selectedLinkCampaignId"
      :is-linking-campaign="isLinkingCampaign"
      @close="showCampaignModal = false"
      @go-to-campaign-room="goToCampaignRoom"
      @unlink-character="unlinkCharacterFromCampaign"
      @link-character="linkCharacterToCampaign"
    />

    <!-- Short & Long Rest Modals -->
    <VttRestModals
      :show-short-rest="showShortRestModal"
      :show-long-rest="showLongRestModal"
      :hit-die-faces="hitDieFaces"
      :con-mod="conMod"
      :current-hp="currentHp"
      :max-hp="maxHp"
      :remaining-hit-dice="remainingHitDice"
      :max-hit-dice-count="maxHitDiceCount"
      :short-rest-roll-result="shortRestRollResult"
      :recover-summary-text="recoverSummaryText"
      :char-edition="char?.edition || '2024'"
      @roll-hit-die="rollHitDie"
      @complete-short-rest="completeShortRest"
      @close-short-rest="showShortRestModal = false"
      @close-long-rest="showLongRestModal = false"
      @execute-long-rest="({ rule, resetMaxHp }) => { longRestRule = rule; resetMaxHpOnRest = resetMaxHp; executeLongRest(); }"
    />

    <!-- Combat & Vitals Modals -->
    <VttCombatModals
      :show-hp-modal="showHpModal"
      :show-ac-modal="showAcModal"
      :show-speed-modal="showSpeedModal"
      :show-add-defense-modal="showAddDefenseModal"
      :show-condition-modal="showConditionModal"
      :show-save-note-modal="showSaveNoteModal"
      v-model:current-hp="currentHp"
      v-model:temp-hp="tempHp"
      :preview-max-hp="previewMaxHp"
      :new-hp-preview="newHpPreview"
      v-model:heal-modal-input="healModalInput"
      v-model:damage-modal-input="damageModalInput"
      v-model:max-hp-modifier-input="maxHpModifierInput"
      v-model:override-max-hp-input="overrideMaxHpInput"
      :current-armor-class="currentArmorClass"
      :ac-breakdown="acBreakdown"
      :ac-custom="acCustom"
      v-model:is-ac-customize-open="isAcCustomizeOpen"
      :custom-speeds="customSpeeds"
      v-model:new-defense-type="newDefenseType"
      v-model:new-defense-damage="newDefenseDamage"
      :damage-types="DAMAGE_TYPES"
      :all-conditions="ALL_CONDITIONS"
      :exhaustion-level="exhaustionLevel"
      :max-exhaustion-level="maxExhaustionLevel"
      :is-condition-active="isConditionActive"
      :get-exhaustion-description="getExhaustionDescription"
      v-model:custom-save-note-input="customSaveNoteInput"
      @close-hp-modal="closeHpModal"
      @apply-modal-heal="applyModalHeal"
      @apply-modal-damage="applyModalDamage"
      @close-ac-modal="closeAcModal"
      @cancel-speed-modal="cancelSpeedModal"
      @close-speed-modal="closeSpeedModal"
      @close-add-defense-modal="showAddDefenseModal = false"
      @add-defense="addDefense"
      @close-condition-modal="showConditionModal = false"
      @toggle-condition="toggleCondition"
      @set-exhaustion-level="setExhaustionLevel"
      @close-save-note-modal="showSaveNoteModal = false"
      @save-custom-save-note="saveCustomSaveNote"
    />

    <!-- Export / Share Modal -->
    <VttExportModal
      :is-open="showExportModal"
      :initial-tab="exportTab"
      :char="char"
      :currency="currency"
      :vtt-attacks="vtt.attacks"
      :is-read-only="isReadOnly"
      :api-url="API_URL"
      :build-avrae-json="buildAvraeJson"
      :build-avrae-attack-macro="buildAvraeAttackMacro"
      :show-toast="showToast"
      @close="showExportModal = false"
      @print="printSheet"
      @preview="openPrintPreview"
    />

    <!-- Custom Action, Skill, and Item Modals -->
    <VttCustomModals
      :show-action-modal="showCustomActionModal"
      :editing-custom-action-id="editingCustomActionId"
      :new-custom-action-form="newCustomActionForm"
      :show-skill-modal="showCustomSkillModal"
      :new-custom-skill-form="newCustomSkillForm"
      :show-item-modal="showCustomItemModal"
      :new-custom-item-form="newCustomItemForm"
      @close-action="showCustomActionModal = false"
      @save-action="saveCustomAction"
      @close-skill="showCustomSkillModal = false"
      @save-skill="saveCustomSkill"
      @close-item="showCustomItemModal = false"
      @save-item="saveCustomItem"
    />

    <!-- Compendium Item Picker Modal -->
    <CompendiumItemPickerModal
      :is-open="isCompendiumOpen"
      :edition="char?.edition || '2024'"
      :api-url="API_URL"
      @close="isCompendiumOpen = false"
      @add-item="addItemFromCompendium"
    />

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

  <!-- Dedicated Printable Character Sheet Component -->
  <VttPrintableSheet
    :is-previewing="isPreviewingPrintSheet"
    :char="char"
    :vtt="vtt"
    :resolved-image-url="resolvedImageUrl"
    :resolved-player-name="resolvedPlayerName"
    :class-summary="classSummary"
    :parsed-characteristics="parsedCharacteristics"
    :current-armor-class="currentArmorClass"
    :remaining-hit-dice="remainingHitDice"
    :total-hit-dice="totalHitDice"
    :computed-skills="computedSkills"
    :clean-proficiency-name="cleanProficiencyName"
    :print-attack-rows="printAttackRows"
    :class-resource-trackers="classResourceTrackers"
    :currency="currency"
    :live-equipment="liveEquipment"
    :combined-class-features="combinedClassFeatures"
    :unpacked-traits="unpackedTraits"
    :char-spell-save-dc="charSpellSaveDc"
    :char-spell-attack-bonus="charSpellAttackBonus"
    :get-max-slots="getMaxSlots"
    :expended-slots="expendedSlots"
    :get-print-spell-rows="getPrintSpellRows"
    :sheet-notes="sheetNotes"
    @close-preview="closePrintPreview"
  />
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
</style>