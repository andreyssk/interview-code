import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RecentTasksPopover } from '@/features/recent-tasks'
import { LanguageSwitcher } from '@/features/switch-language'
import { ThemeSwitcher } from '@/features/switch-theme'
import { UserMenu } from '@/features/user-menu'
import { useAuth } from '@/shared/auth/AuthContext'
import { adminCrumbs } from '@/shared/lib/adminTabs'

const LINKS: (readonly [string, string])[] = [
  ['/theory', 'nav.theory'],
  ['/problems', 'nav.problems'],
  ['/questions', 'nav.questions'],
  ['/mistakes', 'nav.mistakes'],
]

export function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const crumbs = adminCrumbs(useLocation().pathname)
  return (
    <header className="topbar">
      <Link to="/problems" className="logo">
        <span className="logo-mark">▲</span> INTERVIEW<span className="text-[var(--cyan)]">//</span>PREP
      </Link>
      {crumbs.length > 0 && (
        <span className="mr-auto ml-4 flex items-center gap-2 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {c}
            </span>
          ))}
        </span>
      )}
      <nav className="flex items-center gap-1">
        {(user.role === 'admin' ? [...LINKS, ['/admin', 'nav.admin'] as const] : LINKS).map(([to, key]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `navlink ${isActive ? 'navlink-active' : ''}`}>
            {t(key)}
          </NavLink>
        ))}
        <span className="ml-2 flex items-center gap-3">
          <RecentTasksPopover />
          <ThemeSwitcher />
          <LanguageSwitcher />
          <UserMenu />
        </span>
      </nav>
    </header>
  )
}
