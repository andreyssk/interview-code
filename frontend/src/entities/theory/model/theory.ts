import { goStringsBasics } from './data/go-strings-basics'
import { twoPointers } from './data/two-pointers'
import type { TheoryDef } from './types'

// Register new notes here.
export const theory: TheoryDef[] = [twoPointers, goStringsBasics]

/** Notes related to a task: linked to it directly or to any of its categories. */
export function theoryForTask(task: { slug: string; categories: string[] }): TheoryDef[] {
  return theory.filter(
    (n) =>
      n.tasks?.includes(task.slug) ||
      [n.category, ...(n.categories ?? [])].some((c) => c !== undefined && task.categories.includes(c)),
  )
}

export const findTheory = (slug: string | undefined) => theory.find((t) => t.slug === slug)
