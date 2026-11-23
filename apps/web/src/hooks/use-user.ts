import { eq, useLiveQuery } from "@tanstack/react-db"

import { users } from "../lib/collections"
import { surreal } from "../lib/surreal"

export function useUser() {
  const userId = surreal.useAuthId()

  return useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId.toString()))
        .findOne()
    }
  })
}
