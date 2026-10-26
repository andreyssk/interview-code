import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'

/** A nav entry that opens a menu of links; it looks active while the current page is one of them. */
export function NavDropdown({ label, links }: { label: string; links: (readonly [string, string])[] }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const active = links.some(([to]) => pathname === to || pathname.startsWith(`${to}/`))

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={root} className="dropdown">
      <button className={`navlink ${active ? 'navlink-active' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {label} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="dropdown-menu !right-auto left-0 min-w-40" role="menu">
          {links.map(([to, key]) => (
            <li key={to} role="none">
              <NavLink to={to} role="menuitem" className={({ isActive }) => `dropdown-item ${isActive ? 'dropdown-item-active' : ''}`}>
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
