import { useTranslation } from 'react-i18next'
import { RATINGS, sessionScore, type StudySession } from '@/shared/api/sessions'

/** Totals per rating, the overall score and every item with its rating. Used at the end of a session and in history. */
export function SessionSummary({ session }: { session: StudySession }) {
  const { t } = useTranslation()
  const score = sessionScore(session.counts)
  const items = session.items ?? []
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="panel p-3 text-center">
          <div className="text-3xl font-bold">{score === null ? '—' : `${score}%`}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{t('session.score')}</div>
        </div>
        {RATINGS.map((r) => (
          <div key={r.value} className="panel p-3 text-center">
            <div className="text-3xl font-bold">{session.counts[r.value]}</div>
            <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{t(`session.rating.${r.key}`)}</div>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => {
          const r = RATINGS.find((x) => x.value === it.rating)
          return (
            <li key={it.position} className="panel flex items-center justify-between gap-3 px-4 py-2">
              <span className="min-w-0 truncate">{it.title}</span>
              {r ? <span className={`tag ${r.tone}`}>{t(`session.rating.${r.key}`)}</span> : <span className="text-xs text-[var(--muted)]">{t('session.notRated')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
