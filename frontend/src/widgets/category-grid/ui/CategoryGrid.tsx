import { useTranslation } from 'react-i18next'
import { CategoryTile, allSlug, useCategories, useSections } from '@/entities/category'
import { useTasks, useTaskStats } from '@/entities/task'

export function CategoryGrid() {
  const { t } = useTranslation()
  const { solvedCount } = useTaskStats()
  const tasks = useTasks()
  const sections = useSections()
  const categories = useCategories()

  const meta = (slugs: string[]) => {
    const list = tasks.filter((x) => x.categories.some((c) => slugs.includes(c)))
    const done = solvedCount(list.map((x) => x.slug))
    return `${t('counts.task', { count: list.length })} · ${t('counts.solved', { count: done })}`
  }

  return (
    <div className="flex flex-col gap-8">
      {sections.map((s) => {
        const cats = categories.filter((c) => c.section === s.slug)
        // A section with a single category (e.g. SQL) shows only its "all" tile.
        const tiles = cats.length > 1
        return (
          <section key={s.slug}>
            <h2 className="mb-3 text-xl font-semibold">{s.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CategoryTile
                to={`/problems/${allSlug(s)}`}
                glyph="☰"
                jp="全"
                color="var(--text)"
                title={t('problems.allProblems')}
                meta={meta(cats.map((c) => c.slug))}
              />
              {tiles &&
                cats.map((c) => (
                  <CategoryTile
                    key={c.slug}
                    to={`/problems/${c.slug}`}
                    glyph={c.glyph}
                    jp={c.jp}
                    color={c.color}
                    title={c.name}
                    meta={meta([c.slug])}
                  />
                ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
