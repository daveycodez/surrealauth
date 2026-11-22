import { eq, useLiveQuery } from "@tanstack/react-db"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import type { RecordId } from "surrealdb"

import { type User, users } from "./collections"
import { connect, DATABASE, NAMESPACE, queryClient } from "./surreal"

type AuthStatus = "loading" | "signed-in" | "signed-out"

interface AuthContextValue {
  status: AuthStatus
  userId: string | undefined
  signIn: (variables: { email: string; pass: string }) => Promise<void>
  signUp: (variables: { email: string; pass: string }) => Promise<void>
  signOut: () => Promise<void>
}

const TOKEN_KEY = "surrealauth.token"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for the tab only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [userId, setUserId] = useState<string>()

  // The session only tells us who is signed in; the user's data comes from TanStack DB.
  const loadUserId = useCallback(async () => {
    const db = await connect()
    const record = await db.auth<{ id: RecordId<"users"> }>()
    // Same string form the adapter uses for record ids in `recordIds: "string"` mode.
    setUserId(record ? String(record.id) : undefined)
    setStatus(record ? "signed-in" : "signed-out")
  }, [])

  // Restore a saved session on first load.
  useEffect(() => {
    async function restore() {
      try {
        const db = await connect()
        const token = readToken()
        if (!token) throw new Error("No saved session")

        await db.authenticate(token)
        await loadUserId()
      } catch {
        writeToken(null)
        setUserId(undefined)
        setStatus("signed-out")
      }
    }

    void restore()
  }, [loadUserId])

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (variables) => {
      const db = await connect()

      // https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
      const tokens = await db.signin({
        namespace: NAMESPACE,
        database: DATABASE,

        // Provide the name of the access method
        access: "account",

        // Provide the variables used by the signin query
        variables
      })

      writeToken(tokens.access)
      await loadUserId()
    },
    [loadUserId]
  )

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (variables) => {
      const db = await connect()

      // https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
      const tokens = await db.signup({
        namespace: NAMESPACE,
        database: DATABASE,

        // Provide the name of the access method
        access: "account",

        // Provide the variables used by the signup query
        variables
      })

      writeToken(tokens.access)
      await loadUserId()
    },
    [loadUserId]
  )

  const signOut = useCallback(async () => {
    const db = await connect()
    await db.invalidate()
    writeToken(null)
    setUserId(undefined)
    setStatus("signed-out")

    // Stop the user's live sync and drop their cached rows so the next sign-in starts fresh.
    await users.cleanup({ dependents: true })
    queryClient.removeQueries({ queryKey: ["users"] })
  }, [])

  return (
    <AuthContext.Provider value={{ status, userId, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}

// The signed-in user, live from TanStack DB: updates as soon as the record changes.
export function useCurrentUser() {
  const { status, userId } = useAuth()

  const { data: user, isReady } = useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId))
        .findOne()
    }
  })

  return {
    status: status === "signed-in" && !isReady ? ("loading" as const) : status,
    user: user as User | undefined
  }
}
