import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/shared/lib/formatDuration'
import type { useSolveTimer } from '../model/useSolveTimer'

/** Stopwatch controls: start/stop and, when stopped with a reading, reset. */
export function SolveTimer({ timer }: { timer: ReturnType<typeof useSolveTimer> }) {
  const { t } = useTranslation()
  const toggleLabel = timer.running ? t('timer.stop') : t('timer.start')
  return (
    <span className="flex items-center gap-2">
      <span className="timer" title={t('timer.label')}>
        <button className="timer-toggle" aria-label={toggleLabel} title={toggleLabel} onClick={timer.running ? timer.stop : timer.start}>
          <span aria-hidden="true">{timer.running ? '■' : '▶'}</span>
        </button>
        <button className="timer-toggle" aria-label={t('timer.reset')} title={t('timer.reset')} disabled={!timer.running && timer.elapsedMs === 0} onClick={timer.reset}>
          <span aria-hidden="true">↺</span>
        </button>
        <span className={`min-w-[3rem] text-right font-mono tabular-nums ${timer.running ? 'text-[var(--cyan)]' : 'text-[var(--muted)]'}`}>
          {formatDuration(timer.elapsedMs)}
        </span>
      </span>
    </span>
  )
}
