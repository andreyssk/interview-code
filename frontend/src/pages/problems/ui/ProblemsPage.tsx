import { useTranslation } from 'react-i18next'
import { GlobalSearchForm } from '@/features/filter-tasks'
import { CategoryGrid } from '@/widgets/category-grid'
import { StatsSidebar } from '@/widgets/stats-sidebar'

export function ProblemsPage() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('problems.title')}</h1>
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
