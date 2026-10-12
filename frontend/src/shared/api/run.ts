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
export async function runGo(taskSlug: string, code: string, harness: string, solveTimeMs?: number): Promise<RunResult> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskSlug, code, harness, solveTimeMs }),
  })
  if (!res.ok) throw new Error(`Runner error (${res.status})`)
  return res.json()
}
