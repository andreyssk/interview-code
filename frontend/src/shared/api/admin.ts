import type { ApiArticle, ApiTask, Category, Company, Question, Source, QuestionCategory, Quiz, QuestionSubcategory, Section } from './content'
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
export const saveSource = (s: Pick<Source, 'slug' | 'name' | 'link'>) => put<Source>(`/api/admin/sources/${s.slug}`, s)
export const deleteSource = (slug: string) => del(`/api/admin/sources/${slug}`)
/** The image is sent as the raw request body. */
export const uploadSourceIcon = (slug: string, file: Blob) =>
  request<void>(`/api/admin/sources/${slug}/icon`, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
export const deleteSourceIcon = (slug: string) => del(`/api/admin/sources/${slug}/icon`)

export const saveQuestionCategory = (c: QuestionCategory) => put<QuestionCategory>(`/api/admin/question-categories/${c.slug}`, c)
export const deleteQuestionCategory = (slug: string) => del(`/api/admin/question-categories/${slug}`)
export const saveQuestionSubcategory = (c: QuestionSubcategory) => put<QuestionSubcategory>(`/api/admin/question-subcategories/${c.slug}`, c)
export const deleteQuestionSubcategory = (slug: string) => del(`/api/admin/question-subcategories/${slug}`)
/** Creates a question (no id yet) or replaces an existing one. */
export const saveQuestion = (q: Omit<Question, 'id'> & { id?: number }) =>
  q.id ? put<Question>(`/api/admin/questions/${q.id}`, q) : request<Question>('/api/admin/questions', jsonInit('POST', q))
export const deleteQuestion = (id: number) => del(`/api/admin/questions/${id}`)

/** Creates a quiz (no id yet) or replaces an existing one. */
export const saveQuiz = (q: Omit<Quiz, 'id'> & { id?: number }) =>
  q.id ? put<Quiz>(`/api/admin/quizzes/${q.id}`, q) : request<Quiz>('/api/admin/quizzes', jsonInit('POST', q))
export const deleteQuiz = (id: number) => del(`/api/admin/quizzes/${id}`)

export const fetchUsers = () => request<AdminUser[]>('/api/admin/users')
export const resetPassword = (id: number) => request<{ password: string }>(`/api/admin/users/${id}/reset-password`, jsonInit('POST'))
export const fetchSettings = () => request<{ signupEnabled: boolean }>('/api/admin/settings')
export const saveSettings = (v: { signupEnabled: boolean }) => put<{ signupEnabled: boolean }>('/api/admin/settings', v)
