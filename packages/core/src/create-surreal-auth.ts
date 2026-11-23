import {
  ConnectionUnavailableError,
  type ConnectionStatus,
  type ConnectOptions,
  type RecordId,
  ServerError,
  Surreal
} from "surrealdb"

import { createAuthActions } from "./lib/auth-actions"
import {
  type AuthCookie,
  DEFAULT_AUTH_COOKIE,
  readAuthCookie,
  removeAuthCookie,
  subscribeAuthCookie
} from "./lib/cookie"
import {
  type Credential,
  connectAuthentication,
  savedCredentials,
  setupCookieAuth
} from "./lib/cookie-auth"
import { parseRecordId, type TokenClaims, tokenClaims } from "./lib/token-helpers"

export type SurrealAuthConfig = {
  endpoint: string
  namespace: string
  database: string
  // The record access method users sign in with, e.g. "account".
  access: string
  cookie?: Partial<AuthCookie>
  options?: Omit<ConnectOptions, "namespace" | "database" | "authentication">
}

export type SurrealAuth = ReturnType<typeof createSurrealAuth>

// Opens its own connection. Create one per app, and close() it when done (e.g. on hot reload).
export function createSurrealAuth(config: SurrealAuthConfig) {
  const { endpoint, namespace, database, access, options } = config
  const cookie: AuthCookie = { ...DEFAULT_AUTH_COOKIE, ...config.cookie }
  const db = new Surreal({ codecOptions: { useNativeDates: true } })

  const stopCookieAuth = setupCookieAuth(db, { namespace, database, access, cookie })
  const auth = createAuthActions(db, { namespace, database, access, cookie })

  // Signs in from the cookie as part of connecting, so queries sent meanwhile wait for the session
  // instead of running as a guest. A rejected access token falls back to the refresh token, and if
  // every saved credential is rejected, the cookie is forgotten and the client connects as a guest.
  async function connect() {
    for (const credential of savedCredentials({ namespace, database, access, cookie })) {
      try {
        return await connectWith(credential)
      } catch (error) {
        if (!(error instanceof ServerError)) throw error
      }
    }

    if (readAuthCookie(cookie)) removeAuthCookie(cookie)
    return connectWith(null)
  }

  async function connectWith(credential: Credential | null) {
    const connecting = db.connect(endpoint, {
      ...options,
      namespace,
      database,
      authentication: connectAuthentication(credential)
    })
    if (!credential) return connecting

    // When the server rejects the credential, the SDK (2.2.2) publishes an error and then stays
    // "connecting" forever (https://github.com/surrealdb/surrealdb.js/issues/749). So take the
    // error as the rejection, and close to reset the client.
    let unsubscribe = () => {}
    const rejected = new Promise<never>((_, reject) => {
      unsubscribe = db.subscribe("error", (error) => {
        if (error instanceof ServerError) reject(error)
      })
    })

    try {
      return await Promise.race([connecting, rejected])
    } catch (error) {
      if (error instanceof ServerError) await db.close()
      throw error
    } finally {
      unsubscribe()
    }
  }

  let reconnecting: Promise<unknown> | undefined

  function disconnected() {
    return new Promise<void>((resolve) => {
      if (db.status === "disconnected") return resolve()
      const unsubscribe = db.subscribe("disconnected", () => {
        unsubscribe()
        resolve()
      })
    })
  }

  async function reconnect() {
    // close() can return before the old socket closes, and its late event would kill a new connection.
    reconnecting ??= Promise.all([disconnected(), db.close().catch(() => {})])
      .then(() => connect())
      .finally(() => {
        reconnecting = undefined
      })
    await reconnecting
  }

  // The SDK can report "connected" with no usable socket, so a rejected send also reconnects.
  async function withConnection<T>(action: () => Promise<T>) {
    if (db.status === "disconnected") await reconnect()
    try {
      return await action()
    } catch (error) {
      if (!(error instanceof ConnectionUnavailableError)) throw error
      await reconnect()
      return action()
    }
  }

  function login(email: string, password: string) {
    return withConnection(() => auth.login(email, password))
  }

  function register(email: string, password: string) {
    return withConnection(() => auth.register(email, password))
  }

  function close() {
    stopCookieAuth()
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
    login,
    register,
    getToken,
    subscribeToken,
    getTokenClaims,
    getAuthId,
    getStatus,
    subscribeStatus
  }
}
