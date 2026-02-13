import api from './client'
import type { Tag, TagCreate } from '../types'

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const response = await api.get<Tag[]>('/tags')
    return response.data
  },

  create: async (data: TagCreate): Promise<Tag> => {
    const response = await api.post<Tag>('/tags', data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tags/${id}`)
  },
}
