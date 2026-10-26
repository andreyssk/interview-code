/** CSS color of a company's tone class, e.g. neon-blue -> var(--blue). */
export const toneColor = (tone: string) => `var(--${tone.replace(/^neon-/, '')})`

const TONES = ['neon-cyan', 'neon-pink', 'neon-amber', 'neon-green', 'neon-blue', 'neon-red', 'neon-yellow', 'neon-indigo', 'neon-violet']

/** A stable color for things that have none (sources), picked from the slug. */
export function toneFromSlug(slug: string): string {
  let h = 0
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}
