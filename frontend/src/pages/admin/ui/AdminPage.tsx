import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'
import { ArticleForm } from './ArticleForm'
import { ArticlesAdmin } from './ArticlesAdmin'
import { TaskForm } from './TaskForm'
import { TasksAdmin } from './TasksAdmin'
import { TaxonomyAdmin } from './TaxonomyAdmin'
import { UsersAdmin } from './UsersAdmin'

const TABS = [
  ['tasks', 'Tasks'],
  ['articles', 'Articles'],
  ['taxonomy', 'Sections & categories'],
  ['users', 'Users & access'],
] as const

/** Admin panel (admins only): content management and access control. */
export function AdminPage() {
  const { user } = useAuth()
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div>
      <h1 className="neon-title mb-4 text-3xl font-bold">Admin</h1>
      <nav className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)] pb-3">
        {TABS.map(([path, label]) => (
          <NavLink key={path} to={`/admin/${path}`} className={({ isActive }) => `navlink ${isActive ? 'navlink-active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<TasksAdmin />} />
        <Route path="tasks/new" element={<TaskForm />} />
        <Route path="tasks/edit/:slug" element={<TaskForm />} />
        <Route path="articles" element={<ArticlesAdmin />} />
        <Route path="articles/new" element={<ArticleForm />} />
        <Route path="articles/edit/:slug" element={<ArticleForm />} />
        <Route path="taxonomy" element={<TaxonomyAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
        <Route path="*" element={<Navigate to="tasks" replace />} />
      </Routes>
    </div>
  )
}
