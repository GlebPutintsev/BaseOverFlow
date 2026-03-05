import api from './client'
import type { User, UserLogin, UserRegister, TokenResponse, UserUpdate, UserPublicProfile, UserCreateByAdmin, UserRole } from '../types'

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

  // Admin: list all users
  listUsers: async (limit: number = 50, offset: number = 0): Promise<User[]> => {
    const response = await api.get<User[]>('/auth/users', { params: { limit, offset } })
    return response.data
  },

  // Admin: create user
  createUser: async (data: UserCreateByAdmin): Promise<User> => {
    const response = await api.post<User>('/auth/users', data)
    return response.data
  },

  // Admin: update user role
  updateUserRole: async (userId: number, role: UserRole): Promise<User> => {
    const response = await api.put<User>(`/auth/users/${userId}/role`, { role })
    return response.data
  },

  // Admin: block user
  blockUser: async (userId: number): Promise<void> => {
    await api.post(`/auth/users/${userId}/block`)
  },

  // Admin: unblock user
  unblockUser: async (userId: number): Promise<void> => {
    await api.post(`/auth/users/${userId}/unblock`)
  },

  // Admin: delete user
  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/auth/users/${userId}`)
  },
}
