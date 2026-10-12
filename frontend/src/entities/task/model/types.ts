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

/** Contents of data/<slug>/task.json */
export interface TaskMeta {
  /** Unique, 1-based, assigned in the order tasks were added (next = highest + 1); never reused */
  number: number
  difficulty: Difficulty
  /** Category slugs from entities/category */
  categories: string[]
  /** Company slugs from model/companies.ts */
  companies: string[]
  /** Same problem on LeetCode, when it exists there */
  leetcodeUrl?: string
  signature: Signature
  /** Of the reference solution (solution.go) */
  complexity?: { time: string; space: string }
  /** Override the generated starter code (rarely needed) */
  template?: string
}

// Translatable content (title, statement, solution notes) lives in data/<slug>/{en,ru}.json
// and is registered under the "tasks" i18n namespace.
export interface TaskDef extends Omit<TaskMeta, 'template'> {
  slug: string
  tests: TestCase[]
  /** Reference solution source (solution.go), when the task has one */
  solution?: string
  /** Starter code shown in the editor (package main) */
  template: string
  /** Generated Go file with main() that runs the solution against `tests`; exit code != 0 means failure */
  harness: string
}
