import type { Surreal } from "surrealdb"

import { type AuthCookie, readAuthCookie, removeAuthCookie } from "./cookie"

type AuthActionsConfig = {
  namespace: string
  database: string
  access: string
  cookie: AuthCookie
}

export function createAuthActions(
  db: Surreal,
  { namespace, database, access, cookie }: AuthActionsConfig
) {
  async function login(email: string, password: string) {
    return db.signin({ namespace, database, access, variables: { email, pass: password } })
  }

  async function register(email: string, password: string) {
    return db.signup({ namespace, database, access, variables: { email, pass: password } })
  }

  async function logout() {
    // The saved tokens, since the client has no refresh token after signing in with the access token.
    const saved = readAuthCookie(cookie)
    await db.revoke(saved?.refresh ? saved : undefined).catch(() => {})
    removeAuthCookie(cookie)
    return db.invalidate()
  }

  return { login, register, logout }
}
