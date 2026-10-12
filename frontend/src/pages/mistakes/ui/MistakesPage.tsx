import { useTranslation } from 'react-i18next'
import { MistakeTypeCard, useMistakeTypes } from '@/entities/mistake'
import { NewMistakeType } from '@/features/create-mistake-type'
import { Spinner } from '@/shared/ui'

export function MistakesPage() {
  const { t } = useTranslation()
  const { data: types, isPending, isError } = useMistakeTypes()
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h1 className="neon-title text-3xl font-bold">{t('mistakes.title')}</h1>
        <NewMistakeType />
      </div>
      <p className="mb-6 text-[var(--muted)]">{t('mistakes.intro')}</p>
      {isPending && <Spinner />}
      {isError && <p className="text-[var(--pink)]">{t('mistakes.loadError')}</p>}
      {types && types.length === 0 && <div className="panel p-6 text-[var(--muted)]">{t('mistakes.empty')}</div>}
      {types && types.length > 0 && (
        <ul className="flex flex-col gap-2">
          {types.map((type) => (
            <li key={type.id}>
              <MistakeTypeCard type={type} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
