import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ALL_QUESTIONS, UNCATEGORIZED, useQuestionCategories, useQuestions } from '@/entities/question'
import { useCompanies } from '@/entities/task'
import { QuestionCard } from './QuestionCard'

/** Questions of one category (or all / uncategorized), with a search box and a company filter in the sidebar. */
export function QuestionListPage() {
  const { t } = useTranslation()
  const { category = ALL_QUESTIONS } = useParams()
  const [params, setParams] = useSearchParams()
  const questions = useQuestions()
  const categories = useQuestionCategories()
  const companies = useCompanies()
  const q = params.get('q') ?? ''
  const company = params.get('company') ?? ''

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const current = categories.find((c) => c.slug === category)
  const known = category === ALL_QUESTIONS || category === UNCATEGORIZED || current
  const title = category === ALL_QUESTIONS ? t('questions.all') : category === UNCATEGORIZED ? t('questions.uncategorized') : current?.name

  const inScope = questions.filter((x) => (category === ALL_QUESTIONS ? true : category === UNCATEGORIZED ? !x.category : x.category === category))
  const needle = q.trim().toLowerCase()
  const nameOf = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug
  const visible = inScope.filter(
    (x) =>
      (!company || x.companies.includes(company)) &&
      (!needle || [x.title, ...x.companies.map(nameOf)].some((s) => s.toLowerCase().includes(needle))),
  )
  const usedCompanies = companies.filter((c) => inScope.some((x) => x.companies.includes(c.slug)))

  return (
    <div>
      <Link to="/questions" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('questions.allCategories')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{known ? title : t('questions.title')}</h1>
      {!known ? (
        <p className="text-[var(--muted)]">{t('questions.unknownCategory')}</p>
      ) : (
        <div className="with-sidebar with-sidebar-end">
          <div>
            <input className="search mb-4" placeholder={t('questions.searchPlaceholder')} value={q} onChange={(e) => set('q', e.target.value)} />
            {visible.length === 0 ? (
              <div className="panel p-6 text-[var(--muted)]">{t('questions.none')}</div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {visible.map((x) => (
                  <li key={x.id}>
                    <QuestionCard question={x} />
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
      )}
    </div>
  )
}
