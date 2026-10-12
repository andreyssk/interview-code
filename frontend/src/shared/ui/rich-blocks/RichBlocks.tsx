import type { ReactNode } from 'react'

/** Structured rich text kept in translation files: paragraphs, headings, code blocks, bullet lists and info callouts. */
export type Block = { p: string } | { h: string } | { pre: string } | { ul: string[] } | { note: string }

const INLINE = /<(code|b)>(.*?)<\/\1>/g

// Only <code> and <b> are supported inline; everything else is plain text (no innerHTML involved).
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(m[1] === 'code' ? <code key={m.index}>{m[2]}</code> : <b key={m.index}>{m[2]}</b>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

export function RichBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-task">
      {blocks.map((b, i) => {
        if ('p' in b) return <p key={i}>{inline(b.p)}</p>
        if ('h' in b) return <h4 key={i}>{b.h}</h4>
        if ('pre' in b) return <pre key={i}>{b.pre}</pre>
        if ('note' in b) return <aside key={i} className="callout">{inline(b.note)}</aside>
        return (
          <ul key={i}>
            {b.ul.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
