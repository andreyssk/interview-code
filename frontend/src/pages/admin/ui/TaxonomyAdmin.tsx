import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { deleteCategory, deleteCompany, deleteSection, deleteSource, deleteSourceIcon, saveCategory, saveCompany, saveSection, saveSource, uploadSourceIcon } from '@/shared/api/admin'
import type { Category, Company, Section, Source } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { ConfirmDialog, Field, Modal } from '@/shared/ui'

const TONES = ['neon-cyan', 'neon-pink', 'neon-amber', 'neon-green', 'neon-blue', 'neon-red', 'neon-yellow', 'neon-indigo', 'neon-violet']
const COLORS = ['cyan', 'pink', 'amber', 'violet', 'green', 'blue', 'red', 'yellow']

/** Generic list + create/edit modal + delete confirmation for one kind of entity. */
export function Crud<T extends { slug: string }>({
  title,
  items,
  blank,
  describe,
  save,
  remove,
  renderForm,
}: {
  title: string
  items: T[]
  blank: T
  describe: (x: T) => string
  save: (x: T) => Promise<unknown>
  remove: (slug: string) => Promise<unknown>
  renderForm: (draft: T, set: (p: Partial<T>) => void, isNew: boolean) => ReactNode
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<{ value: T; isNew: boolean } | null>(null)
  const [removing, setRemoving] = useState<T | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.content })

  const saving = useMutation({
    mutationFn: (x: T) => save(x),
    onSuccess: () => {
      refresh()
      setDraft(null)
    },
  })
  const removal = useMutation({
    mutationFn: (slug: string) => remove(slug),
    onSettled: () => {
      setRemoving(null)
      refresh()
    },
  })

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {title} ({items.length})
        </h3>
        <button
          className="btn-run"
          onClick={() => {
            saving.reset()
            setDraft({ value: blank, isNew: true })
          }}
        >
          + Add
        </button>
      </div>
      {removal.isError && <p className="text-sm text-[var(--pink)]">{removal.error.message}</p>}
      <ul className="flex flex-col gap-1.5">
        {items.map((x) => (
          <li key={x.slug} className="panel flex flex-wrap items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 basis-60 text-sm">{describe(x)}</span>
            <button
              className="btn-ghost"
              onClick={() => {
                saving.reset()
                setDraft({ value: x, isNew: false })
              }}
            >
              Edit
            </button>
            <button className="btn-danger" onClick={() => setRemoving(x)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <Modal open={draft !== null} wide title={draft?.isNew ? `New ${title.toLowerCase()}` : `Edit ${draft?.value.slug}`} onClose={() => setDraft(null)}>
        {draft && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              saving.mutate(draft.value)
            }}
          >
            <Field label="Slug" hint={draft.isNew ? 'lowercase-with-dashes; cannot be changed later' : 'cannot be changed'}>
              <input className="search" value={draft.value.slug} disabled={!draft.isNew} onChange={(e) => setDraft({ ...draft, value: { ...draft.value, slug: e.target.value.trim() } })} />
            </Field>
            {renderForm(draft.value, (p) => setDraft({ ...draft, value: { ...draft.value, ...p } }), draft.isNew)}
            {saving.isError && <p className="text-sm text-[var(--pink)]">{saving.error.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-run" disabled={!draft.value.slug || saving.isPending}>
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title={`Delete ${removing?.slug}?`}
        message="Not possible while tasks or categories still use it."
        confirmLabel="Delete"
        busy={removal.isPending}
        onConfirm={() => removing && removal.mutate(removing.slug)}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}

/** Sections (Algorithms, Golang, …) and their categories. */
export function TaxonomyAdmin() {
  const { sections, categories } = useContent()
  const sectionName = (slug: string) => sections.find((s) => s.slug === slug)?.name ?? slug

  return (
    <div className="flex flex-col gap-8">
      <Crud<Section>
        title="Sections"
        items={sections}
        blank={{ slug: '', name: '', position: sections.length + 1 }}
        describe={(s) => `${s.position}. ${s.name} (${s.slug})`}
        save={saveSection}
        remove={deleteSection}
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
      <Crud<Category>
        title="Categories"
        items={categories}
        blank={{ slug: '', section: sections[0]?.slug ?? '', name: '', glyph: '', color: 'var(--cyan)', jp: '', position: categories.length + 1 }}
        describe={(c) => `${c.glyph} ${c.name} (${c.slug}) · ${sectionName(c.section)}`}
        save={saveCategory}
        remove={deleteCategory}
        renderForm={(d, set) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input className="search" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Section">
                <select className="search" value={d.section} onChange={(e) => set({ section: e.target.value })}>
                  {sections.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tile glyph" hint="A short symbol">
                <input className="search" value={d.glyph} onChange={(e) => set({ glyph: e.target.value })} />
              </Field>
              <Field label="Japanese label" hint="Decor in the Tokyo theme">
                <input className="search" value={d.jp} onChange={(e) => set({ jp: e.target.value })} />
              </Field>
              <Field label="Glow color">
                <select className="search" value={d.color} onChange={(e) => set({ color: e.target.value })}>
                  {COLORS.map((c) => (
                    <option key={c} value={`var(--${c})`}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Order">
                <input className="search" type="number" value={d.position} onChange={(e) => set({ position: Number(e.target.value) })} />
              </Field>
            </div>
          </>
        )}
      />
    </div>
  )
}

/** Companies: the tags shown on tasks (name and color). */
export function CompaniesAdmin() {
  const { companies } = useContent()
  return (
    <Crud<Company>
      title="Companies"
      items={companies}
      blank={{ slug: '', name: '', tone: 'neon-violet', description: '' }}
      describe={(c) => `${c.name} (${c.slug})`}
      save={saveCompany}
      remove={deleteCompany}
      renderForm={(d, set) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="search" value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Tag color">
            <select className="search" value={d.tone} onChange={(e) => set({ tone: e.target.value })}>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('neon-', '')}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" hint="Optional; shown on the company page">
              <textarea className="search min-h-24" maxLength={2000} value={d.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
    />
  )
}

type SourceDraft = Source & { file?: File; removeIcon?: boolean }

const MAX_ICON = 100 * 1024

/** Sources: where problems, questions and quizzes came from (name, optional link and icon). */
export function SourcesAdmin() {
  const { sources } = useContent()
  const [error, setError] = useState('')
  return (
    <Crud<SourceDraft>
      title="Sources"
      items={sources}
      blank={{ slug: '', name: '', link: null, iconUrl: null }}
      describe={(s) => `${s.name} (${s.slug})${s.link ? ` · ${s.link}` : ''}`}
      save={async ({ file, removeIcon, ...s }) => {
        await saveSource({ slug: s.slug, name: s.name, link: s.link })
        if (file) await uploadSourceIcon(s.slug, file)
        else if (removeIcon) await deleteSourceIcon(s.slug)
      }}
      remove={deleteSource}
      renderForm={(d, set) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="search" value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Link (optional)">
            <input className="search" type="url" placeholder="https://…" value={d.link ?? ''} onChange={(e) => set({ link: e.target.value || null })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Icon (optional)" hint="PNG, JPEG, GIF, WebP, ICO or SVG, up to 100 KB">
              <div className="flex items-center gap-3">
                {(d.file || (d.iconUrl && !d.removeIcon)) && (
                  <img className="h-10 w-10 rounded-lg bg-white object-cover" alt="" src={d.file ? URL.createObjectURL(d.file) : (d.iconUrl ?? undefined)} />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size > MAX_ICON) {
                      setError('The icon is larger than 100 KB.')
                      e.target.value = ''
                      return
                    }
                    setError('')
                    set({ file, removeIcon: false })
                  }}
                />
                {(d.file || d.iconUrl) && !d.removeIcon && (
                  <button type="button" className="btn-ghost" onClick={() => set({ file: undefined, removeIcon: true })}>
                    Remove icon
                  </button>
                )}
              </div>
              {error && <span className="text-sm text-[var(--pink)]">{error}</span>}
            </Field>
          </div>
        </div>
      )}
    />
  )
}
