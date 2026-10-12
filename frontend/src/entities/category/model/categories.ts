export type SectionSlug = 'algorithms' | 'golang' | 'sql'

export interface Category {
  slug: string
  section: SectionSlug
  glyph: string
  /** CSS color used for the tile's neon glow */
  color: string
  /** Japanese label (kanji/kana), shown as decor in the Tokyo theme */
  jp: string
}

// Names live in the "common" translations under categories.<slug>.
export const categories: Category[] = [
  { slug: 'arrays', section: 'algorithms', glyph: '[ ]', color: 'var(--cyan)', jp: '配列' },
  { slug: 'two-pointers', section: 'algorithms', glyph: '⇄', color: 'var(--pink)', jp: '二点' },
  { slug: 'hash-map', section: 'algorithms', glyph: '{ }', color: 'var(--amber)', jp: 'ハッシュ' },
  { slug: 'stack', section: 'algorithms', glyph: '▤', color: 'var(--violet)', jp: 'スタック' },
  { slug: 'sliding-window', section: 'algorithms', glyph: '▭', color: 'var(--green)', jp: '窓' },
  { slug: 'trees', section: 'algorithms', glyph: '⌥', color: 'var(--blue)', jp: '木' },
  { slug: 'graphs', section: 'algorithms', glyph: '◉', color: 'var(--pink)', jp: 'グラフ' },
  { slug: 'strings', section: 'golang', glyph: '“ ”', color: 'var(--cyan)', jp: '文字列' },
  { slug: 'concurrency', section: 'golang', glyph: '⇉', color: 'var(--pink)', jp: '並行' },
  { slug: 'slices', section: 'golang', glyph: '[:]', color: 'var(--amber)', jp: 'スライス' },
  { slug: 'interfaces', section: 'golang', glyph: '◇', color: 'var(--violet)', jp: '界面' },
  // SQL has no sub-categories: its tasks carry this one slug and show up under the section's "all" tile.
  { slug: 'sql', section: 'sql', glyph: '⛁', color: 'var(--green)', jp: 'SQL' },
]

export interface Section {
  slug: SectionSlug
  /** Route slug of the section's "all tasks" tile */
  allSlug: string
  /** Categories shown as tiles (the "sql" category is only a tag) */
  tiles: boolean
}

// Names live in the "common" translations under sections.<slug>.
export const sections: Section[] = [
  { slug: 'algorithms', allSlug: 'all-algorithms', tiles: true },
  { slug: 'golang', allSlug: 'all-golang', tiles: true },
  { slug: 'sql', allSlug: 'all-sql', tiles: false },
]

export const categoriesOf = (section: SectionSlug) => categories.filter((c) => c.section === section)

/** Categories a route slug covers: a section's "all" slug expands to its categories, a category to itself. */
export function categoriesForSlug(slug: string): string[] | undefined {
  const section = sections.find((s) => s.allSlug === slug)
  if (section) return categoriesOf(section.slug).map((c) => c.slug)
  return findCategory(slug) ? [slug] : undefined
}

export const findCategory = (slug: string | undefined) => categories.find((c) => c.slug === slug)
