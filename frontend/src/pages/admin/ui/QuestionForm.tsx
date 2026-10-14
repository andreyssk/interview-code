import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { saveQuestion } from '@/shared/api/admin'
import type { Question } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { BlockEditor, CompanyPicker, Field } from '@/shared/ui'

type Draft = Omit<Question, 'id'> & { id?: number }
const blank: Draft = { title: '', category: null, companies: [], answer: [{ p: '' }] }

/** Create (/admin/questions/new) or edit (/admin/questions/edit/:id) a question. */
export function QuestionForm() {
  const { id } = useParams()
  const { questions } = useContent()
  const existing = questions.find((q) => String(q.id) === id)
  if (id && !existing) return <p className="text-[var(--pink)]">No such question.</p>
  return <Form key={id ?? 'new'} initial={existing ?? blank} />
}

function Form({ initial }: { initial: Draft }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { questionCategories } = useContent()
  const [q, setQ] = useState(initial)
  const isNew = !initial.id

  const save = useMutation({
    mutationFn: () => saveQuestion({ ...q, title: q.title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      navigate('/admin/questions')
    },
  })
  const canSave = q.title.trim() !== '' && !save.isPending

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) save.mutate()
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{isNew ? 'New question' : `Edit question #${initial.id}`}</h2>
        <Link to="/admin/questions" className="btn-ghost">
          Cancel
        </Link>
      </div>
      <Field label="Question">
        <input className="search" value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} autoFocus />
      </Field>
      <Field label="Category (optional)">
        <select className="search" value={q.category ?? ''} onChange={(e) => setQ({ ...q, category: e.target.value || null })}>
          <option value="">none</option>
          {questionCategories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Companies" group>
        <CompanyPicker value={q.companies} onChange={(v) => setQ({ ...q, companies: v })} />
      </Field>
      <Field label="Answer" hint="Use the B and </> buttons to mark the selected text as bold or code." group>
        <BlockEditor initial={initial.answer} onChange={(b) => setQ((p) => ({ ...p, answer: b }))} />
      </Field>
      {save.isError && <p className="text-sm text-[var(--pink)]">{save.error.message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-run" disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save question'}
        </button>
        <Link to="/admin/questions" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  )
}
