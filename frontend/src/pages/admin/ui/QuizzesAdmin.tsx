import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteQuiz } from '@/shared/api/admin'
import type { Quiz } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { ConfirmDialog } from '@/shared/ui'

/** Quizzes: a code snippet and its answer. The list shows the prompt (or the first line of code). */
export function QuizzesAdmin() {
  const { quizzes, categories, companies } = useContent()
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<Quiz | null>(null)
  const remove = useMutation({
    mutationFn: (id: number) => deleteQuiz(id),
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
    },
  })
  const label = (q: Quiz) => q.title || q.code.split('\n').find((l) => l.trim()) || `Quiz #${q.id}`
  const categoryName = (slug: string | null) => categories.find((c) => c.slug === slug)?.name
  const companyName = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quizzes ({quizzes.length})</h2>
        <Link to="/admin/quizzes/new" className="btn-run">
          + New quiz
        </Link>
      </div>
      {remove.isError && <p className="text-sm text-[var(--pink)]">{remove.error.message}</p>}
      <ul className="flex flex-col gap-1.5">
        {quizzes.map((q) => (
          <li key={q.id} className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <span className="min-w-0 flex-1 basis-60">
              <span className="font-medium">{label(q)}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {[q.language, categoryName(q.category), q.companies.map(companyName).join(', ')].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="flex gap-1.5">
              <Link to={`/admin/quizzes/edit/${q.id}`} className="btn-ghost">
                Edit
              </Link>
              <button className="btn-danger" onClick={() => setRemoving(q)}>
                Delete
              </button>
            </span>
          </li>
        ))}
        {quizzes.length === 0 && <li className="panel p-4 text-[var(--muted)]">No quizzes yet.</li>}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Delete this quiz?"
        message={removing ? `"${label(removing)}" is removed.` : ''}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
