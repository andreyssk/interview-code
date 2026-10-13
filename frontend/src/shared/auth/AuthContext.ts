import { createContext, useContext } from 'react'
import type { User } from '@/shared/api/auth'

export interface Auth {
  user: User
  /** Ends the session and clears everything cached for this user */
  signOut: () => Promise<void>
  /** Re-reads the signed-in user (after a password change) */
  refresh: () => Promise<unknown>
}

export const AuthContext = createContext<Auth | null>(null)

/** The signed-in user; only usable below <AuthGate>, which renders the app only when there is one. */
export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthGate>')
  return auth
}
