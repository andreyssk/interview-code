import { request } from './http'
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

export const fetchStats = () => request<TaskStats[]>('/api/stats')
export const fetchAttempts = (slug: string) => request<Attempt[]>(`/api/tasks/${encodeURIComponent(slug)}/attempts`)
export const deleteAttempt = (id: number) => request<void>(`/api/attempts/${id}`, { method: 'DELETE' })
export const clearSolveTime = (id: number) => request<void>(`/api/attempts/${id}/solve-time`, { method: 'DELETE' })
