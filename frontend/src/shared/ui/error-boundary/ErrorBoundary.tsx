import { Component, type ErrorInfo, type ReactNode } from 'react'
import { i18n } from '@/shared/i18n'

interface Props {
  children: ReactNode
  /** When this changes (e.g. the route), a shown error is cleared and the children render again */
  resetKey?: unknown
  /** 'page': a card in the page area (the rest of the app keeps working). 'app': a full-screen last resort. */
  level?: 'page' | 'app'
}

interface State {
  error: Error | null
  resetKey: unknown
}

/**
 * Catches render errors below it so one broken page shows a message instead of a blank screen.
 * Placed twice: around each page (header and navigation stay usable) and around the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  // A new resetKey (the route changed) clears a shown error so the new page gets a fresh try.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // i18n is a plain module, not a hook, so this works even when React context is what broke.
    const t = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback })
    const app = this.props.level === 'app'
    return (
      <div className={app ? 'mx-auto mt-24 w-[min(32rem,calc(100vw-2rem))]' : 'mx-auto mt-10 w-[min(32rem,100%)]'} role="alert">
        <div className="panel p-6">
          <h1 className="neon-title mb-2 text-2xl font-bold">{t('errors.title', 'Something went wrong')}</h1>
          <p className="mb-4 text-[var(--muted)]">{t('errors.hint', 'This part of the page failed to load. The rest of the app still works.')}</p>
          <pre className="mb-4 overflow-auto rounded-md bg-[var(--code-block-bg)] p-3 text-xs text-[var(--pink)]">{error.message}</pre>
          <div className="flex flex-wrap gap-2">
            <button className="btn-run" onClick={() => this.setState({ error: null })}>
              {t('errors.retry', 'Try again')}
            </button>
            {app ? (
              <button className="btn-ghost" onClick={() => window.location.reload()}>
                {t('errors.reload', 'Reload the page')}
              </button>
            ) : (
              <a className="btn-ghost" href="/problems">
                {t('errors.home', 'Go to the start page')}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }
}
