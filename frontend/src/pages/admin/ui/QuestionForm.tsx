import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { saveQuestion } from '@/shared/api/admin'
import type { Question } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuth } from '@/shared/auth/AuthContext'
import { useContent } from '@/shared/content/ContentContext'
import { CompanyMultiSelect, Field, Icon, RichTextEditor } from '@/shared/ui'

type Draft = Omit<Question, 'id'> & { id?: number }
const blank: Draft = { title: '', category: null, subcategory: null, companies: [], answer: [{ p: '' }] }

const AUTOSAVE_MS = 2000

/** Where Back and a successful save lead when the editor was not opened from somewhere specific. */
const DEFAULT_BACK = '/admin/questions'

/** The page the editor was opened from (an "edit" icon passes it in the router state), else the admin list. */
function useBackTo() {
  const from = (useLocation().state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : DEFAULT_BACK
}

/**
 * Create (/admin/questions/new) or edit (/admin/questions/edit/:id) a question.
 * A focus page: the app header is hidden (see App), a sidebar holds the metadata and the answer editor is the hero.
 */
export function QuestionForm() {
  const { user } = useAuth()
  const back = useBackTo()
  const { id } = useParams()
  const { questions } = useContent()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  const existing = questions.find((q) => String(q.id) === id)
  if (id && !existing) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <Link to={back} className="btn-ghost">
          ← Back
        </Link>
        <p className="text-[var(--pink)]">No such question.</p>
      </div>
    )
  }
  return <Form key={id ?? 'new'} initial={existing ?? blank} />
}

function Form({ initial }: { initial: Draft }) {
  const back = useBackTo()
  const queryClient = useQueryClient()
  const { questionCategories, questionSubcategories } = useContent()
  const [q, setQ] = useState(initial)
  const categorySubs = q.category ? questionSubcategories.filter((c) => c.category === q.category) : []

  // Saving keeps the form open. A new question gets its id from the first save, so later saves update it
  // instead of creating a duplicate.
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () => saveQuestion({ ...q, title: q.title.trim() }),
    onSuccess: (saved) => {
      setQ((p) => ({ ...p, id: saved.id }))
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      setSaved(true)
    },
  })
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [saved])
  const canSave = q.title.trim() !== '' && !save.isPending

  // Autosave once the answer has been left alone (no typing or formatting) for 2 seconds. Any further change restarts
  // the wait; a pending save or an empty title just postpones it.
  const [dirty, setDirty] = useState(false)
  const { mutate } = save
  useEffect(() => {
    if (!dirty || !canSave) return
    const timer = setTimeout(() => {
      setDirty(false)
      mutate()
    }, AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [dirty, canSave, q, mutate])

  return (
    <form
      className="fit-form grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) {
          setDirty(false)
          save.mutate()
        }
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault()
          if (canSave) {
            setDirty(false)
            save.mutate()
          }
        }
      }}
    >
      <Link to={back} className="btn-ghost fab fixed top-3 left-4 z-30">
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
        <RichTextEditor
          flush
          initial={initial.answer}
          onChange={(b) => {
            setQ((p) => ({ ...p, answer: b }))
            setDirty(true)
          }}
          actions={
            <>
              <span role="status" className="text-sm">
                {saved && <span className="text-[var(--green)]">Saved ✓</span>}
                {save.isError && <span className="text-[var(--pink)]">{save.error.message}</span>}
              </span>
              <button type="submit" className="icon-btn" title="Save (Ctrl+S)" aria-label="Save question" disabled={!canSave}>
                <Icon name="save" />
              </button>
            </>
          }
        />
      </div>
    </form>
  )
}
