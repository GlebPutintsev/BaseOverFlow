import { useQuery } from '@tanstack/react-query'
import { incidentsApi } from '../api/incidents'

export function useIncident(slug: string) {
  return useQuery({
    queryKey: ['incidents', slug],
    queryFn: () => incidentsApi.getBySlug(slug),
    enabled: !!slug,
  })
}

export function useIncidents(serviceId?: number) {
  return useQuery({
    queryKey: ['incidents', { serviceId }],
    queryFn: () => incidentsApi.getAll({ service_id: serviceId }),
  })
}

export function useRecentIncidents(limit = 10) {
  return useQuery({
    queryKey: ['incidents', 'recent', limit],
    queryFn: () => incidentsApi.getRecent(limit),
  })
}

export function usePopularIncidents(limit = 5) {
  return useQuery({
    queryKey: ['incidents', 'popular', limit],
    queryFn: () => incidentsApi.getPopular(limit),
  })
}

export function usePinnedIncidents() {
  return useQuery({
    queryKey: ['incidents', 'pinned'],
    queryFn: () => incidentsApi.getPinned(),
  })
}

export function useTopRatedIncidents(limit = 5) {
  return useQuery({
    queryKey: ['incidents', 'top-rated', limit],
    queryFn: () => incidentsApi.getTopRated(limit),
  })
}
