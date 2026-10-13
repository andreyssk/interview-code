import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { TheorySourceLabel, useNote, type TheoryDef } from '@/entities/theory'
import { useCategory } from '@/entities/category'
import { RichBlocks } from '@/shared/ui'

export function TheoryPage() {
  const { t } = useTranslation()
  const note = useNote(useParams().slug)
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
  return <Note note={note} />
}

function Note({ note }: { note: TheoryDef }) {
  const { t } = useTranslation()
  const category = useCategory(note.category)
  return (
    <div className="mx-auto max-w-[46rem]">
      <Link to="/theory" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--cyan)]">
        {t('theory.back')}
      </Link>
      <article className="panel p-6">
        <h1 className="neon-title mb-2 text-3xl font-bold">{note.title}</h1>
        {note.source && (
          <div className="mb-4">
            <TheorySourceLabel source={note.source} />
          </div>
        )}
        <RichBlocks blocks={note.content} />
        {category && (
          <Link to={`/problems/${category.slug}`} className="btn-run mt-4 inline-block">
            {t('theory.practice', { category: category.name })}
          </Link>
        )}
      </article>
    </div>
  )
}
