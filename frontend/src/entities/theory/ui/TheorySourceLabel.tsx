import { useTranslation } from 'react-i18next'
import type { TheorySource } from '../model/types'

/** "Source: algocode.io", linked when the source has a url. */
export function TheorySourceLabel({ source }: { source: TheorySource }) {
  const { t } = useTranslation()
  return (
    <span className="text-xs text-[var(--muted)]">
      {t('theory.source')}:{' '}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[var(--amber)] hover:underline">
          {source.name}
        </a>
      ) : (
        source.name
      )}
    </span>
  )
}
