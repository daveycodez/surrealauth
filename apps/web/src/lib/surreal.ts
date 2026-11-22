import { QueryClient } from "@tanstack/react-query"
import { Surreal } from "surrealdb"

// Public connection details for the surrealauth SurrealDB Earth instance.
export const SURREAL_URL = "wss://06h01ki929o216lckkdmj1d92c.surrealdb.earth/rpc"
export const NAMESPACE = "main"
export const DATABASE = "main"

// Module-level client and query client, as in @surrealdb/tanstack-db's examples.
// The same `db` instance is handed to <SurrealProvider client={db}>, which connects it,
// so the TanStack DB collections and useSurrealClient() share one connection.
export const db = new Surreal()
export const queryClient = new QueryClient()
