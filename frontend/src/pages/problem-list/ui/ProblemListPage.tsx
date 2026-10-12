import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { categoriesForSlug } from '@/entities/category'
import { TaskFilters, TaskSearch } from '@/features/filter-tasks'
import { TaskBrowser } from '@/widgets/task-browser'

const titleKey = (slug: string) =>
  slug.startsWith('all-') ? `sections.${slug.slice(4)}.all` : `categories.${slug}.name`

export function ProblemListPage() {
  const { t } = useTranslation()
  const { category = 'all' } = useParams()
  const known = category === 'all' || categoriesForSlug(category)

  return (
    <div>
      <Link to="/problems" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('problems.allCategories')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t(known ? titleKey(category) : 'categories.all.name')}</h1>
      {known ? (
        <div className="with-sidebar with-sidebar-end">
          <div>
            <TaskSearch />
            <TaskBrowser category={category} />
          </div>
          <aside className="sidebar panel">
            <h2>{t('filters.title')}</h2>
            <TaskFilters />
          </aside>
        </div>
      ) : (
        <p className="text-[var(--muted)]">{t('problems.unknownCategory')}</p>
      )}
    </div>
  )
}
