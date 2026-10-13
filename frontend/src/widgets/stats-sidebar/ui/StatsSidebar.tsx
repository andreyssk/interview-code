import { useTranslation } from 'react-i18next'
import { useCategories, useSections } from '@/entities/category'
import { useTasks, useTaskStats, type Difficulty } from '@/entities/task'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--muted)]">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--cyan)]" style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
      </div>
    </div>
  )
}

/** Progress summary for the main page: overall, by difficulty and by section. */
export function StatsSidebar() {
  const { t } = useTranslation()
  const { solvedCount } = useTaskStats()
  const tasks = useTasks()
  const sections = useSections()
  const categories = useCategories()
  const solvedOf = (list: typeof tasks) => solvedCount(list.map((x) => x.slug))
  const inSection = (section: string) => {
    const slugs = categories.filter((c) => c.section === section).map((c) => c.slug)
    return tasks.filter((x) => x.categories.some((c) => slugs.includes(c)))
  }

  return (
    <aside className="sidebar panel">
      <h2>{t('stats.title')}</h2>
      <Bar label={t('stats.total')} done={solvedOf(tasks)} total={tasks.length} />
      <h2 className="mt-5">{t('stats.byDifficulty')}</h2>
      {DIFFICULTIES.map((d) => {
        const list = tasks.filter((x) => x.difficulty === d)
        return <Bar key={d} label={t(`difficulty.${d}`)} done={solvedOf(list)} total={list.length} />
      })}
      <h2 className="mt-5">{t('stats.bySection')}</h2>
      {sections.map((s) => {
        const list = inSection(s.slug)
        return <Bar key={s.slug} label={s.name} done={solvedOf(list)} total={list.length} />
      })}
    </aside>
  )
}
