import { useContent } from '@/shared/content/ContentContext'

export const useQuestions = () => useContent().questions
export const useQuestionCategories = () => useContent().questionCategories

/** Route slugs that are not real categories. */
export const ALL_QUESTIONS = 'all'
export const UNCATEGORIZED = 'uncategorized'
