import { ServerError } from "surrealdb"
import type { Surreal } from "surrealdb"

import { type AuthCookie, readAuthCookie, removeAuthCookie, setAuthCookie } from "./cookie"
import { isTokenExpired } from "./token-helpers"

type CookieAuthConfig = {
  namespace: string
  database: string
  access: string
  cookie: AuthCookie
}

export type Credential = string | Parameters<Surreal["signin"]>[0]

// For connect()'s authentication option: hands over the credential once, on the first connect.
// Reconnects restore the session the SDK already holds, and the SDK's renewal of an expiring token
// then gets nothing, so it signs out and setupCookieAuth renews with the refresh token.
export function connectAuthentication(credential: Credential | null) {
  let used = false
  return () => {
    if (used) return null
    used = true
    return credential
  }
}

// The saved session as credentials to sign in with while connecting, best first: the access token
// while it's valid, then the refresh token.
export function savedCredentials({
  namespace,
  database,
  access,
  cookie
}: CookieAuthConfig): Credential[] {
  const saved = readAuthCookie(cookie)
  if (!saved) return []

  const credentials: Credential[] = []
  if (!isTokenExpired(saved.access)) credentials.push(saved.access)
  // signin, not refresh: https://github.com/surrealdb/surrealdb/issues/7718
  if (saved.refresh) {
    credentials.push({ namespace, database, access, variables: { refresh: saved.refresh } })
  }
  return credentials
}

// Saves the session to the auth cookie on every auth event, and renews it with the refresh token
// when the access token expires. Returns a function that stops it.
export function setupCookieAuth(
  db: Surreal,
  { namespace, database, access, cookie }: CookieAuthConfig
) {
  function signInWithRefresh(refresh: string) {
    return db.signin({ namespace, database, access, variables: { refresh } }).catch((error) => {
      if (error instanceof ServerError) removeAuthCookie(cookie)
    })
  }

  return db.subscribe("auth", (tokens) => {
    const saved = readAuthCookie(cookie)

    if (tokens) {
      setAuthCookie(
        cookie,
        JSON.stringify({ ...tokens, refresh: tokens.refresh ?? saved?.refresh })
      )
      return
    }

    // Signed out with a refresh token still saved: the access token expired.
    if (saved?.refresh) signInWithRefresh(saved.refresh)
    else removeAuthCookie(cookie)
  })
}
