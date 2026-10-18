import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteQuestion, deleteQuestionCategory, deleteQuestionSubcategory, saveQuestionCategory, saveQuestionSubcategory } from '@/shared/api/admin'
import type { Question, QuestionCategory, QuestionSubcategory } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { ConfirmDialog, Field } from '@/shared/ui'
import { Crud } from './TaxonomyAdmin'

export function QuestionsAdmin() {
  const { questions, questionCategories, questionSubcategories, companies } = useContent()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('') // '' = all, '-' = uncategorized, else a category slug
  const [removing, setRemoving] = useState<Question | null>(null)
  const remove = useMutation({
    mutationFn: (id: number) => deleteQuestion(id),
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
    },
  })
  const placeName = (q: Question) => {
    const cat = questionCategories.find((c) => c.slug === q.category)?.name
    if (!cat) return 'Other'
    const sub = questionSubcategories.find((c) => c.slug === q.subcategory)?.name
    return `${cat} › ${sub ?? 'Other'}`
  }
  const companyName = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug
  const shown = questions.filter((q) => (filter === '' ? true : filter === '-' ? !q.category : q.category === filter))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
        <div className="flex items-center gap-2">
          <select className="search search-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by category">
            <option value="">all categories</option>
            <option value="-">Other (no category)</option>
            {questionCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <Link to="/admin/questions/new" className="btn-run">
            + New question
          </Link>
        </div>
      </div>
      {remove.isError && <p className="text-sm text-[var(--pink)]">{remove.error.message}</p>}
      <ul className="flex flex-col gap-1.5">
        {shown.map((q) => (
          <li key={q.id} className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <span className="min-w-0 flex-1 basis-60">
              <span className="font-medium">{q.title}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {placeName(q)}
                {q.companies.length > 0 ? ` · ${q.companies.map(companyName).join(', ')}` : ''}
              </span>
            </span>
            <span className="flex gap-1.5">
              <Link to={`/admin/questions/edit/${q.id}`} className="btn-ghost">
                Edit
              </Link>
              <button className="btn-danger" onClick={() => setRemoving(q)}>
                Delete
              </button>
            </span>
          </li>
        ))}
        {shown.length === 0 && <li className="panel p-4 text-[var(--muted)]">No questions here.</li>}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Delete this question?"
        message={`"${removing?.title}" and its answer are removed.`}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}

/**
 * Question categories and their subcategories. Questions without a category are shown under "Other",
 * and those with a category but no subcategory under that category's "Other".
 */
export function QuestionCategoriesAdmin() {
  const { questionCategories, questionSubcategories } = useContent()
  const categoryName = (slug: string) => questionCategories.find((c) => c.slug === slug)?.name ?? slug
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-[var(--muted)]">
        Deleting a category deletes its subcategories but not its questions; they move to "Other". Deleting a subcategory moves its questions to the category's "Other".
      </p>
      <Crud<QuestionCategory>
        title="Question categories"
        items={questionCategories}
        blank={{ slug: '', name: '', position: questionCategories.length + 1 }}
        describe={(c) => `${c.position}. ${c.name} (${c.slug})`}
        save={saveQuestionCategory}
        remove={deleteQuestionCategory}
        renderForm={(d, set) => (
          <>
            <Field label="Name">
              <input className="search" value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Order">
              <input className="search" type="number" value={d.position} onChange={(e) => set({ position: Number(e.target.value) })} />
            </Field>
          </>
        )}
      />
      <Crud<QuestionSubcategory>
        title="Question subcategories"
        items={questionSubcategories}
        blank={{ slug: '', category: questionCategories[0]?.slug ?? '', name: '', position: questionSubcategories.length + 1 }}
        describe={(c) => `${categoryName(c.category)} › ${c.name} (${c.slug})`}
        save={saveQuestionSubcategory}
        remove={deleteQuestionSubcategory}
        renderForm={(d, set) => (
          <>
            <Field label="Name">
              <input className="search" value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Category">
              <select className="search" value={d.category} onChange={(e) => set({ category: e.target.value })}>
                {questionCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Order">
              <input className="search" type="number" value={d.position} onChange={(e) => set({ position: Number(e.target.value) })} />
            </Field>
          </>
        )}
      />
    </div>
  )
}
