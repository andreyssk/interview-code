import { useMemo } from 'react'
import { useContent } from '@/shared/content/ContentContext'
import { buildHarness } from '../lib/buildHarness'
import { buildTemplate } from '../lib/buildTemplate'
import type { TaskDef } from './types'

/** All tasks, ordered by number, with the starter code and test harness generated from signature + tests. */
export function useTasks(): TaskDef[] {
  const { tasks } = useContent()
  return useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        leetcodeUrl: t.leetcodeUrl ?? undefined,
        solutionNotes: t.solutionNotes ?? [],
        solution: t.solution ?? undefined,
        complexity: t.complexity ?? undefined,
        template: t.template ?? buildTemplate(t.signature),
        harness: buildHarness(t.signature, t.tests),
      })),
    [tasks],
  )
}

export function useTask(slug: string | undefined): TaskDef | undefined {
  return useTasks().find((t) => t.slug === slug)
}
