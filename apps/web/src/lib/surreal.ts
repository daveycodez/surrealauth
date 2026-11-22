import { QueryClient } from "@tanstack/react-query"
import { Surreal } from "surrealdb"

// Public connection details for the surrealauth SurrealDB Earth instance.
export const SURREAL_URL = "wss://06h01ki929o216lckkdmj1d92c.surrealdb.earth/rpc"
export const NAMESPACE = "main"
export const DATABASE = "main"

// Module-level client and query client, as in @surrealdb/tanstack-db's examples.
export const db = new Surreal()
export const queryClient = new QueryClient()

let connection: Promise<Surreal> | undefined

// Opens the shared connection once, in the browser, on first use.
export function connect() {
  connection ??= db
    .connect(SURREAL_URL, { namespace: NAMESPACE, database: DATABASE })
    .then(() => db)

  return connection
}
