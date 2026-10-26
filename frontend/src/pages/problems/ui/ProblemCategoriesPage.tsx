import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { GlobalSearchForm } from '@/features/filter-tasks'
import { CategoryGrid } from '@/widgets/category-grid'
import { StatsSidebar } from '@/widgets/stats-sidebar'

export function ProblemCategoriesPage() {
  const { t } = useTranslation()
  return (
    <div>
      <Link to="/problems" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('problems.backToAll')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('problems.categories')}</h1>
      <div className="with-sidebar with-sidebar-end">
        <div>
          <GlobalSearchForm />
          <CategoryGrid />
        </div>
        <StatsSidebar />
      </div>
    </div>
  )
}
