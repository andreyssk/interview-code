import type { TaskDef } from '../model/types'

/** What a task's search box query is matched against: title, slug, company names, difficulty and category names. */
export function taskSearchText(task: TaskDef, names: { company: (slug: string) => string; category: (slug: string) => string; difficulty: string }): string[] {
  return [task.title, task.slug, ...task.companies.map(names.company), ...task.categories.map(names.category), task.difficulty, names.difficulty]
}
