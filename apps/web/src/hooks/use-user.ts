import { eq, useLiveQuery } from "@tanstack/react-db"

import { users } from "../lib/collections"
import { useAuthId } from "../lib/surreal"

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in. While connecting, the
// query stays loading, since its load waits for the connection (and the cookie sign-in).
// Before hydration the auth id isn't known, so callers check useHydrated() themselves.
export function useUser() {
  const userId = useAuthId()

  return useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId))
        .findOne()
    }
  })
}
