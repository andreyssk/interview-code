// Translatable content (title, summary, body) lives next to each note in en.json / ru.json
// and is registered under the "theory" i18n namespace.
export interface TheorySource {
  /** Shown as is, e.g. "algocode.io" */
  name: string
  url?: string
}

export interface TheoryDef {
  slug: string
  /** Main category: decides the section the note is listed under and where "Practice" leads */
  category?: string
  /** Where the material comes from */
  source?: TheorySource
  /** More categories this note helps with (besides `category`); the note is suggested on their tasks */
  categories?: string[]
  /** Individual tasks (slugs) this note helps with */
  tasks?: string[]
}
