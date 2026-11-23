import { ServerError } from "surrealdb"
import type { Surreal } from "surrealdb"

import { type AuthCookie, readAuthCookie, removeAuthCookie, setAuthCookie } from "./cookie"
import { isTokenExpired, tokenClaims } from "./token-helpers"

const MAX_RENEWAL_LEAD_MS = 60_000
const RENEWAL_TIMEOUT_MS = 10_000
const SIGNED_OUT = "signed-out"

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
export function connectAuthentication(
  credential: Credential | null | (() => Promise<Credential | null>)
) {
  let used = false
  return () => {
    if (used) return null
    used = true
    return typeof credential === "function" ? credential() : credential
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

// Refresh tokens are single use, so a rejected one may mean another tab just rotated it.
export async function rotatedTokens(cookie: AuthCookie, used: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const saved = readAuthCookie(cookie)
    if (!saved) return undefined
    if (saved.refresh && saved.refresh !== used) return saved
  }
  return undefined
}

// Only one tab at a time may spend the shared refresh token.
function withRenewalLock(name: string, task: () => Promise<void>) {
  const guarded = () =>
    Promise.race([task(), new Promise<void>((resolve) => setTimeout(resolve, RENEWAL_TIMEOUT_MS))])
  if (typeof navigator === "undefined" || !navigator.locks) return guarded()
  return navigator.locks.request(`surrealauth:renew:${name}`, guarded)
}

// Holds the lock across a connect, so a tab loading alongside another reuses its rotated tokens.
export function holdRenewalLock(name: string) {
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const acquired = new Promise<void>((resolve) => {
    void withRenewalLock(name, () => {
      resolve()
      return held
    })
  })
  return { acquired, release }
}

function renewalDelayMs(token: string) {
  const { exp, iat } = tokenClaims(token)
  if (exp === undefined) return undefined
  const expiresAt = exp * 1000
  const lifetime = expiresAt - (iat === undefined ? Date.now() : iat * 1000)
  return Math.max(expiresAt - Math.min(MAX_RENEWAL_LEAD_MS, lifetime / 3) - Date.now(), 0)
}

// Saves the session to the auth cookie on every auth event, renews it with the refresh token before
// the access token expires, and tells other tabs about a sign-out.
export function setupCookieAuth(
  db: Surreal,
  { namespace, database, access, cookie }: CookieAuthConfig,
  onSignedOutElsewhere: () => void
) {
  let currentAccess: string | undefined
  let renewing: Promise<void> | undefined
  let renewOnConnect = false
  let renewalTimer: ReturnType<typeof setTimeout> | undefined

  const channel =
    typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(`surrealauth:${cookie.name}`)
      : undefined

  channel?.addEventListener("message", ({ data }) => {
    if (data !== SIGNED_OUT) return
    clearTimeout(renewalTimer)
    currentAccess = undefined
    onSignedOutElsewhere()
  })

  async function signInWithRefresh(refresh: string): Promise<void> {
    try {
      await db.signin({ namespace, database, access, variables: { refresh } })
    } catch (error) {
      if (!(error instanceof ServerError)) {
        renewOnConnect = true
        return
      }

      const rotated = await rotatedTokens(cookie, refresh)
      if (!rotated?.refresh) {
        removeAuthCookie(cookie)
        return
      }
      await db.authenticate(rotated.access).catch(() => signInWithRefresh(rotated.refresh!))
    }
  }

  async function restoreSession() {
    const saved = readAuthCookie(cookie)
    if (!saved?.refresh) {
      removeAuthCookie(cookie)
      return
    }

    // Another tab already renewed it.
    if (saved.access !== currentAccess && !isTokenExpired(saved.access)) {
      try {
        await db.authenticate(saved.access)
        return
      } catch {}
    }
    await signInWithRefresh(saved.refresh)
  }

  // The SDK replays requests sent while it restores a connection, which would spend the token twice.
  function renew() {
    if (db.status !== "connected") {
      renewOnConnect = true
      return
    }

    renewing ??= withRenewalLock(cookie.name, restoreSession)
      .catch(() => {})
      .finally(() => {
        renewing = undefined
      })
  }

  function scheduleRenewal(token: string) {
    clearTimeout(renewalTimer)
    const delay = renewalDelayMs(token)
    if (delay !== undefined) renewalTimer = setTimeout(renew, delay)
  }

  const stopAuth = db.subscribe("auth", (tokens) => {
    if (tokens) {
      const saved = readAuthCookie(cookie)

      // A renewal that finished after a sign-out must not restore the session.
      if (renewing && !saved) {
        db.invalidate().catch(() => {})
        return
      }

      currentAccess = tokens.access
      scheduleRenewal(tokens.access)

      // The same access token means the cookie's refresh token is the newest one.
      if (saved?.access !== tokens.access) {
        setAuthCookie(
          cookie,
          JSON.stringify({ ...tokens, refresh: tokens.refresh ?? saved?.refresh })
        )
      }
      return
    }

    // Signed out with a refresh token still saved: the access token expired.
    clearTimeout(renewalTimer)
    renew()
  })

  const stopConnected = db.subscribe("connected", () => {
    if (!renewOnConnect) return
    renewOnConnect = false
    renew()
  })

  return {
    ready: () => renewing ?? Promise.resolve(),
    announceSignOut() {
      clearTimeout(renewalTimer)
      channel?.postMessage(SIGNED_OUT)
    },
    stop() {
      clearTimeout(renewalTimer)
      stopAuth()
      stopConnected()
      channel?.close()
    }
  }
}
