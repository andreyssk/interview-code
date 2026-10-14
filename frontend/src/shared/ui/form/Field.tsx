import type { ReactNode } from 'react'

const LABEL = 'text-xs uppercase tracking-wider text-[var(--muted)]'

/**
 * Labelled form row. A `<label>` is right for a single input, but a label also passes its :hover to its first
 * control, so a row that holds several buttons (chips, block editors) must be a plain group instead.
 */
export function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  const body = (
    <>
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </>
  )
  return group ? (
    <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
      {body}
    </div>
  ) : (
    <label className="flex flex-col gap-1.5">{body}</label>
  )
}

/** Pick any number of options by clicking chips. */
export function ChipPicker({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" className={`chip ${value.includes(o.value) ? 'chip-active' : ''}`} onClick={() => toggle(o.value)}>
          {o.label}
        </button>
      ))}
      {options.length === 0 && <span className="text-sm text-[var(--muted)]">—</span>}
    </div>
  )
}
