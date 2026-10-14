import type { ReactNode } from 'react'

export type EditorLanguage = 'go' | 'java'

const CLASS: Record<string, string> = {
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

export function highlight(src: string, language: EditorLanguage = 'go'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of src.matchAll(TOKENS[language])) {
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

export const highlightGo = (src: string) => highlight(src, 'go')
