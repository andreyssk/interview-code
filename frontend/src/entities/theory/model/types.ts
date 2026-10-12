// Translatable content (title, summary, body) lives next to each note in en.json / ru.json
// and is registered under the "theory" i18n namespace.
export interface TheoryDef {
  slug: string
  /** Category slug this note belongs to, if any */
  category?: string
}
