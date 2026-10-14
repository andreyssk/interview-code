import { useTranslation } from 'react-i18next'
import type { RunResult } from '@/shared/api/run'
import { statusTone, type RunStatus } from '../model/useRunCode'

export function RunOutput({ status, result }: { status: RunStatus; result?: RunResult }) {
  const { t } = useTranslation()
  if (status === 'running') return <p className="text-[var(--cyan)]">{t('task.compiling')}</p>
  if (status === 'error') return <p className="text-[var(--pink)]">{t('task.runnerError')}</p>
  if (!result) return <p className="text-[var(--muted)]">{t('task.emptyOutput')}</p>
  return (
    <>
      <div className={`mb-3 text-lg font-semibold ${statusTone[status]}`}>{t(`status.${status}`, { ms: result.durationMs, sec: result.timeLimitSec })}</div>
      <pre className="output">{result.output || t('task.noOutput')}</pre>
    </>
  )
}
