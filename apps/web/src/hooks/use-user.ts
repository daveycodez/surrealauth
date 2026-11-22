import { eq, useLiveQuery } from "@tanstack/react-db"
import { useHydrated } from "@tanstack/react-router"

import { users } from "../lib/collections"
import { useAuthId, useConnection } from "../lib/surreal"

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in. isLoading also covers
// hydrating and connecting, which a disabled live query can't tell apart from being signed out.
export function useUser() {
  const hydrated = useHydrated()
  const { isConnecting } = useConnection()
  const userId = useAuthId()

  const query = useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId))
        .findOne()
    }
  })

  return { ...query, isLoading: (!hydrated || isConnecting || query.isLoading) && !query.data }
}
