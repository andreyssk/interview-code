import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import { saveSolution } from '@/shared/api/run'

/** Saves the current code as a submission without running it. */
export function useSaveSolution(taskSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { code: string; language: string }) => saveSolution(taskSlug, v.code, v.language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts(taskSlug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}
