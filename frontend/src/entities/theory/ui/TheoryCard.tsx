import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TheoryDef } from '../model/types'
import { TheorySourceLabel } from './TheorySourceLabel'

/** `footer` is rendered outside the card link so it can hold its own links. */
export function TheoryCard({ note, footer }: { note: TheoryDef; footer?: ReactNode }) {
  const { title, summary } = note
  return (
    <div className="panel flex w-full flex-col p-4 transition hover-glow hover:-translate-y-0.5">
      <Link to={`/theory/${note.slug}`} className="block flex-1">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">{summary}</p>
      </Link>
      {note.source && (
        <div className="mt-3">
          <TheorySourceLabel source={note.source} />
        </div>
      )}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}
