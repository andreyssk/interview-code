import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, currentTheme, themes, type Theme } from '@/shared/lib/theme'

// Theme names are proper names, so they are not translated.
const LABELS: Record<Theme, string> = { tokyo: 'Tokyo', depressive: 'Depressive', cozy: 'Cozy', apple: 'Apple', 'apple-dark': 'Apple Dark', android: 'Android', jetbrains: 'JetBrains' }

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={root} className="dropdown">
      <button
        className="chip dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('theme.label')}
        title={t('theme.label')}
        onClick={() => setOpen((v) => !v)}
      >
        {LABELS[theme]} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox" aria-label={t('theme.label')}>
          {themes.map((name) => (
            <li key={name} role="option" aria-selected={theme === name}>
              <button
                className={`dropdown-item ${theme === name ? 'dropdown-item-active' : ''}`}
                onClick={() => {
                  applyTheme(name)
                  setTheme(name)
                  setOpen(false)
                }}
              >
                {LABELS[name]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
