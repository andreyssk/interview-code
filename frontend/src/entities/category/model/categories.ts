import { useContent } from '@/shared/content/ContentContext'
import type { Category, Section } from '@/shared/api/content'

export type { Category, Section }

/** Route slug of a section's "all tasks" tile, e.g. all-golang. */
export const allSlug = (section: Pick<Section, 'slug'>) => `all-${section.slug}`

export const useSections = () => useContent().sections
export const useCategories = () => useContent().categories
export const useCategoriesOf = (section: string) => useCategories().filter((c) => c.section === section)
export const useCategory = (slug: string | undefined) => useCategories().find((c) => c.slug === slug)

/**
 * Categories a route slug covers: a section's "all" slug expands to its categories, a category to itself;
 * undefined when the slug is unknown.
 */
export function useCategoriesForSlug(slug: string) {
  const sections = useSections()
  const categories = useCategories()
  const section = sections.find((s) => allSlug(s) === slug)
  if (section) return { title: section.name, slugs: categories.filter((c) => c.section === section.slug).map((c) => c.slug), section }
  const category = categories.find((c) => c.slug === slug)
  return category ? { title: category.name, slugs: [slug], section: undefined } : undefined
}
