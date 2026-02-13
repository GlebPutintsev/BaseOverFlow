import { useQuery } from '@tanstack/react-query'
import { guidesApi } from '../api/guides'

export function useGuide(slug: string) {
  return useQuery({
    queryKey: ['guides', slug],
    queryFn: () => guidesApi.getBySlug(slug),
    enabled: !!slug,
  })
}

export function useGuides(serviceId?: number) {
  return useQuery({
    queryKey: ['guides', { serviceId }],
    queryFn: () => guidesApi.getAll({ service_id: serviceId }),
  })
}

export function useRecentGuides(limit = 10) {
  return useQuery({
    queryKey: ['guides', 'recent', limit],
    queryFn: () => guidesApi.getRecent(limit),
  })
}

export function usePinnedGuides() {
  return useQuery({
    queryKey: ['guides', 'pinned'],
    queryFn: () => guidesApi.getPinned(),
  })
}

export function useTopRatedGuides(limit = 5) {
  return useQuery({
    queryKey: ['guides', 'top-rated', limit],
    queryFn: () => guidesApi.getTopRated(limit),
  })
}
