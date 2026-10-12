import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { theoryForTask, useTheoryText, type TheoryDef } from '@/entities/theory'
import { Popover } from '@/shared/ui'

function Item({ note, onNavigate }: { note: TheoryDef; onNavigate: () => void }) {
  const { title, summary } = useTheoryText(note.slug)
  return (
    <Link to={`/theory/${note.slug}`} className="dropdown-item block whitespace-normal" onClick={onNavigate}>
      <span className="block font-medium text-[var(--text)]">{title}</span>
      <span className="block text-xs">{summary}</span>
    </Link>
  )
}

/** ⓘ button on the task page: articles linked to this task or to its categories. Renders nothing when there are none. */
export function TaskTheoryPopover({ task }: { task: { slug: string; categories: string[] } }) {
  const { t } = useTranslation()
  const notes = theoryForTask(task)
  if (notes.length === 0) return null
  return (
    <Popover iconOnly button={<span aria-hidden="true">ⓘ</span>} label={t('theory.relatedTitle')}>
      {(close) => (
        <>
          <h3 className="px-3 pb-1 pt-1 text-xs uppercase tracking-wider text-[var(--muted)]">{t('theory.relatedTitle')}</h3>
          {notes.map((n) => (
            <Item key={n.slug} note={n} onNavigate={close} />
          ))}
        </>
      )}
    </Popover>
  )
}
