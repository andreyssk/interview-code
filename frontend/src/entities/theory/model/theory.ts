import { useMemo } from 'react'
import { useContent } from '@/shared/content/ContentContext'
import type { TheoryDef } from './types'

export function useTheory(): TheoryDef[] {
  const { articles } = useContent()
  return useMemo(
    () =>
      articles.map(({ sourceName, sourceUrl, category, ...a }) => ({
        ...a,
        category: category ?? undefined,
        source: sourceName ? { name: sourceName, url: sourceUrl ?? undefined } : undefined,
      })),
    [articles],
  )
}

export const useNote = (slug: string | undefined) => useTheory().find((n) => n.slug === slug)

/** Notes related to a task: linked to it directly or to any of its categories. */
export function useTheoryForTask(task: { slug: string; categories: string[] }): TheoryDef[] {
  return useTheory().filter(
    (n) =>
      n.tasks.includes(task.slug) ||
      [n.category, ...n.categories].some((c) => c !== undefined && task.categories.includes(c)),
  )
}
