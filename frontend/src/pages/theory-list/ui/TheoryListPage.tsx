import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCategories, useSections } from '@/entities/category'
import { TheoryCard, useTheory } from '@/entities/theory'

export function TheoryListPage() {
  const { t } = useTranslation()
  const sections = useSections()
  const categories = useCategories()
  const theory = useTheory()
  // Notes are grouped by the section (Algorithms, Golang, ...) of their category; empty sections are hidden.
  const sectionOf = (category: string | undefined) => categories.find((c) => c.slug === category)?.section
  const groups = sections
    .map((s) => ({ section: s, notes: theory.filter((n) => sectionOf(n.category) === s.slug) }))
    .filter((g) => g.notes.length > 0)

  return (
    <div>
      <h1 className="neon-title mb-6 text-3xl font-bold">{t('theory.title')}</h1>
      <div className="flex flex-col gap-8">
        {groups.map(({ section, notes }) => (
          <section key={section.slug}>
            <h2 className="mb-3 text-xl font-semibold">{section.name}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => {
                const category = categories.find((c) => c.slug === note.category)
                return (
                  <li key={note.slug} className="flex">
                    <TheoryCard
                      note={note}
                      footer={
                        category && (
                          <Link to={`/problems/${category.slug}`} className="text-sm text-[var(--cyan)] hover:underline">
                            {t('theory.practiceLink', { category: category.name })}
                          </Link>
                        )
                      }
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
