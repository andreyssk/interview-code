import i18n, { languages, type Language } from './config'

/**
 * Registers one entry's translations (e.g. a task) under `<ns>.<key>`, so content stays next to the code that owns it.
 * A language without its own text shows the first one provided (e.g. Russian-only theory articles).
 */
export function addTexts(ns: 'tasks' | 'theory', key: string, texts: Partial<Record<Language, object>>) {
  const fallback = languages.map((l) => texts[l]).find(Boolean)
  for (const lng of languages) i18n.addResourceBundle(lng, ns, { [key]: texts[lng] ?? fallback }, true, true)
}
