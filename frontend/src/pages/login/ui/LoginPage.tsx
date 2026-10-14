import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAuthConfig, login, signup } from '@/shared/api/auth'
import { queryKeys } from '@/shared/api/queryKeys'
import { LanguageSwitcher } from '@/features/switch-language'
import { ThemeSwitcher } from '@/features/switch-theme'

/** Login and, while an admin allows it, sign-up. */
export function LoginPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: config } = useQuery({ queryKey: queryKeys.authConfig, queryFn: fetchAuthConfig })
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const canSignUp = config?.signupEnabled === true
  const signingUp = mode === 'signup' && canSignUp

  const submit = useMutation({
    mutationFn: () => (signingUp ? signup : login)({ username, password }),
    onSuccess: (user) => {
      // Drop anything cached for a previous session, then hand AuthGate the signed-in user directly.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] })
      queryClient.setQueryData(queryKeys.me, user)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (username && password) submit.mutate()
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">
          <span className="logo-mark">▲</span> INTERVIEW<span className="text-[var(--cyan)]">//</span>PREP
        </span>
        <span className="flex items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </span>
      </header>
      {/* Covers the whole viewport (the header floats above it), so the card sits in the true center. */}
      <main className="absolute inset-0 grid place-items-center overflow-auto p-4">
      <form onSubmit={onSubmit} className="panel flex w-[min(24rem,100%)] flex-col gap-3 p-6">
        <h1 className="neon-title text-2xl font-bold">{signingUp ? t('auth.signUp') : t('auth.signIn')}</h1>
        <input className="search" placeholder={t('auth.username')} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input
          className="search"
          type="password"
          placeholder={t('auth.password')}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {submit.isError && <p className="text-sm text-[var(--pink)]">{submit.error.message}</p>}
        <button type="submit" className="btn-run" disabled={!username || !password || submit.isPending}>
          {signingUp ? t('auth.signUp') : t('auth.signIn')}
        </button>
        {canSignUp ? (
          <button type="button" className="text-sm text-[var(--cyan)] hover:underline" onClick={() => { setMode(signingUp ? 'login' : 'signup'); submit.reset() }}>
            {signingUp ? t('auth.haveAccount') : t('auth.noAccount')}
          </button>
        ) : (
          <p className="text-xs text-[var(--muted)]">{t('auth.signupClosed')}</p>
        )}
      </form>
      </main>
    </div>
  )
}
