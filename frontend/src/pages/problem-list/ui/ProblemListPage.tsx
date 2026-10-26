import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useCategoriesForSlug } from '@/entities/category'
import { TaskFilters, TaskSearch } from '@/features/filter-tasks'
import { TaskBrowser } from '@/widgets/task-browser'

export function ProblemListPage() {
  const { t } = useTranslation()
  const { category = 'all' } = useParams()
  const scope = useCategoriesForSlug(category)
  const known = category === 'all' || scope
  // A section's "all" page is titled "All <section>"; a category page by the category's own name.
  const title = category === 'all' ? t('problems.allProblems') : scope?.section ? t('problems.allOf', { name: scope.title }) : scope?.title

  return (
    <div>
      <Link to="/problems/categories" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('problems.allCategories')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{known ? title : t('problems.allProblems')}</h1>
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
