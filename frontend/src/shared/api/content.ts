import type { Block } from '@/shared/ui'

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
  leetcodeUrl: string | null
  description: Block[]
  solutionNotes: Block[] | null
  /** Reference solution (Go) */
  solution: string | null
  signature: Signature
  tests: TestCase[]
  complexity: { time: string; space: string } | null
  /** Overrides the generated starter code */
  template: string | null
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

export interface Content {
  sections: Section[]
  categories: Category[]
  companies: Company[]
  tasks: ApiTask[]
  articles: ApiArticle[]
}

export async function fetchContent(): Promise<Content> {
  const res = await fetch('/api/content')
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}
