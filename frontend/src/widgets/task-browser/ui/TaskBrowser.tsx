import { useTranslation } from 'react-i18next'
import { useCategories, useCategoriesForSlug } from '@/entities/category'
import { TaskCard, taskSearchText, useCompanies, useTasks, useTaskStats } from '@/entities/task'
import { filterTasks, useTaskFilters } from '@/features/filter-tasks'

/** Task list for one category slug, a section's "all" slug, or 'all', narrowed by the sidebar filters in the URL. */
export function TaskBrowser({ category }: { category: string }) {
  const { t } = useTranslation()
  const { q, difficulty, company, status } = useTaskFilters()
  const { isSolved } = useTaskStats()
  const tasks = useTasks()
  const companies = useCompanies()
  const categories = useCategories()
  const scope = useCategoriesForSlug(category)

  const nameOf = <T extends { slug: string; name: string }>(list: T[]) => (slug: string) => list.find((x) => x.slug === slug)?.name ?? slug
  const visible = filterTasks(tasks, {
    slugs: category === 'all' ? undefined : (scope?.slugs ?? []),
    q,
    difficulty,
    company,
    status,
    isSolved,
    searchText: (task) =>
      taskSearchText(task, { company: nameOf(companies), category: nameOf(categories), difficulty: t(`difficulty.${task.difficulty}`) }),
  })

  if (visible.length === 0) return <div className="panel p-6 text-[var(--muted)]">{t('problems.none')}</div>
  return (
    <ul className="flex flex-col gap-1.5">
      {visible.map((task) => (
        <li key={task.slug}>
          <TaskCard task={task} solved={isSolved(task.slug)} />
        </li>
      ))}
    </ul>
  )
}
