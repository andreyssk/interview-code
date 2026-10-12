import type { AttemptStatus } from './run'

export interface MistakeType {
  id: number
  title: string
  description: string
  count: number
  createdAt: string
}

/** A failed attempt filed under a type; keeps its own copy of the code and output. */
export interface Mistake {
  id: number
  typeId: number
  attemptId: number | null
  taskSlug: string
  code: string
  status: AttemptStatus
  output: string
  createdAt: string
}

export interface MistakeTypeDetail extends MistakeType {
  mistakes: Mistake[]
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const fetchMistakeTypes = () => request<MistakeType[]>('/api/mistake-types')
export const fetchMistakeType = (id: number) => request<MistakeTypeDetail>(`/api/mistake-types/${id}`)
export const createMistakeType = (v: { title: string; description: string }) => request<MistakeType>('/api/mistake-types', json('POST', v))
export const deleteMistakeType = (id: number) => request<void>(`/api/mistake-types/${id}`, { method: 'DELETE' })
export const addMistake = (v: { attemptId: number; typeId: number }) => request<Mistake>('/api/mistakes', json('POST', v))
export const deleteMistake = (id: number) => request<void>(`/api/mistakes/${id}`, { method: 'DELETE' })
export const updateMistakeType = (id: number, v: { title: string; description: string }) =>
  request<MistakeType>(`/api/mistake-types/${id}`, json('PATCH', v))
export const moveMistake = (id: number, typeId: number) => request<Mistake>(`/api/mistakes/${id}`, json('PATCH', { typeId }))
