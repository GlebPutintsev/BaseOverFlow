import { useQuery } from '@tanstack/react-query'
import { servicesApi } from '../api/services'

export function useServices() {
  return useQuery({
    queryKey: ['services', 'tree'],
    queryFn: () => servicesApi.getTree(),
  })
}

export function useServicesFlat() {
  return useQuery({
    queryKey: ['services', 'flat'],
    queryFn: () => servicesApi.getFlat(),
  })
}

export function useServicesFlatWithDepth() {
  return useQuery({
    queryKey: ['services', 'flat-depth'],
    queryFn: () => servicesApi.getFlatWithDepth(),
  })
}

export function useService(slug: string) {
  return useQuery({
    queryKey: ['services', slug],
    queryFn: () => servicesApi.getBySlug(slug),
    enabled: !!slug,
  })
}
