import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/shared/api/queryKeys'
import { clearRecentTasks, fetchRecentTasks, recordRecentTask } from '@/shared/api/recent'

/** How many entries the popover shows (the server keeps a few more, so deleted tasks do not leave it short). */
export const SHOWN = 10

/** Slugs of the tasks the user opened, newest first. */
export function useRecentTaskSlugs(): string[] {
  const { data } = useQuery({ queryKey: queryKeys.recentTasks, queryFn: fetchRecentTasks })
  return data ?? []
}

/** Call on the task page: tells the server this task was just opened and refreshes the history. */
export function useRecordRecentTask(slug: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!slug) return
    // Best effort: failing to note a view must never get in the way of reading the task.
    recordRecentTask(slug)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.recentTasks }))
      .catch(() => undefined)
  }, [slug, queryClient])
}

export function useClearRecentTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearRecentTasks,
    onSuccess: () => queryClient.setQueryData(queryKeys.recentTasks, []),
  })
}
