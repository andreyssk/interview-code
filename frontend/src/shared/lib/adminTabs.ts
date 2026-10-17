/** Admin panel tabs: route segment under /admin and its label. */
export const ADMIN_TABS = [
  ['tasks', 'Tasks'],
  ['articles', 'Articles'],
  ['questions', 'Questions'],
  ['question-categories', 'Question categories'],
  ['taxonomy', 'Sections & categories'],
  ['companies', 'Companies'],
  ['users', 'Users & access'],
] as const

/** Breadcrumb trail for an /admin/... path, e.g. ["Admin", "Questions", "New question"]. */
export function adminCrumbs(pathname: string): string[] {
  const [root, tab, action, id] = pathname.split('/').filter(Boolean)
  if (root !== 'admin') return []
  const label = ADMIN_TABS.find(([path]) => path === tab)?.[1]
  const crumbs = ['Admin']
  if (!label) return crumbs
  crumbs.push(label)
  const noun = tab === 'questions' ? ' question' : ''
  if (action === 'new') crumbs.push(`New${noun}`)
  else if (action === 'edit') crumbs.push(noun && id ? `Edit question #${id}` : 'Edit')
  return crumbs
}
