import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChangePasswordForm } from '@/features/change-password'
import { useAuth } from '@/shared/auth/AuthContext'
import { Modal, Popover } from '@/shared/ui'

/** Header menu of the signed-in user: admin link, change password, sign out. */
export function UserMenu() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [changing, setChanging] = useState(false)

  return (
    <>
      <Popover button={<>{user.username} <span aria-hidden="true">▾</span></>} label={t('auth.account')}>
        {(close) => (
          <div className="flex flex-col">
            {user.role === 'admin' && (
              <Link to="/admin" className="dropdown-item" onClick={close}>
                {t('nav.admin')}
              </Link>
            )}
            <button
              className="dropdown-item"
              onClick={() => {
                close()
                setChanging(true)
              }}
            >
              {t('auth.changePassword')}
            </button>
            <button className="dropdown-item" onClick={() => signOut()}>
              {t('auth.signOut')}
            </button>
          </div>
        )}
      </Popover>
      <Modal open={changing} title={t('auth.changePassword')} onClose={() => setChanging(false)}>
        {changing && (
          <ChangePasswordForm
            onDone={() => setChanging(false)}
            extra={
              <button type="button" className="btn-ghost" onClick={() => setChanging(false)}>
                {t('dialog.cancel')}
              </button>
            }
          />
        )}
      </Modal>
    </>
  )
}
