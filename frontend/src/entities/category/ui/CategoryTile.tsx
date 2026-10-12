import { Link } from 'react-router-dom'

interface Props {
  to: string
  glyph: string
  color: string
  title: string
  meta: string
  jp?: string
}

export function CategoryTile({ to, glyph, color, title, meta, jp }: Props) {
  return (
    <Link to={to} className="cat-tile" style={{ '--c': color } as React.CSSProperties}>
      {jp && (
        <span className="cat-kanji" aria-hidden="true">
          {jp}
        </span>
      )}
      <div className="cat-glyph">{glyph}</div>
      <h3>{title}</h3>
      <span className="cat-meta">{meta}</span>
    </Link>
  )
}
