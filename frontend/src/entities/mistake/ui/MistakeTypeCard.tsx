import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { MistakeType } from '@/shared/api/mistakes'

export function MistakeTypeCard({ type }: { type: MistakeType }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/mistakes/${type.id}`}
      className="panel flex items-start justify-between gap-4 p-4 transition hover-glow"
    >
      <div className="min-w-0">
        <div className="text-lg font-semibold">{type.title}</div>
        {type.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{type.description}</p>}
      </div>
      <span className="tag neon-amber shrink-0">{t('mistakes.count', { count: type.count })}</span>
    </Link>
  )
}
