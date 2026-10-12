import { useTranslation } from 'react-i18next'
import { Modal } from '../modal/Modal'

interface Props {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  /** 'danger' paints the confirm button red and focuses Cancel first */
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Themed replacement for window.confirm. */
export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'default', busy, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      {message && <p className="modal-message">{message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" autoFocus={tone === 'danger'} onClick={onCancel} disabled={busy}>
          {t('dialog.cancel')}
        </button>
        <button type="button" className={tone === 'danger' ? 'btn-danger-solid' : 'btn-run'} autoFocus={tone !== 'danger'} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
