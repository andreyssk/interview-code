import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChangePasswordPage } from '@/pages/change-password'
import { LoginPage } from '@/pages/login'
import { fetchMe, logout } from '@/shared/api/auth'
import { ApiError } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/queryKeys'
import { AuthContext } from '@/shared/auth/AuthContext'
import { Spinner } from '@/shared/ui'

/** Renders the app only for a signed-in user; otherwise the login screen (or the forced password change). */
export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: user, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.me,
    retry: false,
    queryFn: () => fetchMe().catch((e) => (e instanceof ApiError && e.status === 401 ? null : Promise.reject(e))),
  })

  const auth = useMemo(
    () =>
      user
        ? {
            user,
            refresh: () => refetch(),
            signOut: async () => {
              await logout().catch(() => undefined)
              // Nothing of this user may leak into the next session.
              queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] })
              queryClient.setQueryData(queryKeys.me, null)
            },
          }
        : null,
    [user, refetch, queryClient],
  )

  if (isPending) return <Spinner />
  if (error) return <p className="p-6 text-[var(--pink)]">{t('status.serverDown')}</p>
  if (!user || !auth) return <LoginPage />
  if (user.mustChangePassword) return <ChangePasswordPage onSignOut={auth.signOut} onDone={auth.refresh} />
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
