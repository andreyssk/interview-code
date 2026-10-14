/**
 * Disclosure arrow for collapsible things (console, accordions). An SVG in a fixed, flex-centred box, so it lines up
 * with the text next to it exactly; the ▸/▾ text glyphs sit at font-dependent heights and drift off-centre.
 */
export function Chevron({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex h-4 w-4 flex-none items-center justify-center">
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
      >
        <path d="M3.5 1.5 7 5 3.5 8.5" />
      </svg>
    </span>
  )
}
