import { twoPointers } from './data/two-pointers'
import type { TheoryDef } from './types'

// Register new notes here.
export const theory: TheoryDef[] = [twoPointers]

export const findTheory = (slug: string | undefined) => theory.find((t) => t.slug === slug)
