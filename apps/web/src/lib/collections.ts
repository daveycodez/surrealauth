import { persistedSurrealCollectionOptions, surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"
import { QueryClient } from "@tanstack/react-query"

import type { User } from "../types/schema.generated"
import { persistence } from "./persistence"
import { db } from "./surreal-provider"

export type { User }

export const queryClient = new QueryClient()

const userOptions = {
  db,
  table: { name: "user" },
  queryClient,
  queryKey: ["user"],
  syncMode: "on-demand"
} as const

// Realtime (LIVE) TanStack DB collection over the `user` table, persisted to SQLite (OPFS)
// in the browser. Table permissions only let a record user see their own row.
export const users = createCollection(
  persistence
    ? persistedSurrealCollectionOptions<User>({ persistence, schemaVersion: 1, ...userOptions })
    : surrealCollectionOptions<User>(userOptions)
)
