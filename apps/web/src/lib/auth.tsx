import { eq, useLiveQuery } from "@tanstack/react-db"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import type { RecordId } from "surrealdb"

import { users } from "./collections"
import { DATABASE, NAMESPACE, queryClient } from "./surreal"
import { useSurreal } from "./surreal-provider"

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
  // The same `db` instance the TanStack DB collections use, connected by <SurrealProvider client={db}>.
  const { client, isSuccess, isError } = useSurreal()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [userId, setUserId] = useState<string>()

  // The session only tells us who is signed in; the user's data comes from TanStack DB.
  const loadUserId = useCallback(async () => {
    const record = await client.auth<{ id: RecordId<"users"> }>()
    // Same string form the adapter uses for record ids in `recordIds: "string"` mode.
    setUserId(record ? String(record.id) : undefined)
    setStatus(record ? "signed-in" : "signed-out")
  }, [client])

  // Restore a saved session once SurrealProvider has connected.
  useEffect(() => {
    if (!isSuccess) return

    async function restore() {
      try {
        const token = readToken()
        if (!token) throw new Error("No saved session")

        await client.authenticate(token)
        await loadUserId()
      } catch {
        writeToken(null)
        setUserId(undefined)
        setStatus("signed-out")
      }
    }

    void restore()
  }, [isSuccess, client, loadUserId])

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (variables) => {
      // https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
      const tokens = await client.signin({
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
    [client, loadUserId]
  )

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (variables) => {
      // https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
      const tokens = await client.signup({
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
    [client, loadUserId]
  )

  const signOut = useCallback(async () => {
    await client.invalidate()
    writeToken(null)
    setUserId(undefined)
    setStatus("signed-out")

    // Stop the user's live sync and drop their cached rows so the next sign-in starts fresh.
    await users.cleanup({ dependents: true })
    queryClient.removeQueries({ queryKey: ["users"] })
  }, [client])

  // If the connection fails, nobody can be signed in.
  const currentStatus: AuthStatus = isError && status === "loading" ? "signed-out" : status

  return (
    <AuthContext.Provider value={{ status: currentStatus, userId, signIn, signUp, signOut }}>
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
// Disabled (status "disabled", data undefined) while nobody is signed in.
export function useUser() {
  const { userId } = useAuth()

  return useLiveQuery({
    query: (q) => {
      if (!userId) return undefined
      return q
        .from({ user: users })
        .where(({ user }) => eq(user.id, userId))
        .findOne()
    }
  })
}
