import { useTranslation } from 'react-i18next'
import { useCompanies, useSources } from '@/entities/task'
import { MultiSelect } from '@/shared/ui'
import { useTaskFilters } from '../model/useTaskFilters'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const STATUSES = ['solved', 'unsolved']

function Group({ label, value, options, render, onChange }: {
  label: string
  value: string
  options: string[]
  render: (o: string) => string
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} className={`chip ${value === o ? 'chip-active' : ''}`} onClick={() => onChange(value === o ? '' : o)}>
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Sidebar filters for the task list: search, difficulty, solved status and company. */
export function TaskFilters() {
  const { t } = useTranslation()
  const f = useTaskFilters()
  const companies = useCompanies()
  const sources = useSources()
  return (
    <>
      <Group label={t('filters.difficulty')} value={f.difficulty} options={DIFFICULTIES} render={(o) => t(`difficulty.${o}`)} onChange={f.setDifficulty} />
      <Group label={t('filters.status')} value={f.status} options={STATUSES} render={(o) => t(`filters.${o}`)} onChange={f.setStatus} />
      <div className="mb-4">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{t('filters.company')}</h3>
        <MultiSelect
          label={t('filters.company')}
          placeholder={t('filters.searchCompanies')}
          options={companies.map((c) => ({ value: c.slug, label: c.name }))}
          value={f.company}
          onChange={f.setCompany}
          emptyText={{ all: t('filters.allSelected'), none: t('filters.noMatch') }}
        />
      </div>
      <div className="mb-4">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">{t('filters.source')}</h3>
        <MultiSelect
          label={t('filters.source')}
          placeholder={t('filters.searchSources')}
          options={sources.map((s) => ({ value: s.slug, label: s.name }))}
          value={f.source}
          onChange={f.setSource}
          emptyText={{ all: t('filters.allSelected'), none: t('filters.noMatch') }}
        />
      </div>
      {f.active && (
        <button className="btn-ghost w-full" onClick={f.reset}>
          {t('filters.reset')}
        </button>
      )}
    </>
  )
}

/** Search box shown in the main content above the task list. */
export function TaskSearch() {
  const { t } = useTranslation()
  const { q, setQuery } = useTaskFilters()
  return (
    <input
      className="search mb-4"
      placeholder={t('problems.searchPlaceholder')}
      value={q}
      onChange={(e) => setQuery(e.target.value)}
      autoFocus
    />
  )
}
