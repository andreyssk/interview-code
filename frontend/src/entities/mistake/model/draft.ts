export interface MistakeTypeDraft {
  title: string
  description: string
}

export const emptyDraft: MistakeTypeDraft = { title: '', description: '' }
export const isDraftValid = (d: MistakeTypeDraft) => d.title.trim().length > 0

/** A picked existing type (its id), a new one, or nothing yet. */
export type TypeChoice = number | 'new' | null

/** With no existing types to pick from, the only option is a new type. */
export const effectiveChoice = (types: { id: number }[], selected: TypeChoice): TypeChoice => (types.length === 0 ? 'new' : selected)
