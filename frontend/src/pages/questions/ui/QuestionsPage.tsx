import { useTranslation } from 'react-i18next'
import { CategoryTile } from '@/entities/category'
import { PlayButton } from '@/features/study-session'
import { ALL_QUESTIONS, UNCATEGORIZED, useQuestionCategories, useQuestions } from '@/entities/question'

const COLORS = ['cyan', 'pink', 'amber', 'violet', 'green', 'blue']

/** Question categories as tiles, like the problems page; plus "all" and (when there are any) "uncategorized". */
export function QuestionsPage() {
  const { t } = useTranslation()
  const questions = useQuestions()
  const categories = useQuestionCategories()
  const meta = (n: number) => t('counts.question', { count: n })
  const uncategorized = questions.filter((q) => !q.category).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="neon-title text-3xl font-bold">{t('questions.title')}</h1>
        <PlayButton kind="question" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CategoryTile to={`/questions/${ALL_QUESTIONS}`} glyph="☰" color="var(--text)" title={t('questions.all')} meta={meta(questions.length)} />
        {categories.map((c, i) => (
          <CategoryTile
            key={c.slug}
            to={`/questions/${c.slug}`}
            glyph="?"
            color={`var(--${COLORS[i % COLORS.length]})`}
            title={c.name}
            meta={meta(questions.filter((q) => q.category === c.slug).length)}
          />
        ))}
        {uncategorized > 0 && categories.length > 0 && (
          <CategoryTile to={`/questions/${UNCATEGORIZED}`} glyph="∅" color="var(--muted)" title={t('questions.uncategorized')} meta={meta(uncategorized)} />
        )}
      </div>
    </div>
  )
}
