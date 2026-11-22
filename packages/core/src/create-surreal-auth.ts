import { type ConnectionStatus, type ConnectOptions, type RecordId, Surreal } from "surrealdb"

import { createAuthActions } from "./lib/auth-actions"
import {
  type AuthCookie,
  DEFAULT_AUTH_COOKIE,
  readAuthCookie,
  subscribeAuthCookie
} from "./lib/cookie"
import { setupCookieAuth } from "./lib/cookie-auth"
import { parseRecordId, type TokenClaims, tokenClaims } from "./lib/token-helpers"

export type SurrealAuthConfig = {
  endpoint: string
  namespace: string
  database: string
  // The record access method users sign in with, e.g. "account".
  access: string
  cookie?: Partial<AuthCookie>
  options?: Omit<ConnectOptions, "namespace" | "database">
}

export type SurrealAuth = ReturnType<typeof create>

declare global {
  var __surrealAuthStore: Map<string, SurrealAuth> | undefined
}

// Kept on globalThis so hot reload reuses the live client instead of opening a second connection.
const store = (globalThis.__surrealAuthStore ??= new Map())

export function createSurrealAuth(config: SurrealAuthConfig): SurrealAuth {
  const cookie = { ...DEFAULT_AUTH_COOKIE, ...config.cookie }
  const key = [config.endpoint, config.namespace, config.database, config.access, cookie.name].join(
    "|"
  )

  const existing = store.get(key)
  if (existing) return existing

  const instance = create(config, cookie, () => store.delete(key))
  store.set(key, instance)
  return instance
}

function create(config: SurrealAuthConfig, cookie: AuthCookie, forget: () => void) {
  const { endpoint, namespace, database, access, options } = config
  const db = new Surreal()

  const stopCookieAuth = setupCookieAuth(db, { namespace, database, access, cookie })
  const auth = createAuthActions(db, { namespace, database, access, cookie })

  function connect() {
    return db.connect(endpoint, { ...options, namespace, database })
  }

  function close() {
    stopCookieAuth()
    forget()
    return db.close()
  }

  function subscribe(events: Parameters<Surreal["subscribe"]>[0][], listener: () => void) {
    const unsubscribes = events.map((event) => db.subscribe(event, listener))
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }

  // The session's access token, or else the saved one, so it works offline and before connecting.
  function getToken() {
    // accessToken throws while the client has no session.
    const hasSession = db.status === "connected" || db.status === "reconnecting"
    return (hasSession ? db.accessToken : undefined) ?? readAuthCookie(cookie)?.access ?? null
  }

  function subscribeToken(listener: () => void) {
    const unsubscribeCookie = subscribeAuthCookie(listener)
    const unsubscribeDb = subscribe(["auth", "connected", "disconnected"], listener)
    return () => {
      unsubscribeCookie()
      unsubscribeDb()
    }
  }

  // Cached, so they stay the same object until the token (or the ID) changes.
  let claimsToken: string | null = null
  let claims: TokenClaims | null = null
  let authIdKey: string | undefined
  let authId: RecordId | null = null

  function getTokenClaims() {
    const token = getToken()
    if (token !== claimsToken) {
      claimsToken = token
      claims = token ? tokenClaims(token) : null
    }
    return claims
  }

  function getAuthId() {
    const id = getTokenClaims()?.ID
    if (id !== authIdKey) {
      authIdKey = id
      authId = id ? parseRecordId(id) : null
    }
    return authId
  }

  function getStatus(): ConnectionStatus {
    return db.status
  }

  function subscribeStatus(listener: () => void) {
    return subscribe(["connecting", "connected", "reconnecting", "disconnected"], listener)
  }

  // Only in the browser: server renders stay signed out.
  if (typeof window !== "undefined") {
    connect().catch((error) => console.error("Failed to connect to SurrealDB", error))
  }

  return {
    db,
    cookie,
    connect,
    close,
    ...auth,
    getToken,
    subscribeToken,
    getTokenClaims,
    getAuthId,
    getStatus,
    subscribeStatus
  }
}
