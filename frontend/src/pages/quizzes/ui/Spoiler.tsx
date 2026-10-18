import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hides its content (blurred, not selectable, not readable by assistive tech) until the reader clicks it.
 * Once revealed, a small button hides it again.
 */
export function Spoiler({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <div className={`spoiler-body ${shown ? '' : 'spoiler-hidden'}`} aria-hidden={!shown} inert={!shown}>
        {children}
      </div>
      {!shown && (
        <button type="button" className="spoiler-cover" onClick={() => setShown(true)}>
          <span className="spoiler-hint">{t('quizzes.reveal')}</span>
        </button>
      )}
      {shown && (
        <button type="button" className="spoiler-hide" onClick={() => setShown(false)}>
          {t('quizzes.hide')}
        </button>
      )}
    </div>
  )
}
