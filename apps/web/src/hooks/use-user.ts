import { eq, useLiveQuery } from "@tanstack/react-db"
import { useIsMutating, useIsRestoring } from "@tanstack/react-query"
import { RecordId } from "surrealdb"

import { users } from "../lib/collections"
import { tokenClaims } from "../lib/token"
import { useToken } from "./use-token"

// SurrealDB puts the signed-in record in the access token's `ID` claim, e.g. "user:abc".
function userIdFromToken(token: string) {
  const { ID } = tokenClaims(token)
  const separator = ID.indexOf(":")
  return new RecordId("user", ID.slice(separator + 1))
}

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in. isLoading also covers
// restoring the token from IndexedDB and checking it with the server, which a disabled live
// query can't tell apart from being signed out.
export function useUser() {
  const isRestoring = useIsRestoring()
  const isAuthenticating = useIsMutating({ mutationKey: ["authenticate"] }) > 0
  const { data: tokens } = useToken()
  const userId = tokens ? userIdFromToken(tokens.access) : undefined

  const query = useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId))
        .findOne()
    }
  })

  return { ...query, isLoading: isRestoring || isAuthenticating || query.isLoading }
}
