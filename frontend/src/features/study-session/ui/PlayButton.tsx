import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionKind } from '@/shared/api/sessions'
import { StartSessionDialog } from './StartSessionDialog'

/** "Play" button for the top of the Questions / Quizzes pages: opens the dialog that sets up a session. */
export function PlayButton({ kind }: { kind: SessionKind }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn-run" onClick={() => setOpen(true)}>
        ▶ {t('session.play')}
      </button>
      {open && <StartSessionDialog kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}
