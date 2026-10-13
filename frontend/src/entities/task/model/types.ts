import type { Block } from '@/shared/ui'
import type { ApiTask, Difficulty, Param, Signature, TestCase } from '@/shared/api/content'

export type { Difficulty, Param, Signature, TestCase }

/** A task ready for the UI: the stored definition plus the generated starter code and Go test harness. */
export interface TaskDef extends Omit<ApiTask, 'leetcodeUrl' | 'solutionNotes' | 'solution' | 'complexity' | 'template'> {
  leetcodeUrl?: string
  solutionNotes: Block[]
  /** Reference solution source (Go), when the task has one */
  solution?: string
  complexity?: { time: string; space: string }
  /** Starter code shown in the editor (package main) */
  template: string
  /** Generated Go file with main() that runs the solution against `tests`; exit code != 0 means failure */
  harness: string
}
