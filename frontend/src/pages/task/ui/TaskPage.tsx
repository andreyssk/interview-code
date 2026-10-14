import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useTask } from '@/entities/task'
import { EditTaskButton } from '@/features/edit-task'
import { useRecordRecentTask } from '@/features/recent-tasks'
import { useAuth } from '@/shared/auth/AuthContext'
import { MistakesPopover } from '@/widgets/mistakes-popover'
import { TaskTheoryPopover } from '@/widgets/task-theory-popover'
import { TaskWorkspace } from '@/widgets/task-workspace'

export function TaskPage() {
  const { t } = useTranslation()
  const task = useTask(useParams().slug)
  const { user } = useAuth()
  useRecordRecentTask(task?.slug) // the history popover in the header lists these
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
  return (
    <TaskWorkspace
      key={task.slug}
      task={task}
      adminActions={user.role === 'admin' ? <EditTaskButton slug={task.slug} /> : undefined}
      editorActions={
        <>
          <TaskTheoryPopover task={task} />
          <MistakesPopover />
        </>
      }
    />
  )
}
