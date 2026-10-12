import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MistakeTypePicker, effectiveChoice, emptyDraft, isDraftValid, useMistakeTypes, type TypeChoice } from '@/entities/mistake'
import { createMistakeType, moveMistake, type Mistake } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'
import { Modal } from '@/shared/ui'

/** "Move" button with a dialog to file a mistake under another type (existing or new). */
export function MoveMistake({ mistake }: { mistake: Mistake }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: allTypes = [] } = useMistakeTypes()
  const types = allTypes.filter((type) => type.id !== mistake.typeId) // moving to where it already is makes no sense
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<TypeChoice>(null)
  const [draft, setDraft] = useState(emptyDraft)

  const choice = effectiveChoice(types, selected)
  const canSave = choice === 'new' ? isDraftValid(draft) : choice !== null

  const move = useMutation({
    mutationFn: async () => {
      const typeId = choice === 'new' ? (await createMistakeType(draft)).id : (choice as number)
      return moveMistake(mistake.id, typeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mistake-type'] }) // both the old and the new type
      queryClient.invalidateQueries({ queryKey: queryKeys.mistakeTypes })
      queryClient.invalidateQueries({ queryKey: ['attempts'] })
      setOpen(false)
      setSelected(null)
      setDraft(emptyDraft)
    },
  })

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        {t('mistakes.move')}
      </button>
      <Modal open={open} wide title={t('mistakes.moveTitle')} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) move.mutate()
          }}
        >
          <MistakeTypePicker
            types={types}
            selected={selected}
            onSelect={setSelected}
            draft={draft}
            onDraftChange={setDraft}
            legend={t('mistakes.moveChoose')}
          />
          {move.isError && <p className="mt-3 text-[var(--pink)]">{move.error.message || t('mistakes.saveError')}</p>}
          <div className="modal-actions mt-5">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={move.isPending}>
              {t('dialog.cancel')}
            </button>
            <button type="submit" className="btn-run" disabled={!canSave || move.isPending}>
              {t('mistakes.moveSubmit')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
