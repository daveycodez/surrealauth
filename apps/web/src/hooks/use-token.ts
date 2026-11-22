import { useQuery } from "@tanstack/react-query"

// The current access token. Nothing fetches it: useAuthSubscription writes it into the cache
// whenever the client's auth state changes, so it never goes stale or gets collected.
export function useToken() {
  return useQuery<string | null>({
    queryKey: ["token"],
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity
  })
}
