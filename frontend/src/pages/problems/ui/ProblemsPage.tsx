import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TaskFilters, TaskSearch } from '@/features/filter-tasks'
import { TaskBrowser } from '@/widgets/task-browser'

/** Default problems screen: every problem with filters; categories are one link away. */
export function ProblemsPage() {
  const { t } = useTranslation()
  return (
    <div>
      <Link to="/problems/categories" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('problems.byCategory')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('problems.title')}</h1>
      <div className="with-sidebar with-sidebar-end">
        <div>
          <TaskSearch />
          <TaskBrowser category="all" />
        </div>
        <aside className="sidebar panel">
          <h2>{t('filters.title')}</h2>
          <TaskFilters />
        </aside>
      </div>
    </div>
  )
}
