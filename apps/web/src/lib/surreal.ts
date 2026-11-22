import { createSurrealAuth } from "@surrealauth/react"

// The app's SurrealDB client and auth hooks. The TanStack DB collections use the same client, so
// they share one connection.
export const { db, login, register, logout, useAuthId, useConnection, useToken, useTokenClaims } =
  createSurrealAuth({
    endpoint: import.meta.env.VITE_SURREAL_URL,
    namespace: "main",
    database: "main",
    access: "account"
  })
