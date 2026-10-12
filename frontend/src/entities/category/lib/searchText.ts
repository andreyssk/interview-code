import { i18n, languages } from '@/shared/i18n'

/** Category name in every language, so search works whichever one is displayed. */
export const categorySearchText = (slug: string): string[] =>
  languages.map((lng) => i18n.getFixedT(lng)(`categories.${slug}.name`))
