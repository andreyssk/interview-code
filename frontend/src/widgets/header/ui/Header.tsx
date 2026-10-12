import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { LanguageSwitcher } from '@/features/switch-language'
import { ThemeSwitcher } from '@/features/switch-theme'

const LINKS = [
  ['/theory', 'nav.theory'],
  ['/problems', 'nav.problems'],
  ['/mistakes', 'nav.mistakes'],
] as const

export function Header() {
  const { t } = useTranslation()
  return (
    <header className="topbar">
      <Link to="/problems" className="logo">
        <span className="logo-mark">▲</span> INTERVIEW<span className="text-[var(--cyan)]">//</span>PREP
      </Link>
      <nav className="flex items-center gap-1">
        {LINKS.map(([to, key]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `navlink ${isActive ? 'navlink-active' : ''}`}>
            {t(key)}
          </NavLink>
        ))}
        <span className="ml-2 flex items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </span>
      </nav>
    </header>
  )
}
