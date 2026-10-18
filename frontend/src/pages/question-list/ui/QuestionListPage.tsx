import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CategoryTile } from '@/entities/category'
import { ALL_QUESTIONS, OTHER_SUBCATEGORY, UNCATEGORIZED, useQuestionCategories, useQuestionSubcategories, useQuestions } from '@/entities/question'
import { useCompanies } from '@/entities/task'
import { QuestionCard } from './QuestionCard'

const COLORS = ['cyan', 'pink', 'amber', 'violet', 'green', 'blue']

/**
 * Questions of one category, subcategory, or all / "other" (no category), with a search box and a company filter in the sidebar.
 * A category that has subcategories first shows them as tiles (plus "all" and an implicit "other"); each opens /questions/:category/:sub.
 */
export function QuestionListPage() {
  const { t } = useTranslation()
  const { category = ALL_QUESTIONS, sub } = useParams()
  const [params, setParams] = useSearchParams()
  const questions = useQuestions()
  const categories = useQuestionCategories()
  const allSubs = useQuestionSubcategories()
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
  const subs = allSubs.filter((c) => c.category === category)
  const currentSub = sub && sub !== ALL_QUESTIONS && sub !== OTHER_SUBCATEGORY ? subs.find((c) => c.slug === sub) : undefined
  const subKnown = !sub || sub === ALL_QUESTIONS || sub === OTHER_SUBCATEGORY || currentSub
  const known = category === ALL_QUESTIONS || category === UNCATEGORIZED || (current && subKnown)
  const showSubTiles = current && subs.length > 0 && !sub
  const subTitle = sub === ALL_QUESTIONS ? t('questions.all') : sub === OTHER_SUBCATEGORY ? t('questions.otherSub') : currentSub?.name
  const title = sub ? subTitle : category === ALL_QUESTIONS ? t('questions.all') : category === UNCATEGORIZED ? t('questions.uncategorized') : current?.name

  const inCategory = questions.filter((x) => (category === ALL_QUESTIONS ? true : category === UNCATEGORIZED ? !x.category : x.category === category))
  const inScope = inCategory.filter((x) => !sub || sub === ALL_QUESTIONS || (sub === OTHER_SUBCATEGORY ? !x.subcategory : x.subcategory === sub))
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
      <Link
        to={sub && current ? `/questions/${category}` : '/questions'}
        className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]"
      >
        {sub && current ? t('questions.backTo', { name: current.name }) : t('questions.allCategories')}
      </Link>
      <h1 className="neon-title mb-4 text-3xl font-bold">{known ? title : t('questions.title')}</h1>
      {!known ? (
        <p className="text-[var(--muted)]">{t('questions.unknownCategory')}</p>
      ) : showSubTiles ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CategoryTile to={`/questions/${category}/${ALL_QUESTIONS}`} glyph="☰" color="var(--text)" title={t('questions.all')} meta={t('counts.question', { count: inCategory.length })} />
          {subs.map((c, i) => (
            <CategoryTile
              key={c.slug}
              to={`/questions/${category}/${c.slug}`}
              glyph="?"
              color={`var(--${COLORS[i % COLORS.length]})`}
              title={c.name}
              meta={t('counts.question', { count: inCategory.filter((x) => x.subcategory === c.slug).length })}
            />
          ))}
          {inCategory.some((x) => !x.subcategory) && (
            <CategoryTile
              to={`/questions/${category}/${OTHER_SUBCATEGORY}`}
              glyph="∅"
              color="var(--muted)"
              title={t('questions.otherSub')}
              meta={t('counts.question', { count: inCategory.filter((x) => !x.subcategory).length })}
            />
          )}
        </div>
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
