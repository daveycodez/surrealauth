import { persistedSurrealCollectionOptions, surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"
import { QueryClient } from "@tanstack/react-query"

import type { User } from "../types/schema.generated"
import { db } from "./db"
import { persistence } from "./persistence"

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

// schemaVersion 2: password stopped being selectable, so rows cached with it are dropped.
// Realtime (LIVE) TanStack DB collection over the `user` table, persisted to SQLite (OPFS)
// in the browser. Table permissions only let a record user see their own row.
export const users = createCollection(
  persistence
    ? persistedSurrealCollectionOptions<User>({ persistence, schemaVersion: 2, ...userOptions })
    : surrealCollectionOptions<User>(userOptions)
)
