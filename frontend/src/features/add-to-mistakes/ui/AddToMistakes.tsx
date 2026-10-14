import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MistakeTypePicker, effectiveChoice, emptyDraft, isDraftValid, useMistakeTypes, type TypeChoice } from '@/entities/mistake'
import type { Attempt } from '@/shared/api/attempts'
import { addMistake, createMistakeType } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'
import { Modal } from '@/shared/ui'

/** For a failed attempt: a button that files it under a type of mistake (existing or new), or a link to its type. */
export function AddToMistakes({ attempt }: { attempt: Attempt }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: types = [] } = useMistakeTypes()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<TypeChoice>(null)
  const [draft, setDraft] = useState(emptyDraft)

  const choice = effectiveChoice(types, selected)
  const canSave = choice === 'new' ? isDraftValid(draft) : choice !== null

  const save = useMutation({
    mutationFn: async () => {
      const typeId = choice === 'new' ? (await createMistakeType(draft)).id : (choice as number)
      return addMistake({ attemptId: attempt.id, typeId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts(attempt.taskSlug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mistakeTypes })
      queryClient.invalidateQueries({ queryKey: ['mistake-type'] })
      setOpen(false)
      setSelected(null)
      setDraft(emptyDraft)
    },
  })

  if (attempt.status === 'passed' || attempt.status === 'saved') return null

  if (attempt.mistake) {
    return (
      <Link to={`/mistakes/${attempt.mistake.typeId}`} className="tag neon-amber hover:underline">
        {t('mistakes.inJournal', { type: attempt.mistake.typeTitle })}
      </Link>
    )
  }

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        {t('mistakes.add')}
      </button>
      <Modal open={open} wide title={t('mistakes.addTitle')} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) save.mutate()
          }}
        >
          <MistakeTypePicker
            types={types}
            selected={selected}
            onSelect={setSelected}
            draft={draft}
            onDraftChange={setDraft}
            legend={t('mistakes.chooseType')}
          />
          {save.isError && <p className="mt-3 text-[var(--pink)]">{save.error.message || t('mistakes.saveError')}</p>}
          <div className="modal-actions mt-5">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={save.isPending}>
              {t('dialog.cancel')}
            </button>
            <button type="submit" className="btn-run" disabled={!canSave || save.isPending}>
              {t('mistakes.submitAdd')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
