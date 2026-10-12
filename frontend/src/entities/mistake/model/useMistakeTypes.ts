import { useQuery } from '@tanstack/react-query'
import { fetchMistakeType, fetchMistakeTypes } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'

export const useMistakeTypes = () => useQuery({ queryKey: queryKeys.mistakeTypes, queryFn: fetchMistakeTypes })

export const useMistakeType = (id: number) =>
  useQuery({ queryKey: queryKeys.mistakeType(id), queryFn: () => fetchMistakeType(id), enabled: Number.isFinite(id) })
