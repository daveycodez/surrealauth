import { createSurrealAuth } from "@surrealauth/react"

export const surreal = createSurrealAuth({
  endpoint: import.meta.env.VITE_SURREAL_URL,
  namespace: "main",
  database: "main",
  access: "account"
})
