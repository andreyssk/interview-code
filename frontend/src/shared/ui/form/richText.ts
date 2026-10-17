import type { Block } from '../rich-blocks/RichBlocks'

/** Minimal shape of the Tiptap/ProseMirror JSON we produce and read. */
export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: { type: string }[]
}

type Tag = 'b' | 'i' | 'code'
const TAGS: Tag[] = ['b', 'i', 'code'] // nesting order when serializing: outermost first
const MARK: Record<Tag, string> = { b: 'bold', i: 'italic', code: 'code' }
const TAG_OF: Record<string, Tag> = { bold: 'b', italic: 'i', code: 'code' }
const TOKEN = /<(\/?)(b|i|code)>/g

interface Run {
  text: string
  tags: Set<Tag>
}

/** Parses "a <b>b</b> <code>c</code>" into text runs. Unbalanced tags stay as literal text. */
function parseInline(source: string): Run[] {
  const frames: { tag: Tag | null; runs: Run[] }[] = [{ tag: null, runs: [] }]
  const top = () => frames[frames.length - 1]
  const text = (t: string) => t && top().runs.push({ text: t, tags: new Set() })
  let last = 0
  for (const m of source.matchAll(TOKEN)) {
    text(source.slice(last, m.index))
    last = m.index + m[0].length
    const closing = m[1] === '/'
    const tag = m[2] as Tag
    if (!closing) frames.push({ tag, runs: [] })
    else if (top().tag === tag) {
      const f = frames.pop()!
      f.runs.forEach((r) => r.tags.add(tag))
      top().runs.push(...f.runs)
    } else text(m[0])
  }
  text(source.slice(last))
  while (frames.length > 1) {
    const f = frames.pop()!
    text(`<${f.tag}>`)
    top().runs.push(...f.runs)
  }
  return frames[0].runs
}

function inlineToPM(source: string): PMNode[] {
  return parseInline(source.replace(/\n/g, ' ')).map(({ text, tags }) => {
    // The code mark excludes all other marks.
    const marks = tags.has('code') ? ['code'] : TAGS.filter((t) => tags.has(t)).map((t) => MARK[t])
    return { type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) }
  })
}

function inlineFromPM(nodes: PMNode[] = []): string {
  let out = ''
  let open: Tag[] = []
  for (const n of nodes) {
    const marks = (n.marks ?? []).map((m) => TAG_OF[m.type]).filter(Boolean)
    const want = TAGS.filter((t) => marks.includes(t))
    let k = 0
    while (k < open.length && k < want.length && open[k] === want[k]) k++
    for (let i = open.length - 1; i >= k; i--) out += `</${open[i]}>`
    for (let i = k; i < want.length; i++) out += `<${want[i]}>`
    out += n.text ?? ''
    open = want
  }
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`
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
    if ('pre' in b) return { type: 'codeBlock', content: b.pre ? [{ type: 'text', text: b.pre }] : [] }
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
        if (pre.trim()) blocks.push({ pre })
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
