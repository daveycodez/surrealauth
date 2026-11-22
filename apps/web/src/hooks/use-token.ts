import { useQuery } from "@tanstack/react-query"
import type { Tokens } from "surrealdb"

import { isTokenExpired } from "../lib/token"

// The current access and refresh tokens. Nothing fetches them: useAuthSubscription writes them
// whenever the client's auth state changes, and they are restored from IndexedDB on load.
// Disabled so a fetch on load can't overwrite the restored tokens, and never stale or collected.
// An expired access token with no refresh token reads as null.
export function useToken() {
  return useQuery<Tokens | null>({
    queryKey: ["token"],
    queryFn: () => null,
    select: (tokens) =>
      tokens && (tokens.refresh || !isTokenExpired(tokens.access)) ? tokens : null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity
  })
}
