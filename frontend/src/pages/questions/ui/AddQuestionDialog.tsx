import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveQuestion, saveQuestionCategory } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { slugify } from '@/shared/lib/slugify'
import { useContent } from '@/shared/content/ContentContext'
import { CompanyMultiSelect, Field, Modal, MultiSelect, RichTextEditor, type Block } from '@/shared/ui'

/** Admin-only popup that creates a question without leaving the list. The full editor stays at /admin/questions/new. */
export function AddQuestionDialog({ onClose, initialCategory = '', initialCompanies = [] }: { onClose: () => void; initialCategory?: string; initialCompanies?: string[] }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { questionCategories, questionSubcategories, sources } = useContent()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [subcategory, setSubcategory] = useState('')
  const [companies, setCompanies] = useState<string[]>(initialCompanies)
  const [src, setSrc] = useState<string[]>([])
  const [answer, setAnswer] = useState<Block[]>([{ p: '' }])
  const [newCategory, setNewCategory] = useState('')
  const subs = category ? questionSubcategories.filter((c) => c.category === category) : []

  const save = useMutation({
    mutationFn: () =>
      saveQuestion({ title: title.trim(), category: category || null, subcategory: subcategory || null, companies, sources: src, answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      onClose()
    },
  })
  // Creates the category (or picks the existing one with that name) and selects it.
  const addCategory = useMutation({
    mutationFn: async () => {
      const name = newCategory.trim()
      const slug = slugify(name)
      if (!slug) throw new Error(t('questions.badCategoryName'))
      const existing = questionCategories.find((c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase())
      if (existing) return existing.slug
      await saveQuestionCategory({ slug, name, position: questionCategories.length })
      await queryClient.invalidateQueries({ queryKey: queryKeys.content }) // wait, so the select has the new option
      return slug
    },
    onSuccess: (slug) => {
      setCategory(slug)
      setSubcategory('')
      setNewCategory('')
    },
  })
  const canSave = title.trim() !== '' && !save.isPending

  return (
    <Modal open form title={t('questions.addTitle')} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) save.mutate()
        }}
      >
        <Field label={t('questions.fieldQuestion')}>
          <textarea className="search resize-none" rows={2} value={title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label={t('questions.category')}>
              <select
                className="search"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setSubcategory('')
                }}
              >
                <option value="">—</option>
                {questionCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  className="search search-sm min-w-0 flex-1"
                  placeholder={t('questions.newCategory')}
                  aria-label={t('questions.newCategory')}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault() // do not submit the whole form
                      if (newCategory.trim() && !addCategory.isPending) addCategory.mutate()
                    }
                  }}
                />
                <button type="button" className="btn-ghost" disabled={!newCategory.trim() || addCategory.isPending} onClick={() => addCategory.mutate()}>
                  {addCategory.isPending ? t('questions.adding') : t('questions.addShort')}
                </button>
              </div>
              {addCategory.isError && <span className="text-sm text-[var(--pink)]">{addCategory.error.message}</span>}
            </Field>
            {subs.length > 0 && (
              <Field label={t('questions.subcategory')}>
                <select className="search" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  <option value="">—</option>
                  {subs.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <Field label={t('filters.company')} group>
            <CompanyMultiSelect value={companies} onChange={setCompanies} />
          </Field>
        </div>
        <Field label={t('questions.fieldAnswer')} group>
          <div className="flex h-72 min-h-0 flex-col">
            <RichTextEditor initial={answer} onChange={setAnswer} />
          </div>
        </Field>
        <Field label={t('filters.source')} group>
          <MultiSelect
            label={t('filters.source')}
            placeholder={t('filters.searchSources')}
            options={sources.map((s) => ({ value: s.slug, label: s.name }))}
            value={src}
            onChange={setSrc}
            emptyText={{ all: t('filters.allSelected'), none: t('filters.noMatch') }}
          />
        </Field>
        {save.isError && (
          <p role="alert" className="text-sm text-[var(--pink)]">
            {save.error.message}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="btn-run" disabled={!canSave}>
            {save.isPending ? t('questions.saving') : t('questions.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
