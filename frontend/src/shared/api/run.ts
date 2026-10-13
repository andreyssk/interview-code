import { jsonInit, request } from './http'

export type AttemptStatus = 'passed' | 'failed' | 'compile' | 'timeout'

export interface RunResult {
  attemptId?: number
  status: AttemptStatus
  ok: boolean
  stage: 'build' | 'run'
  output: string
  exitCode: number
  timedOut: boolean
  durationMs: number
}

/** Runs the solution; the backend records the attempt under `taskSlug` (and `solveTimeMs` if it passes). */
export const runGo = (taskSlug: string, code: string, harness: string, solveTimeMs?: number) =>
  request<RunResult>('/api/run', jsonInit('POST', { taskSlug, code, harness, solveTimeMs }))
