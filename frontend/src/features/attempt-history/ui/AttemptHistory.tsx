import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clearSolveTime, deleteAttempt, fetchAttempts, type Attempt } from '@/shared/api/attempts'
import { queryKeys } from '@/shared/api/queryKeys'
import { formatDuration } from '@/shared/lib/formatDuration'
import { highlightGo } from '@/shared/lib/highlight'
import type { ReactNode } from 'react'
import { ConfirmDialog, Spinner, StatusTag } from '@/shared/ui'

interface Props {
  taskSlug: string
  /** Called with a past solution's code when the user wants it back in the editor */
  onRestore: (code: string) => void
  /** Extra actions per attempt, supplied by the caller (keeps features independent of each other) */
  renderActions?: (attempt: Attempt) => ReactNode
}

/** Every saved run of a task with its code, newest first. */
export function AttemptHistory({ taskSlug, onRestore, renderActions }: Props) {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery({ queryKey: queryKeys.attempts(taskSlug), queryFn: () => fetchAttempts(taskSlug) })
  const [open, setOpen] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<Attempt | null>(null) // attempt awaiting confirmation
  const queryClient = useQueryClient()

  // Deleting changes the solved/failed counters too, so refresh both.
  const remove = useMutation({
    mutationFn: deleteAttempt,
    onSettled: () => {
      setDeleting(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts(taskSlug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })

  const discardTime = useMutation({
    mutationFn: clearSolveTime,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.attempts(taskSlug) }),
  })

  if (isPending) return <Spinner />
  if (isError) return <p className="text-[var(--pink)]">{t('attempts.loadError')}</p>
  if (data.length === 0) return <p className="text-[var(--muted)]">{t('attempts.empty')}</p>

  return (
    <>
      {remove.isError && <p className="mb-3 text-[var(--pink)]">{t('attempts.deleteError')}</p>}
      <ol className="flex flex-col gap-3">
      {data.map((a) => (
        <li key={a.id} className="output">
          <div className="flex flex-wrap items-center gap-3">
            <StatusTag status={a.status} />
            <span className="text-[var(--muted)]">{new Date(a.createdAt).toLocaleString(i18n.language)}</span>
            <span className="text-[var(--muted)]">{a.durationMs} ms</span>
            {a.solveTimeMs !== null && (
              <span className="flex items-center gap-1.5">
                <span className="tag neon-cyan" title={t('timer.solveTime')}>
                  ⏱ {formatDuration(a.solveTimeMs)}
                </span>
                <button
                  className="btn-ghost"
                  disabled={discardTime.isPending}
                  title={t('timer.discardHint')}
                  onClick={() => discardTime.mutate(a.id)}
                >
                  {t('timer.discard')}
                </button>
              </span>
            )}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {renderActions?.(a)}
              <button className="btn-ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>
                {open === a.id ? t('attempts.hideCode') : t('attempts.showCode')}
              </button>
              <button
                className="btn-danger"
                disabled={remove.isPending}
                onClick={() => setDeleting(a)}
              >
                {t('attempts.delete')}
              </button>
            </span>
          </div>
          {open === a.id && (
            <div className="mt-3">
              <pre className="attempt-code">{highlightGo(a.code)}</pre>
              {a.status !== 'passed' && a.output && (
                <>
                  <div className="mb-1 mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">{t('attempts.output')}</div>
                  <pre className="attempt-output">{a.output}</pre>
                </>
              )}
              <button className="btn-ghost mt-3" onClick={() => onRestore(a.code)}>
                {t('attempts.restore')}
              </button>
            </div>
          )}
        </li>
      ))}
      </ol>
      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={t('attempts.deleteTitle')}
        message={t('attempts.deleteConfirm')}
        confirmLabel={t('attempts.delete')}
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
