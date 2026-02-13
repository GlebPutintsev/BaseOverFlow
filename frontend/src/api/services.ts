import api from './client'
import type { Service, ServiceTree, ServiceCreate, ServiceUpdate, ServiceWithStats, ServiceWithDepth } from '../types'

export const servicesApi = {
  getTree: async (): Promise<ServiceTree[]> => {
    const response = await api.get<ServiceTree[]>('/services/tree')
    return response.data
  },

  getFlat: async (): Promise<ServiceWithStats[]> => {
    const response = await api.get<ServiceWithStats[]>('/services')
    return response.data
  },

  getFlatWithDepth: async (): Promise<ServiceWithDepth[]> => {
    const response = await api.get<ServiceWithDepth[]>('/services/flat')
    return response.data
  },

  getBySlug: async (slug: string): Promise<Service> => {
    const response = await api.get<Service>(`/services/slug/${slug}`)
    return response.data
  },

  create: async (data: ServiceCreate): Promise<Service> => {
    const response = await api.post<Service>('/services', data)
    return response.data
  },

  update: async (id: number, data: ServiceUpdate): Promise<Service> => {
    const response = await api.put<Service>(`/services/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/services/${id}`)
  },
}
