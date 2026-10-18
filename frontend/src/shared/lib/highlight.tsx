import type { ReactNode } from 'react'

export type EditorLanguage = 'go' | 'java'

export const TOKEN_CLASS: Record<string, string> = {
  comment: 'tok-comment',
  string: 'tok-string',
  number: 'tok-number',
  keyword: 'tok-keyword',
  builtin: 'tok-builtin',
  fn: 'tok-fn',
}

// Order matters: comments and strings first so keywords inside them aren't colored.
function tokenizer(keywords: string, builtins: string, strings: string, number: string): RegExp {
  return new RegExp(
    [
      String.raw`(?<comment>//[^\n]*|/\*[\s\S]*?\*/)`,
      `(?<string>${strings})`,
      `(?<number>${number})`,
      String.raw`(?<keyword>\b(?:${keywords})\b)`,
      String.raw`(?<builtin>\b(?:${builtins})\b)`,
      String.raw`(?<fn>\b[A-Za-z_]\w*(?=\())`,
    ].join('|'),
    'g',
  )
}

const TOKENS: Record<EditorLanguage, RegExp> = {
  go: tokenizer(
    'break|default|func|interface|select|case|defer|go|map|struct|chan|else|goto|package|switch|const|fallthrough|if|range|type|continue|for|import|return|var',
    'int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|string|bool|byte|rune|error|any|nil|true|false|make|len|cap|append|copy|delete|new|panic|min|max',
    String.raw`"(?:\\.|[^"\\\n])*"|` + '`[^`]*`' + String.raw`|'(?:\\.|[^'\\\n])+'`,
    String.raw`\b\d+(?:\.\d+)?\b`,
  ),
  java: tokenizer(
    'abstract|assert|break|case|catch|class|continue|default|do|else|enum|extends|final|finally|for|if|implements|import|instanceof|interface|new|package|private|protected|public|return|static|super|switch|synchronized|this|throw|throws|try|var|void|volatile|while',
    'int|long|short|byte|char|boolean|float|double|String|Integer|Long|Short|Byte|Character|Boolean|Float|Double|Object|List|ArrayList|LinkedList|Map|HashMap|TreeMap|Set|HashSet|TreeSet|Deque|ArrayDeque|Queue|PriorityQueue|Stack|Arrays|Collections|Math|StringBuilder|Optional|null|true|false',
    String.raw`"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])+'`,
    String.raw`\b\d[\d_]*(?:\.\d+)?[LlFfDd]?\b`,
  ),
}

export interface Token {
  from: number
  to: number
  /** Key of TOKEN_CLASS */
  kind: string
}

/** The highlighted spans of `src`; everything between them is plain text. */
export function tokenize(src: string, language: EditorLanguage = 'go'): Token[] {
  return [...src.matchAll(TOKENS[language])].map((m) => ({
    from: m.index!,
    to: m.index! + m[0].length,
    kind: Object.keys(m.groups!).find((k) => m.groups![k] !== undefined)!,
  }))
}

export function highlight(src: string, language: EditorLanguage = 'go'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const t of tokenize(src, language)) {
    if (t.from > last) out.push(src.slice(last, t.from))
    out.push(
      <span key={t.from} className={TOKEN_CLASS[t.kind]}>
        {src.slice(t.from, t.to)}
      </span>,
    )
    last = t.to
  }
  out.push(src.slice(last))
  return out
}

export const highlightGo = (src: string) => highlight(src, 'go')
