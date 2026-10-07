<script setup>
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../composables/useAuth'
import {
  IconX,
  IconUser,
  IconMail,
  IconLock,
  IconBrandGoogle,
  IconBrandGithub
} from '@tabler/icons-vue'

const {
  isAuthModalOpen,
  authModalMode,
  authError,
  isLoading,
  closeAuthModal,
  login,
  register,
  loginSso
} = useAuth()

const form = reactive({
  identifier: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const clientError = ref('')
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const resetForm = () => {
  form.identifier = ''
  form.username = ''
  form.email = ''
  form.password = ''
  form.confirmPassword = ''
  clientError.value = ''
}

watch(authModalMode, () => {
  clientError.value = ''
})

watch(isAuthModalOpen, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && isAuthModalOpen.value) {
    closeAuthModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  if (googleClientId && !document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const handleSubmit = async () => {
  clientError.value = ''

  if (authModalMode.value === 'login') {
    if (!form.identifier.trim()) {
      clientError.value = 'Please enter your username or email'
      return
    }
    if (!form.password) {
      clientError.value = 'Please enter your password'
      return
    }
    try {
      await login({
        identifier: form.identifier.trim(),
        password: form.password
      })
    } catch {
      // Error handled in useAuth
    }
  } else {
    if (!form.username.trim() || form.username.trim().length < 3) {
      clientError.value = 'Username must be at least 3 characters'
      return
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      clientError.value = 'Please enter a valid email address'
      return
    }
    if (!form.password || form.password.length < 6) {
      clientError.value = 'Password must be at least 6 characters'
      return
    }
    if (form.password !== form.confirmPassword) {
      clientError.value = 'Passwords do not match'
      return
    }

    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      })
    } catch {
      // Error handled in useAuth
    }
  }
}

const handleSsoClick = async (provider) => {
  clientError.value = ''

  // Real Google Sign-In if client ID configured
  if (provider === 'google' && googleClientId && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (response?.credential) {
            await loginSso({ credential: response.credential })
          }
        }
      })
      window.google.accounts.id.prompt()
      return
    } catch (e) {
      console.warn('Google One Tap init failed, falling back:', e)
    }
  }

  // ponytail: Fallback demo mock SSO when VITE_GOOGLE_CLIENT_ID / GitHub OAuth app not yet configured
  const mockSsoData = provider === 'google'
    ? {
        provider: 'google',
        provider_id: 'google_' + Math.floor(100000 + Math.random() * 900000),
        email: 'google_user@example.com',
        username: 'GoogleAdventurer'
      }
    : {
        provider: 'github',
        provider_id: 'github_' + Math.floor(100000 + Math.random() * 900000),
        email: 'github_user@example.com',
        username: 'GithubAdventurer'
      }

  try {
    await loginSso(mockSsoData)
  } catch {
    // Error handled in useAuth
  }
}
</script>

<template>
  <div
    v-if="isAuthModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    @click.self="closeAuthModal"
  >
    <div
      class="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden transition-all text-gray-900"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-base font-bold text-gray-900">
            {{ authModalMode === 'login' ? 'Sign In' : 'Create Account' }}
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ authModalMode === 'login' ? 'Access your saved D&D characters' : 'Join to create and manage characters' }}
          </p>
        </div>
        <button
          type="button"
          @click="closeAuthModal"
          class="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>

      <!-- Mode Switch Tabs -->
      <div class="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
        <button
          type="button"
          @click="authModalMode = 'login'"
          :class="[
            authModalMode === 'login'
              ? 'bg-white border-b-2 border-gray-900 text-gray-900 font-bold'
              : 'text-gray-500 hover:text-gray-800 border-b-2 border-transparent',
            'flex-1 py-2.5 text-center transition cursor-pointer'
          ]"
        >
          Sign In
        </button>
        <button
          type="button"
          @click="authModalMode = 'register'"
          :class="[
            authModalMode === 'register'
              ? 'bg-white border-b-2 border-gray-900 text-gray-900 font-bold'
              : 'text-gray-500 hover:text-gray-800 border-b-2 border-transparent',
            'flex-1 py-2.5 text-center transition cursor-pointer'
          ]"
        >
          Register
        </button>
      </div>

      <!-- Content / Form -->
      <div class="p-6">
        <!-- Error Banner -->
        <div
          v-if="clientError || authError"
          class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex justify-between items-center"
        >
          <span>{{ clientError || authError }}</span>
          <button
            type="button"
            @click="clientError = ''; authError = ''"
            class="text-red-500 hover:text-red-700 font-bold ml-2"
          >
            x
          </button>
        </div>

        <!-- SSO Buttons -->
        <div class="space-y-2 mb-4">
          <button
            type="button"
            @click="handleSsoClick('google')"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <IconBrandGoogle class="w-4 h-4 text-red-600" />
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            @click="handleSsoClick('github')"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <IconBrandGithub class="w-4 h-4 text-gray-900" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div class="relative flex py-2 items-center mb-4">
          <div class="grow border-t border-gray-200"></div>
          <span class="shrink mx-2 text-[11px] text-gray-400 uppercase tracking-wider">or with credentials</span>
          <div class="grow border-t border-gray-200"></div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5">
          <!-- Login View -->
          <template v-if="authModalMode === 'login'">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Username or Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconUser class="w-4 h-4" />
                </div>
                <input
                  v-model="form.identifier"
                  type="text"
                  required
                  placeholder="e.g. gandalf or gandalf@shire.org"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconLock class="w-4 h-4" />
                </div>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  placeholder="••••••••"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </template>

          <!-- Register View -->
          <template v-else>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Username</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconUser class="w-4 h-4" />
                </div>
                <input
                  v-model="form.username"
                  type="text"
                  required
                  placeholder="e.g. aragorn"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconMail class="w-4 h-4" />
                </div>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="aragorn@gondor.org"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconLock class="w-4 h-4" />
                </div>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <IconLock class="w-4 h-4" />
                </div>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  placeholder="Repeat password"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          </template>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full mt-2 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <div
              v-if="isLoading"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            ></div>
            <span>{{ authModalMode === 'login' ? 'Sign In' : 'Create Account' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
