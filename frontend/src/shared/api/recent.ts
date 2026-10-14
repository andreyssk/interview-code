import { jsonInit, request } from './http'

/** Slugs of the tasks the user opened, newest first (kept on the server, so it follows the user between browsers). */
export const fetchRecentTasks = () => request<string[]>('/api/recent-tasks')
export const recordRecentTask = (slug: string) => request<void>('/api/recent-tasks', jsonInit('POST', { slug }))
export const clearRecentTasks = () => request<void>('/api/recent-tasks', { method: 'DELETE' })
