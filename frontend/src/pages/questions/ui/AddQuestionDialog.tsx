import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveQuestion } from '@/shared/api/admin'
import type { Block } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { useContent } from '@/shared/content/ContentContext'
import { CompanyMultiSelect, Field, Modal, MultiSelect, RichTextEditor } from '@/shared/ui'

/** Admin-only popup that creates a question without leaving the list. The full editor stays at /admin/questions/new. */
export function AddQuestionDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { questionCategories, questionSubcategories, sources } = useContent()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [companies, setCompanies] = useState<string[]>([])
  const [src, setSrc] = useState<string[]>([])
  const [answer, setAnswer] = useState<Block[]>([{ p: '' }])
  const subs = category ? questionSubcategories.filter((c) => c.category === category) : []

  const save = useMutation({
    mutationFn: () =>
      saveQuestion({ title: title.trim(), category: category || null, subcategory: subcategory || null, companies, sources: src, answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      onClose()
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
          <Field label={t('filters.company')} group>
            <CompanyMultiSelect value={companies} onChange={setCompanies} />
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
        </div>
        <Field label={t('questions.fieldAnswer')} group>
          <div className="flex h-72 min-h-0 flex-col">
            <RichTextEditor initial={answer} onChange={setAnswer} />
          </div>
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
