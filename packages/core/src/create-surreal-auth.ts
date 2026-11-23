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
  rotatedTokens,
  savedCredentials,
  setupCookieAuth
} from "./lib/cookie-auth"
import { PromptCloseWebSocket } from "./lib/prompt-close-websocket"
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

const CONNECT_TIMEOUT_MS = 5000

// Opens its own connection. Create one per app, and close() it when done (e.g. on hot reload).
export function createSurrealAuth(config: SurrealAuthConfig) {
  const { endpoint, namespace, database, access, options } = config
  const cookie: AuthCookie = { ...DEFAULT_AUTH_COOKIE, ...config.cookie }
  const db = new Surreal({
    codecOptions: { useNativeDates: true },
    websocketImpl: PromptCloseWebSocket
  })

  const cookieAuth = setupCookieAuth(db, { namespace, database, access, cookie }, () => {
    removeAuthCookie(cookie)
    reconnect().catch(() => {})
  })
  const auth = createAuthActions(db, { namespace, database, access, cookie })

  // Signs in from the cookie as part of connecting, so queries sent meanwhile wait for the session
  // instead of running as a guest. A rejected access token falls back to the refresh token, and if
  // every saved credential is rejected, the cookie is forgotten and the client connects as a guest.
  async function connect(): Promise<true> {
    const saved = readAuthCookie(cookie)
    for (const credential of savedCredentials({ namespace, database, access, cookie })) {
      try {
        return await connectWith(credential)
      } catch (error) {
        if (!(error instanceof ServerError)) throw error
      }
    }

    if (saved?.refresh && (await rotatedTokens(cookie, saved.refresh))) return connect()
    if (readAuthCookie(cookie)) removeAuthCookie(cookie)
    return connectWith(null)
  }

  async function connectWith(credential: Credential | null) {
    const connecting = db.connect(endpoint, {
      ...options,
      namespace,
      database,
      // setupCookieAuth renews first, since the SDK's refresh fails on a reconnected socket.
      expiryMargin: 1,
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
      // Waits for the old socket, since its late event would kill the next connection.
      if (error instanceof ServerError) await Promise.all([disconnected(), db.close()])
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

  function withinConnectTimeout<T>(pending: Promise<T>) {
    let timer: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ConnectionUnavailableError()), CONNECT_TIMEOUT_MS)
    })
    return Promise.race([pending, timeout]).finally(() => clearTimeout(timer))
  }

  function whenConnected() {
    if (db.status === "connected") return Promise.resolve()
    if (db.status === "disconnected") return withinConnectTimeout(reconnect())

    let unsubscribe = () => {}
    const connected = new Promise<void>((resolve) => {
      unsubscribe = db.subscribe("connected", () => resolve())
    })
    return withinConnectTimeout(connected).finally(() => unsubscribe())
  }

  // The SDK can report "connected" with no usable socket, so a rejected send also reconnects.
  async function withConnection<T>(action: () => Promise<T>) {
    await whenConnected()
    try {
      return await action()
    } catch (error) {
      if (!(error instanceof ConnectionUnavailableError)) throw error
      await withinConnectTimeout(reconnect())
      return action()
    }
  }

  function login(email: string, password: string) {
    return withConnection(() => auth.login(email, password))
  }

  function register(email: string, password: string) {
    return withConnection(() => auth.register(email, password))
  }

  // Signs out locally when the server can't be reached, since requests would wait for a reconnect.
  async function logout() {
    if (db.status === "connected") {
      const signedOut = await Promise.race([
        auth.logout().then(
          () => true,
          () => false
        ),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
      ])
      if (signedOut) {
        cookieAuth.announceSignOut()
        return
      }
    }

    removeAuthCookie(cookie)
    cookieAuth.announceSignOut()
    reconnect().catch(() => {})
  }

  function close() {
    cookieAuth.stop()
    return db.close()
  }

  function subscribe(events: Parameters<Surreal["subscribe"]>[0][], listener: () => void) {
    const unsubscribes = events.map((event) => db.subscribe(event, listener))
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }

  // The saved token, so it works offline and a local sign-out applies before the socket closes.
  function getToken() {
    return readAuthCookie(cookie)?.access ?? null
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
    logout,
    whenSessionReady: cookieAuth.ready,
    getToken,
    subscribeToken,
    getTokenClaims,
    getAuthId,
    getStatus,
    subscribeStatus
  }
}
