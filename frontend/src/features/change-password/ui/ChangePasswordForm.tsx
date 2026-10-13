import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { changePassword } from '@/shared/api/auth'

interface Props {
  onDone: () => void
  /** Extra buttons next to Save (Cancel / Sign out) */
  extra?: React.ReactNode
}

export function ChangePasswordForm({ onDone, extra }: Props) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const save = useMutation({ mutationFn: changePassword, onSuccess: onDone })
  const mismatch = repeat !== '' && next !== repeat
  const canSave = current !== '' && next.length >= 8 && next === repeat && !save.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSave) save.mutate({ current, new: next })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input className="search" type="password" autoComplete="current-password" placeholder={t('auth.currentPassword')} value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
      <input className="search" type="password" autoComplete="new-password" placeholder={t('auth.newPassword')} value={next} onChange={(e) => setNext(e.target.value)} />
      <input className="search" type="password" autoComplete="new-password" placeholder={t('auth.repeatPassword')} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      {mismatch && <p className="text-sm text-[var(--pink)]">{t('auth.mismatch')}</p>}
      {save.isError && <p className="text-sm text-[var(--pink)]">{save.error.message}</p>}
      <div className="flex justify-end gap-2">
        {extra}
        <button type="submit" className="btn-run" disabled={!canSave}>
          {t('auth.changePassword')}
        </button>
      </div>
    </form>
  )
}
