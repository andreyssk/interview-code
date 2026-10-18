/** The palette for text color and background in rich text; each is a theme CSS variable (--red, --amber, …). */
export const INLINE_COLORS = ['red', 'amber', 'green', 'cyan', 'blue', 'violet'] as const
export type InlineColor = (typeof INLINE_COLORS)[number]

export const isInlineColor = (c: unknown): c is InlineColor => INLINE_COLORS.includes(c as InlineColor)

/** Inline markup tags: <b> <i> <code>, <mark> / <mark:red> (background), <color:red> (text color). */
export const INLINE_TOKEN = new RegExp(String.raw`<(\/?)(b|i|code|mark|color)(?::(${INLINE_COLORS.join('|')}))?>`, 'g')
