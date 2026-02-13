import api from './client'
import type { Incident, IncidentList, IncidentCreate, IncidentUpdate } from '../types'

interface GetAllParams {
  service_id?: number
  limit?: number
  offset?: number
}

export const incidentsApi = {
  getAll: async (params?: GetAllParams): Promise<IncidentList[]> => {
    const response = await api.get<IncidentList[]>('/incidents', { params })
    return response.data
  },

  getBySlug: async (slug: string): Promise<Incident> => {
    const response = await api.get<Incident>(`/incidents/slug/${slug}`)
    return response.data
  },

  getRecent: async (limit = 10): Promise<Incident[]> => {
    const response = await api.get<Incident[]>('/incidents/recent', { params: { limit } })
    return response.data
  },

  getPopular: async (limit = 5): Promise<Incident[]> => {
    const response = await api.get<Incident[]>('/incidents/popular', { params: { limit } })
    return response.data
  },

  getPinned: async (): Promise<Incident[]> => {
    const response = await api.get<Incident[]>('/incidents/pinned')
    return response.data
  },

  getTopRated: async (limit = 5): Promise<Incident[]> => {
    const response = await api.get<Incident[]>('/incidents/top-rated', { params: { limit } })
    return response.data
  },

  create: async (data: IncidentCreate): Promise<Incident> => {
    const response = await api.post<Incident>('/incidents', data)
    return response.data
  },

  update: async (id: number, data: IncidentUpdate): Promise<Incident> => {
    const response = await api.put<Incident>(`/incidents/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/incidents/${id}`)
  },
}
