import { useContent } from '@/shared/content/ContentContext'

export const useCompanies = () => useContent().companies

/** Display name and tag color of a company; an unknown slug falls back to the slug itself. */
export function useCompany(slug: string) {
  const company = useCompanies().find((c) => c.slug === slug)
  return { name: company?.name ?? slug, tone: company?.tone ?? 'neon-violet' }
}
