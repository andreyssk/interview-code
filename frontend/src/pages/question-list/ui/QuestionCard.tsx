import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CompanyTag } from '@/entities/task'
import type { Question } from '@/entities/question'
import { useAuth } from '@/shared/auth/AuthContext'
import { Chevron, Icon, RichBlocks } from '@/shared/ui'
import { QuestionViewer } from './QuestionViewer'

/**
 * A question as an accordion row: title and companies, the answer opens on click.
 * Icons: view it at viewport size, view it in browser fullscreen, and (admins) edit.
 */
export function QuestionCard({ question, defaultOpen = false }: { question: Question; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [viewer, setViewer] = useState<null | 'viewport' | 'fullscreen'>(null)
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  return (
    <div className="panel">
      <div className="flex items-center">
        <button className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-3 pr-2 pl-4 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="min-w-0 flex-1 basis-60 font-medium">{question.title}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {question.companies.map((c) => (
              <CompanyTag key={c} slug={c} />
            ))}
          </span>
        </button>
        <button type="button" className="icon-btn" title="Open full size" aria-label="Open full size" onClick={() => setViewer('viewport')}>
          <Icon name="expand" />
        </button>
        <button type="button" className="icon-btn" title="Full screen" aria-label="Full screen" onClick={() => setViewer('fullscreen')}>
          <Icon name="maximize" />
        </button>
        {user.role === 'admin' && (
          // `from` lets the editor's Back button return to this list.
          <Link
            to={`/admin/questions/edit/${question.id}`}
            state={{ from: pathname + search }}
            className="icon-btn"
            title="Edit question"
            aria-label="Edit question"
          >
            <Icon name="edit" />
          </Link>
        )}
        {/* The arrow is a second click target for the same toggle; the row button above is the accessible one. */}
        <button className="shrink-0 self-stretch py-3 pr-4 pl-2 text-[var(--muted)]" tabIndex={-1} aria-hidden="true" onClick={() => setOpen((v) => !v)}>
          <Chevron open={open} />
        </button>
      </div>
      {viewer && <QuestionViewer question={question} fullscreen={viewer === 'fullscreen'} onClose={() => setViewer(null)} />}
      {open && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <RichBlocks blocks={question.answer} />
        </div>
      )}
    </div>
  )
}
