import { useId, useState, type KeyboardEvent } from 'react'

export interface MultiOption {
  value: string
  label: string
}

interface Props {
  options: MultiOption[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
  /** Accessible name of the input */
  label: string
  /** Text when every option is already selected / nothing matches */
  emptyText?: { all: string; none: string }
  /** No chips under the input: the placeholder counts the selection and a button inside the input clears it */
  compact?: boolean
}

/**
 * Autocomplete with multiple selection: type to filter, Enter / click to add, selected values show as removable chips.
 * The list can be long (hundreds of options), so it never renders more than it can show at once.
 */
export function MultiSelect({ options, value, onChange, placeholder, label, emptyText = { all: 'All selected', none: 'No match' }, compact }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v
  const needle = query.trim().toLowerCase()
  const matches = options.filter((o) => !value.includes(o.value) && o.label.toLowerCase().includes(needle))
  const shown = matches.slice(0, 100)

  const pick = (v: string) => {
    onChange([...value, v])
    setQuery('')
    setActive(0)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (shown.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit a surrounding form
      if (open && shown[active]) pick(shown[active].value)
    } else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Backspace' && !query && value.length > 0) onChange(value.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          className={`search${compact && value.length > 0 ? ' pr-8' : ''}`}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
        {compact && value.length > 0 && (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--pink)]"
            title="Reset"
            aria-label="Reset"
            onClick={() => onChange([])}
          >
            ×
          </button>
        )}
        {open && (
          <ul id={listId} className="dropdown-menu max-h-60 overflow-y-auto" role="listbox">
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-[var(--muted)]">{needle ? emptyText.none : emptyText.all}</li>}
            {shown.map((o, i) => (
              <li key={o.value} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  className={`dropdown-item w-full text-left ${i === active ? 'dropdown-item-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()} // keep the input focused
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!compact && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <button key={v} type="button" className="chip chip-active" title="Remove" onClick={() => onChange(value.filter((x) => x !== v))}>
              {labelOf(v)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
