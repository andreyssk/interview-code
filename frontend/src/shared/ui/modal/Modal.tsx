import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  wide?: boolean
  /** Wider still, for code listings */
  code?: boolean
  children: ReactNode
}

/** Themed modal built on the native <dialog>: focus trap, Esc to close, inert page behind it. */
export function Modal({ open, title, onClose, wide, code, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''} ${code ? 'modal-code' : ''}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault() // Esc: let React state close it
        onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose() // press on the backdrop
      }}
    >
      <h2 className="modal-title">{title}</h2>
      {children}
    </dialog>
  )
}
