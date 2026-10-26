import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PlayButton } from '@/features/study-session'
import { UNCATEGORIZED, useQuestionCategories, useQuestions } from '@/entities/question'
import { useCompanies } from '@/entities/task'
import { QuestionCard } from '@/pages/question-list'
import { useAuth } from '@/shared/auth/AuthContext'
import { Icon, MultiSelect } from '@/shared/ui'
import { AddQuestionDialog } from './AddQuestionDialog'

const PAGE_SIZE = 20
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

/** All questions as a paginated list; search box plus category and company filters, all kept in the URL. */
export function QuestionsPage() {
  const { t } = useTranslation()
  const questions = useQuestions()
  const categories = useQuestionCategories()
  const companies = useCompanies()
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const picked = list(params.get('category'))
  const pickedCompanies = list(params.get('company'))

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page') // any filter change starts from the first page
    setParams(next, { replace: true })
  }

  const needle = q.trim().toLowerCase()
  const nameOf = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug
  const visible = questions.filter(
    (x) =>
      (picked.length === 0 || picked.includes(x.category ?? UNCATEGORIZED)) &&
      (pickedCompanies.length === 0 || x.companies.some((c) => pickedCompanies.includes(c))) &&
      (!needle || [x.title, ...x.companies.map(nameOf)].some((s) => s.toLowerCase().includes(needle))),
  )
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), pages)
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])
  const go = (n: number) => {
    const next = new URLSearchParams(params)
    if (n > 1) next.set('page', String(n))
    else next.delete('page')
    setParams(next, { replace: true })
  }

  const hasUncategorized = questions.some((x) => !x.category)
  const categoryOptions = [
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
    ...(hasUncategorized ? [{ value: UNCATEGORIZED, label: t('questions.uncategorized') }] : []),
  ]
  const usedCompanies = companies.filter((c) => questions.some((x) => x.companies.includes(c.slug)))
  const emptyText = { all: t('filters.allSelected'), none: t('filters.noMatch') }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="neon-title text-3xl font-bold">{t('questions.title')}</h1>
        <label className="field w-56">
          <span>
            {t('filters.companies')}{pickedCompanies.length > 0 && <span className="ml-1 text-[var(--cyan)]">({pickedCompanies.length})</span>}
          </span>
          <MultiSelect
            label={t('filters.companies')}
            placeholder=""
            options={usedCompanies.map((c) => ({ value: c.slug, label: c.name }))}
            value={pickedCompanies}
            onChange={(v) => set('company', v.join(','))}
            emptyText={emptyText}
            compact
          />
        </label>
        <label className="field w-56">
          <span>
            {t('filters.categories')}{picked.length > 0 && <span className="ml-1 text-[var(--cyan)]">({picked.length})</span>}
          </span>
          <MultiSelect
            label={t('filters.categories')}
            placeholder=""
            options={categoryOptions}
            value={picked}
            onChange={(v) => set('category', v.join(','))}
            emptyText={emptyText}
            compact
          />
        </label>
        <div className="ml-auto" />
        {user.role === 'admin' && (
          <span className="tip tip-left" data-tip={t('questions.add')}>
            <button type="button" className="icon-btn" aria-label={t('questions.add')} onClick={() => setAdding(true)}>
              <Icon name="plus" />
            </button>
          </span>
        )}
        <PlayButton kind="question" />
      </div>
      <div className="relative mb-4">
        <input className="search pr-8" placeholder={t('questions.searchPlaceholder')} value={q} onChange={(e) => set('q', e.target.value)} />
        {q && (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--pink)]"
            title={t('filters.reset')}
            aria-label={t('filters.reset')}
            onClick={() => set('q', '')}
          >
            ×
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="panel p-6 text-[var(--muted)]">{t('questions.none')}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((x) => (
            <li key={x.id}>
              <QuestionCard question={x} />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => go(page - 1)}>
            {t('questions.prev')}
          </button>
          <span className="text-sm text-[var(--muted)]">{t('questions.page', { page, pages })}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => go(page + 1)}>
            {t('questions.next')}
          </button>
        </nav>
      )}
      {adding && <AddQuestionDialog onClose={() => setAdding(false)} />}
    </div>
  )
}
