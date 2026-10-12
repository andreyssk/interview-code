import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** Content of the trigger button */
  button: ReactNode
  /** Accessible name of the button and the popover */
  label: string
  /** Button only has an icon: give it the compact square look */
  iconOnly?: boolean
  children: (close: () => void) => ReactNode
}

/**
 * Button that opens a popover below it, right-aligned. Rendered in a portal because panels clip overflow;
 * closes on outside click, Escape and resize.
 */
export function Popover({ button, label, iconOnly, children }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const toggle = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    setOpen((v) => !v)
  }

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
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={trigger}
        className={`btn-ghost ${iconOnly ? 'btn-icon' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        onClick={toggle}
      >
        {button}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="dialog"
            aria-label={label}
            className="panel fixed z-50 max-h-[70vh] w-[min(24rem,calc(100vw-1rem))] overflow-auto p-2"
            style={{ top: pos.top, right: pos.right }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  )
}
