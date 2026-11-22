import { surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"

import { db, queryClient } from "./surreal"

export type User = {
  // Record ids are plain strings in TanStack DB (`recordIds: "string"`), e.g. "users:abc".
  id: string
  name?: string
  email: string
}

// Realtime (LIVE) TanStack DB collection over the `users` table.
// Table permissions only let a record user see their own row.
export const users = createCollection(
  surrealCollectionOptions<User>({
    db,
    table: { name: "users" },
    queryClient,
    queryKey: ["users"],
    syncMode: "on-demand",
    recordIds: "string"
  })
)
