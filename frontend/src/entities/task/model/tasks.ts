import { useMemo } from 'react'
import { useContent } from '@/shared/content/ContentContext'
import { buildHarness } from '../lib/buildHarness'
import { buildJavaTemplate, buildTemplate } from '../lib/buildTemplate'
import { normalizeSignature } from '@/shared/api/content'
import type { TaskDef } from './types'

/** All tasks, ordered by number, with the starter code and test harness generated from signature + tests. */
export function useTasks(): TaskDef[] {
  const { tasks } = useContent()
  return useMemo(
    () =>
      tasks.map((t) => {
        const signature = normalizeSignature(t.signature)
        return {
          ...t,
          signature,
          leetcodeUrl: t.leetcodeUrl ?? undefined,
          solutionNotes: t.solutionNotes ?? [],
          commonMistakes: t.commonMistakes ?? [],
          solution: t.solution ?? undefined,
          complexity: t.complexity ?? undefined,
          template: t.template ?? buildTemplate(signature),
          javaTemplate: buildJavaTemplate(signature),
          // Nothing to run without tests (or without a function to call).
          harness: signature.name && t.tests.length > 0 ? buildHarness(signature, t.tests) : '',
        }
      }),
    [tasks],
  )
}

export function useTask(slug: string | undefined): TaskDef | undefined {
  return useTasks().find((t) => t.slug === slug)
}
