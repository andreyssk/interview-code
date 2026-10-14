import { jsonInit, request } from './http'

/** 'saved' = code stored without running it (no tests yet, or a language that cannot be run) */
export type AttemptStatus = 'passed' | 'failed' | 'compile' | 'timeout' | 'saved'

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
/** `dryRun`: run and show the output without recording an attempt (the editor's Run; Submit records). */
export const runGo = (taskSlug: string, code: string, harness: string, solveTimeMs?: number, dryRun?: boolean) =>
  request<RunResult>('/api/run', jsonInit('POST', { taskSlug, code, harness, solveTimeMs, dryRun }))

/** Stores code as a "saved" submission without running it. */
export const saveSolution = (taskSlug: string, code: string, language: string) =>
  request<{ id: number }>(`/api/tasks/${encodeURIComponent(taskSlug)}/saved`, jsonInit('POST', { code, language }))
