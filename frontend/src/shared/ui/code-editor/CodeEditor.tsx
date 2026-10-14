import { useMemo } from 'react'
import { autoEdit, type Edit } from '../../lib/editing'
import { highlight, type EditorLanguage } from '../../lib/highlight'

interface Props {
  value: string
  onChange: (code: string) => void
  onRun?: () => void
  label?: string
  /** Syntax highlighting; defaults to Go */
  language?: EditorLanguage
}

// Lightweight editor: a transparent <textarea> on top of a highlighted <pre> with identical metrics.
// The <pre> sizes the block; the outer wrapper scrolls both together.
export function CodeEditor({ value, onChange, onRun, label, language = 'go' }: Props) {
  const lines = value.split('\n').length
  const highlighted = useMemo(() => highlight(value, language), [value, language])

  const insert = (text: string) => document.execCommand('insertText', false, text) // keeps native undo

  // Applies an edit through execCommand so the browser's undo stack keeps working.
  const apply = (ta: HTMLTextAreaElement, e: Edit) => {
    ta.setSelectionRange(e.from, e.to)
    if (e.text) insert(e.text)
    else if (e.from !== e.to) document.execCommand('delete')
    ta.setSelectionRange(e.caret, e.selectEnd ?? e.caret)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onRun?.()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      insert('\t')
      return
    }
    if (e.nativeEvent.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
    const ta = e.currentTarget
    const edit = autoEdit(ta.value, ta.selectionStart, ta.selectionEnd, e.key)
    if (edit) {
      e.preventDefault()
      apply(ta, edit)
    }
  }

  return (
    <div className="code-scroll">
      <div className="code-gutter" aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="code-body">
        <pre className="code-text" aria-hidden>
          {highlighted}
          {'\n'}
        </pre>
        <textarea
          className="code-text code-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={label}
        />
      </div>
    </div>
  )
}
