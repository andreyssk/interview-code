import { useTranslation } from 'react-i18next'
import type { AttemptStatus } from '../../api/run'

const TONE: Record<AttemptStatus, string> = {
  passed: 'neon-green',
  failed: 'neon-pink',
  compile: 'neon-pink',
  timeout: 'neon-amber',
}

/** Result of a run: passed, failed, compile error or timeout. */
export function StatusTag({ status }: { status: AttemptStatus }) {
  const { t } = useTranslation()
  return <span className={`tag ${TONE[status]}`}>{t(`attempts.status.${status}`)}</span>
}
