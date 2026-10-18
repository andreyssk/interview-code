import { jsonInit, request } from './http'

export type SessionKind = 'question' | 'quiz'
export type SessionMode = 'random' | 'srs'

/** Self-assessment after seeing the answer; the number is what the server stores. */
export const RATINGS = [
  { value: 3, key: 'correct', tone: 'neon-green' },
  { value: 2, key: 'almost', tone: 'neon-amber' },
  { value: 1, key: 'bad', tone: 'neon-pink' },
  { value: 0, key: 'veryBad', tone: 'neon-pink' },
] as const

export interface SessionItem {
  position: number
  itemId: number
  /** The title when the session started, so history survives deleted questions */
  title: string
  rating: number | null
  ratedAt: string | null
}

export interface StudySession {
  id: number
  kind: SessionKind
  mode: SessionMode
  /** Question category slugs the session was limited to; empty = all */
  categories: string[]
  createdAt: string
  /** Set when the last item was rated */
  finishedAt: string | null
  total: number
  /** Items per rating, indexed by rating value (0 very bad … 3 correct) */
  counts: [number, number, number, number]
  /** Only in a single-session response */
  items?: SessionItem[]
}

export interface StartSession {
  kind: SessionKind
  mode: SessionMode
  count: number
  categories?: string[]
}

export const fetchSessions = () => request<StudySession[]>('/api/sessions')
export const fetchSession = (id: number) => request<StudySession>(`/api/sessions/${id}`)
export const startSession = (body: StartSession) => request<StudySession>('/api/sessions', jsonInit('POST', body))
export const rateSessionItem = (id: number, position: number, rating: number) =>
  request<StudySession>(`/api/sessions/${id}/rating`, jsonInit('PUT', { position, rating }))
export const deleteSession = (id: number) => request<void>(`/api/sessions/${id}`, { method: 'DELETE' })

/** Average of the ratings as 0–100: correct 100, almost 67, bad 33, very bad 0. */
export const sessionScore = (counts: StudySession['counts']): number | null => {
  const rated = counts.reduce((a, b) => a + b, 0)
  return rated === 0 ? null : Math.round(((counts[3] * 3 + counts[2] * 2 + counts[1]) / (rated * 3)) * 100)
}
