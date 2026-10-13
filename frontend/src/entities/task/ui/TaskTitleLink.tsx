import { Link } from 'react-router-dom'
import { useTask } from '../model/tasks'

/** Title of a task as a link; falls back to the plain slug if the task no longer exists. */
export function TaskTitleLink({ slug, className }: { slug: string; className?: string }) {
  const task = useTask(slug)
  if (!task) return <span className={className}>{slug}</span>
  return (
    <Link to={`/tasks/${slug}`} className={className}>
      {task.title}
    </Link>
  )
}
