import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMistakeType, useMistakeTypes } from '@/entities/mistake'
import { TaskTitleLink, useTask } from '@/entities/task'
import type { Mistake, MistakeTypeDetail } from '@/shared/api/mistakes'
import { highlightGo } from '@/shared/lib/highlight'
import { Modal, Popover, Spinner, StatusTag } from '@/shared/ui'

interface Selected {
  type: MistakeTypeDetail
  mistake: Mistake
}

/** Task title as plain text: the row is a button, so it can't hold a link. */
function MistakeTitle({ slug }: { slug: string }) {
  const task = useTask(slug)
  return <span className="min-w-0 truncate">{task?.title ?? slug}</span>
}

function TypeMistakes({ id, onSelect }: { id: number; onSelect: (s: Selected) => void }) {
  const { t, i18n } = useTranslation()
  const { data, isPending } = useMistakeType(id)
  if (isPending) return <Spinner inline />
  return (
    <ul className="mb-1 ml-3 flex flex-col gap-1 border-l border-[var(--border)] pl-3">
      {data?.mistakes.map((m) => (
        <li key={m.id}>
          <button className="dropdown-item dropdown-item-row" onClick={() => onSelect({ type: data, mistake: m })}>
            <MistakeTitle slug={m.taskSlug} />
            <span className="shrink-0 text-xs">{new Date(m.createdAt).toLocaleDateString(i18n.language)}</span>
          </button>
        </li>
      ))}
      <li className="px-3">
        <Link to={`/mistakes/${id}`} className="text-xs text-[var(--cyan)] hover:underline">
          {t('mistakes.openType')}
        </Link>
      </li>
    </ul>
  )
}

/** Header button that opens the whole mistakes journal (every type and its mistakes) in a popover. */
export function MistakesPopover() {
  const { t } = useTranslation()
  const { data: types, isPending, isError } = useMistakeTypes()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [selected, setSelected] = useState<Selected | null>(null)

  return (
    <>
      <Popover button={<><span aria-hidden="true">⚠</span> {t('nav.mistakes')}</>} label={t('mistakes.title')}>
        {(close) => (
          <>
            {isPending && <Spinner />}
            {isError && <p className="p-2 text-sm text-[var(--pink)]">{t('mistakes.loadError')}</p>}
            {types?.length === 0 && <p className="p-2 text-sm text-[var(--muted)]">{t('mistakes.empty')}</p>}
            {types?.map((type) => (
              <div key={type.id}>
                <button
                  className="dropdown-item dropdown-item-row"
                  aria-expanded={expanded === type.id}
                  onClick={() => setExpanded(expanded === type.id ? null : type.id)}
                >
                  <span className="min-w-0 truncate">{type.title}</span>
                  <span className="tag neon-amber shrink-0">{type.count}</span>
                </button>
                {expanded === type.id && (
                  <TypeMistakes
                    id={type.id}
                    onSelect={(sel) => {
                      close()
                      setSelected(sel)
                    }}
                  />
                )}
              </div>
            ))}
          </>
        )}
      </Popover>
      <MistakeModal selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function MistakeModal({ selected, onClose }: { selected: Selected | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  // Keep the last selection while the dialog closes so its content doesn't blank out.
  const [view, setView] = useState(selected)
  if (selected && selected !== view) setView(selected)
  return (
    <Modal open={selected !== null} code title={view?.type.title ?? ''} onClose={onClose}>
      {view && (
        <>
          {view.type.description && <p className="mb-4 whitespace-pre-wrap text-[var(--muted)]">{view.type.description}</p>}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <TaskTitleLink slug={view.mistake.taskSlug} className="font-semibold text-[var(--cyan)] hover:underline" />
            <StatusTag status={view.mistake.status} />
            <span className="text-sm text-[var(--muted)]">{new Date(view.mistake.createdAt).toLocaleString(i18n.language)}</span>
          </div>
          <pre className="attempt-code">{highlightGo(view.mistake.code)}</pre>
          {view.mistake.output && (
            <>
              <div className="mb-1 mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">{t('attempts.output')}</div>
              <pre className="attempt-output">{view.mistake.output}</pre>
            </>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Link to={`/mistakes/${view.type.id}`} className="btn-ghost" onClick={onClose}>
              {t('mistakes.openType')}
            </Link>
            <button className="btn-ghost" onClick={onClose}>
              {t('dialog.close')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
