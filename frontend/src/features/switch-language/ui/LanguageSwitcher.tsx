import { useTranslation } from 'react-i18next'
import { languages } from '@/shared/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <span className="flex items-center gap-1" title={t('language.label')}>
      {languages.map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`chip ${i18n.resolvedLanguage === lng ? 'chip-active' : ''}`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </span>
  )
}
