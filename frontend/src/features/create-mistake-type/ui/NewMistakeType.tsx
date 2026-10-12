import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MistakeTypeForm, emptyDraft, isDraftValid } from '@/entities/mistake'
import { createMistakeType } from '@/shared/api/mistakes'
import { queryKeys } from '@/shared/api/queryKeys'
import { Modal } from '@/shared/ui'

/** "New type" button with its dialog (title and description). */
export function NewMistakeType() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)

  const create = useMutation({
    mutationFn: () => createMistakeType(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mistakeTypes })
      setOpen(false)
      setDraft(emptyDraft)
    },
  })

  return (
    <>
      <button className="btn-run" onClick={() => setOpen(true)}>
        + {t('mistakes.newType')}
      </button>
      <Modal open={open} wide title={t('mistakes.newType')} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (isDraftValid(draft)) create.mutate()
          }}
        >
          <MistakeTypeForm value={draft} onChange={setDraft} />
          {create.isError && <p className="mt-3 text-[var(--pink)]">{create.error.message || t('mistakes.saveError')}</p>}
          <div className="modal-actions mt-5">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              {t('dialog.cancel')}
            </button>
            <button type="submit" className="btn-run" disabled={!isDraftValid(draft) || create.isPending}>
              {t('mistakes.create')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
