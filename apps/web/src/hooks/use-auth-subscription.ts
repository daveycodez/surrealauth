import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import type { Tokens } from "surrealdb"

import { getAuthCookie, removeAuthCookie, setAuthCookie } from "../lib/cookie"
import { db } from "../lib/db"
import { isTokenExpired } from "../lib/token"

function whenConnected() {
  if (db.isConnected) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const off = db.subscribe("connected", () => {
      off()
      resolve()
    })
  })
}

// The auth cookie (notes-kit's cookie.ts) holds a string; we store the token pair as JSON.
function readAuthCookie(): Tokens | undefined {
  const value = getAuthCookie()
  if (!value) return undefined
  try {
    return JSON.parse(value) as Tokens
  } catch {
    return undefined
  }
}

// Mirrors the client's auth state into the ["token"] query and the auth cookie. The `auth` event
// fires on sign in, sign up, token renewal (the SDK renews in the background with the refresh
// token) and sign out.
export function useAuthSubscription() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return db.subscribe("auth", (next) => {
      queryClient.setQueryData(["token"], next ?? null)
      if (next) setAuthCookie(JSON.stringify(next))
      else removeAuthCookie()
    })
  }, [queryClient])

  // Signs the connection in with the tokens saved in the auth cookie. Keyed so useUser can
  // report loading while it runs (useIsMutating).
  const { mutate: restore } = useMutation({
    mutationKey: ["authenticate"],
    mutationFn: async (saved: Tokens): Promise<Tokens> => {
      await whenConnected()
      if (saved.refresh) {
        // Workaround for https://github.com/surrealdb/surrealdb/issues/7718: on SurrealDB Earth
        // the refresh RPC (db.authenticate({ access, refresh })) fails on a session that isn't
        // signed in yet, but signing in with the refresh token works. It also gives the SDK the
        // new refresh token, so its background renewal keeps the session going.
        return db.signin({
          namespace: "main",
          database: "main",
          access: "account",
          variables: { refresh: saved.refresh }
        })
      }
      await db.authenticate(saved.access)
      return saved
    },
    onSuccess: (signedIn) => {
      queryClient.setQueryData(["token"], signedIn)
      setAuthCookie(JSON.stringify(signedIn))
    },
    onError: () => {
      // Rejected (expired or revoked): stay signed out.
      queryClient.setQueryData(["token"], null)
      removeAuthCookie()
    }
  })

  // Once per page load. The ref keeps React's development double effect from spending the
  // single-use refresh token twice.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = readAuthCookie()
    if (!saved) return
    if (saved.refresh || !isTokenExpired(saved.access)) restore(saved)
    else removeAuthCookie()
  }, [restore])
}
