import { useSyncExternalStore } from "react"
import type { Surreal, Tokens } from "surrealdb"

import { useSurreal } from "../components/surreal-provider"
import { type AuthCookie, getAuthCookie, subscribeAuthCookie } from "../lib/cookie"

function sessionToken(db: Surreal) {
  // accessToken throws while the client has no session.
  if (db.status !== "connected" && db.status !== "reconnecting") return undefined

  return db.accessToken
}

function cookieToken(cookie: AuthCookie) {
  const value = getAuthCookie(cookie)
  if (!value) return undefined

  try {
    return (JSON.parse(value) as Tokens).access
  } catch {
    return undefined
  }
}

export function useToken() {
  const { client: db, cookie } = useSurreal()

  return useSyncExternalStore(
    (onChange) => {
      const unsubscribes = [
        subscribeAuthCookie(onChange),
        db.subscribe("auth", onChange),
        db.subscribe("connected", onChange),
        db.subscribe("disconnected", onChange)
      ]
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
    },
    () => sessionToken(db) ?? cookieToken(cookie) ?? null,
    () => null
  )
}
