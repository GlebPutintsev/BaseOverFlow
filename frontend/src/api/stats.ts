import api from './client'

export interface Stats {
  total_incidents: number
  total_guides: number
  total_services: number
}

export const statsApi = {
  getStats: async (): Promise<Stats> => {
    const response = await api.get<Stats>('/stats')
    return response.data
  },
}
