import { createSurrealAuth } from "@surrealauth/react"

// The app's SurrealDB client and auth hooks. The TanStack DB collections use the same client, so
// they share one connection.
const auth = createSurrealAuth({
  endpoint: import.meta.env.VITE_SURREAL_URL,
  namespace: "main",
  database: "main",
  access: "account"
})

export const { db, login, register, logout, useAuthId, useConnection, useToken, useTokenClaims } =
  auth

// The collections and mounted hooks hold this client, so it can't be swapped in place. On a change
// here (or in @surrealauth/*), close the old connection and reload the page instead.
import.meta.hot?.dispose(() => auth.close())
import.meta.hot?.accept(() => window.location.reload())
