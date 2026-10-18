import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import type { Quiz } from '@/entities/quiz'
import { CompanyTag } from '@/entities/task'
import { useAuth } from '@/shared/auth/AuthContext'
import { highlight } from '@/shared/lib/highlight'
import { Chevron, Icon } from '@/shared/ui'
import { Spoiler } from './Spoiler'

/**
 * A quiz as an accordion row, like a question: only the prompt and companies show; the code opens on click,
 * with the answer behind a spoiler. Admins get an edit icon.
 */
export function QuizCard({ quiz }: { quiz: Quiz }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  return (
    <div className="panel">
      <div className="flex items-center">
        <button className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-3 pr-2 pl-4 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="min-w-0 flex-1 basis-60 font-medium">{quiz.title || t('quizzes.defaultPrompt')}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {quiz.companies.map((c) => (
              <CompanyTag key={c} slug={c} />
            ))}
          </span>
        </button>
        {user.role === 'admin' && (
          // `from` lets the editor's Cancel / Save return to this list.
          <Link to={`/admin/quizzes/edit/${quiz.id}`} state={{ from: pathname + search }} className="icon-btn" title="Edit quiz" aria-label="Edit quiz">
            <Icon name="edit" />
          </Link>
        )}
        {/* The arrow is a second click target for the same toggle; the row button above is the accessible one. */}
        <button className="shrink-0 self-stretch py-3 pr-4 pl-2 text-[var(--muted)]" tabIndex={-1} aria-hidden="true" onClick={() => setOpen((v) => !v)}>
          <Chevron open={open} />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4">
          <pre className="code-block">{highlight(quiz.code, quiz.language)}</pre>
          <Spoiler>
            <pre className="output">{quiz.answer}</pre>
            {quiz.explanation && (
              <p className="mt-2 text-sm text-[var(--muted)]">
                <b className="text-[var(--text)]">{t('quizzes.why')}:</b> {quiz.explanation}
              </p>
            )}
          </Spoiler>
        </div>
      )}
    </div>
  )
}
