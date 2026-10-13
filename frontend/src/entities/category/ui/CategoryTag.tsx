import { useCategory } from '../model/categories'

export function CategoryTag({ slug }: { slug: string }) {
  const category = useCategory(slug)
  return category ? <span className="tag tag-cat">{category.name}</span> : null
}
