import { useTranslation } from 'react-i18next'
import { COMPANY_TONES } from '@/entities/task'
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
  return (
    <>
      <Group label={t('filters.difficulty')} value={f.difficulty} options={DIFFICULTIES} render={(o) => t(`difficulty.${o}`)} onChange={f.setDifficulty} />
      <Group label={t('filters.status')} value={f.status} options={STATUSES} render={(o) => t(`filters.${o}`)} onChange={f.setStatus} />
      <Group
        label={t('filters.company')}
        value={f.company}
        options={Object.keys(COMPANY_TONES)}
        render={(o) => t(`companies.${o}`, { defaultValue: o })}
        onChange={f.setCompany}
      />
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
