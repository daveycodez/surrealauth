import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import type { Tokens } from "surrealdb"

import { db } from "../lib/surreal-provider"
import { useToken } from "./use-token"

function whenConnected() {
  if (db.isConnected) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const off = db.subscribe("connected", () => {
      off()
      resolve()
    })
  })
}

// Mirrors the client's auth state into the ["token"] query. The `auth` event fires on sign in,
// sign up, token renewal (the SDK renews in the background with the refresh token) and sign out.
export function useAuthSubscription() {
  const queryClient = useQueryClient()
  const { data: tokens } = useToken()

  useEffect(() => {
    return db.subscribe("auth", (next) => {
      queryClient.setQueryData(["token"], next ?? null)
    })
  }, [queryClient])

  // Signs the connection in with tokens restored from IndexedDB. Keyed so useUser can report
  // loading while it runs (useIsMutating).
  const { mutate: restore } = useMutation({
    mutationKey: ["authenticate"],
    mutationFn: async (restored: Tokens): Promise<Tokens> => {
      await whenConnected()
      if (restored.refresh) {
        // Workaround for https://github.com/surrealdb/surrealdb/issues/7718: on SurrealDB Earth
        // the refresh RPC (db.authenticate({ access, refresh })) fails on a session that isn't
        // signed in yet, but signing in with the refresh token works. It also gives the SDK the
        // new refresh token, so its background renewal keeps the session going.
        return db.signin({
          namespace: "main",
          database: "main",
          access: "account",
          variables: { refresh: restored.refresh }
        })
      }
      await db.authenticate(restored.access)
      return restored
    },
    onSuccess: (signedIn) => queryClient.setQueryData(["token"], signedIn),
    onError: () => queryClient.setQueryData(["token"], null) // rejected: stays signed out
  })

  useEffect(() => {
    if (!tokens || (db.isConnected && db.accessToken === tokens.access)) return
    // Hidden until the server accepts them, so ["token"] only holds tokens the connection is
    // signed in with.
    queryClient.setQueryData(["token"], null)
    restore(tokens)
  }, [tokens, restore, queryClient])
}
