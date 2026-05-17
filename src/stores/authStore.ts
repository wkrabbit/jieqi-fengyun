import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'

interface User {
  id: number
  username: string
  email: string | null
  isVip: boolean
  createdAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isVip = computed(() => user.value?.isVip ?? false)

  function loadFromStorage() {
    const stored = localStorage.getItem('token')
    if (stored) token.value = stored
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password })
    if (res.error) {
      error.value = res.error
      loading.value = false
      return false
    }
    token.value = res.data!.token
    user.value = res.data!.user
    localStorage.setItem('token', res.data!.token)
    loading.value = false
    return true
  }

  async function register(username: string, password: string, email?: string) {
    loading.value = true
    error.value = null
    const res = await api.post<{ token: string; user: User }>('/auth/register', { username, password, email })
    if (res.error) {
      error.value = res.error
      loading.value = false
      return false
    }
    token.value = res.data!.token
    user.value = res.data!.user
    localStorage.setItem('token', res.data!.token)
    loading.value = false
    return true
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  loadFromStorage()

  return { token, user, loading, error, isLoggedIn, isVip, login, register, logout }
})
