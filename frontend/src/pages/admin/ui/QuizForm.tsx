import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { saveQuiz } from '@/shared/api/admin'
import type { Quiz, QuizStage } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { CodeEditor, CompanyMultiSelect, Field, MultiSelect } from '@/shared/ui'

type Draft = Omit<Quiz, 'id'> & { id?: number }
const blankStage: QuizStage = { code: '', answer: '', explanation: '' }
const blank: Draft = { title: '', language: 'go', stages: [blankStage], companies: [], sources: [] }

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
  // Where the edit link on the public page came from; the admin list otherwise.
  const from = (useLocation().state as { from?: unknown } | null)?.from
  const back = typeof from === 'string' && from.startsWith('/') ? from : '/admin/quizzes'
  const { sources } = useContent()
  const [q, setQ] = useState(initial)
  const set = (p: Partial<Draft>) => setQ((prev) => ({ ...prev, ...p }))

  const save = useMutation({
    mutationFn: () => saveQuiz({ ...q, title: q.title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      navigate(back)
    },
  })
  const setStage = (i: number, p: Partial<QuizStage>) => set({ stages: q.stages.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  const moveStage = (i: number, d: number) => {
    const stages = [...q.stages]
    ;[stages[i], stages[i + d]] = [stages[i + d], stages[i]]
    set({ stages })
  }
  const canSave = q.stages.length > 0 && q.stages.every((s) => s.code.trim() !== '' && s.answer.trim() !== '') && !save.isPending

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
        <Field label="Prompt (optional)" hint='Shown above the code. Empty means "What will be printed?"'>
          <input className="search" value={q.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Language">
          <select className="search" value={q.language} onChange={(e) => set({ language: e.target.value as Quiz['language'] })}>
            <option value="go">Go</option>
            <option value="java">Java</option>
          </select>
        </Field>
      </div>
      <Field label="Companies" group>
        <CompanyMultiSelect value={q.companies} onChange={(v) => set({ companies: v })} />
      </Field>
      <Field label="Sources" group>
        <MultiSelect label="Sources" placeholder="Search sources…" options={sources.map((s) => ({ value: s.slug, label: s.name }))} value={q.sources} onChange={(v) => set({ sources: v })} />
      </Field>
      {q.stages.map((st, i) => (
        // Stages have no stable id and are only reordered via the buttons, so the index is a fine key.
        <section key={i} className="panel flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Stage {i + 1}</h3>
            <div className="flex gap-1.5">
              <button type="button" className="btn-ghost" disabled={i === 0} onClick={() => moveStage(i, -1)}>
                ↑
              </button>
              <button type="button" className="btn-ghost" disabled={i === q.stages.length - 1} onClick={() => moveStage(i, 1)}>
                ↓
              </button>
              <button type="button" className="btn-danger" disabled={q.stages.length === 1} onClick={() => set({ stages: q.stages.filter((_, j) => j !== i) })}>
                Remove
              </button>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Code">
              <div className="h-72 overflow-hidden rounded-lg border border-[var(--border)]">
                <CodeEditor value={st.code} onChange={(code) => setStage(i, { code })} language={q.language} label={`Stage ${i + 1} code`} />
              </div>
            </Field>
            <div className="flex flex-col gap-5">
              <Field label="Answer" hint="The output, or what happens. Hidden behind a spoiler.">
                <textarea className="search font-mono text-sm" rows={6} spellCheck={false} value={st.answer} onChange={(e) => setStage(i, { answer: e.target.value })} />
              </Field>
              <Field label="Explanation (optional)" hint="A short why, shown under the answer.">
                <textarea className="search" rows={3} value={st.explanation} onChange={(e) => setStage(i, { explanation: e.target.value })} />
              </Field>
            </div>
          </div>
        </section>
      ))}
      <div>
        <button type="button" className="btn-ghost" onClick={() => set({ stages: [...q.stages, blankStage] })}>
          + Add stage
        </button>
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
