import type { TaskDef } from '@/entities/task'

interface Filters {
  /** Category slugs the list is limited to; undefined = every task */
  slugs?: string[]
  q: string
  difficulty?: string
  company?: string
  status?: 'solved' | 'unsolved' | ''
  isSolved?: (slug: string) => boolean
  /** Strings the query is matched against (title, company, difficulty and category names) */
  searchText: (task: TaskDef) => string[]
}

export function filterTasks(tasks: TaskDef[], { slugs, q, difficulty, company, status, isSolved, searchText }: Filters): TaskDef[] {
  const needle = q.trim().toLowerCase()
  return tasks.filter((t) => {
    if (slugs && !t.categories.some((c) => slugs.includes(c))) return false
    if (difficulty && t.difficulty !== difficulty) return false
    if (company && !t.companies.includes(company)) return false
    if (status && isSolved && isSolved(t.slug) !== (status === 'solved')) return false
    if (!needle) return true
    return searchText(t).some((s) => s.toLowerCase().includes(needle))
  })
}
