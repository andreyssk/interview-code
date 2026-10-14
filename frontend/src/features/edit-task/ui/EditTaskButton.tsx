import { useState } from 'react'
import { Modal } from '@/shared/ui'
import { TaskForm } from './TaskForm'

/** "Edit" for admins: opens the full task form in a dialog, so the task page stays where it is. */
export function EditTaskButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        <span aria-hidden="true">✎</span> Edit
      </button>
      <Modal open={open} form title={`Edit task: ${slug}`} onClose={() => setOpen(false)}>
        {/* Mounted only while open, so every opening starts from the saved task. */}
        {open && <TaskForm slug={slug} compact onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />}
      </Modal>
    </>
  )
}
