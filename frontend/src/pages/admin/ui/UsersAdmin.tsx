import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchSettings, fetchUsers, resetPassword, saveSettings, type AdminUser } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuth } from '@/shared/auth/AuthContext'
import { ConfirmDialog, Modal, Spinner } from '@/shared/ui'

/** Access control: the sign-up switch, the users list and password resets. */
export function UsersAdmin() {
  const queryClient = useQueryClient()
  const { user: me } = useAuth()
  const users = useQuery({ queryKey: queryKeys.adminUsers, queryFn: fetchUsers })
  const settings = useQuery({ queryKey: queryKeys.adminSettings, queryFn: fetchSettings })
  const [resetting, setResetting] = useState<AdminUser | null>(null)
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null)

  const toggle = useMutation({
    mutationFn: (signupEnabled: boolean) => saveSettings({ signupEnabled }),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.adminSettings, data),
  })
  const reset = useMutation({
    mutationFn: (u: AdminUser) => resetPassword(u.id).then((r) => ({ username: u.username, password: r.password })),
    onSuccess: (r) => {
      setIssued(r)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
    },
    onSettled: () => setResetting(null),
  })

  const open = settings.data?.signupEnabled === true

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h3 className="text-lg font-semibold">New sign-ups</h3>
          <p className="text-sm text-[var(--muted)]">
            {open ? 'Anyone who can reach the app can create an account.' : 'Closed: only existing accounts can sign in.'}
          </p>
        </div>
        <button
          className={open ? 'btn-danger-solid' : 'btn-run'}
          disabled={settings.isPending || toggle.isPending}
          aria-pressed={open}
          onClick={() => toggle.mutate(!open)}
        >
          {open ? 'Disable sign-ups' : 'Enable sign-ups'}
        </button>
        {toggle.isError && <p className="w-full text-sm text-[var(--pink)]">{toggle.error.message}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Users {users.data && `(${users.data.length})`}</h3>
        {users.isPending && <Spinner />}
        {users.isError && <p className="text-sm text-[var(--pink)]">{users.error.message}</p>}
        {reset.isError && <p className="text-sm text-[var(--pink)]">{reset.error.message}</p>}
        <ul className="flex flex-col gap-1.5">
          {users.data?.map((u) => (
            <li key={u.id} className="panel flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 basis-60">
                <span className="font-medium">{u.username}</span>
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {u.role} · joined {new Date(u.createdAt).toLocaleDateString()}
                  {u.mustChangePassword ? ' · must set a new password' : ''}
                </span>
              </span>
              <button className="btn-ghost" disabled={u.id === me.id} title={u.id === me.id ? 'Change your own password from the account menu' : undefined} onClick={() => setResetting(u)}>
                Reset password
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={resetting !== null}
        title={`Reset the password of ${resetting?.username}?`}
        message="They are signed out everywhere. You get a temporary password to give them; they must replace it at their next login."
        confirmLabel="Reset"
        busy={reset.isPending}
        onConfirm={() => resetting && reset.mutate(resetting)}
        onCancel={() => setResetting(null)}
      />
      <Modal open={issued !== null} title={`Temporary password for ${issued?.username}`} onClose={() => setIssued(null)}>
        <p className="modal-message">Shown only once. Send it to the user; they will be asked to choose their own.</p>
        <input className="search font-mono" readOnly value={issued?.password ?? ''} onFocus={(e) => e.target.select()} />
        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => issued && navigator.clipboard?.writeText(issued.password)}>
            Copy
          </button>
          <button className="btn-run" onClick={() => setIssued(null)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  )
}
