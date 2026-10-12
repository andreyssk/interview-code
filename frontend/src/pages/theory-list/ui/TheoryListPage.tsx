import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TheoryCard, theory } from '@/entities/theory'

export function TheoryListPage() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="neon-title mb-6 text-3xl font-bold">{t('theory.title')}</h1>
      <ul className="space-y-3">
        {theory.map((note) => (
          <li key={note.slug}>
            <TheoryCard
              note={note}
              footer={
                note.category && (
                  <Link to={`/problems/${note.category}`} className="text-sm text-[var(--cyan)] hover:underline">
                    {t('theory.practiceLink', { category: t(`categories.${note.category}.name`) })}
                  </Link>
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
