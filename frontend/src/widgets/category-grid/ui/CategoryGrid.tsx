import { useTranslation } from 'react-i18next'
import { CategoryTile, categoriesOf, sections } from '@/entities/category'
import { tasks, useTaskStats } from '@/entities/task'

export function CategoryGrid() {
  const { t } = useTranslation()
  const { solvedCount } = useTaskStats()

  const meta = (slugs: string[]) => {
    const list = tasks.filter((x) => x.categories.some((c) => slugs.includes(c)))
    const done = solvedCount(list.map((x) => x.slug))
    return `${t('counts.task', { count: list.length })} · ${t('counts.solved', { count: done })}`
  }

  return (
    <div className="flex flex-col gap-8">
      {sections.map((s) => {
        const cats = categoriesOf(s.slug)
        return (
          <section key={s.slug}>
            <h2 className="mb-3 text-xl font-semibold">{t(`sections.${s.slug}.name`)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CategoryTile
                to={`/problems/${s.allSlug}`}
                glyph="☰"
                jp="全"
                color="var(--text)"
                title={t('categories.all.name')}
                meta={meta(cats.map((c) => c.slug))}
              />
              {s.tiles &&
                cats.map((c) => (
                  <CategoryTile
                    key={c.slug}
                    to={`/problems/${c.slug}`}
                    glyph={c.glyph}
                    jp={c.jp}
                    color={c.color}
                    title={t(`categories.${c.slug}.name`)}
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
