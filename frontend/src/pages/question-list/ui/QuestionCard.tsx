import { useState } from 'react'
import { CompanyTag } from '@/entities/task'
import type { Question } from '@/entities/question'
import { Chevron, RichBlocks } from '@/shared/ui'

/** A question as an accordion row: title and companies, the answer opens on click. */
export function QuestionCard({ question, defaultOpen = false }: { question: Question; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="panel">
      <button className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0 flex-1 basis-60 font-medium">{question.title}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {question.companies.map((c) => (
            <CompanyTag key={c} slug={c} />
          ))}
        </span>
        <span className="text-[var(--muted)]">
          <Chevron open={open} />
        </span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <RichBlocks blocks={question.answer} />
        </div>
      )}
    </div>
  )
}
