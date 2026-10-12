import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '@/shared/api/attempts'
import { queryKeys } from '@/shared/api/queryKeys'

/** Per-task results from the backend: a task is solved once any attempt passed. */
export function useTaskStats() {
  const { data } = useQuery({ queryKey: queryKeys.stats, queryFn: fetchStats })
  const bySlug = new Map((data ?? []).map((s) => [s.taskSlug, s]))
  return {
    isSolved: (slug: string) => (bySlug.get(slug)?.passed ?? 0) > 0,
    counts: (slug: string) => ({ passed: bySlug.get(slug)?.passed ?? 0, failed: bySlug.get(slug)?.failed ?? 0 }),
    solvedCount: (slugs: string[]) => slugs.filter((s) => (bySlug.get(s)?.passed ?? 0) > 0).length,
  }
}
