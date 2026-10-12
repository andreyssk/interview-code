import { useCallback, useEffect, useState } from 'react'
import { usePersistentState } from '@/shared/lib/storage'

interface State {
  /** Milliseconds counted before the current run (or the whole reading when stopped) */
  acc: number
  /** Date.now() when the current run started; null while stopped */
  startedAt: number | null
  /** The reading was frozen by a successful submission: the next start begins from zero */
  done: boolean
}

const initial: State = { acc: 0, startedAt: null, done: false }

/** Manual stopwatch for one task. Survives reloads (kept in localStorage). */
export function useSolveTimer(taskSlug: string) {
  const [state, setState] = usePersistentState<State>(`timer:${taskSlug}`, initial)
  const [now, setNow] = useState(() => Date.now())
  const running = state.startedAt !== null

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  /** Current reading; reads the clock, so it is exact at the moment of a submit. */
  const elapsed = useCallback(() => state.acc + (state.startedAt !== null ? Date.now() - state.startedAt : 0), [state])

  return {
    running,
    elapsedMs: state.acc + (state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0),
    elapsed,
    start: () => setState((s) => (s.startedAt !== null ? s : { acc: s.done ? 0 : s.acc, startedAt: Date.now(), done: false })),
    stop: () => setState((s) => (s.startedAt === null ? s : { ...s, acc: s.acc + Date.now() - s.startedAt, startedAt: null })),
    reset: () => setState(initial),
    /** A passing submission: freeze the timer at the reading that was recorded with it. */
    finish: (ms: number) => setState({ acc: ms, startedAt: null, done: true }),
  }
}
