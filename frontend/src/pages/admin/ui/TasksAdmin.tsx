import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteTask, saveTask } from '@/shared/api/admin'
import type { ApiTask } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { usePersistentState } from '@/shared/lib/storage'
import { ConfirmDialog } from '@/shared/ui'
import { downloadJson } from '../lib/download'
import { UploadJson } from './UploadJson'

const EXAMPLE = {
  slug: 'reverse-string',
  title: 'Reverse a string',
  difficulty: 'easy',
  categories: ['strings'],
  companies: [],
  leetcodeUrl: null,
  description: [{ p: 'Return the string reversed.' }, { h: 'Example' }, { pre: 'Input: s = "abc"\nOutput: "cba"' }],
  signature: { name: 'reverseString', params: [{ name: 's', type: 'string' }], returns: 'string' },
  tests: [{ name: 'example', input: { s: 'abc' }, expected: 'cba' }],
  solution: 'package main\n\nfunc reverseString(s string) string {\n\tr := []rune(s)\n\tfor i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {\n\t\tr[i], r[j] = r[j], r[i]\n\t}\n\treturn string(r)\n}\n',
  solutionNotes: null,
  commonMistakes: null,
  complexity: { time: 'O(n)', space: 'O(n)' },
  template: null,
}

export function TasksAdmin() {
  const { tasks, categories, companies } = useContent()
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<ApiTask | null>(null)
  const remove = useMutation({
    mutationFn: (slug: string) => deleteTask(slug),
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
    },
  })
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug
  const companyName = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug

  // Kept across navigation, so after editing a task you land back on the same search.
  const [query, setQuery] = usePersistentState('admin:tasks:search', '')
  // Every word must match somewhere in: number, slug, title, difficulty, category names, company names.
  const words = query.toLowerCase().replace(/#/g, '').split(/\s+/).filter(Boolean)
  const shown = words.length === 0 ? tasks : tasks.filter((t) => {
    const hay = [String(t.number), t.slug, t.title, t.difficulty, ...t.categories.map(categoryName), ...t.companies.map(companyName)].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks ({tasks.length})</h2>
        <Link to="/admin/tasks/new" className="btn-run">
          + New task
        </Link>
      </div>
      <UploadJson
        noun="task"
        existing={tasks.map((t) => t.slug)}
        save={(item) => saveTask(item as unknown as Omit<ApiTask, 'number'>)}
        example={EXAMPLE as never}
      />
      <div className="flex items-center gap-3">
        <input
          className="search"
          type="search"
          placeholder="Search tasks by title, number, slug, category or company…"
          aria-label="Search tasks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {words.length > 0 && (
          <span className="shrink-0 text-sm text-[var(--muted)]">
            {shown.length} of {tasks.length}
          </span>
        )}
      </div>
      {remove.isError && <p className="text-sm text-[var(--pink)]">{remove.error.message}</p>}
      <ul className="flex flex-col gap-1.5">
        {shown.length === 0 && <li className="panel p-4 text-[var(--muted)]">No tasks match “{query.trim()}”.</li>}
        {shown.map((t) => (
          <li key={t.slug} className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <span className="w-10 shrink-0 text-sm tabular-nums text-[var(--muted)]">#{t.number}</span>
            <span className="min-w-0 flex-1 basis-60">
              <span className="font-medium">{t.title}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {t.slug} · {t.difficulty} · {t.categories.map(categoryName).join(', ') || 'no category'}
              </span>
            </span>
            <span className="flex gap-1.5">
              <Link to={`/admin/tasks/edit/${t.slug}`} className="btn-ghost">
                Edit
              </Link>
              <button className="btn-ghost" onClick={() => downloadJson(`${t.slug}.json`, { ...t, number: undefined })}>
                Export
              </button>
              <button className="btn-danger" onClick={() => setRemoving(t)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Delete this task?"
        message={`"${removing?.title}" disappears from the app. Saved attempts of users stay in the database but are no longer shown. Its number is not reused.`}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.slug)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
