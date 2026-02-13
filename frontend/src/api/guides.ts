import api from './client'
import type { Guide, GuideList, GuideCreate, GuideUpdate } from '../types'

interface GetAllParams {
  service_id?: number
  limit?: number
  offset?: number
}

export const guidesApi = {
  getAll: async (params?: GetAllParams): Promise<GuideList[]> => {
    const response = await api.get<GuideList[]>('/guides', { params })
    return response.data
  },

  getBySlug: async (slug: string): Promise<Guide> => {
    const response = await api.get<Guide>(`/guides/slug/${slug}`)
    return response.data
  },

  getRecent: async (limit = 10): Promise<Guide[]> => {
    const response = await api.get<Guide[]>('/guides/recent', { params: { limit } })
    return response.data
  },

  getPinned: async (): Promise<Guide[]> => {
    const response = await api.get<Guide[]>('/guides/pinned')
    return response.data
  },

  getTopRated: async (limit = 5): Promise<Guide[]> => {
    const response = await api.get<Guide[]>('/guides/top-rated', { params: { limit } })
    return response.data
  },

  create: async (data: GuideCreate): Promise<Guide> => {
    const response = await api.post<Guide>('/guides', data)
    return response.data
  },

  update: async (id: number, data: GuideUpdate): Promise<Guide> => {
    const response = await api.put<Guide>(`/guides/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/guides/${id}`)
  },
}
