import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuizzes } from '@/entities/quiz'
import { useCompanies } from '@/entities/task'
import { useContent } from '@/shared/content/ContentContext'
import { QuizCard } from './QuizCard'

/** All quizzes in one list, with a search box and category / company filters in the sidebar. */
export function QuizzesPage() {
  const { t } = useTranslation()
  const quizzes = useQuizzes()
  const companies = useCompanies()
  const { categories } = useContent()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const company = params.get('company') ?? ''
  const category = params.get('category') ?? ''

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const nameOf = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug
  const needle = q.trim().toLowerCase()
  const visible = quizzes.filter(
    (x) =>
      (!company || x.companies.includes(company)) &&
      (!category || x.category === category) &&
      (!needle || [x.title, x.code, ...x.companies.map(nameOf)].some((s) => s.toLowerCase().includes(needle))),
  )
  const usedCompanies = companies.filter((c) => quizzes.some((x) => x.companies.includes(c.slug)))
  const usedCategories = categories.filter((c) => quizzes.some((x) => x.category === c.slug))

  return (
    <div>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('quizzes.title')}</h1>
      <div className="with-sidebar with-sidebar-end">
        <div>
          <input className="search mb-4" placeholder={t('quizzes.searchPlaceholder')} value={q} onChange={(e) => set('q', e.target.value)} />
          {visible.length === 0 ? (
            <div className="panel p-6 text-[var(--muted)]">{t('quizzes.none')}</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((x) => (
                <li key={x.id}>
                  <QuizCard quiz={x} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="sidebar panel">
          <h2>{t('filters.title')}</h2>
          {usedCategories.length > 0 && (
            <>
              <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{t('quizzes.category')}</h3>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {usedCategories.map((c) => (
                  <button key={c.slug} className={`chip ${category === c.slug ? 'chip-active' : ''}`} onClick={() => set('category', category === c.slug ? '' : c.slug)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{t('filters.company')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {usedCompanies.map((c) => (
              <button key={c.slug} className={`chip ${company === c.slug ? 'chip-active' : ''}`} onClick={() => set('company', company === c.slug ? '' : c.slug)}>
                {c.name}
              </button>
            ))}
            {usedCompanies.length === 0 && <span className="text-sm text-[var(--muted)]">—</span>}
          </div>
          {(q || company || category) && (
            <button className="btn-ghost mt-4 w-full" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              {t('filters.reset')}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
