import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuestions } from '@/entities/question'
import { useQuizzes } from '@/entities/quiz'
import { toneColor, useCompanies, useTasks } from '@/entities/task'

/** Every company as a tile with how much material is tagged with it. */
export function CompaniesPage() {
  const { t } = useTranslation()
  const companies = useCompanies()
  const tasks = useTasks()
  const questions = useQuestions()
  const quizzes = useQuizzes()
  const [q, setQ] = useState('')

  const needle = q.trim().toLowerCase()
  const visible = companies.filter((c) => c.name.toLowerCase().includes(needle))
  const count = (slug: string) =>
    tasks.filter((x) => x.companies.includes(slug)).length + questions.filter((x) => x.companies.includes(slug)).length + quizzes.filter((x) => x.companies.includes(slug)).length

  return (
    <div>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('companies.title')}</h1>
      <input className="search mb-6" placeholder={t('companies.search')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      {visible.length === 0 ? (
        <div className="panel p-6 text-[var(--muted)]">{t('companies.none')}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <Link key={c.slug} to={`/companies/${c.slug}`} className="cat-tile" style={{ '--c': toneColor(c.tone) } as React.CSSProperties}>
              <div className="cat-glyph">{c.name.slice(0, 1).toUpperCase()}</div>
              <h3>{c.name}</h3>
              <span className="cat-meta">{t('companies.items', { count: count(c.slug) })}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
