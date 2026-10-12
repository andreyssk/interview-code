import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMistakeType } from '@/entities/mistake'
import { TaskTitleLink } from '@/entities/task'
import { EditMistakeType } from '@/features/edit-mistake-type'
import { MoveMistake } from '@/features/move-mistake'
import { deleteMistake, deleteMistakeType, type Mistake } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'
import { highlightGo } from '@/shared/lib/highlight'
import { ConfirmDialog, Spinner, StatusTag } from '@/shared/ui'

export function MistakeTypePage() {
  const { t, i18n } = useTranslation()
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useMistakeType(id)
  const [open, setOpen] = useState<number | null>(null) // mistake whose code is expanded
  const [removing, setRemoving] = useState<Mistake | null>(null)
  const [deletingType, setDeletingType] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mistakeType(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.mistakeTypes })
    queryClient.invalidateQueries({ queryKey: ['attempts'] }) // attempts show which type they are filed under
  }

  const removeMistake = useMutation({
    mutationFn: deleteMistake,
    onSettled: () => {
      setRemoving(null)
      refresh()
    },
  })
  const removeType = useMutation({
    mutationFn: () => deleteMistakeType(id),
    onSuccess: () => {
      refresh()
      navigate('/mistakes', { replace: true })
    },
    onSettled: () => setDeletingType(false),
  })

  const back = (
    <Link to="/mistakes" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
      {t('mistakes.back')}
    </Link>
  )
  if (isPending) return <div>{back}<Spinner /></div>
  if (isError || !data) return <div>{back}<p>{t('mistakes.notFound')}</p></div>

  return (
    <div>
      {back}
      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="neon-title text-3xl font-bold">{data.title}</h1>
        <div className="flex shrink-0 gap-2">
          <EditMistakeType type={data} />
          <button className="btn-danger" onClick={() => setDeletingType(true)}>
            {t('mistakes.deleteType')}
          </button>
        </div>
      </div>
      {data.description && <p className="mb-6 whitespace-pre-wrap text-[var(--muted)]">{data.description}</p>}

      {data.mistakes.length === 0 ? (
        <div className="panel p-6 text-[var(--muted)]">{t('mistakes.noMistakes')}</div>
      ) : (
        <ol className="flex flex-col gap-3">
          {data.mistakes.map((m) => (
            <li key={m.id} className="output">
              <div className="flex flex-wrap items-center gap-3">
                <TaskTitleLink slug={m.taskSlug} className="font-semibold text-[var(--cyan)] hover:underline" />
                <StatusTag status={m.status} />
                <span className="text-[var(--muted)]">{new Date(m.createdAt).toLocaleString(i18n.language)}</span>
                <span className="ml-auto flex gap-2">
                  <button className="btn-ghost" onClick={() => setOpen(open === m.id ? null : m.id)}>
                    {open === m.id ? t('attempts.hideCode') : t('attempts.showCode')}
                  </button>
                  <MoveMistake mistake={m} />
                  <button className="btn-danger" onClick={() => setRemoving(m)}>
                    {t('mistakes.removeMistake')}
                  </button>
                </span>
              </div>
              {open === m.id && (
                <div className="mt-3">
                  <pre className="attempt-code">{highlightGo(m.code)}</pre>
                  {m.output && (
                    <>
                      <div className="mb-1 mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">{t('attempts.output')}</div>
                      <pre className="attempt-output">{m.output}</pre>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title={t('mistakes.removeTitle')}
        message={t('mistakes.removeMessage')}
        confirmLabel={t('mistakes.removeMistake')}
        busy={removeMistake.isPending}
        onConfirm={() => removing && removeMistake.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={deletingType}
        tone="danger"
        title={t('mistakes.deleteTypeTitle')}
        message={t('mistakes.deleteTypeMessage')}
        confirmLabel={t('mistakes.deleteType')}
        busy={removeType.isPending}
        onConfirm={() => removeType.mutate()}
        onCancel={() => setDeletingType(false)}
      />
    </div>
  )
}
