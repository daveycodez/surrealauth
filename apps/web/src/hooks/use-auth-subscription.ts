import { useEffect } from "react"

import { queryClient } from "../lib/collections"
import { db } from "../lib/surreal-provider"

// Mirrors the client's auth state into the ["token"] query. The `auth` event fires on sign in,
// sign up, token renewal and sign out.
export function useAuthSubscription() {
  useEffect(() => {
    return db.subscribe("auth", (tokens) => {
      queryClient.setQueryData(["token"], tokens?.access ?? null)
    })
  }, [])
}
