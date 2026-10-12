import { i18n, languages } from '@/shared/i18n'
import type { TaskDef } from '../model/types'

/** Title, companies and difficulty in every language, so search works whichever one is displayed. */
export function taskSearchText(task: TaskDef): string[] {
  return languages.flatMap((lng) => {
    const common = i18n.getFixedT(lng)
    return [
      i18n.getFixedT(lng, 'tasks')(`${task.slug}.title`),
      ...task.companies.map((c) => common(`companies.${c}`, { defaultValue: c })),
      common(`difficulty.${task.difficulty}`),
    ]
  })
}
