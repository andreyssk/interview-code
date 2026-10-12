import { useTranslation } from 'react-i18next'
import type { Block } from '@/shared/ui'

export function useTaskText(slug: string) {
  const { t } = useTranslation('tasks')
  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`, { returnObjects: true }) as unknown as Block[],
    solutionNotes: t(`${slug}.solution`, { returnObjects: true, defaultValue: [] }) as unknown as Block[],
  }
}
