import type { ApiArticle, ApiTask, Category, Company, Section } from './content'
import { jsonInit, request } from './http'

export interface AdminUser {
  id: number
  username: string
  role: 'user' | 'admin'
  mustChangePassword: boolean
  createdAt: string
}

const put = <T>(path: string, body: unknown) => request<T>(path, jsonInit('PUT', body))
const del = (path: string) => request<void>(path, { method: 'DELETE' })

// The number is never sent: the server assigns it on create and keeps it on update.
export const saveTask = (task: Omit<ApiTask, 'number'>) => put<void>(`/api/admin/tasks/${task.slug}`, task)
export const deleteTask = (slug: string) => del(`/api/admin/tasks/${slug}`)
export const saveArticle = (article: ApiArticle) => put<void>(`/api/admin/articles/${article.slug}`, article)
export const deleteArticle = (slug: string) => del(`/api/admin/articles/${slug}`)

export const saveSection = (s: Section) => put<Section>(`/api/admin/sections/${s.slug}`, s)
export const deleteSection = (slug: string) => del(`/api/admin/sections/${slug}`)
export const saveCategory = (c: Category) => put<Category>(`/api/admin/categories/${c.slug}`, c)
export const deleteCategory = (slug: string) => del(`/api/admin/categories/${slug}`)
export const saveCompany = (c: Company) => put<Company>(`/api/admin/companies/${c.slug}`, c)
export const deleteCompany = (slug: string) => del(`/api/admin/companies/${slug}`)

export const fetchUsers = () => request<AdminUser[]>('/api/admin/users')
export const resetPassword = (id: number) => request<{ password: string }>(`/api/admin/users/${id}/reset-password`, jsonInit('POST'))
export const fetchSettings = () => request<{ signupEnabled: boolean }>('/api/admin/settings')
export const saveSettings = (v: { signupEnabled: boolean }) => put<{ signupEnabled: boolean }>('/api/admin/settings', v)
