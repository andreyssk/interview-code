import type { ApiArticle } from '@/shared/api/content'

export interface TheorySource {
  /** Shown as is, e.g. "algocode.io" */
  name: string
  url?: string
}

/** An article ready for the UI. `category` decides its section and where "Practice" leads. */
export interface TheoryDef extends Omit<ApiArticle, 'sourceName' | 'sourceUrl' | 'category'> {
  category?: string
  source?: TheorySource
}
