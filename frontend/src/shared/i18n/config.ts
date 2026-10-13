import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readStorage, writeStorage } from '../lib/storage'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const languages = ['en', 'ru'] as const
export type Language = (typeof languages)[number]

const isLanguage = (v: unknown): v is Language => languages.includes(v as Language)

// ?lng=ru wins (handy for sharing/screenshots), then the saved choice, then English.
function initialLanguage(): Language {
  const fromUrl = new URLSearchParams(window.location.search).get('lng')
  if (isLanguage(fromUrl)) return fromUrl
  const stored = readStorage('language')
  return isLanguage(stored) ? stored : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    ru: { common: ru },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: languages,
  ns: ['common'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lng) => {
  writeStorage('language', lng)
  document.documentElement.lang = lng
})

export default i18n
