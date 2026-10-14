import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runGo, type AttemptStatus } from '@/shared/api/run'
import { queryKeys } from '@/shared/api/queryKeys'

export type RunStatus = 'idle' | 'running' | 'error' | AttemptStatus

/** `dryRun`: just run and report; nothing is recorded, so counters and the submissions list stay as they are. */
export function useRunCode(taskSlug: string, { dryRun = false }: { dryRun?: boolean } = {}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (v: { code: string; harness: string; solveTimeMs?: number }) => runGo(taskSlug, v.code, v.harness, v.solveTimeMs, dryRun),
    // The backend saved the attempt; refresh the counters and the submissions list.
    onSuccess: () => {
      if (dryRun) return
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts(taskSlug) })
    },
  })

  const result = mutation.data
  const status: RunStatus = mutation.isPending ? 'running' : mutation.isError ? 'error' : (result?.status ?? 'idle')

  return { run: mutation.mutate, status, result, isPending: mutation.isPending }
}

export const statusTone: Record<RunStatus, string> = {
  idle: '',
  running: 'text-[var(--cyan)]',
  passed: 'text-[var(--green)]',
  error: 'text-[var(--pink)]',
  timeout: 'text-[var(--pink)]',
  compile: 'text-[var(--pink)]',
  failed: 'text-[var(--pink)]',
  saved: 'text-[var(--cyan)]',
}
