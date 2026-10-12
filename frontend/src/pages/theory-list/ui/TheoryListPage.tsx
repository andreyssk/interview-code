import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { findCategory, sections } from '@/entities/category'
import { TheoryCard, theory } from '@/entities/theory'

export function TheoryListPage() {
  const { t } = useTranslation()
  // Notes are grouped by the section (Algorithms, Golang, ...) of their category; empty sections are hidden.
  const groups = sections
    .map((s) => ({ section: s, notes: theory.filter((n) => findCategory(n.category)?.section === s.slug) }))
    .filter((g) => g.notes.length > 0)

  return (
    <div>
      <h1 className="neon-title mb-6 text-3xl font-bold">{t('theory.title')}</h1>
      <div className="flex flex-col gap-8">
        {groups.map(({ section, notes }) => (
          <section key={section.slug}>
            <h2 className="mb-3 text-xl font-semibold">{t(`sections.${section.slug}.name`)}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <li key={note.slug} className="flex">
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
          </section>
        ))}
      </div>
    </div>
  )
}
