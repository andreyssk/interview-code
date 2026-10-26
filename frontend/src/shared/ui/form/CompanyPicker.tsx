import { useQueryClient } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { saveCompany } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { slugify } from '@/shared/lib/slugify'
import { ChipPicker } from './Field'

const TONES = ['neon-cyan', 'neon-pink', 'neon-amber', 'neon-green', 'neon-blue', 'neon-red', 'neon-yellow', 'neon-indigo', 'neon-violet']

/**
 * "New company" state: type a name, `add()` creates the company (slug from the name, a random tag color) and selects it.
 * An existing company with that name is just selected.
 */
function useNewCompany(value: string[], onChange: (v: string[]) => void) {
  const queryClient = useQueryClient()
  const { companies } = useContent()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async () => {
    const clean = name.trim()
    if (!clean || busy) return
    setError('')
    const existing = companies.find((c) => c.name.toLowerCase() === clean.toLowerCase() || c.slug === slugify(clean))
    if (existing) {
      if (!value.includes(existing.slug)) onChange([...value, existing.slug])
      setName('')
      return
    }
    const slug = slugify(clean)
    if (!slug) {
      setError('Use letters or digits in the name')
      return
    }
    setBusy(true)
    try {
      await saveCompany({ slug, name: clean, tone: TONES[Math.floor(Math.random() * TONES.length)], description: '' })
      await queryClient.invalidateQueries({ queryKey: queryKeys.content }) // wait, so the new company exists
      onChange([...value, slug])
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the company')
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // do not submit the whole form
      add()
    }
  }

  return { name, setName, busy, error, add, onKey }
}

function NewCompanyRow({ state }: { state: ReturnType<typeof useNewCompany> }) {
  const { name, setName, busy, error, add, onKey } = state
  return (
    <>
      <div className="flex gap-2">
        <input className="search search-sm min-w-0 flex-1" placeholder="New company…" aria-label="New company name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
        <button type="button" className="btn-ghost" disabled={!name.trim() || busy} onClick={add}>
          {busy ? 'Adding…' : '+ Add'}
        </button>
      </div>
      {error && <span className="text-sm text-[var(--pink)]">{error}</span>}
    </>
  )
}

/** Company chips plus a "new company" box. */
export function CompanyPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { companies } = useContent()
  const state = useNewCompany(value, onChange)
  const { name, setName, busy, error, add, onKey } = state
  return (
    <div className="flex flex-col gap-2">
      <ChipPicker options={companies.map((c) => ({ value: c.slug, label: c.name }))} value={value} onChange={onChange} />
      <div className="flex gap-2">
        <input className="search search-sm !w-64" placeholder="New company…" aria-label="New company name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
        <button type="button" className="btn-ghost" disabled={!name.trim() || busy} onClick={add}>
          {busy ? 'Adding…' : '+ Add company'}
        </button>
      </div>
      {error && <span className="text-sm text-[var(--pink)]">{error}</span>}
    </div>
  )
}

/**
 * Autocomplete with multiple selection: type to filter, Enter / click to add, selected companies show as removable chips.
 * A "new company" box below creates companies that do not exist yet.
 */
export function CompanyMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { companies } = useContent()
  const state = useNewCompany(value, onChange)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const nameOf = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug
  const needle = query.trim().toLowerCase()
  const options = companies.filter((c) => !value.includes(c.slug) && c.name.toLowerCase().includes(needle))
  const pick = (slug: string) => {
    onChange([...value, slug])
    setQuery('')
    setActive(0)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (options.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the whole form from here
      if (open && options[active]) pick(options[active].slug)
    } else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Backspace' && !query && value.length > 0) onChange(value.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          className="search"
          placeholder="Search companies…"
          aria-label="Companies"
          role="combobox"
          aria-expanded={open}
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
        {open && (
          <ul className="dropdown-menu max-h-60 overflow-y-auto" role="listbox">
            {options.length === 0 && <li className="px-3 py-2 text-sm text-[var(--muted)]">{needle ? 'No match' : 'All selected'}</li>}
            {options.map((c, i) => (
              <li key={c.slug} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  className={`dropdown-item w-full text-left ${i === active ? 'dropdown-item-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()} // keep the input focused
                  onClick={() => pick(c.slug)}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <button key={slug} type="button" className="chip chip-active" title="Remove" onClick={() => onChange(value.filter((v) => v !== slug))}>
              {nameOf(slug)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <NewCompanyRow state={state} />
    </div>
  )
}
