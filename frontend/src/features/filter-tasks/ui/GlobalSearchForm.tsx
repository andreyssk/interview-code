import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/** Search box for the categories screen: Enter jumps to the full list with the query applied. */
export function GlobalSearchForm() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  return (
    <form
      className="mb-6"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/problems/all${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      }}
    >
      <input className="search" placeholder={t('problems.searchAll')} value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  )
}
