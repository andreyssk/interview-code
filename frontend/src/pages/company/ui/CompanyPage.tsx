import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useQuestions } from '@/entities/question'
import { useQuizzes } from '@/entities/quiz'
import { TaskCard, toneColor, useCompanies, useTasks, useTaskStats } from '@/entities/task'
import { QuestionCard } from '@/pages/question-list'
import { QuizCard } from '@/pages/quizzes'

type Tab = 'problems' | 'questions' | 'quizzes'

/** One company: its name and description on a page tinted with the company color, then everything tagged with it. */
export function CompanyPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  const company = useCompanies().find((c) => c.slug === slug)
  const { isSolved } = useTaskStats()
  const tasks = useTasks().filter((x) => x.companies.includes(slug))
  const questions = useQuestions().filter((x) => x.companies.includes(slug))
  const quizzes = useQuizzes().filter((x) => x.companies.includes(slug))
  const [chosen, setChosen] = useState<Tab | null>(null)

  const back = (
    <Link to="/companies" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
      {t('companies.back')}
    </Link>
  )
  if (!company) {
    return (
      <div>
        {back}
        <p className="text-[var(--muted)]">{t('companies.notFound')}</p>
      </div>
    )
  }

  const color = toneColor(company.tone)
  const tabs: [Tab, number][] = [
    ['problems', tasks.length],
    ['questions', questions.length],
    ['quizzes', quizzes.length],
  ]
  // Open on the first tab that has something, unless the user picked one.
  const tab = chosen ?? tabs.find(([, n]) => n > 0)?.[0] ?? 'problems'

  return (
    <div>
      {back}
      <header
        className="company-hero panel mb-6 flex flex-wrap items-center gap-5 p-6"
        style={{ '--c': color, borderColor: `color-mix(in srgb, ${color} 55%, transparent)` } as React.CSSProperties}
      >
        <span className="company-badge" aria-hidden="true">
          {company.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="company-name text-4xl font-bold">{company.name}</h1>
          {company.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-[var(--prose)]">{company.description}</p>}
        </div>
        <div className="flex gap-6 text-center">
          {tabs.map(([key, n]) => (
            <div key={key}>
              <div className="text-2xl font-bold tabular-nums" style={{ color }}>
                {n}
              </div>
              <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{t(`companies.${key}`)}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map(([key, n]) => (
          <button key={key} className={`chip ${tab === key ? 'chip-active' : ''}`} onClick={() => setChosen(key)}>
            {t(`companies.${key}`)} ({n})
          </button>
        ))}
      </div>

      {tab === 'problems' && (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li key={task.slug}>
              <TaskCard task={task} solved={isSolved(task.slug)} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'questions' && (
        <div className="flex flex-col gap-1.5">
          {questions.map((x) => (
            <QuestionCard key={x.id} question={x} />
          ))}
        </div>
      )}
      {tab === 'quizzes' && (
        <div className="flex flex-col gap-1.5">
          {quizzes.map((x) => (
            <QuizCard key={x.id} quiz={x} />
          ))}
        </div>
      )}
      {tabs.find(([key]) => key === tab)?.[1] === 0 && <div className="panel p-6 text-[var(--muted)]">{t('companies.empty')}</div>}
    </div>
  )
}
