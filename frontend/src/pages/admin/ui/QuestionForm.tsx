import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { saveQuestion } from '@/shared/api/admin'
import type { Question } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuth } from '@/shared/auth/AuthContext'
import { useContent } from '@/shared/content/ContentContext'
import { CompanyMultiSelect, Field, RichTextEditor } from '@/shared/ui'

type Draft = Omit<Question, 'id'> & { id?: number }
const blank: Draft = { title: '', category: null, subcategory: null, companies: [], answer: [{ p: '' }] }

const BACK = '/admin/questions'

/**
 * Create (/admin/questions/new) or edit (/admin/questions/edit/:id) a question.
 * A focus page: the app header is hidden (see App), a sidebar holds the metadata and the answer editor is the hero.
 */
export function QuestionForm() {
  const { user } = useAuth()
  const { id } = useParams()
  const { questions } = useContent()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  const existing = questions.find((q) => String(q.id) === id)
  if (id && !existing) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <Link to={BACK} className="btn-ghost">
          ← Back
        </Link>
        <p className="text-[var(--pink)]">No such question.</p>
      </div>
    )
  }
  return <Form key={id ?? 'new'} initial={existing ?? blank} />
}

function Form({ initial }: { initial: Draft }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { questionCategories, questionSubcategories } = useContent()
  const [q, setQ] = useState(initial)
  const categorySubs = q.category ? questionSubcategories.filter((c) => c.category === q.category) : []

  const save = useMutation({
    mutationFn: () => saveQuestion({ ...q, title: q.title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      navigate(BACK)
    },
  })
  const canSave = q.title.trim() !== '' && !save.isPending

  return (
    <form
      className="fit-form grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) save.mutate()
      }}
    >
      <Link to={BACK} className="btn-ghost fab fixed top-3 left-4 z-30">
        ← Back
      </Link>
      <aside className="flex flex-col gap-5 p-4 pt-16 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-[var(--border)]">
        <Field label="Question">
          <textarea className="search resize-none" rows={3} value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value.replace(/\n/g, ' ') })} autoFocus />
        </Field>
        <Field label="Category (optional)">
          <select className="search" value={q.category ?? ''} onChange={(e) => setQ({ ...q, category: e.target.value || null, subcategory: null })}>
            <option value="">none</option>
            {questionCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {categorySubs.length > 0 && (
          <Field label="Subcategory (optional)">
            <select className="search" value={q.subcategory ?? ''} onChange={(e) => setQ({ ...q, subcategory: e.target.value || null })}>
              <option value="">none</option>
              {categorySubs.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Companies" group>
          <CompanyMultiSelect value={q.companies} onChange={(v) => setQ({ ...q, companies: v })} />
        </Field>
      </aside>
      <div className="flex h-[70dvh] min-h-0 flex-col lg:h-auto">
        <RichTextEditor flush initial={initial.answer} onChange={(b) => setQ((p) => ({ ...p, answer: b }))} />
      </div>
      <div className="fixed right-6 bottom-5 z-30 flex items-center gap-4">
        {save.isError && <p className="fab rounded-lg px-3 py-2 text-sm text-[var(--pink)]">{save.error.message}</p>}
        <button type="submit" className="btn-run btn-lg fab" disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save question'}
        </button>
      </div>
    </form>
  )
}
