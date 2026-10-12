import { useTranslation } from 'react-i18next'
import type { Block } from '@/shared/ui'

export function useTheoryText(slug: string) {
  const { t } = useTranslation('theory')
  return {
    title: t(`${slug}.title`),
    summary: t(`${slug}.summary`),
    content: t(`${slug}.content`, { returnObjects: true }) as unknown as Block[],
  }
}
