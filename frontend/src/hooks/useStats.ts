import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../api/stats'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
  })
}
