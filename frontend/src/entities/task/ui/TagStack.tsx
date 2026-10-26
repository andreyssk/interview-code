import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCompanies } from '../model/companies'
import { useSources } from '../model/sources'
import { toneColor, toneFromSlug } from '../lib/tone'

const VISIBLE = 3

interface Item {
  slug: string
  name: string
  /** CSS color of the circle */
  color: string
  iconUrl?: string | null
  /** In-app page (companies) or external link (sources) */
  to?: string
  href?: string | null
}

function Circle({ item }: { item: Item }) {
  return (
    <span className="stack-circle" style={{ color: item.color }} aria-hidden="true">
      {item.iconUrl ? <img src={item.iconUrl} alt="" /> : item.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * Companies or sources of a problem as a few overlapping circles plus their count. Clicking opens a popover with the full list.
 * The circles are a button, so put the stack outside any link that wraps the whole row.
 */
export function TagStack({ kind, slugs }: { kind: 'company' | 'source'; slugs: string[] }) {
  const { t } = useTranslation()
  const companies = useCompanies()
  const sources = useSources()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const items: Item[] = slugs.map((slug) => {
    if (kind === 'company') {
      const c = companies.find((x) => x.slug === slug)
      return { slug, name: c?.name ?? slug, color: toneColor(c?.tone ?? 'neon-violet'), to: `/companies/${slug}` }
    }
    const s = sources.find((x) => x.slug === slug)
    return { slug, name: s?.name ?? slug, color: toneColor(toneFromSlug(slug)), iconUrl: s?.iconUrl, href: s?.link }
  })

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    // The page scrolls inside .main, where a fixed popover would stay behind; capture catches any scroller.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  if (items.length === 0) return null

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const r = trigger.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 264)) })
    setOpen((v) => !v)
  }

  const label = t(kind === 'company' ? 'stack.companies' : 'stack.sources', { count: items.length })
  return (
    <>
      <button ref={trigger} type="button" className="stack" aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={label} onClick={toggle}>
        <span className="stack-circles">
          {items.slice(0, VISIBLE).map((item, i) => (
            <span key={item.slug} style={{ zIndex: VISIBLE - i }}>
              <Circle item={item} />
            </span>
          ))}
        </span>
        <span className="stack-count">{items.length}</span>
      </button>
      {open &&
        createPortal(
          <div ref={menu} role="dialog" aria-label={label} className="panel fixed z-50 max-h-[60vh] w-64 overflow-auto p-2" style={{ top: pos.top, left: pos.left }}>
            <div className="px-2 pb-1 text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
            <ul className="flex flex-col">
              {items.map((item) => {
                const body = (
                  <>
                    <Circle item={item} />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  </>
                )
                return (
                  <li key={item.slug}>
                    {item.to ? (
                      <Link to={item.to} className="dropdown-item flex items-center gap-2">
                        {body}
                      </Link>
                    ) : item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer" className="dropdown-item flex items-center gap-2">
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 text-sm">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
