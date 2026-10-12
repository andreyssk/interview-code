import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MistakeTypeForm, isDraftValid, type MistakeTypeDraft } from '@/entities/mistake'
import { updateMistakeType, type MistakeType } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'
import { Modal } from '@/shared/ui'

/** "Edit" button with a dialog to change a type's title and description. */
export function EditMistakeType({ type }: { type: MistakeType }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MistakeTypeDraft>({ title: type.title, description: type.description })

  const save = useMutation({
    mutationFn: () => updateMistakeType(type.id, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mistakeType(type.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mistakeTypes })
      queryClient.invalidateQueries({ queryKey: ['attempts'] }) // attempts show the type's title
      setOpen(false)
    },
  })

  return (
    <>
      <button
        className="btn-ghost"
        onClick={() => {
          setDraft({ title: type.title, description: type.description }) // always start from the saved values
          save.reset()
          setOpen(true)
        }}
      >
        {t('mistakes.edit')}
      </button>
      <Modal open={open} wide title={t('mistakes.editTitle')} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (isDraftValid(draft)) save.mutate()
          }}
        >
          <MistakeTypeForm value={draft} onChange={setDraft} />
          {save.isError && <p className="mt-3 text-[var(--pink)]">{save.error.message || t('mistakes.saveError')}</p>}
          <div className="modal-actions mt-5">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={save.isPending}>
              {t('dialog.cancel')}
            </button>
            <button type="submit" className="btn-run" disabled={!isDraftValid(draft) || save.isPending}>
              {t('mistakes.save')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
