import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useQuestions, type Question } from '@/entities/question'
import { useQuizzes, type Quiz } from '@/entities/quiz'
import { SessionSummary } from '@/features/study-session'
import { queryKeys } from '@/shared/api/queryKeys'
import { fetchSession, RATINGS, rateSessionItem, type StudySession } from '@/shared/api/sessions'
import { highlight } from '@/shared/lib/highlight'
import { RichBlocks, Spinner } from '@/shared/ui'

/**
 * Plays a stored session item by item: the prompt without its answer, a button to reveal it, then a self-rating
 * (keys 1–4). Opening an unfinished session continues at its first unrated item.
 */
export function SessionPage() {
  const { t } = useTranslation()
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const questions = useQuestions()
  const quizzes = useQuizzes()
  const { data: session, isPending, isError } = useQuery({ queryKey: queryKeys.session(id), queryFn: () => fetchSession(id), enabled: id > 0 })
  // Items whose question / quiz was deleted after the session started: skipped on screen, never rated.
  const [skipped, setSkipped] = useState<number[]>([])
  const rate = useMutation({
    mutationFn: ({ position, rating }: { position: number; rating: number }) => rateSessionItem(id, position, rating),
    onSuccess: (s) => {
      queryClient.setQueryData(queryKeys.session(id), s)
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
    },
  })

  if (isPending) return <Spinner />
  if (isError || !session) return <p className="text-[var(--pink)]">{t('session.notFound')}</p>

  const items = session.items ?? []
  const lookup = (kind: StudySession['kind'], itemId: number) => (kind === 'quiz' ? quizzes.find((q) => q.id === itemId) : questions.find((q) => q.id === itemId))
  const current = items.find((it) => it.rating === null && !skipped.includes(it.position))
  const done = items.filter((it) => it.rating !== null).length
  const content = current && lookup(session.kind, current.itemId)

  if (!current) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="neon-title text-3xl font-bold">{t('session.summaryTitle')}</h1>
        <SessionSummary session={session} />
        <div className="flex flex-wrap gap-3">
          <Link to={session.kind === 'quiz' ? '/quizzes' : '/questions'} className="btn-run">
            {t('session.playAgain')}
          </Link>
          <Link to="/history" className="btn-ghost">
            {t('nav.history')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <span>{t('session.progress', { n: done + 1, total: items.length })}</span>
        <Link to={session.kind === 'quiz' ? '/quizzes' : '/questions'} className="hover:text-[var(--cyan)]">
          {t('session.leave')}
        </Link>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-[var(--border)]" aria-hidden="true">
        <div className="h-full bg-[var(--cyan)] transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {!content ? (
        <div className="panel flex flex-col gap-3 p-5">
          <p className="text-[var(--muted)]">{t('session.missing', { title: current.title })}</p>
          <div>
            <button className="btn-ghost" autoFocus onClick={() => setSkipped((s) => [...s, current.position])}>
              {t('session.skip')}
            </button>
          </div>
        </div>
      ) : (
        <Card
          key={current.position}
          item={content}
          kind={session.kind}
          busy={rate.isPending}
          onRate={(rating) => rate.mutate({ position: current.position, rating })}
        />
      )}
      {rate.isError && <p className="text-sm text-[var(--pink)]">{rate.error.message}</p>}
    </div>
  )
}

function Card({ item, kind, busy, onRate }: { item: Question | Quiz; kind: StudySession['kind']; busy: boolean; onRate: (rating: number) => void }) {
  const { t } = useTranslation()
  const quiz = kind === 'quiz' ? (item as Quiz) : null
  const question = kind === 'question' ? (item as Question) : null
  // Questions have one answer; a quiz reveals stage by stage, then asks for one rating for the whole quiz.
  const [stage, setStage] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const stages = quiz?.stages.length ?? 1
  const allRevealed = revealed && stage === stages - 1

  useEffect(() => {
    if (!allRevealed || busy) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const r = RATINGS[Number(e.key) - 1]
      if (r) onRate(r.value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [allRevealed, busy, onRate])

  const advance = () => {
    if (!revealed) setRevealed(true)
    else {
      setStage((s) => s + 1)
      setRevealed(false)
    }
  }

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <h1 className="text-xl font-semibold">{question ? question.title : quiz!.title || t('quizzes.defaultPrompt')}</h1>
      {question && revealed && (
        <div className="border-t border-[var(--border)] pt-4 text-lg">
          <RichBlocks blocks={question.answer} />
        </div>
      )}
      {quiz &&
        quiz.stages.slice(0, stage + 1).map((st, i) => (
          <div key={i} className="flex flex-col gap-3">
            {stages > 1 && <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{t('quizzes.stage', { n: i + 1, total: stages })}</div>}
            <pre className="code-block">{highlight(st.code, quiz.language)}</pre>
            {(i < stage || revealed) && (
              <>
                <pre className="output">{st.answer}</pre>
                {st.explanation && (
                  <p className="text-sm text-[var(--muted)]">
                    <b className="text-[var(--text)]">{t('quizzes.why')}:</b> {st.explanation}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      {!allRevealed ? (
        <div>
          <button type="button" className="btn-run btn-lg" autoFocus onClick={advance}>
            {!revealed ? t('session.showAnswer') : t('session.nextStage')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
          <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{t('session.rateTitle')}</span>
          <div className="grid gap-2 sm:grid-cols-4">
            {RATINGS.map((r, i) => (
              <button key={r.value} type="button" className="btn-ghost" disabled={busy} onClick={() => onRate(r.value)}>
                <span className="mr-2 text-[var(--muted)]">{i + 1}</span>
                {t(`session.rating.${r.key}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
