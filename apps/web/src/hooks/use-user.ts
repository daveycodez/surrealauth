import { useSurreal, useAuthId } from "@surrealauth/react"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useHydrated } from "@tanstack/react-router"

import { users } from "../lib/collections"

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in. isLoading also covers
// connecting, which includes signing in from the auth cookie: a disabled live query can't tell
// that apart from being signed out.
export function useUser() {
  const hydrated = useHydrated()
  const { isConnecting } = useSurreal()
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
