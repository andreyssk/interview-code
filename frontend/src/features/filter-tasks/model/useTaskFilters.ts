import { useSearchParams } from 'react-router-dom'

export type SolvedFilter = 'solved' | 'unsolved'

// Filters live in the URL, so a search can be bookmarked or shared.
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  // Multi-value filters are comma-separated (slugs never contain commas); a single old-style value still works.
  const list = (key: string) => (params.get(key) ?? '').split(',').filter(Boolean)
  const company = list('company')
  const source = list('source')
  const status = (params.get('status') ?? '') as SolvedFilter | ''

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const reset = () => setParams(new URLSearchParams(), { replace: true })

  return {
    q,
    difficulty,
    company,
    source,
    status,
    active: Boolean(q || difficulty || company.length || source.length || status),
    setQuery: (v: string) => set('q', v),
    setDifficulty: (v: string) => set('difficulty', v),
    setCompany: (v: string[]) => set('company', v.join(',')),
    setSource: (v: string[]) => set('source', v.join(',')),
    setStatus: (v: string) => set('status', v),
    reset,
  }
}
