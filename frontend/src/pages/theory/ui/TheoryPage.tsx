import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { findTheory, useTheoryText } from '@/entities/theory'
import { RichBlocks } from '@/shared/ui'

export function TheoryPage() {
  const { t } = useTranslation()
  const note = findTheory(useParams().slug)
  if (!note) {
    return (
      <p>
        {t('theory.notFound')}{' '}
        <Link className="underline" to="/theory">
          {t('theory.backToList')}
        </Link>
      </p>
    )
  }
  return <Note slug={note.slug} category={note.category} />
}

function Note({ slug, category }: { slug: string; category?: string }) {
  const { t } = useTranslation()
  const { title, content } = useTheoryText(slug)
  return (
    <div>
      <Link to="/theory" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('theory.back')}
      </Link>
      <article className="panel p-6">
        <h1 className="neon-title mb-4 text-3xl font-bold">{title}</h1>
        <RichBlocks blocks={content} />
        {category && (
          <Link to={`/problems/${category}`} className="btn-run mt-4 inline-block">
            {t('theory.practice', { category: t(`categories.${category}.name`) })}
          </Link>
        )}
      </article>
    </div>
  )
}
