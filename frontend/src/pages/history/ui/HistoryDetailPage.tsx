import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { SessionSummary } from '@/features/study-session'
import { queryKeys } from '@/shared/api/queryKeys'
import { fetchSession } from '@/shared/api/sessions'
import { Spinner } from '@/shared/ui'

/** One past session: totals and the rating of every item. */
export function HistoryDetailPage() {
  const { t, i18n } = useTranslation()
  const id = Number(useParams().id)
  const { data: session, isPending, isError } = useQuery({ queryKey: queryKeys.session(id), queryFn: () => fetchSession(id), enabled: id > 0 })
  return (
    <div className="flex flex-col gap-4">
      <Link to="/history" className="text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        ← {t('history.title')}
      </Link>
      {isPending && <Spinner />}
      {(isError || !session) && !isPending && <p className="text-[var(--pink)]">{t('session.notFound')}</p>}
      {session && (
        <>
          <h1 className="neon-title text-3xl font-bold">{t(session.kind === 'quiz' ? 'history.quizzes' : 'history.questions', { count: session.total })}</h1>
          <p className="text-sm text-[var(--muted)]">
            {new Date(session.createdAt).toLocaleString(i18n.language)} · {t(`session.mode_${session.mode}`)}
          </p>
          <SessionSummary session={session} />
          {!session.finishedAt && (
            <div>
              <Link to={`/session/${session.id}`} className="btn-run">
                {t('history.continue')}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
