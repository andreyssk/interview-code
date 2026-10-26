import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { UNCATEGORIZED, useQuestionCategories, useQuestions } from '@/entities/question'
import { useQuizzes } from '@/entities/quiz'
import { startSession, type SessionKind, type SessionMode } from '@/shared/api/sessions'
import { queryKeys } from '@/shared/api/queryKeys'
import { useCompanies } from '@/entities/task'
import { Field, Modal, MultiSelect } from '@/shared/ui'

const PRESETS = [5, 10, 20]

/**
 * Sets up a session: how many items, which question categories, and how to pick them (random or SRS-weighted).
 * Asking for more than exists gives everything that exists; an empty pool cannot start and says so.
 */
export function StartSessionDialog({ kind, onClose }: { kind: SessionKind; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const questions = useQuestions()
  const quizzes = useQuizzes()
  const categories = useQuestionCategories()
  const companies = useCompanies()
  const [count, setCount] = useState(10)
  const [mode, setMode] = useState<SessionMode>('srs')
  const [picked, setPicked] = useState<string[]>([])
  const [pickedCompanies, setPickedCompanies] = useState<string[]>([])

  const hasUncategorized = questions.some((q) => !q.category)
  const options = [
    ...categories.map((c) => ({ value: c.slug, label: `${c.name} (${questions.filter((q) => q.category === c.slug).length})` })),
    ...(hasUncategorized && categories.length > 0 ? [{ value: UNCATEGORIZED, label: `${t('questions.uncategorized')} (${questions.filter((q) => !q.category).length})` }] : []),
  ]
  const companyOptions = companies.map((c) => ({ value: c.slug, label: c.name }))
  const available =
    kind === 'quiz'
      ? quizzes.length
      : questions.filter(
          (q) =>
            (picked.length === 0 || picked.includes(q.category ?? UNCATEGORIZED)) &&
            (pickedCompanies.length === 0 || q.companies.some((c) => pickedCompanies.includes(c))),
        ).length
  const wanted = Math.max(1, Math.floor(count) || 1)
  const given = Math.min(wanted, available)

  const start = useMutation({
    mutationFn: () => startSession({ kind, mode, count: given, categories: kind === 'question' ? picked : undefined, companies: kind === 'question' ? pickedCompanies : undefined }),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
      navigate(`/session/${s.id}`)
    },
  })
  const empty = available === 0
  const emptyMessage = kind === 'quiz' ? t('session.noQuizzes') : picked.length > 0 || pickedCompanies.length > 0 ? t('session.noQuestionsInCategories') : t('session.noQuestions')

  return (
    <Modal open title={t(kind === 'quiz' ? 'session.titleQuiz' : 'session.titleQuestion')} onClose={onClose} wide>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!empty && !start.isPending) start.mutate()
        }}
      >
        <Field label={t('session.count')} group>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((n) => (
              <button key={n} type="button" className={`chip ${count === n ? 'chip-active' : ''}`} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
            <button type="button" className={`chip ${count === available && available > 0 ? 'chip-active' : ''}`} disabled={empty} onClick={() => setCount(available)}>
              {t('session.max', { count: available })}
            </button>
            <input
              type="number"
              min={1}
              max={1000}
              className="search w-24"
              aria-label={t('session.count')}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          {!empty && given < wanted && <span className="text-xs text-[var(--amber)]">{t('session.onlyAvailable', { count: given })}</span>}
        </Field>
        {kind === 'question' && (
          <>
            <Field label={t('session.categories')} hint={t('session.categoriesHint')} group>
              <MultiSelect
                label={t('session.categories')}
                placeholder={t('session.searchCategories')}
                options={options}
                value={picked}
                onChange={setPicked}
                emptyText={{ all: t('filters.allSelected'), none: t('filters.noMatch') }}
              />
            </Field>
            <Field label={t('session.companies')} hint={t('session.companiesHint')} group>
              <MultiSelect
                label={t('session.companies')}
                placeholder={t('filters.searchCompanies')}
                options={companyOptions}
                value={pickedCompanies}
                onChange={setPickedCompanies}
                emptyText={{ all: t('filters.allSelected'), none: t('filters.noMatch') }}
              />
            </Field>
          </>
        )}
        <Field label={t('session.mode')} group>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['srs', 'random'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                className={`panel flex flex-col gap-1 p-3 text-left ${mode === m ? 'chip-active' : ''}`}
                onClick={() => setMode(m)}
              >
                <b>{t(`session.mode_${m}`)}</b>
                <span className="text-xs text-[var(--muted)]">{t(`session.mode_${m}_hint`)}</span>
              </button>
            ))}
          </div>
        </Field>
        {empty && (
          <p role="alert" className="text-sm text-[var(--pink)]">
            {emptyMessage}
          </p>
        )}
        {start.isError && (
          <p role="alert" className="text-sm text-[var(--pink)]">
            {start.error.message}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="btn-run" disabled={empty || start.isPending}>
            {start.isPending ? t('session.starting') : t('session.start', { count: given })}
          </button>
        </div>
      </form>
    </Modal>
  )
}
