import { Link } from 'react-router-dom'
import { findTask } from '../model/tasks'
import { useTaskText } from '../model/useTaskText'

/** Title of a task as a link; falls back to the plain slug if the task no longer exists. */
export function TaskTitleLink({ slug, className }: { slug: string; className?: string }) {
  const { title } = useTaskText(slug)
  if (!findTask(slug)) return <span className={className}>{slug}</span>
  return (
    <Link to={`/tasks/${slug}`} className={className}>
      {title}
    </Link>
  )
}
