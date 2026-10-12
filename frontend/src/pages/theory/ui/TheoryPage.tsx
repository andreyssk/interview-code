import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { findTheory, TheorySourceLabel, useTheoryText, type TheorySource } from '@/entities/theory'
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
  return <Note slug={note.slug} category={note.category} source={note.source} />
}

function Note({ slug, category, source }: { slug: string; category?: string; source?: TheorySource }) {
  const { t } = useTranslation()
  const { title, content } = useTheoryText(slug)
  return (
    <div className="mx-auto max-w-[46rem]">
      <Link to="/theory" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('theory.back')}
      </Link>
      <article className="panel p-6">
        <h1 className="neon-title mb-2 text-3xl font-bold">{title}</h1>
        {source && (
          <div className="mb-4">
            <TheorySourceLabel source={source} />
          </div>
        )}
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
