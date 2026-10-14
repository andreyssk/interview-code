import { useNavigate, useParams } from 'react-router-dom'
import { TaskForm } from '@/features/edit-task'

/** Admin routes /admin/tasks/new and /admin/tasks/edit/:slug. */
export function TaskFormPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const back = () => navigate('/admin/tasks')
  return <TaskForm slug={slug} onDone={back} onCancel={back} />
}
