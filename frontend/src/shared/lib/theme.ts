import { readStorage, writeStorage } from './storage'

export const themes = ['tokyo', 'depressive', 'cozy', 'apple', 'apple-dark', 'android', 'jetbrains'] as const
export type Theme = (typeof themes)[number]

export const isTheme = (v: unknown): v is Theme => themes.includes(v as Theme)

/** The theme currently applied to the page (themes are CSS variable sets keyed by <html data-theme>). */
export function currentTheme(): Theme {
  const v = document.documentElement.dataset.theme
  return isTheme(v) ? v : 'tokyo'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  writeStorage('theme', theme)
}

/** Re-applies the saved theme at startup (index.html does the same before first paint to avoid a flash). */
export function restoreTheme() {
  const saved = readStorage('theme')
  document.documentElement.dataset.theme = isTheme(saved) ? saved : 'tokyo'
}
