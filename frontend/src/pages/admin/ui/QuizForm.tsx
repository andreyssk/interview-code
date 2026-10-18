import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { saveQuiz } from '@/shared/api/admin'
import type { Quiz } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { CompanyMultiSelect, Field } from '@/shared/ui'

type Draft = Omit<Quiz, 'id'> & { id?: number }
const blank: Draft = { title: '', language: 'go', code: '', answer: '', explanation: '', category: null, companies: [] }

/** Create (/admin/quizzes/new) or edit (/admin/quizzes/edit/:id) a quiz. */
export function QuizForm() {
  const { id } = useParams()
  const { quizzes } = useContent()
  const existing = quizzes.find((q) => String(q.id) === id)
  if (id && !existing) return <p className="text-[var(--pink)]">No such quiz.</p>
  return <Form key={id ?? 'new'} initial={existing ?? blank} />
}

function Form({ initial }: { initial: Draft }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { categories } = useContent()
  // Where the edit link on the public page came from; the admin list otherwise.
  const from = (useLocation().state as { from?: unknown } | null)?.from
  const back = typeof from === 'string' && from.startsWith('/') ? from : '/admin/quizzes'
  const [q, setQ] = useState(initial)
  const set = (p: Partial<Draft>) => setQ((prev) => ({ ...prev, ...p }))

  const save = useMutation({
    mutationFn: () => saveQuiz({ ...q, title: q.title.trim(), explanation: q.explanation.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      navigate(back)
    },
  })
  const canSave = q.code.trim() !== '' && q.answer.trim() !== '' && !save.isPending

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) save.mutate()
      }}
    >
      <h2 className="text-xl font-semibold">{initial.id ? `Edit quiz #${initial.id}` : 'New quiz'}</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Field label="Prompt (optional)" hint='Shown above the code. Empty means "What will be printed?"'>
            <input className="search" value={q.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Language">
              <select className="search" value={q.language} onChange={(e) => set({ language: e.target.value as Quiz['language'] })}>
                <option value="go">Go</option>
                <option value="java">Java</option>
              </select>
            </Field>
            <Field label="Category (optional)">
              <select className="search" value={q.category ?? ''} onChange={(e) => set({ category: e.target.value || null })}>
                <option value="">none</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Companies" group>
            <CompanyMultiSelect value={q.companies} onChange={(v) => set({ companies: v })} />
          </Field>
          <Field label="Code">
            <textarea className="search font-mono text-sm" rows={14} spellCheck={false} value={q.code} onChange={(e) => set({ code: e.target.value })} autoFocus />
          </Field>
        </div>
        <div className="flex flex-col gap-5">
          <Field label="Answer" hint="The output, or what happens. Hidden behind a spoiler.">
            <textarea className="search font-mono text-sm" rows={8} spellCheck={false} value={q.answer} onChange={(e) => set({ answer: e.target.value })} />
          </Field>
          <Field label="Explanation (optional)" hint="A short why, shown under the answer.">
            <textarea className="search" rows={3} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} />
          </Field>
        </div>
      </div>
      {save.isError && <p className="text-sm text-[var(--pink)]">{save.error.message}</p>}
      <div className="flex justify-end gap-3">
        <Link to={back} className="btn-ghost btn-lg">
          Cancel
        </Link>
        <button type="submit" className="btn-run btn-lg" disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save quiz'}
        </button>
      </div>
    </form>
  )
}
