import api from './client'
import type { Notification } from '../types'

interface NotificationCountResponse {
  unread_count: number
}

export const notificationsApi = {
  getAll: async (limit = 10): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications', { params: { limit } })
    return response.data
  },

  getCount: async (): Promise<NotificationCountResponse> => {
    const response = await api.get<NotificationCountResponse>('/notifications/count')
    return response.data
  },

  markRead: async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all')
  },
}
