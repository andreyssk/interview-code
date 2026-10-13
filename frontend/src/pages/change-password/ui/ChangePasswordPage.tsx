import { useTranslation } from 'react-i18next'
import { ChangePasswordForm } from '@/features/change-password'

/** Shown instead of the app after an admin reset the password: a new one must be chosen first. */
export function ChangePasswordPage({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto mt-16 w-[min(26rem,calc(100vw-2rem))]">
      <div className="panel p-6">
        <h1 className="neon-title mb-2 text-2xl font-bold">{t('auth.mustChangeTitle')}</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">{t('auth.mustChangeHint')}</p>
        <ChangePasswordForm
          onDone={onDone}
          extra={
            <button type="button" className="btn-ghost" onClick={onSignOut}>
              {t('auth.signOut')}
            </button>
          }
        />
      </div>
    </div>
  )
}
