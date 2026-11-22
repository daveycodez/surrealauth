import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence"
import { surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"
import { QueryClient } from "@tanstack/react-query"

import type { User } from "../types/schema.generated"
import { persistence } from "./persistence"
import { db } from "./surreal"

export type { User }

// TanStack DB collections get their own QueryClient, separate from the app-wide one in router.tsx.
const queryClient = new QueryClient()

const userOptions = {
  db,
  table: { name: "user" },
  queryClient,
  queryKey: ["user"],
  syncMode: "on-demand"
} as const

// Realtime (LIVE) TanStack DB collection over the `user` table, persisted to SQLite (OPFS)
// in the browser. Table permissions only let a record user see their own row.
// schemaVersion 4: drops rows cached before record ids were stored as strings (2: with password).
// initialRender: a query the cache already covers waits at most networkTimeoutMs for the server,
// then shows the cached rows, so it doesn't load forever while offline. (We call
// persistedCollectionOptions ourselves: persistedSurrealCollectionOptions drops initialRender.)
export const users = createCollection(
  persistence
    ? persistedCollectionOptions({
        ...surrealCollectionOptions<User>(userOptions),
        persistence,
        schemaVersion: 4,
        initialRender: { strategy: "network-first", networkTimeoutMs: 3000 }
      })
    : surrealCollectionOptions<User>(userOptions)
)
