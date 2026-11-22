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

// Keeps the client's session and the auth cookie in step. Returns a function that stops it.
export function setupCookieAuth(
  db: Surreal,
  { namespace, database, access, cookie }: CookieAuthConfig
) {
  function forgetIfRejected(error: unknown) {
    if (error instanceof ServerError) removeAuthCookie(cookie)
  }

  // signin, not refresh: https://github.com/surrealdb/surrealdb/issues/7718
  function signInWithRefresh(refresh: string) {
    return db
      .signin({ namespace, database, access, variables: { refresh } })
      .catch(forgetIfRejected)
  }

  const unsubscribeConnected = db.subscribe("connected", () => {
    const saved = readAuthCookie(cookie)
    if (!saved || db.accessToken) return

    const { access: accessToken, refresh } = saved

    if (!isTokenExpired(accessToken)) {
      db.authenticate(accessToken).catch((error) => {
        if (error instanceof ServerError && refresh) signInWithRefresh(refresh)
        else forgetIfRejected(error)
      })
    } else if (refresh) {
      signInWithRefresh(refresh)
    } else {
      removeAuthCookie(cookie)
    }
  })

  const unsubscribeAuth = db.subscribe("auth", (tokens) => {
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

  return () => {
    unsubscribeConnected()
    unsubscribeAuth()
  }
}
