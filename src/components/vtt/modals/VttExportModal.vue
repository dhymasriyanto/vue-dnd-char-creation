<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import {
  IconShare,
  IconX,
  IconFileTypePdf,
  IconLink,
  IconBrandDiscord,
  IconPrinter,
  IconEye,
  IconWorld,
  IconLock,
  IconCheck,
  IconCopy,
  IconDownload
} from '@tabler/icons-vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialTab: {
    type: String,
    default: 'pdf'
  },
  char: {
    type: Object,
    required: true
  },
  currency: {
    type: Object,
    default: () => ({})
  },
  vttAttacks: {
    type: Array,
    default: () => []
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  apiUrl: {
    type: String,
    required: true
  },
  buildAvraeJson: {
    type: Function,
    required: true
  },
  buildAvraeAttackMacro: {
    type: Function,
    required: true
  },
  showToast: {
    type: Function,
    default: () => {}
  }
})

const emit = defineEmits(['close', 'print', 'preview'])

const exportTab = ref(props.initialTab)
watch(() => props.initialTab, (val) => {
  exportTab.value = val || 'pdf'
})

const copiedLink = ref(false)
const copiedAvraeJson = ref(false)
const copiedAvraeMacro = ref(false)
const copiedAvraeApiUrl = ref(false)

const charKey = computed(() => props.char?.public_id || props.char?.id)

const isPublicChar = ref(Boolean(props.char?.is_public))
watch(() => props.char?.is_public, (v) => {
  isPublicChar.value = Boolean(v)
})

const isUpdatingVisibility = ref(false)
const toggleVisibility = async () => {
  if (props.isReadOnly || !props.char?.id) return
  const nextVal = !isPublicChar.value
  isUpdatingVisibility.value = true
  try {
    await axios.put(`${props.apiUrl}/character/${props.char.id}`, { is_public: nextVal })
    isPublicChar.value = nextVal
    if (props.char) props.char.is_public = nextVal
    props.showToast(nextVal ? 'Character set to Public' : 'Character set to Private')
  } catch (err) {
    console.error('Failed to toggle visibility', err)
    props.showToast('Failed to update visibility')
  } finally {
    isUpdatingVisibility.value = false
  }
}

const publicShareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  const basePath = window.location.pathname.replace(/\/character\/[^/]+/i, '').replace(/\/$/, '')
  return `${window.location.origin}${basePath}/character/${charKey.value}`
})

const avraeApiUrl = computed(() => {
  if (!charKey.value) return ''
  return `${props.apiUrl}/character/${charKey.value}/avrae`
})

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(publicShareUrl.value)
    copiedLink.value = true
    props.showToast('Public link copied to clipboard')
    setTimeout(() => { copiedLink.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy share link:', err)
  }
}

const copyAvraeApiUrl = async () => {
  try {
    await navigator.clipboard.writeText(avraeApiUrl.value)
    copiedAvraeApiUrl.value = true
    props.showToast('Avrae endpoint URL copied')
    setTimeout(() => { copiedAvraeApiUrl.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy avrae api url:', err)
  }
}

const copyAvraeJson = async () => {
  try {
    const data = props.buildAvraeJson(props.char, props.currency)
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    copiedAvraeJson.value = true
    props.showToast('Avrae character JSON copied')
    setTimeout(() => { copiedAvraeJson.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy Avrae JSON:', err)
  }
}

const copyAvraeMacro = async () => {
  try {
    const macro = props.buildAvraeAttackMacro(props.vttAttacks || [])
    await navigator.clipboard.writeText(macro)
    copiedAvraeMacro.value = true
    props.showToast('Avrae attack macro copied')
    setTimeout(() => { copiedAvraeMacro.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy Avrae macro:', err)
  }
}

const downloadAvraeJson = () => {
  try {
    const data = props.buildAvraeJson(props.char, props.currency)
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = (props.char?.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
    a.href = url
    a.download = `${safeName}-${charKey.value}-avrae.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    props.showToast('Avrae JSON downloaded')
  } catch (err) {
    console.error('Failed to download Avrae JSON:', err)
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-gray-300 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div class="flex items-center gap-2">
          <IconShare class="w-5 h-5 text-black" />
          <h3 class="font-bold text-black text-sm">Export &amp; Share Character</h3>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-gray-400 hover:text-black transition cursor-pointer p-1"
        >
          <IconX class="w-5 h-5" />
        </button>
      </div>

      <!-- Tab Selector -->
      <div class="flex border-b border-gray-200 bg-white text-xs font-semibold px-4 pt-2 gap-2">
        <button
          type="button"
          @click="exportTab = 'pdf'"
          :class="exportTab === 'pdf' ? 'border-b-2 border-black text-black font-bold' : 'text-gray-500 hover:text-black'"
          class="px-3 py-2 transition cursor-pointer flex items-center gap-1.5"
        >
          <IconFileTypePdf class="w-4 h-4 text-black" />
          <span>Print / PDF</span>
        </button>
        <button
          type="button"
          @click="exportTab = 'link'"
          :class="exportTab === 'link' ? 'border-b-2 border-black text-black font-bold' : 'text-gray-500 hover:text-black'"
          class="px-3 py-2 transition cursor-pointer flex items-center gap-1.5"
        >
          <IconLink class="w-4 h-4 text-black" />
          <span>Public Link</span>
        </button>
        <button
          type="button"
          @click="exportTab = 'avrae'"
          :class="exportTab === 'avrae' ? 'border-b-2 border-black text-black font-bold' : 'text-gray-500 hover:text-black'"
          class="px-3 py-2 transition cursor-pointer flex items-center gap-1.5"
        >
          <IconBrandDiscord class="w-4 h-4 text-black" />
          <span>Discord Avrae</span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto space-y-4 text-xs bg-white text-black">
        <!-- 1. PDF / Print Tab -->
        <div v-if="exportTab === 'pdf'" class="space-y-4">
          <div class="bg-white border border-gray-300 rounded-lg p-4 space-y-2">
            <div class="font-bold text-black text-sm flex items-center gap-2">
              <IconPrinter class="w-4 h-4 text-black" />
              <span>Standard D&amp;D Character Sheet (3 Pages)</span>
            </div>
            <p class="text-xs text-gray-700 leading-relaxed">
              Page 1 (Combat, Skills, Actions &amp; Features), Page 2 (Spells &amp; Spell Slots 1–9), Page 3 (Characteristics, Backstory &amp; Notes).
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              @click="emit('print')"
              class="flex-1 py-2.5 px-4 bg-black hover:bg-neutral-800 text-white rounded font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <IconPrinter class="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              @click="emit('preview')"
              class="flex-1 py-2.5 px-4 bg-white hover:bg-gray-100 border border-gray-300 text-black rounded font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <IconEye class="w-4 h-4 text-black" />
              <span>Preview &amp; Edit Sheet</span>
            </button>
          </div>
          <p class="text-[11px] text-gray-500 italic text-center">
            Tip: In browser print dialog, select <b>Save as PDF</b> and enable "Background graphics".
          </p>
        </div>

        <!-- 2. Public Link Tab -->
        <div v-else-if="exportTab === 'link'" class="space-y-4">
          <!-- Visibility Setting Card -->
          <div
            class="p-3.5 border rounded-lg flex items-center justify-between gap-3 bg-white border-gray-300"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="p-2 rounded-full shrink-0 bg-gray-100 text-black border border-gray-200"
              >
                <IconWorld v-if="isPublicChar" class="w-4 h-4" />
                <IconLock v-else class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <div class="font-bold text-xs text-black">
                  {{ isPublicChar ? 'Public Character' : 'Private Character' }}
                </div>
                <div class="text-[11px] text-gray-600">
                  {{ isPublicChar ? 'Anyone with this link can view this sheet' : 'Only you can view this sheet' }}
                </div>
              </div>
            </div>
            <button
              v-if="!isReadOnly"
              type="button"
              @click="toggleVisibility"
              :disabled="isUpdatingVisibility"
              class="px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer shrink-0 disabled:opacity-50 bg-black hover:bg-neutral-800 text-white border-black shadow-xs"
            >
              {{ isUpdatingVisibility ? 'Saving...' : (isPublicChar ? 'Make Private' : 'Make Public') }}
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-black mb-1.5">Direct Public URL</label>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                :value="publicShareUrl"
                class="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-xs font-mono text-black focus:outline-none select-all"
              />
              <button
                type="button"
                @click="copyShareLink"
                class="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <IconCheck v-if="copiedLink" class="w-4 h-4 text-white" />
                <IconCopy v-else class="w-4 h-4" />
                <span>{{ copiedLink ? 'Copied!' : 'Copy Link' }}</span>
              </button>
            </div>
            <p v-if="!isPublicChar" class="text-[11px] text-gray-500 mt-1.5 italic">
              * Note: This character is currently Private. Anyone opening this link without logging in will receive a private character notice.
            </p>
          </div>
        </div>

        <!-- 3. Discord Avrae Tab -->
        <div v-else-if="exportTab === 'avrae'" class="space-y-4">
          <div class="bg-white border border-gray-300 rounded-lg p-3.5 space-y-1">
            <div class="font-bold text-black text-xs flex items-center gap-1.5">
              <IconBrandDiscord class="w-4 h-4 text-black" />
              <span>Avrae Discord Bot Integration</span>
            </div>
            <p class="text-xs text-gray-700 leading-relaxed">
              Export character stats, attacks, and spellbook into Avrae's character format or import combat attacks directly into your active character.
            </p>
          </div>

          <!-- Avrae Character JSON Box -->
          <div class="border border-gray-300 rounded-lg p-3.5 space-y-2.5 bg-white">
            <div class="font-bold text-black text-xs">Full Character JSON</div>
            <p class="text-[11px] text-gray-600">
              Download the complete character JSON or copy the API endpoint URL for custom Avrae GVAR or bot integrations.
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                @click="downloadAvraeJson"
                class="px-3 py-2 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <IconDownload class="w-4 h-4" />
                <span>Download .json</span>
              </button>
              <button
                type="button"
                @click="copyAvraeJson"
                class="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-black rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <IconCheck v-if="copiedAvraeJson" class="w-4 h-4 text-black" />
                <IconCopy v-else class="w-4 h-4 text-black" />
                <span>{{ copiedAvraeJson ? 'JSON Copied!' : 'Copy JSON' }}</span>
              </button>
              <button
                type="button"
                @click="copyAvraeApiUrl"
                class="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-black rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <IconCheck v-if="copiedAvraeApiUrl" class="w-4 h-4 text-black" />
                <IconLink v-else class="w-4 h-4 text-black" />
                <span>{{ copiedAvraeApiUrl ? 'URL Copied!' : 'Copy API URL' }}</span>
              </button>
            </div>
          </div>

          <!-- Attack Automation Macro (!a import) -->
          <div class="border border-gray-300 rounded-lg p-3.5 space-y-2.5 bg-white">
            <div class="flex items-center justify-between">
              <div class="font-bold text-black text-xs">Attack Automation (<code class="font-mono text-black font-bold">!a import</code>)</div>
              <button
                type="button"
                @click="copyAvraeMacro"
                class="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <IconCheck v-if="copiedAvraeMacro" class="w-3.5 h-3.5 text-white" />
                <IconCopy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedAvraeMacro ? 'Macro Copied!' : 'Copy Command' }}</span>
              </button>
            </div>
            <p class="text-[11px] text-gray-600">
              Paste into your Discord channel to instantly register your weapon attacks with correct damage dice, bonuses, and damage types:
            </p>
            <div class="bg-gray-100 text-black border border-gray-300 p-2.5 rounded font-mono text-[10px] max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
              {{ buildAvraeAttackMacro(vttAttacks || []) || '!a import []' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-gray-200 bg-white flex justify-end">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 border border-gray-300 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
