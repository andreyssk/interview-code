import { useContent } from '@/shared/content/ContentContext'

export const useQuestions = () => useContent().questions
export const useQuestionCategories = () => useContent().questionCategories
export const useQuestionSubcategories = () => useContent().questionSubcategories

/** Route slugs that are not real categories. */
export const ALL_QUESTIONS = 'all'
export const UNCATEGORIZED = 'uncategorized'
/** Route segment of a category's implicit "Other" subcategory (questions with a category but no subcategory). */
export const OTHER_SUBCATEGORY = 'other'
