import api from './client'
import type { ModerationItem, PublishStatus } from '../types'

interface ModerationListResponse {
  items: ModerationItem[]
  total: number
}

export const moderationApi = {
  getPending: async (): Promise<ModerationListResponse> => {
    const response = await api.get<ModerationListResponse>('/moderation/pending')
    return response.data
  },

  approve: async (type: 'incident' | 'guide', id: number): Promise<void> => {
    const plural = type === 'incident' ? 'incidents' : 'guides'
    await api.post(`/moderation/${plural}/${id}/approve`)
  },

  reject: async (type: 'incident' | 'guide', id: number, reason?: string): Promise<void> => {
    const plural = type === 'incident' ? 'incidents' : 'guides'
    await api.post(`/moderation/${plural}/${id}/reject`, { reason })
  },

  updateStatus: async (type: 'incident' | 'guide', id: number, status: PublishStatus): Promise<void> => {
    const plural = type === 'incident' ? 'incidents' : 'guides'
    await api.patch(`/moderation/${plural}/${id}/status`, { publish_status: status })
  },
}
