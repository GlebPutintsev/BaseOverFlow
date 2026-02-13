import { create } from 'zustand'
import type { User } from '../types'
import { authApi } from '../api/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  
  checkAuth: () => Promise<void>
  login: (emailOrUsername: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (emailOrUsername: string, password: string) => {
    const response = await authApi.login({
      email_or_username: emailOrUsername,
      password,
    })
    set({ user: response.user, isAuthenticated: true })
  },

  register: async (email: string, username: string, password: string, displayName?: string) => {
    const response = await authApi.register({
      email,
      username,
      password,
      display_name: displayName,
    })
    set({ user: response.user, isAuthenticated: true })
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },
}))
