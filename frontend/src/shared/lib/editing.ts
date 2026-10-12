/** One replacement in the editor text, plus where the selection goes afterwards. */
export interface Edit {
  from: number
  to: number
  text: string
  caret: number
  /** End of the selection after the edit; defaults to `caret` */
  selectEnd?: number
}

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSERS = new Set(Object.values(PAIRS))
const QUOTES = new Set(['"', "'", '`'])
const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c)

/**
 * Smart typing for code: auto-closing brackets and quotes, typing over a closer, deleting an empty pair,
 * and indenting new lines (including opening a block when Enter is pressed between { and }).
 * Returns null when the browser's default behaviour should apply.
 */
export function autoEdit(value: string, start: number, end: number, key: string): Edit | null {
  const prev = value[start - 1]
  const next = value[end]
  const collapsed = start === end

  if (key === 'Enter') {
    const line = value.slice(value.lastIndexOf('\n', start - 1) + 1, start)
    const indent = line.match(/^[ \t]*/)![0]
    if (collapsed && prev in PAIRS && next === PAIRS[prev]) {
      // {|}  ->  {\n\t|\n}
      const text = `\n${indent}\t\n${indent}`
      return { from: start, to: end, text, caret: start + 2 + indent.length }
    }
    const opensBlock = /[{([]$/.test(line.trimEnd())
    const text = `\n${indent}${opensBlock ? '\t' : ''}`
    return { from: start, to: end, text, caret: start + text.length }
  }

  if (key in PAIRS || QUOTES.has(key)) {
    const close = PAIRS[key] ?? key
    if (!collapsed) {
      // Wrap the selection and keep it selected.
      const inner = value.slice(start, end)
      return { from: start, to: end, text: key + inner + close, caret: start + 1, selectEnd: start + 1 + inner.length }
    }
    if (QUOTES.has(key)) {
      if (next === key) return { from: start, to: start, text: '', caret: start + 1 } // type over the closing quote
      if (isWord(prev) || isWord(next)) return null // an apostrophe or the end of a string, not a new pair
    } else if (isWord(next)) {
      return null
    }
    return { from: start, to: end, text: key + close, caret: start + 1 }
  }

  if (CLOSERS.has(key) && collapsed && next === key) {
    return { from: start, to: start, text: '', caret: start + 1 } // type over the closer
  }

  if (key === 'Backspace' && collapsed && next !== undefined && (PAIRS[prev] === next || (QUOTES.has(prev) && prev === next))) {
    return { from: start - 1, to: start + 1, text: '', caret: start - 1 } // delete an empty pair together
  }

  return null
}
