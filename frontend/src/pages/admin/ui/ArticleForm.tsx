import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { saveArticle } from '@/shared/api/admin'
import type { ApiArticle } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { BlockEditor, ChipPicker, Field } from '@/shared/ui'

const blank: ApiArticle = { slug: '', title: '', summary: '', content: [{ p: '' }], sourceName: null, sourceUrl: null, category: null, categories: [], tasks: [] }

/** Create (/admin/articles/new) or edit (/admin/articles/edit/:slug) a theory article. */
export function ArticleForm() {
  const { slug: editing } = useParams()
  const { articles } = useContent()
  const existing = articles.find((a) => a.slug === editing)
  if (editing && !existing) return <p className="text-[var(--pink)]">No such article.</p>
  return <Form key={editing ?? 'new'} initial={existing ?? blank} isNew={!existing} />
}

function Form({ initial, isNew }: { initial: ApiArticle; isNew: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { categories, sections, tasks } = useContent()
  const [a, setA] = useState(initial)
  const set = <K extends keyof ApiArticle>(k: K, v: ApiArticle[K]) => setA((p) => ({ ...p, [k]: v }))
  const sectionName = (slug: string) => sections.find((s) => s.slug === slug)?.name ?? slug

  const save = useMutation({
    mutationFn: () => saveArticle({ ...a, sourceName: a.sourceName?.trim() || null, sourceUrl: a.sourceUrl?.trim() || null, category: a.category || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      navigate('/admin/articles')
    },
  })
  const canSave = a.slug !== '' && a.title.trim() !== '' && !save.isPending

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) save.mutate()
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{isNew ? 'New article' : `Edit ${initial.slug}`}</h2>
        <Link to="/admin/articles" className="btn-ghost">
          Cancel
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Slug" hint={isNew ? 'lowercase-with-dashes; used in the URL' : 'cannot be changed'}>
          <input className="search" value={a.slug} disabled={!isNew} onChange={(e) => set('slug', e.target.value.trim())} placeholder="go-strings-basics" />
        </Field>
        <Field label="Title">
          <input className="search" value={a.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Source name (optional)">
          <input className="search" value={a.sourceName ?? ''} onChange={(e) => set('sourceName', e.target.value)} placeholder="algocode.io" />
        </Field>
        <Field label="Source link (optional)">
          <input className="search" value={a.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://algocode.io" />
        </Field>
      </div>
      <Field label="Summary" hint="One sentence for the card in the theory list">
        <textarea className="search" rows={2} value={a.summary} onChange={(e) => set('summary', e.target.value)} />
      </Field>
      <Field label="Main category" hint="Decides the section it is listed under and where “Practice” leads">
        <select className="search" value={a.category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
          <option value="">none</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {sectionName(c.section)} · {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Also suggest on tasks of these categories" group>
        <ChipPicker options={categories.map((c) => ({ value: c.slug, label: c.name }))} value={a.categories} onChange={(v) => set('categories', v)} />
      </Field>
      <Field label="Also suggest on these tasks" group>
        <ChipPicker options={tasks.map((t) => ({ value: t.slug, label: `#${t.number} ${t.title}` }))} value={a.tasks} onChange={(v) => set('tasks', v)} />
      </Field>
      <Field label="Content" group>
        <BlockEditor initial={initial.content} onChange={(b) => set('content', b)} />
      </Field>
      {save.isError && <p className="text-sm text-[var(--pink)]">{save.error.message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-run" disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save article'}
        </button>
        <Link to="/admin/articles" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  )
}
