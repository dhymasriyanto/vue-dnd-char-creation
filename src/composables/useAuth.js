import { ref, computed } from 'vue'
import axios from 'axios'
import { useConfig } from '../config'

const token = ref(localStorage.getItem('dnd_auth_token') || '')
const user = ref(null)
const isLoading = ref(false)
const isAuthReady = ref(false)
const isAuthModalOpen = ref(false)
const authModalMode = ref('login')
const authError = ref('')

// Configure axios interceptor once
axios.interceptors.request.use((config) => {
  const currentToken = token.value || localStorage.getItem('dnd_auth_token')
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`
  }
  return config
})

export function useAuth() {
  const API_URL = useConfig().API_URL

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const openLoginModal = () => {
    authError.value = ''
    authModalMode.value = 'login'
    isAuthModalOpen.value = true
  }

  const openRegisterModal = () => {
    authError.value = ''
    authModalMode.value = 'register'
    isAuthModalOpen.value = true
  }

  const closeAuthModal = () => {
    isAuthModalOpen.value = false
    authError.value = ''
  }

  const setSession = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    if (newToken) {
      localStorage.setItem('dnd_auth_token', newToken)
    } else {
      localStorage.removeItem('dnd_auth_token')
    }
  }

  const login = async ({ identifier, password }) => {
    isLoading.value = true
    authError.value = ''
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { identifier, password })
      if (res.data?.data) {
        setSession(res.data.data.token, res.data.data.user)
        closeAuthModal()
        return res.data.data
      }
      throw new Error(res.data?.message || 'Login failed')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed'
      authError.value = msg
      throw new Error(msg)
    } finally {
      isLoading.value = false
    }
  }

  const register = async ({ username, email, password }) => {
    isLoading.value = true
    authError.value = ''
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username, email, password })
      if (res.data?.data) {
        setSession(res.data.data.token, res.data.data.user)
        closeAuthModal()
        return res.data.data
      }
      throw new Error(res.data?.message || 'Registration failed')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed'
      authError.value = msg
      throw new Error(msg)
    } finally {
      isLoading.value = false
    }
  }

  const loginSso = async ({ provider, provider_id, email, username }) => {
    isLoading.value = true
    authError.value = ''
    try {
      const res = await axios.post(`${API_URL}/auth/sso`, {
        provider,
        provider_id,
        email,
        username
      })
      if (res.data?.data) {
        setSession(res.data.data.token, res.data.data.user)
        closeAuthModal()
        return res.data.data
      }
      throw new Error(res.data?.message || 'SSO failed')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'SSO failed'
      authError.value = msg
      throw new Error(msg)
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    setSession('', null)
  }

  const initAuth = async () => {
    const savedToken = localStorage.getItem('dnd_auth_token')
    if (!savedToken) {
      user.value = null
      isAuthReady.value = true
      return
    }
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      if (res.data?.data) {
        user.value = res.data.data
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      isAuthReady.value = true
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAuthReady,
    isLoading,
    isAuthModalOpen,
    authModalMode,
    authError,
    openLoginModal,
    openRegisterModal,
    closeAuthModal,
    login,
    register,
    loginSso,
    logout,
    initAuth
  }
}
