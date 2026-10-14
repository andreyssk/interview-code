import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { RunResult } from '@/shared/api/run'
import { usePersistentState } from '@/shared/lib/storage'
import { Chevron } from '@/shared/ui'
import { statusTone, type RunStatus } from '../model/useRunCode'

const MIN = 90
const MIN_ABOVE = 140 // always leave this much of the editor visible

interface Props {
  status: RunStatus
  result?: RunResult
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The console under the editor: a bar that is always there, and a body with the output that opens by itself when
 * a run finishes. The body scrolls, and the bar above it can be dragged (or moved with the arrow keys) to resize it.
 */
export function RunConsole({ status, result, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [height, setHeight] = usePersistentState('console-height', 220)
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startHeight: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // How tall the console may get: the panel it sits in, minus a strip of editor that must stay visible.
  const [room, setRoom] = useState(600)
  useEffect(() => {
    const parent = root.current?.parentElement
    if (!parent) return
    const observer = new ResizeObserver(([entry]) => setRoom(entry.contentRect.height - MIN_ABOVE))
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])
  const clamp = (h: number) => Math.max(MIN, Math.min(h, room))
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startY: e.clientY, startHeight: height }
    setDragging(true)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setHeight(clamp(drag.current.startHeight + (drag.current.startY - e.clientY)))
  }
  const onUp = () => {
    drag.current = null
    setDragging(false)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') setHeight(clamp(height + 24))
    else if (e.key === 'ArrowDown') setHeight(clamp(height - 24))
    else return
    e.preventDefault()
  }

  const summary =
    status === 'running'
      ? t('task.compiling')
      : status === 'error'
        ? t('task.runnerError')
        : result
          ? t(`status.${status}`, { ms: result.durationMs })
          : ''

  return (
    <div ref={root} className="flex flex-none flex-col border-t border-[var(--border)] bg-[var(--panel)]" style={open ? { height: clamp(height) } : undefined}>
      {open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('task.consoleResize')}
          aria-valuenow={Math.round(height)}
          tabIndex={0}
          className={`console-grip ${dragging ? 'console-grip-active' : ''}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        />
      )}
      <div className="flex flex-none items-center gap-3 px-3 py-1.5 text-sm">
        <button className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)]" aria-expanded={open} onClick={() => onOpenChange(!open)}>
          <Chevron open={open} />
          <span className="text-xs uppercase leading-none tracking-wider">{t('task.console')}</span>
        </button>
        <span className={`min-w-0 flex-1 truncate ${statusTone[status]}`}>{summary}</span>
        {open && (
          <button className="text-[var(--muted)] hover:text-[var(--text)]" aria-label={t('task.consoleClose')} onClick={() => onOpenChange(false)}>
            ✕
          </button>
        )}
      </div>
      {open && (
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
          {status === 'running' ? (
            <p className="text-[var(--cyan)]">{t('task.compiling')}</p>
          ) : status === 'error' ? (
            <p className="text-[var(--pink)]">{t('task.runnerError')}</p>
          ) : result ? (
            <pre className="console-output">{result.output || t('task.noOutput')}</pre>
          ) : (
            <p className="text-[var(--muted)]">{t('task.consoleEmpty')}</p>
          )}
        </div>
      )}
    </div>
  )
}
