import i18n, { languages, type Language } from './config'

/** Registers one entry's translations (e.g. a task) under `<ns>.<key>`, so content stays next to the code that owns it. */
export function addTexts(ns: 'tasks' | 'theory', key: string, texts: Record<Language, object>) {
  for (const lng of languages) i18n.addResourceBundle(lng, ns, { [key]: texts[lng] }, true, true)
}
