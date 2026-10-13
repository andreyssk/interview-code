import { useState } from 'react'
import type { Block } from '@/shared/ui'

type Kind = 'p' | 'h' | 'pre' | 'note' | 'ul'
interface Row {
  id: number
  kind: Kind
  /** For a list: one item per line */
  text: string
}

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'p', label: 'Paragraph' },
  { kind: 'h', label: 'Heading' },
  { kind: 'pre', label: 'Code' },
  { kind: 'ul', label: 'List' },
  { kind: 'note', label: 'Note' },
]

let nextId = 1

function toRows(blocks: Block[]): Row[] {
  return blocks.map((b) => {
    if ('ul' in b) return { id: nextId++, kind: 'ul', text: b.ul.join('\n') }
    const kind = (Object.keys(b)[0] ?? 'p') as Exclude<Kind, 'ul'>
    return { id: nextId++, kind, text: (b as Record<string, string>)[kind] }
  })
}

function toBlocks(rows: Row[]): Block[] {
  return rows.map((r): Block => {
    if (r.kind === 'ul') return { ul: r.text.split('\n').filter((l) => l.trim() !== '') }
    return { [r.kind]: r.text } as Block
  })
}

/**
 * Edits rich text as a list of blocks (paragraph, heading, code, list, note).
 * Inline <code>…</code> and <b>…</b> are allowed inside text. Remount with a new `key` to load other content.
 */
export function BlockEditor({ initial, onChange }: { initial: Block[]; onChange: (blocks: Block[]) => void }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))

  const update = (next: Row[]) => {
    setRows(next)
    onChange(toBlocks(next))
  }
  const patch = (id: number, p: Partial<Row>) => update(rows.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.id} className="output flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <select className="search search-sm" value={r.kind} onChange={(e) => patch(r.id, { kind: e.target.value as Kind })}>
              {KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
            {r.kind === 'ul' && <span className="text-xs text-[var(--muted)]">one item per line</span>}
            <span className="ml-auto flex gap-1">
              <button type="button" className="btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="btn-ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="btn-danger" onClick={() => update(rows.filter((x) => x.id !== r.id))} aria-label="Remove block">
                ✕
              </button>
            </span>
          </div>
          <textarea
            className="search font-mono text-sm"
            rows={r.kind === 'pre' ? 6 : r.kind === 'h' ? 1 : 3}
            value={r.text}
            onChange={(e) => patch(r.id, { text: e.target.value })}
            spellCheck={r.kind !== 'pre'}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" className="chip" onClick={() => update([...rows, { id: nextId++, kind: k.kind, text: '' }])}>
            + {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}
