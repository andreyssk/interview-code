import { useSearchParams } from 'react-router-dom'

export type SolvedFilter = 'solved' | 'unsolved'

// Filters live in the URL, so a search can be bookmarked or shared.
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const company = params.get('company') ?? ''
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
    status,
    active: Boolean(q || difficulty || company || status),
    setQuery: (v: string) => set('q', v),
    setDifficulty: (v: string) => set('difficulty', v),
    setCompany: (v: string) => set('company', v),
    setStatus: (v: string) => set('status', v),
    reset,
  }
}
