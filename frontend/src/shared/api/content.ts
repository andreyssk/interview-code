import type { Block } from '@/shared/ui'
import { request } from './http'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Param {
  name: string
  /** Go type; must be JSON-representable (int, string, bool, float64, slices, maps, nested slices) */
  type: string
}

export interface Signature {
  name: string
  params: Param[]
  /** Go return type. Omit for functions that modify an argument in place (set `mutates`). */
  returns?: string
  /** For in-place tasks: the parameter whose final value is compared with `expected` */
  mutates?: string
  /** 'unordered' when the statement says the answer may be returned in any order (compares sorted arrays); default 'exact' */
  compare?: 'exact' | 'unordered'
}

/** A signature as stored may be {} (a task with no function to write); this fills the gaps. */
export const normalizeSignature = (raw: Partial<Signature> | null | undefined): Signature => ({ ...raw, name: raw?.name ?? '', params: raw?.params ?? [] })

export interface TestCase {
  name?: string
  /** Argument values keyed by parameter name */
  input: Record<string, unknown>
  expected: unknown
}

export interface Section {
  slug: string
  name: string
  position: number
}

export interface Category {
  slug: string
  section: string
  name: string
  glyph: string
  /** CSS color used for the tile's neon glow */
  color: string
  /** Japanese label shown as decor in the Tokyo theme */
  jp: string
  position: number
}

export interface Company {
  slug: string
  name: string
  /** CSS class that colors the tag, e.g. neon-blue */
  tone: string
  /** Text for the company page; empty when none */
  description: string
}

/** Where problems / questions / quizzes originally came from: a platform, provider or knowledge base. */
export interface Source {
  slug: string
  name: string
  link: string | null
  /** Where the icon image is served; null = no icon */
  iconUrl: string | null
}

/** A task as the backend stores and serves it (text in a single language). */
export interface ApiTask {
  slug: string
  /** Unique, 1-based, never reused */
  number: number
  title: string
  difficulty: Difficulty
  categories: string[]
  companies: string[]
  sources: string[]
  leetcodeUrl: string | null
  description: Block[]
  solutionNotes: Block[] | null
  /** Typical mistakes, shown as their own block on the solution tab */
  commonMistakes: Block[] | null
  /** Reference solution (Go) */
  solution: string | null
  /** Empty ({}) for tasks that are not "write a function" (SQL, code review, …) */
  signature: Partial<Signature>
  tests: TestCase[]
  complexity: { time: string; space: string } | null
  /** Overrides the generated starter code */
  template: string | null
  /** How long a run may take, in seconds; null = the server default (`Content.defaultTimeLimitSec`) */
  timeLimitSec: number | null
}

export interface ApiArticle {
  slug: string
  title: string
  summary: string
  content: Block[]
  sourceName: string | null
  sourceUrl: string | null
  /** Main category: decides the section and where "Practice" leads */
  category: string | null
  /** More categories the article is suggested on */
  categories: string[]
  /** Individual tasks (slugs) the article is suggested on */
  tasks: string[]
}

export interface QuestionCategory {
  slug: string
  name: string
  position: number
}

/** Second level under a question category. */
export interface QuestionSubcategory {
  slug: string
  category: string
  name: string
  position: number
}

/**
 * An interview question with its rich-text answer. The category is optional; a subcategory only comes with a category.
 * No category means the implicit "Other" category, a category without a subcategory the implicit "Other" subcategory.
 */
export interface Question {
  id: number
  title: string
  category: string | null
  subcategory: string | null
  companies: string[]
  sources: string[]
  answer: Block[]
}

/** One step of a quiz: a code snippet and what it prints / does; the answer is hidden behind a spoiler. */
export interface QuizStage {
  code: string
  /** Plain text: the output, or what happens */
  answer: string
  /** Optional short why */
  explanation: string
}

/** A quiz is a sequence of stages. */
export interface Quiz {
  id: number
  /** Optional prompt, e.g. "What will be printed?" */
  title: string
  language: 'go' | 'java'
  stages: QuizStage[]
  companies: string[]
  sources: string[]
}

export interface Content {
  sections: Section[]
  categories: Category[]
  companies: Company[]
  sources: Source[]
  tasks: ApiTask[]
  articles: ApiArticle[]
  questionCategories: QuestionCategory[]
  questionSubcategories: QuestionSubcategory[]
  questions: Question[]
  quizzes: Quiz[]
  /** The run limit of tasks that do not set their own */
  defaultTimeLimitSec: number
}

/**
 * Every list defaults to empty, so a backend that does not send a field yet (an older build that was not restarted)
 * degrades to "nothing there" instead of crashing the pages that read it.
 */
export const fetchContent = () =>
  request<Partial<Content>>('/api/content').then(
    (c): Content => ({
      sections: c.sections ?? [],
      categories: c.categories ?? [],
      companies: c.companies ?? [],
      sources: c.sources ?? [],
      tasks: (c.tasks ?? []).map((t) => ({ ...t, sources: t.sources ?? [] })),
      articles: c.articles ?? [],
      questionCategories: c.questionCategories ?? [],
      questionSubcategories: c.questionSubcategories ?? [],
      questions: (c.questions ?? []).map((q) => ({ ...q, sources: q.sources ?? [] })),
      quizzes: (c.quizzes ?? []).map((q) => ({ ...q, sources: q.sources ?? [] })),
      defaultTimeLimitSec: c.defaultTimeLimitSec ?? 5,
    }),
  )
