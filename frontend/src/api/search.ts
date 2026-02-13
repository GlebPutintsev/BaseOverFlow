import api from './client'
import type { SearchResponse, SuggestionsResponse } from '../types'

interface SearchParams {
  q: string
  type?: 'incident' | 'guide'
  service_id?: number
  limit?: number
}

export const searchApi = {
  search: async (params: SearchParams): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>('/search', { params })
    return response.data
  },

  suggest: async (q: string): Promise<SuggestionsResponse> => {
    const response = await api.get<SuggestionsResponse>('/search/suggestions', { params: { q } })
    return response.data
  },
}
