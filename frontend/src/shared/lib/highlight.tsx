import type { ReactNode } from 'react'

const KEYWORDS =
  'break|default|func|interface|select|case|defer|go|map|struct|chan|else|goto|package|switch|const|fallthrough|if|range|type|continue|for|import|return|var'
const BUILTINS =
  'int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|string|bool|byte|rune|error|any|nil|true|false|make|len|cap|append|copy|delete|new|panic|min|max'

// Order matters: comments and strings first so keywords inside them aren't colored.
const TOKEN = new RegExp(
  [
    String.raw`(?<comment>//[^\n]*|/\*[\s\S]*?\*/)`,
    String.raw`(?<string>"(?:\\.|[^"\\\n])*"|` + '`[^`]*`' + String.raw`|'(?:\\.|[^'\\\n])+')`,
    String.raw`(?<number>\b\d+(?:\.\d+)?\b)`,
    String.raw`(?<keyword>\b(?:${KEYWORDS})\b)`,
    String.raw`(?<builtin>\b(?:${BUILTINS})\b)`,
    String.raw`(?<fn>\b[A-Za-z_]\w*(?=\())`,
  ].join('|'),
  'g',
)

const CLASS: Record<string, string> = {
  comment: 'tok-comment',
  string: 'tok-string',
  number: 'tok-number',
  keyword: 'tok-keyword',
  builtin: 'tok-builtin',
  fn: 'tok-fn',
}

export function highlightGo(src: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of src.matchAll(TOKEN)) {
    const start = m.index!
    if (start > last) out.push(src.slice(last, start))
    const kind = Object.keys(m.groups!).find((k) => m.groups![k] !== undefined)!
    out.push(
      <span key={start} className={CLASS[kind]}>
        {m[0]}
      </span>,
    )
    last = start + m[0].length
  }
  out.push(src.slice(last))
  return out
}
