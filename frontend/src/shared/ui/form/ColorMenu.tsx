import type { Editor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { INLINE_COLORS, type InlineColor } from '@/shared/lib/inlineColors'
import { Icon } from '../icon/Icon'

const KIND = {
  bg: { mark: 'highlight', title: 'Background color (Ctrl+Shift+H)', icon: <Icon name="highlight" /> },
  fg: { mark: 'textColor', title: 'Text color', icon: <span className="font-semibold leading-none">A</span> },
} as const

/** A toolbar button with a six-color palette: sets the selection's text color (fg) or background (bg). */
export function ColorMenu({ editor, kind }: { editor: Editor; kind: keyof typeof KIND }) {
  const { mark, title, icon } = KIND[kind]
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const current = editor.isActive(mark) ? ((editor.getAttributes(mark).color as string | null) ?? (kind === 'bg' ? 'amber' : null)) : null

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const apply = (color: InlineColor | null) => {
    // Without a selection the caret's whole marked word is affected.
    const chain = editor.chain().focus().extendMarkRange(mark)
    if (color && color !== current) chain.setMark(mark, { color }).run()
    else chain.unsetMark(mark).run()
    setOpen(false)
  }

  return (
    <span ref={root} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        className={`chip inline-flex h-[1.9rem] items-center justify-center gap-1.5 !px-2.5 ${current ? 'chip-active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-[var(--border)]" style={{ background: current ? `var(--${current})` : 'var(--border)' }} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--modal-bg)] p-2 shadow-lg" role="menu" aria-label={title}>
          {INLINE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitem"
              title={c}
              aria-label={c}
              className={`h-5 w-5 rounded-full border ${current === c ? 'ring-2 ring-[var(--text)]' : 'border-[var(--border)]'}`}
              style={{ background: `var(--${c})` }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(c)}
            />
          ))}
          <button type="button" role="menuitem" title="Remove" aria-label="Remove color" className="icon-btn !p-0.5" onMouseDown={(e) => e.preventDefault()} onClick={() => apply(null)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </span>
  )
}
