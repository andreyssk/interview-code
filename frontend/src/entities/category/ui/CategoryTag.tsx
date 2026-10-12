import { useTranslation } from 'react-i18next'
import { findCategory } from '../model/categories'

export function CategoryTag({ slug }: { slug: string }) {
  const { t } = useTranslation()
  return findCategory(slug) ? <span className="tag tag-cat">{t(`categories.${slug}.name`)}</span> : null
}
