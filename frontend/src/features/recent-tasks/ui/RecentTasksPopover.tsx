import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useTasks, useTaskStats } from '@/entities/task'
import { Popover } from '@/shared/ui'
import { SHOWN, useClearRecentTasks, useRecentTaskSlugs } from '../model/recent'

/** Clock button in the header: the last tasks you opened, newest first. */
export function RecentTasksPopover() {
  const { t } = useTranslation()
  const slugs = useRecentTaskSlugs()
  const clear = useClearRecentTasks()
  const tasks = useTasks()
  const { isSolved } = useTaskStats()
  const recent = slugs.flatMap((s) => tasks.find((x) => x.slug === s) ?? []).slice(0, SHOWN)

  return (
    <Popover
      iconOnly
      label={t('recent.label')}
      button={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 4.5V8l2.5 1.5" />
        </svg>
      }
    >
      {(close) => (
        <>
          <h3 className="px-3 pb-1 pt-1 text-xs uppercase tracking-wider text-[var(--muted)]">{t('recent.title')}</h3>
          {recent.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--muted)]">{t('recent.empty')}</p>
          ) : (
            <ul>
              {recent.map((task) => (
                <li key={task.slug}>
                  <Link to={`/tasks/${task.slug}`} className="dropdown-item dropdown-item-row" onClick={close}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-9 shrink-0 text-xs tabular-nums">#{task.number}</span>
                      <span className="truncate">{task.title}</span>
                    </span>
                    {isSolved(task.slug) && (
                      <span className="shrink-0 text-[var(--green)]" title={t('tags.solved')}>
                        ✓
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <button className="dropdown-item mt-1 w-full border-t border-[var(--border)] text-xs" disabled={clear.isPending} onClick={() => clear.mutate()}>
              {t('recent.clear')}
            </button>
          )}
        </>
      )}
    </Popover>
  )
}
