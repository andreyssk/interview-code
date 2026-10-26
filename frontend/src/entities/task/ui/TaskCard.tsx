import { Link } from 'react-router-dom'
import type { TaskDef } from '../model/types'
import { DifficultyTag, SolvedTag } from './tags'
import { TagStack } from './TagStack'

interface Props {
  task: TaskDef
  solved: boolean
}

/**
 * One compact line: title on the left, difficulty / solved and the company and source stacks on the right.
 * The title link is stretched over the whole row; the stacks sit above it so they can open their own popovers.
 */
export function TaskCard({ task, solved }: Props) {
  return (
    <div className="task-row panel relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 transition hover-glow">
      <span className="w-10 shrink-0 text-sm tabular-nums text-[var(--muted)]">#{task.number}</span>
      <Link to={`/tasks/${task.slug}`} className="min-w-0 flex-1 basis-60 truncate font-medium after:absolute after:inset-0 after:content-['']">
        {task.title}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5">
        <DifficultyTag difficulty={task.difficulty} />
        {solved && <SolvedTag />}
        <TagStack kind="company" slugs={task.companies} />
        <TagStack kind="source" slugs={task.sources} />
      </span>
    </div>
  )
}
