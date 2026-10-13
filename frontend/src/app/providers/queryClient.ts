import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/queryKeys'

// A 401 from any call means the session ended (expired, or reset by an admin): re-check who is signed in,
// which sends the user back to the login screen.
const onUnauthorized = (error: unknown) => {
  if (error instanceof ApiError && error.status === 401) queryClient.invalidateQueries({ queryKey: queryKeys.me })
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onUnauthorized }),
  mutationCache: new MutationCache({ onError: onUnauthorized }),
})
