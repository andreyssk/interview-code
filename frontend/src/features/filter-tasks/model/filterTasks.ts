import { categoriesForSlug, categorySearchText } from '@/entities/category'
import { taskSearchText, type TaskDef } from '@/entities/task'

interface Filters {
  category: string // category slug, a section's "all" slug, or 'all'
  q: string
  difficulty?: string
  company?: string
  status?: 'solved' | 'unsolved' | ''
  isSolved?: (slug: string) => boolean
}

export function filterTasks(tasks: TaskDef[], { category, q, difficulty, company, status, isSolved }: Filters): TaskDef[] {
  const slugs = category === 'all' ? undefined : (categoriesForSlug(category) ?? [])
  const needle = q.trim().toLowerCase()
  return tasks.filter((t) => {
    if (slugs && !t.categories.some((c) => slugs.includes(c))) return false
    if (difficulty && t.difficulty !== difficulty) return false
    if (company && !t.companies.includes(company)) return false
    if (status && isSolved && isSolved(t.slug) !== (status === 'solved')) return false
    if (!needle) return true
    // Matches title, companies, difficulty and category names in every language.
    return [...taskSearchText(t), ...t.categories.flatMap(categorySearchText)].some((s) => s.toLowerCase().includes(needle))
  })
}
