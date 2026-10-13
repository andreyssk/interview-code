import { jsonInit, request } from './http'

export interface User {
  id: number
  username: string
  role: 'user' | 'admin'
  /** Set after an admin reset: the user must choose a new password before anything else */
  mustChangePassword: boolean
  createdAt: string
}

export interface Credentials {
  username: string
  password: string
}

export const fetchMe = () => request<User>('/api/auth/me')
export const fetchAuthConfig = () => request<{ signupEnabled: boolean }>('/api/auth/config')
export const login = (v: Credentials) => request<User>('/api/auth/login', jsonInit('POST', v))
export const signup = (v: Credentials) => request<User>('/api/auth/signup', jsonInit('POST', v))
export const logout = () => request<void>('/api/auth/logout', jsonInit('POST'))
export const changePassword = (v: { current: string; new: string }) => request<void>('/api/auth/password', jsonInit('POST', v))
