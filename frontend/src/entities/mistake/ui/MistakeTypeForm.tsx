import { useTranslation } from 'react-i18next'
import type { MistakeTypeDraft } from '../model/draft'

/** The two fields of a mistake type. Controlled; the caller owns saving. */
export function MistakeTypeForm({ value, onChange }: { value: MistakeTypeDraft; onChange: (v: MistakeTypeDraft) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <label className="field">
        <span>{t('mistakes.titleLabel')}</span>
        <input
          className="search"
          value={value.title}
          maxLength={100}
          placeholder={t('mistakes.titlePlaceholder')}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          autoFocus
        />
      </label>
      <label className="field">
        <span>{t('mistakes.descriptionLabel')}</span>
        <textarea
          className="search"
          rows={4}
          value={value.description}
          maxLength={2000}
          placeholder={t('mistakes.descriptionPlaceholder')}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
    </div>
  )
}
