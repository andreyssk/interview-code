import { useContent } from '@/shared/content/ContentContext'

export const useSources = () => useContent().sources

/** Name, link and icon of a source; an unknown slug falls back to the slug itself. */
export function useSource(slug: string) {
  const source = useSources().find((s) => s.slug === slug)
  return { name: source?.name ?? slug, link: source?.link ?? null, iconUrl: source?.iconUrl ?? null }
}
