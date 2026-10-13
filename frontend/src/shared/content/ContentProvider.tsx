import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchContent } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { Spinner } from '@/shared/ui'
import { ContentContext } from './ContentContext'

/** Everything the app renders (tasks, theory, categories) comes from the backend; the app waits for it once, at startup. */
export function ContentProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useQuery({ queryKey: queryKeys.content, queryFn: fetchContent, staleTime: 60_000 })

  if (isPending) return <Spinner />
  if (isError || !data) return <p className="p-6 text-[var(--pink)]">{t('status.serverDown')}</p>
  return <ContentContext.Provider value={data}>{children}</ContentContext.Provider>
}
