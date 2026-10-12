import { useTranslation } from 'react-i18next'

interface Props {
  /** Small inline spinner (buttons, popovers) instead of the block one */
  inline?: boolean
}

/** Loading indicator; announced to screen readers as a status. */
export function Spinner({ inline }: Props) {
  const { t } = useTranslation()
  return (
    <span className={inline ? 'spinner-inline' : 'spinner-block'} role="status" aria-label={t('loading')}>
      <span className="spinner" aria-hidden="true" />
    </span>
  )
}
