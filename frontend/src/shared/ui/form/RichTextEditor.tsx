import { Extension, InputRule, Mark, Node } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { ListItem } from '@tiptap/extension-list'
import StarterKit from '@tiptap/starter-kit'
import type { ReactNode } from 'react'
import type { Block } from '../rich-blocks/RichBlocks'
import { CodeEditing } from './codeEditing'
import { ColorMenu } from './ColorMenu'
import { blocksToDoc, docToBlocks, type PMNode } from './richText'

/** Info callout, the editor side of the `note` block. Inline text only. */
const Note = Node.create({
  name: 'note',
  group: 'block',
  content: 'inline*',
  parseHTML: () => [{ tag: 'aside.callout' }],
  renderHTML: () => ['aside', { class: 'callout' }, 0],
})

/** <mark> with one of six background colors (no color = the default amber). */
const ColoredHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-c'),
        renderHTML: (attrs: { color?: string | null }) => (attrs.color ? { 'data-c': attrs.color } : {}),
      },
    }
  },
})

/** Text color: one of six theme colors, stored as the color's name. */
const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-fg'),
        renderHTML: (attrs: { color?: string | null }) => (attrs.color ? { 'data-fg': attrs.color } : {}),
      },
    }
  },
  parseHTML: () => [{ tag: 'span[data-fg]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
})

/** Extra hotkeys; bold, italic, inline code, undo and redo come with the starter kit. */
const Hotkeys = Extension.create({
  name: 'hotkeys',
  addKeyboardShortcuts() {
    const e = () => this.editor
    return {
      'Mod-Alt-h': () => e().chain().focus().toggleHeading({ level: 4 }).run(),
      'Mod-Shift-8': () => e().chain().focus().toggleBulletList().run(),
      'Mod-Shift-7': () => e().chain().focus().toggleOrderedList().run(),
      'Mod-Alt-c': () => e().chain().focus().toggleCodeBlock({ language: 'go' }).run(),
      'Mod-Alt-n': () => e().chain().focus().toggleNode('note', 'paragraph').run(),
      'Mod-Shift-h': () => e().chain().focus().toggleHighlight().run(),
    }
  },
})

/** "--" becomes an em dash; one more "-" right after it gives the literal "---" back. Backspace undoes either. */
const SmartDash = Extension.create({
  name: 'smartDash',
  addInputRules() {
    const replace = (find: RegExp, text: string) =>
      new InputRule({ find, handler: ({ state, range }) => void state.tr.insertText(text, range.from, range.to) })
    return [replace(/--$/, '\u2014'), replace(/\u2014-$/, '---')]
  },
})

// A list item holds a single paragraph: the block format stores one string per item.
const FlatListItem = ListItem.extend({ content: 'paragraph' })

const extensions = [
  StarterKit.configure({
    heading: { levels: [4] },
    // No red spell-check squiggles under code.
    code: { HTMLAttributes: { spellcheck: 'false' } },
    codeBlock: { HTMLAttributes: { spellcheck: 'false' } },
    listItem: false,
    blockquote: false,
    horizontalRule: false,
    hardBreak: false,
    strike: false,
    underline: false,
    link: false,
  }),
  FlatListItem,
  Note,
  ColoredHighlight,
  TextColor,
  CodeEditing,
  Hotkeys,
  SmartDash,
]

// Curved-arrow icons (Lucide undo-2 / redo-2); redo is the undo icon mirrored.
function HistoryIcon({ redo }: { redo?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={redo ? '-scale-x-100' : undefined}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  )
}

interface Tool {
  label: React.ReactNode
  title: string
  active: (e: Editor) => boolean
  run: (e: Editor) => void
  mono?: boolean
}

const TOOLS: Tool[] = [
  { label: <b>B</b>, title: 'Bold (Ctrl+B)', active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: <i>I</i>, title: 'Italic (Ctrl+I)', active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: '</>', mono: true, title: 'Inline code (Ctrl+E)', active: (e) => e.isActive('code'), run: (e) => e.chain().focus().toggleCode().run() },
  { label: 'H', title: 'Heading (Ctrl+Alt+H)', active: (e) => e.isActive('heading'), run: (e) => e.chain().focus().toggleHeading({ level: 4 }).run() },
  { label: '• List', title: 'Bullet list (Ctrl+Shift+8)', active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: '1. List', title: 'Numbered list (Ctrl+Shift+7)', active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Code block', mono: true, title: 'Code block (Ctrl+Alt+C)', active: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock({ language: 'go' }).run() },
  { label: 'Note', title: 'Info callout (Ctrl+Alt+N)', active: (e) => e.isActive('note'), run: (e) => e.chain().focus().toggleNode('note', 'paragraph').run() },
]

function Toolbar({ editor, actions }: { editor: Editor; actions?: ReactNode }) {
  // Re-render on selection/content changes so the active states stay current.
  useEditorState({ editor, selector: (s) => s.transactionNumber })
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TOOLS.map((t) => (
        <button
          key={t.title}
          type="button"
          title={t.title}
          className={`chip${t.mono ? ' font-mono' : ''}${t.active(editor) ? ' chip-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => t.run(editor)}
        >
          {t.label}
        </button>
      ))}
      <ColorMenu editor={editor} kind="fg" />
      <ColorMenu editor={editor} kind="bg" />
      {editor.isActive('codeBlock') && (
        <select
          className="search search-sm"
          aria-label="Code block language"
          value={(editor.getAttributes('codeBlock').language as string | null) ?? ''}
          onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value || null }).run()}
        >
          <option value="">Plain text</option>
          <option value="go">Go</option>
          <option value="java">Java</option>
        </select>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" className="chip" disabled={!editor.can().undo()} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()}>
          <HistoryIcon />
        </button>
        <button type="button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className="chip" disabled={!editor.can().redo()} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()}>
          <HistoryIcon redo />
        </button>
        {actions}
      </span>
    </div>
  )
}

/**
 * WYSIWYG editor over the same `Block[]` format that RichBlocks renders (p, h, pre with optional lang, ul, ol, note;
 * inline b, i, code, mark[:color], color:name). Code blocks edit like a code editor (see codeEditing.ts).
 * Remount with a new `key` to load other content. `flush` drops the frame so it can fill a whole pane.
 */
export function RichTextEditor({
  initial,
  onChange,
  flush = false,
  actions,
}: {
  initial: Block[]
  onChange: (blocks: Block[]) => void
  flush?: boolean
  /** Extra controls at the right end of the toolbar (e.g. a save button) */
  actions?: ReactNode
}) {
  const editor = useEditor({
    extensions,
    content: blocksToDoc(initial),
    editorProps: { attributes: { class: 'rte-body prose-task' } },
    onUpdate: ({ editor }) => onChange(docToBlocks(editor.getJSON() as PMNode)),
  })
  if (!editor) return null
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${flush ? '' : 'gap-2'}`}>
      <div className={flush ? 'px-4 py-3' : undefined}>
        <Toolbar editor={editor} actions={actions} />
      </div>
      <EditorContent editor={editor} className={`rte search min-h-0 flex-1 overflow-y-auto${flush ? ' rte-flush' : ''}`} />
    </div>
  )
}
