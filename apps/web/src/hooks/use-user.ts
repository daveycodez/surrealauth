import { eq, useLiveQuery } from "@tanstack/react-db"
import { useHydrated } from "@tanstack/react-router"

import { users } from "../lib/collections"
import { useAuthId } from "../lib/surreal"

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in. While connecting, the
// query stays loading, since its load waits for the connection (and the cookie sign-in).
// isLoading also covers hydrating, when the auth id isn't known yet.
export function useUser() {
  const hydrated = useHydrated()
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

  return { ...query, isLoading: (!hydrated || query.isLoading) && !query.data }
}
