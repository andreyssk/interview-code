// Companies are identified by a slug, so a tag keeps its color in every language.
// Display names live in the "common" translations under companies.<slug>.
// To add a company: add it here and add companies.<slug> to shared/i18n/locales/{en,ru}.json.
export const COMPANY_TONES: Record<string, string> = {
  vk: 'neon-blue',
  yandex: 'neon-red',
  'yellow-bank': 'neon-yellow',
  ozon: 'neon-indigo',
  avito: 'neon-green',
}

export const companyTone = (slug: string) => COMPANY_TONES[slug] ?? 'neon-violet'
