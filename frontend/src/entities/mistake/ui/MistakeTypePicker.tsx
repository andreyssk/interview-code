import type { MistakeType } from '@/shared/api/mistakes'
import { useTranslation } from 'react-i18next'
import { effectiveChoice, type MistakeTypeDraft, type TypeChoice } from '../model/draft'
import { MistakeTypeForm } from './MistakeTypeForm'

interface Props {
  /** Types that can be picked */
  types: MistakeType[]
  selected: TypeChoice
  onSelect: (choice: number | 'new') => void
  draft: MistakeTypeDraft
  onDraftChange: (draft: MistakeTypeDraft) => void
  legend: string
}

/** Pick an existing type or describe a new one. Controlled; the caller saves. */
export function MistakeTypePicker({ types, selected, onSelect, draft, onDraftChange, legend }: Props) {
  const { t } = useTranslation()
  const choice = effectiveChoice(types, selected)
  return (
    <>
      {types.length > 0 && (
        <fieldset className="mb-4">
          <legend className="modal-message mb-2">{legend}</legend>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {types.map((type) => (
              <label key={type.id} className={`choice ${choice === type.id ? 'choice-active' : ''}`}>
                <input type="radio" name="mistake-type" checked={choice === type.id} onChange={() => onSelect(type.id)} />
                <span className="min-w-0">
                  <span className="block font-medium">{type.title}</span>
                  {type.description && <span className="line-clamp-2 block text-sm text-[var(--muted)]">{type.description}</span>}
                </span>
              </label>
            ))}
            <label className={`choice ${choice === 'new' ? 'choice-active' : ''}`}>
              <input type="radio" name="mistake-type" checked={choice === 'new'} onChange={() => onSelect('new')} />
              <span className="font-medium">{t('mistakes.createNew')}</span>
            </label>
          </div>
        </fieldset>
      )}
      {choice === 'new' && <MistakeTypeForm value={draft} onChange={onDraftChange} />}
    </>
  )
}
