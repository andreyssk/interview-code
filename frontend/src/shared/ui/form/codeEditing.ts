import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { TOKEN_CLASS, tokenize } from '@/shared/lib/highlight'

const OPEN_TO_CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSERS = new Set(Object.values(OPEN_TO_CLOSE))
const QUOTES = new Set(['"', "'", '`'])
const INDENT = '\t'
const TAB_WIDTH = 4

const inCodeBlock = (state: EditorState) => state.selection.$from.parent.type.name === 'codeBlock'

/** Moves the caret / selection through the (possibly shifted) positions of a transaction. */
const keepSelection = (tr: Transaction, from: number, to: number) =>
  tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(from), tr.mapping.map(to))).scrollIntoView()

/**
 * Makes code blocks behave like a code editor: Tab / Shift-Tab indent and outdent (never moving focus),
 * Enter keeps the indentation (and indents after an opening bracket), brackets and quotes close themselves,
 * and the block is syntax highlighted by its `language` attribute (go or java).
 */
export const CodeEditing = Extension.create({
  name: 'codeEditing',
  priority: 1000, // before the code block's own Enter / Backspace handling

  addKeyboardShortcuts() {
    // Indents (or outdents) every line touched by the selection; with a bare caret Tab just inserts a tab.
    const shift = (dir: 1 | -1) => () => {
      const { state, view } = this.editor
      if (!inCodeBlock(state)) return false
      const { $from, $to, from, to, empty } = state.selection
      if ($from.parent !== $to.parent) return true
      if (dir === 1 && empty) {
        view.dispatch(state.tr.insertText(INDENT, from, to))
        return true
      }
      const text = $from.parent.textContent
      const base = $from.start()
      const startOff = $from.parentOffset
      const endOff = $to.parentOffset
      const first = text.lastIndexOf('\n', startOff - 1) + 1
      const lines = [first]
      for (let i = first; i < endOff; i++) if (text[i] === '\n' && i + 1 < endOff) lines.push(i + 1)
      const tr = state.tr
      for (const ls of lines.reverse()) {
        if (dir === 1) tr.insertText(INDENT, base + ls)
        else {
          const lead = /^(\t| {1,4})/.exec(text.slice(ls, ls + TAB_WIDTH))
          if (lead) tr.delete(base + ls, base + ls + lead[0].length)
        }
      }
      view.dispatch(keepSelection(tr, from, to))
      return true
    }

    return {
      Tab: shift(1),
      'Shift-Tab': shift(-1),

      Enter: () => {
        const { state, view } = this.editor
        if (!inCodeBlock(state)) return false
        const { $from, $to, from, to } = state.selection
        const text = $from.parent.textContent
        const before = text.slice(0, $from.parentOffset)
        const line = before.slice(before.lastIndexOf('\n') + 1)
        const indent = /^[ \t]*/.exec(line)![0]
        const opener = line.trimEnd().slice(-1)
        const opens = opener in OPEN_TO_CLOSE
        // Between a bracket pair, put the closer on its own line: {|} becomes {\n\t|\n}
        if (opens && text[$to.parentOffset] === OPEN_TO_CLOSE[opener]) {
          const tr = state.tr.insertText(`\n${indent}${INDENT}\n${indent}`, from, to)
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 1 + indent.length + INDENT.length)).scrollIntoView())
        } else {
          view.dispatch(state.tr.insertText(`\n${indent}${opens ? INDENT : ''}`, from, to).scrollIntoView())
        }
        return true
      },

      // Deleting the opener of an empty pair removes the closer too.
      Backspace: () => {
        const { state, view } = this.editor
        const { $from, empty, from } = state.selection
        if (!empty || !inCodeBlock(state)) return false
        const text = $from.parent.textContent
        const off = $from.parentOffset
        const open = text[off - 1]
        const close = text[off]
        if (open === undefined || close === undefined) return false
        if (OPEN_TO_CLOSE[open] !== close && !(QUOTES.has(open) && open === close)) return false
        view.dispatch(state.tr.delete(from - 1, from + 1))
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('codeEditing'),
        props: {
          // Auto-closing brackets and quotes, typing over an auto-inserted closer, and wrapping a selection.
          handleTextInput(view, from, to, typed) {
            const { state } = view
            const $from = state.doc.resolve(from)
            if ($from.parent.type.name !== 'codeBlock' || typed.length !== 1) return false
            const text = $from.parent.textContent
            const off = $from.parentOffset
            const prev = text[off - 1] ?? ''
            const next = text[off + (to - from)] ?? ''
            const isQuote = QUOTES.has(typed)

            if (from === to && next === typed && (CLOSERS.has(typed) || isQuote)) {
              view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)))
              return true
            }
            const close = isQuote ? typed : OPEN_TO_CLOSE[typed]
            if (!close) return false
            if (from !== to) {
              const selected = state.doc.textBetween(from, to)
              const tr = state.tr.insertText(typed + selected + close, from, to)
              view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selected.length)))
              return true
            }
            // Only auto-close where it will not get in the way: before whitespace, a closer, or the end of the line.
            if (isQuote ? /\w/.test(prev) || /\w/.test(next) : next !== '' && !/[\s)\]}]/.test(next)) return false
            const tr = state.tr.insertText(typed + close, from, to)
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 1)))
            return true
          },

          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'codeBlock') return
              const lang = node.attrs.language
              if (lang === 'go' || lang === 'java') {
                for (const t of tokenize(node.textContent, lang)) {
                  decorations.push(Decoration.inline(pos + 1 + t.from, pos + 1 + t.to, { class: TOKEN_CLASS[t.kind] }))
                }
              }
              return false
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
