import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { queryKeys } from '@/shared/api/queryKeys'
import { deleteSession, fetchSessions, sessionScore, type StudySession } from '@/shared/api/sessions'
import { ConfirmDialog, Spinner } from '@/shared/ui'

/** The user's past study sessions, newest first; a click opens the per-item ratings. */
export function HistoryPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { data: sessions, isPending, isError } = useQuery({ queryKey: queryKeys.sessions, queryFn: fetchSessions })
  const [removing, setRemoving] = useState<StudySession | null>(null)
  const remove = useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
    },
  })

  return (
    <div>
      <h1 className="neon-title mb-4 text-3xl font-bold">{t('history.title')}</h1>
      {isPending && <Spinner />}
      {isError && <p className="text-[var(--pink)]">{t('history.loadError')}</p>}
      {sessions && sessions.length === 0 && <div className="panel p-6 text-[var(--muted)]">{t('history.empty')}</div>}
      <ul className="flex flex-col gap-1.5">
        {sessions?.map((s) => {
          const score = sessionScore(s.counts)
          return (
            <li key={s.id} className="panel flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
              <Link to={`/history/${s.id}`} className="flex min-w-0 flex-1 basis-60 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{t(s.kind === 'quiz' ? 'history.quizzes' : 'history.questions', { count: s.total })}</span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(s.createdAt).toLocaleString(i18n.language)} · {t(`session.mode_${s.mode}`)}
                </span>
                {!s.finishedAt && <span className="tag neon-amber">{t('history.unfinished')}</span>}
              </Link>
              <span className="text-sm tabular-nums text-[var(--muted)]">{score === null ? '—' : `${score}%`}</span>
              {!s.finishedAt && (
                <Link to={`/session/${s.id}`} className="btn-ghost">
                  {t('history.continue')}
                </Link>
              )}
              <button className="btn-danger" onClick={() => setRemoving(s)}>
                {t('history.delete')}
              </button>
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        title={t('history.deleteTitle')}
        confirmLabel={t('history.delete')}
        tone="danger"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
