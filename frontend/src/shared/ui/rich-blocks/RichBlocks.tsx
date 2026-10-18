import type { ReactNode } from 'react'
import { highlight } from '@/shared/lib/highlight'
import { INLINE_TOKEN } from '@/shared/lib/inlineColors'

/** Structured rich text kept in translation files: paragraphs, headings, code blocks, bullet/numbered lists and info callouts. */
export type Block = { p: string } | { h: string } | { pre: string; lang?: 'go' | 'java' } | { ul: string[] } | { ol: string[] } | { note: string }

type Tag = 'b' | 'i' | 'code' | 'mark' | 'color'
const ELEMENT: Record<Tag, (key: number, kids: ReactNode[], color?: string) => ReactNode> = {
  b: (key, kids) => <b key={key}>{kids}</b>,
  i: (key, kids) => <i key={key}>{kids}</i>,
  code: (key, kids) => <code key={key}>{kids}</code>,
  mark: (key, kids, color) => (
    <mark key={key} data-c={color}>
      {kids}
    </mark>
  ),
  color: (key, kids, color) => (
    <span key={key} data-fg={color}>
      {kids}
    </span>
  ),
}

// Only <b>, <i>, <code>, <mark[:color]> (background) and <color:name> (text color) are supported inline, nestable;
// everything else is plain text (no innerHTML involved). Unbalanced tags are shown as literal text.
function inline(text: string): ReactNode[] {
  const frames: { tag: Tag | null; color?: string; kids: ReactNode[] }[] = [{ tag: null, kids: [] }]
  const top = () => frames[frames.length - 1]
  const add = (t: string) => t && top().kids.push(t)
  let last = 0
  for (const m of text.matchAll(INLINE_TOKEN)) {
    add(text.slice(last, m.index))
    last = m.index + m[0].length
    const tag = m[2] as Tag
    const color = m[3]
    if (m[1] === '/') {
      if (top().tag === tag && !color) {
        const f = frames.pop()!
        top().kids.push(ELEMENT[tag](m.index, f.kids, f.color))
      } else add(m[0])
    } else if (tag === 'color' && !color) add(m[0])
    else frames.push({ tag, color, kids: [] })
  }
  add(text.slice(last))
  while (frames.length > 1) {
    const f = frames.pop()!
    add(f.color ? `<${f.tag}:${f.color}>` : `<${f.tag}>`)
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
        if ('pre' in b) return <pre key={i}>{b.lang ? highlight(b.pre, b.lang) : b.pre}</pre>
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
