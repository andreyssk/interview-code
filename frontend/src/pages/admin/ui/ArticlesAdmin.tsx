import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteArticle, saveArticle } from '@/shared/api/admin'
import type { ApiArticle } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { ConfirmDialog } from '@/shared/ui'
import { downloadJson } from '../lib/download'
import { UploadJson } from './UploadJson'

const EXAMPLE = {
  slug: 'go-strings-basics',
  title: 'Strings basics',
  summary: 'How strings work in Go.',
  content: [{ p: 'A string is an immutable array of bytes.' }, { h: 'Example' }, { pre: 's := "hello"\nfmt.Println(len(s))' }],
  sourceName: 'example.com',
  sourceUrl: 'https://example.com',
  category: 'strings',
  categories: [],
  tasks: [],
}

export function ArticlesAdmin() {
  const { articles, categories } = useContent()
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<ApiArticle | null>(null)
  const remove = useMutation({
    mutationFn: (slug: string) => deleteArticle(slug),
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
    },
  })
  const categoryName = (slug: string | null) => categories.find((c) => c.slug === slug)?.name ?? 'no category'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Articles ({articles.length})</h2>
        <Link to="/admin/articles/new" className="btn-run">
          + New article
        </Link>
      </div>
      <UploadJson noun="article" existing={articles.map((a) => a.slug)} save={(item) => saveArticle(item as unknown as ApiArticle)} example={EXAMPLE as never} />
      {remove.isError && <p className="text-sm text-[var(--pink)]">{remove.error.message}</p>}
      <ul className="flex flex-col gap-1.5">
        {articles.map((a) => (
          <li key={a.slug} className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <span className="min-w-0 flex-1 basis-60">
              <span className="font-medium">{a.title}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {a.slug} · {categoryName(a.category)}
                {a.sourceName ? ` · ${a.sourceName}` : ''}
              </span>
            </span>
            <span className="flex gap-1.5">
              <Link to={`/admin/articles/edit/${a.slug}`} className="btn-ghost">
                Edit
              </Link>
              <button className="btn-ghost" onClick={() => downloadJson(`${a.slug}.json`, a)}>
                Export
              </button>
              <button className="btn-danger" onClick={() => setRemoving(a)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Delete this article?"
        message={`"${removing?.title}" is removed from the theory section.`}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.slug)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
