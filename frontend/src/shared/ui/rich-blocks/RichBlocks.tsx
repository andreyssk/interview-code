import type { ReactNode } from 'react'

/** Structured rich text kept in translation files: paragraphs, headings, code blocks, bullet/numbered lists and info callouts. */
export type Block = { p: string } | { h: string } | { pre: string } | { ul: string[] } | { ol: string[] } | { note: string }

type Tag = 'b' | 'i' | 'code'
const TOKEN = /<(\/?)(b|i|code)>/g
const ELEMENT: Record<Tag, (key: number, kids: ReactNode[]) => ReactNode> = {
  b: (key, kids) => <b key={key}>{kids}</b>,
  i: (key, kids) => <i key={key}>{kids}</i>,
  code: (key, kids) => <code key={key}>{kids}</code>,
}

// Only <b>, <i> and <code> (nestable) are supported inline; everything else is plain text (no innerHTML involved).
// Unbalanced tags are shown as literal text.
function inline(text: string): ReactNode[] {
  const frames: { tag: Tag | null; kids: ReactNode[] }[] = [{ tag: null, kids: [] }]
  const top = () => frames[frames.length - 1]
  const add = (t: string) => t && top().kids.push(t)
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    add(text.slice(last, m.index))
    last = m.index + m[0].length
    const tag = m[2] as Tag
    if (m[1] !== '/') frames.push({ tag, kids: [] })
    else if (top().tag === tag) {
      const f = frames.pop()!
      top().kids.push(ELEMENT[tag](m.index, f.kids))
    } else add(m[0])
  }
  add(text.slice(last))
  while (frames.length > 1) {
    const f = frames.pop()!
    add(`<${f.tag}>`)
    top().kids.push(...f.kids)
  }
  return frames[0].kids
}

export function RichBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-task">
      {blocks.map((b, i) => {
        if ('p' in b) return <p key={i}>{inline(b.p)}</p>
        if ('h' in b) return <h4 key={i}>{b.h}</h4>
        if ('pre' in b) return <pre key={i}>{b.pre}</pre>
        if ('note' in b) return <aside key={i} className="callout">{inline(b.note)}</aside>
        if ('ol' in b) {
          return (
            <ol key={i}>
              {b.ol.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          )
        }
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
