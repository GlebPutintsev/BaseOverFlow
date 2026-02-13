import api from './client'
import type { User, UserLogin, UserRegister, TokenResponse, UserUpdate, UserPublicProfile } from '../types'

export const authApi = {
  // Get current user
  me: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  // Login
  login: async (data: UserLogin): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data)
    return response.data
  },

  // Register
  register: async (data: UserRegister): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data)
    return response.data
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  // Update profile
  updateProfile: async (data: UserUpdate): Promise<User> => {
    const response = await api.put<User>('/auth/me', data)
    return response.data
  },

  // Get public profile by username
  getProfile: async (username: string): Promise<UserPublicProfile> => {
    const response = await api.get<UserPublicProfile>(`/auth/users/${username}/profile`)
    return response.data
  },
}
