import { useTranslation } from 'react-i18next'
import { TaskCard, tasks, useTaskStats } from '@/entities/task'
import { filterTasks, useTaskFilters } from '@/features/filter-tasks'

/** Task list for one category slug, or 'all', narrowed by the sidebar filters in the URL. */
export function TaskBrowser({ category }: { category: string }) {
  const { t } = useTranslation()
  const { q, difficulty, company, status } = useTaskFilters()
  const { isSolved } = useTaskStats()
  const visible = filterTasks(tasks, { category, q, difficulty, company, status, isSolved })

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
