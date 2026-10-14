import { useQueryClient } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { saveCompany } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { slugify } from '@/shared/lib/slugify'
import { ChipPicker } from './Field'

const TONES = ['neon-cyan', 'neon-pink', 'neon-amber', 'neon-green', 'neon-blue', 'neon-red', 'neon-yellow', 'neon-indigo', 'neon-violet']

/**
 * Company chips plus a "new company" box: type a name, press Enter (or Add), and the company is created
 * (slug from the name, a random tag color) and selected. An existing company with that name is just selected.
 */
export function CompanyPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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
      await saveCompany({ slug, name: clean, tone: TONES[Math.floor(Math.random() * TONES.length)] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.content }) // wait, so the new chip exists
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
