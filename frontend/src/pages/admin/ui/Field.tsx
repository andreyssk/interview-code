import type { ReactNode } from 'react'

/** Labelled form row. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </label>
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
