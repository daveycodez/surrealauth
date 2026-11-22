import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import type { RecordId } from "surrealdb"

import { DATABASE, getDb, NAMESPACE } from "./surreal"

export interface User {
  id: RecordId
  name: string
  email: string
}

type AuthStatus = "loading" | "signed-in" | "signed-out"

interface AuthContextValue {
  status: AuthStatus
  user: User | undefined
  signIn: (variables: { email: string; password: string }) => Promise<void>
  signUp: (variables: { name: string; email: string; password: string }) => Promise<void>
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
  const [user, setUser] = useState<User>()

  const loadUser = useCallback(async () => {
    const db = await getDb()
    const record = await db.auth<User>()
    setUser(record ?? undefined)
    setStatus(record ? "signed-in" : "signed-out")
  }, [])

  // Restore a saved session on first load.
  useEffect(() => {
    async function restore() {
      try {
        const db = await getDb()
        const token = readToken()
        if (!token) throw new Error("No saved session")

        await db.authenticate(token)
        await loadUser()
      } catch {
        writeToken(null)
        setUser(undefined)
        setStatus("signed-out")
      }
    }

    void restore()
  }, [loadUser])

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (variables) => {
      const db = await getDb()

      // https://surrealdb.com/docs/learn/security/authentication/users#sign-in-as-a-record-user
      const tokens = await db.signin({
        namespace: NAMESPACE,
        database: DATABASE,

        // Provide the name of the access method
        access: "user",

        // Provide the variables used by the signin query
        variables
      })

      writeToken(tokens.access)
      await loadUser()
    },
    [loadUser]
  )

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (variables) => {
      const db = await getDb()

      // https://surrealdb.com/docs/learn/security/authentication/users#sign-up-as-a-user-record
      const tokens = await db.signup({
        namespace: NAMESPACE,
        database: DATABASE,

        // Provide the name of the access method
        access: "user",

        // Provide the variables used by the signup query
        variables
      })

      writeToken(tokens.access)
      await loadUser()
    },
    [loadUser]
  )

  const signOut = useCallback(async () => {
    const db = await getDb()
    await db.invalidate()
    writeToken(null)
    setUser(undefined)
    setStatus("signed-out")
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
