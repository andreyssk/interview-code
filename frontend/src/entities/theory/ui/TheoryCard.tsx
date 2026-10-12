import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TheoryDef } from '../model/types'
import { useTheoryText } from '../model/useTheoryText'

/** `footer` is rendered outside the card link so it can hold its own links. */
export function TheoryCard({ note, footer }: { note: TheoryDef; footer?: ReactNode }) {
  const { title, summary } = useTheoryText(note.slug)
  return (
    <div className="panel p-4 transition hover-glow hover:-translate-y-0.5">
      <Link to={`/theory/${note.slug}`} className="block">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">{summary}</p>
      </Link>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}
