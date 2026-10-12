export const queryKeys = {
  stats: ['stats'] as const,
  attempts: (slug: string) => ['attempts', slug] as const,
  mistakeTypes: ['mistake-types'] as const,
  mistakeType: (id: number) => ['mistake-type', id] as const,
}
