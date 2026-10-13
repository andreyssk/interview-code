import { Link } from 'react-router-dom'
import type { TaskDef } from '../model/types'
import { CompanyTag, DifficultyTag, SolvedTag } from './tags'

interface Props {
  task: TaskDef
  solved: boolean
}

/** One compact line: title on the left, difficulty / solved / companies on the right. */
export function TaskCard({ task, solved }: Props) {
  return (
    <Link
      to={`/tasks/${task.slug}`}
      className="task-row panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 transition hover-glow"
    >
      <span className="w-10 shrink-0 text-sm tabular-nums text-[var(--muted)]">#{task.number}</span>
      <span className="min-w-0 flex-1 basis-60 truncate font-medium">{task.title}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <DifficultyTag difficulty={task.difficulty} />
        {solved && <SolvedTag />}
        {task.companies.map((c) => (
          <CompanyTag key={c} slug={c} />
        ))}
      </span>
    </Link>
  )
}
