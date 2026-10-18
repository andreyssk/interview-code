import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuizzes } from '@/entities/quiz'
import { PlayButton } from '@/features/study-session'
import { useCompanies } from '@/entities/task'
import { QuizCard } from './QuizCard'

/** All quizzes in one list, with a search box and company filter in the sidebar. */
export function QuizzesPage() {
  const { t } = useTranslation()
  const quizzes = useQuizzes()
  const companies = useCompanies()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const company = params.get('company') ?? ''

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
      (!needle || [x.title, ...x.stages.map((s) => s.code), ...x.companies.map(nameOf)].some((s) => s.toLowerCase().includes(needle))),
  )
  const usedCompanies = companies.filter((c) => quizzes.some((x) => x.companies.includes(c.slug)))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="neon-title text-3xl font-bold">{t('quizzes.title')}</h1>
        <PlayButton kind="quiz" />
      </div>
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
          <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{t('filters.company')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {usedCompanies.map((c) => (
              <button key={c.slug} className={`chip ${company === c.slug ? 'chip-active' : ''}`} onClick={() => set('company', company === c.slug ? '' : c.slug)}>
                {c.name}
              </button>
            ))}
            {usedCompanies.length === 0 && <span className="text-sm text-[var(--muted)]">—</span>}
          </div>
          {(q || company) && (
            <button className="btn-ghost mt-4 w-full" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              {t('filters.reset')}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
