import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { findTask } from '@/entities/task'
import { MistakesPopover } from '@/widgets/mistakes-popover'
import { TaskTheoryPopover } from '@/widgets/task-theory-popover'
import { TaskWorkspace } from '@/widgets/task-workspace'

export function TaskPage() {
  const { t } = useTranslation()
  const task = findTask(useParams().slug)
  if (!task) {
    return (
      <p>
        {t('task.notFound')}{' '}
        <Link className="underline" to="/problems">
          {t('task.backToList')}
        </Link>
      </p>
    )
  }
  // key: reset editor/tab state when navigating between tasks
  return <TaskWorkspace key={task.slug} task={task} editorActions={
        <>
          <TaskTheoryPopover task={task} />
          <MistakesPopover />
        </>
      } />
}
