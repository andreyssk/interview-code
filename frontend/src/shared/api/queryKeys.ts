export const queryKeys = {
  content: ['content'] as const,
  me: ['me'] as const,
  recentTasks: ['recent-tasks'] as const,
  sessions: ['sessions'] as const,
  session: (id: number) => ['session', id] as const,
  adminUsers: ['admin-users'] as const,
  adminSettings: ['admin-settings'] as const,
  authConfig: ['auth-config'] as const,
  stats: ['stats'] as const,
  attempts: (slug: string) => ['attempts', slug] as const,
  mistakeTypes: ['mistake-types'] as const,
  mistakeType: (id: number) => ['mistake-type', id] as const,
}
