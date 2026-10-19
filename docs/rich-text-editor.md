# Rich text editor

The editor used for question answers (`RichTextEditor`). On macOS read **Ctrl** as **Cmd**.

## Hotkeys

| Action             | Keys               |
|--------------------|--------------------|
| Bold               | Ctrl+B             |
| Italic             | Ctrl+I             |
| Inline code        | Ctrl+E             |
| Heading            | Ctrl+Alt+H         |
| Bullet list        | Ctrl+Shift+8       |
| Numbered list      | Ctrl+Shift+7       |
| Code block         | Ctrl+Alt+C         |
| Info callout       | Ctrl+Alt+N         |
| Highlight          | Ctrl+Shift+H       |
| Undo               | Ctrl+Z             |
| Redo               | Ctrl+Shift+Z / Ctrl+Y |

Inside code blocks Tab / Shift+Tab indent and outdent.

## Dashes

- Typing `--` produces an em dash (—).
- Typing a third `-` right after it turns it into the literal `---`.
- Backspace right after either conversion undoes it (back to `--` or `-`-style text as typed).
- Nothing is converted inside code blocks or inline code.
