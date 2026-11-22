import { Surreal } from "surrealdb"

// Public connection details for the surrealauth SurrealDB Earth instance.
export const SURREAL_URL = "wss://06h01ki929o216lckkdmj1d92c.surrealdb.earth/rpc"
export const NAMESPACE = "main"
export const DATABASE = "main"

let connection: Promise<Surreal> | undefined

// One shared browser connection, opened on first use.
export function getDb() {
  connection ??= (async () => {
    const db = new Surreal()
    await db.connect(SURREAL_URL, {
      namespace: NAMESPACE,
      database: DATABASE
    })
    return db
  })()

  return connection
}
