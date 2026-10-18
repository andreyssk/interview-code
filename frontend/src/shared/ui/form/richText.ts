import { INLINE_TOKEN, isInlineColor, type InlineColor } from '@/shared/lib/inlineColors'
import type { Block } from '../rich-blocks/RichBlocks'

/** Minimal shape of the Tiptap/ProseMirror JSON we produce and read. */
export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

type Tag = 'mark' | 'color' | 'b' | 'i' | 'code'
const TAG_ORDER: Tag[] = ['mark', 'color', 'b', 'i', 'code'] // nesting order when serializing: outermost first
const MARK_NAME: Record<Tag, string> = { mark: 'highlight', color: 'textColor', b: 'bold', i: 'italic', code: 'code' }
const TAG_OF: Record<string, Tag> = { highlight: 'mark', textColor: 'color', bold: 'b', italic: 'i', code: 'code' }

/** A mark in markup terms: the tag plus its color (color for <color>, optional for <mark>). */
interface Style {
  tag: Tag
  color?: InlineColor
}
const keyOf = (s: Style) => (s.color ? `${s.tag}:${s.color}` : s.tag)
const openTag = (s: Style) => `<${keyOf(s)}>`

interface Run {
  text: string
  styles: Style[]
}

/** Parses "a <b>b</b> <color:red>c</color>" into text runs. Unbalanced or invalid tags stay as literal text. */
function parseInline(source: string): Run[] {
  const frames: { style: Style | null; runs: Run[] }[] = [{ style: null, runs: [] }]
  const top = () => frames[frames.length - 1]
  const text = (t: string) => t && top().runs.push({ text: t, styles: [] })
  let last = 0
  for (const m of source.matchAll(INLINE_TOKEN)) {
    text(source.slice(last, m.index))
    last = m.index + m[0].length
    const closing = m[1] === '/'
    const tag = m[2] as Tag
    const color = m[3] as InlineColor | undefined
    if (closing) {
      if (top().style?.tag === tag && !color) {
        const f = frames.pop()!
        f.runs.forEach((r) => r.styles.push(f.style!))
        top().runs.push(...f.runs)
      } else text(m[0])
    } else if (tag === 'color' && !color) text(m[0]) // a text color needs a color
    else frames.push({ style: { tag, color }, runs: [] })
  }
  text(source.slice(last))
  while (frames.length > 1) {
    const f = frames.pop()!
    text(openTag(f.style!))
    top().runs.push(...f.runs)
  }
  return frames[0].runs
}

function inlineToPM(source: string): PMNode[] {
  return parseInline(source.replace(/\n/g, ' ')).map(({ text, styles }) => {
    // The code mark excludes all other marks. Within a kind, the innermost (first closed) wins on conflicts.
    const used = styles.some((s) => s.tag === 'code') ? styles.filter((s) => s.tag === 'code') : styles
    const marks = TAG_ORDER.flatMap((tag) => {
      const s = used.find((u) => u.tag === tag)
      if (!s) return []
      return [{ type: MARK_NAME[tag], ...(tag === 'mark' || tag === 'color' ? { attrs: { color: s.color ?? null } } : {}) }]
    })
    return { type: 'text', text, ...(marks.length ? { marks } : {}) }
  })
}

function inlineFromPM(nodes: PMNode[] = []): string {
  let out = ''
  let open: Style[] = []
  for (const n of nodes) {
    const styles: Style[] = []
    for (const tag of TAG_ORDER) {
      const m = (n.marks ?? []).find((x) => TAG_OF[x.type] === tag)
      if (!m) continue
      const color = m.attrs?.color
      if (tag === 'color' && !isInlineColor(color)) continue
      styles.push({ tag, color: isInlineColor(color) ? color : undefined })
    }
    let k = 0
    while (k < open.length && k < styles.length && keyOf(open[k]) === keyOf(styles[k])) k++
    for (let i = open.length - 1; i >= k; i--) out += `</${open[i].tag}>`
    for (let i = k; i < styles.length; i++) out += openTag(styles[i])
    out += n.text ?? ''
    open = styles
  }
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i].tag}>`
  return out
}

const plain = (nodes: PMNode[] = []) => nodes.map((n) => n.text ?? '').join('')

export function blocksToDoc(blocks: Block[]): PMNode {
  const list = (type: string, items: string[]): PMNode => ({
    type,
    content: items.map((s) => ({ type: 'listItem', content: [{ type: 'paragraph', content: inlineToPM(s) }] })),
  })
  const content = blocks.map((b): PMNode => {
    if ('p' in b) return { type: 'paragraph', content: inlineToPM(b.p) }
    if ('h' in b) return { type: 'heading', attrs: { level: 4 }, content: b.h ? [{ type: 'text', text: b.h }] : [] }
    if ('pre' in b) return { type: 'codeBlock', attrs: { language: b.lang ?? null }, content: b.pre ? [{ type: 'text', text: b.pre }] : [] }
    if ('note' in b) return { type: 'note', content: inlineToPM(b.note) }
    if ('ol' in b) return list('orderedList', b.ol)
    return list('bulletList', b.ul)
  })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

/** Empty blocks are dropped; an empty document becomes a single empty paragraph. */
export function docToBlocks(doc: PMNode): Block[] {
  const items = (n: PMNode) => (n.content ?? []).map((li) => (li.content ?? []).map((p) => inlineFromPM(p.content)).join(' '))
  const blocks: Block[] = []
  for (const n of doc.content ?? []) {
    switch (n.type) {
      case 'paragraph': {
        const p = inlineFromPM(n.content)
        if (p.trim()) blocks.push({ p })
        break
      }
      case 'heading': {
        const h = plain(n.content)
        if (h.trim()) blocks.push({ h })
        break
      }
      case 'codeBlock': {
        const pre = plain(n.content)
        const lang = n.attrs?.language
        if (pre.trim()) blocks.push(lang === 'go' || lang === 'java' ? { pre, lang } : { pre })
        break
      }
      case 'note': {
        const note = inlineFromPM(n.content)
        if (note.trim()) blocks.push({ note })
        break
      }
      case 'bulletList':
        blocks.push({ ul: items(n) })
        break
      case 'orderedList':
        blocks.push({ ol: items(n) })
        break
    }
  }
  return blocks.length ? blocks : [{ p: '' }]
}
