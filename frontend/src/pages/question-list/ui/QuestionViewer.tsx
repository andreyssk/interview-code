import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CompanyTag } from '@/entities/task'
import type { Question } from '@/entities/question'
import { Icon, RichBlocks } from '@/shared/ui'

/**
 * A question and its answer filling the viewport. With `fullscreen` it also asks the browser for real fullscreen;
 * the icon toggles that, and leaving fullscreen (Esc) keeps the viewer open. Esc again, or the close icon, closes it.
 */
export function QuestionViewer({ question, fullscreen = false, onClose }: { question: Question; fullscreen?: boolean; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const sync = () => setIsFullscreen(document.fullscreenElement === el)
    document.addEventListener('fullscreenchange', sync)
    // Esc leaves fullscreen first (the browser eats that keypress); only when not fullscreen does it close the viewer.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (fullscreen) el.requestFullscreen?.().catch(() => {}) // denied or unsupported: stays a viewport-sized view
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on open
  }, [])

  const toggleFullscreen = () => {
    const el = root.current
    if (!el) return
    if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen?.().catch(() => {})
  }

  return createPortal(
    <div ref={root} className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'var(--bg-image), var(--bg)' }} role="dialog" aria-modal="true" aria-label={question.title}>
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1">
        <button type="button" className="icon-btn" title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
          <Icon name={isFullscreen ? 'minimize' : 'maximize'} />
        </button>
        <button type="button" className="icon-btn" title="Close (Esc)" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-3xl font-bold">{question.title}</h2>
          {question.companies.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-1.5">
              {question.companies.map((c) => (
                <CompanyTag key={c} slug={c} />
              ))}
            </div>
          )}
          <div className="text-lg">
            <RichBlocks blocks={question.answer} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
