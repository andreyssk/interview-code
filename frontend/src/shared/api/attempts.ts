import type { AttemptStatus } from './run'

export interface TaskStats {
  taskSlug: string
  passed: number
  failed: number
  lastAttemptAt: string
}

export interface Attempt {
  id: number
  taskSlug: string
  code: string
  status: AttemptStatus
  output: string
  durationMs: number
  /** Stopwatch reading recorded with a passing attempt; null when not timed or discarded */
  solveTimeMs: number | null
  createdAt: string
  /** Set when the attempt was filed in the mistakes journal */
  mistake: { id: number; typeId: number; typeTitle: string } | null
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

export const fetchStats = () => getJson<TaskStats[]>('/api/stats')
export const fetchAttempts = (slug: string) => getJson<Attempt[]>(`/api/tasks/${encodeURIComponent(slug)}/attempts`)
export async function deleteAttempt(id: number): Promise<void> {
  const res = await fetch(`/api/attempts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
}
export async function clearSolveTime(id: number): Promise<void> {
  const res = await fetch(`/api/attempts/${id}/solve-time`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
}
