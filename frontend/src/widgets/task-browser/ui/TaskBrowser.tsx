import { useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'
import { useCategories, useCategoriesForSlug } from '@/entities/category'
import { TaskCard, taskSearchText, useCompanies, useTasks, useTaskStats } from '@/entities/task'
import { filterTasks, useTaskFilters } from '@/features/filter-tasks'

/** Task list for one category slug, a section's "all" slug, or 'all', narrowed by the sidebar filters in the URL. */
export function TaskBrowser({ category }: { category: string }) {
  const { t } = useTranslation()
  const { q, difficulty, company, source, status } = useTaskFilters()
  const { isSolved } = useTaskStats()
  const tasks = useTasks()
  const companies = useCompanies()
  const categories = useCategories()
  const scope = useCategoriesForSlug(category)

  const nameOf = <T extends { slug: string; name: string }>(list: T[]) => (slug: string) => list.find((x) => x.slug === slug)?.name ?? slug
  const total = category === 'all' ? tasks.length : tasks.filter((x) => x.categories.some((c) => scope?.slugs.includes(c))).length
  const visible = filterTasks(tasks, {
    slugs: category === 'all' ? undefined : (scope?.slugs ?? []),
    q,
    difficulty,
    company,
    source,
    status,
    isSolved,
    searchText: (task) =>
      taskSearchText(task, { company: nameOf(companies), category: nameOf(categories), difficulty: t(`difficulty.${task.difficulty}`) }),
  })

  const listRef = useRef<HTMLUListElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const list = listRef.current
    const scroller = list?.closest<HTMLElement>('.main')
    if (list && scroller) setScrollMargin(list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop)
  }, [visible.length === 0])
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => listRef.current?.closest<HTMLElement>('.main') ?? null,
    estimateSize: () => 46,
    overscan: 10,
    gap: 6,
    scrollMargin,
    getItemKey: (i) => visible[i].slug,
  })

  if (visible.length === 0) return <div className="panel p-6 text-[var(--muted)]">{t('problems.none')}</div>
  return (
    <>
      <div className="mb-2 text-sm text-[var(--muted)]">{t('problems.shown', { shown: visible.length, total })}</div>
      <ul ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const task = visible[row.index]
          return (
            <li
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
            >
              <TaskCard task={task} solved={isSolved(task.slug)} />
            </li>
          )
        })}
      </ul>
    </>
  )
}
