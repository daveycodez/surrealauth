import { Surreal } from "surrealdb"

// The app's SurrealDB client. <SurrealProvider client={db}> connects it, and the TanStack DB
// collections use the same instance, so they share one connection.
export const db = new Surreal()
