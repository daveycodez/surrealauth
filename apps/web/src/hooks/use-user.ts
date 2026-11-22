import { eq, useLiveQuery } from "@tanstack/react-db"
import { RecordId } from "surrealdb"

import { users } from "../lib/collections"
import { useToken } from "./use-token"

// SurrealDB puts the signed-in record in the access token's `ID` claim, e.g. "user:abc".
function userIdFromToken(token: string) {
  const payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")
  const { ID } = JSON.parse(atob(payload)) as { ID: string }
  const separator = ID.indexOf(":")
  return new RecordId("user", ID.slice(separator + 1))
}

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
// Disabled (status "disabled", data undefined) while nobody is signed in.
export function useUser() {
  const { data: token } = useToken()
  const userId = token ? userIdFromToken(token) : undefined

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
