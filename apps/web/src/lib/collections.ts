import { surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"

import type { User } from "../types/schema.generated"
import { db, queryClient } from "./surreal"

export type { User }

// Realtime (LIVE) TanStack DB collection over the `user` table.
// Table permissions only let a record user see their own row.
export const users = createCollection(
  surrealCollectionOptions<User>({
    db,
    table: { name: "user" },
    queryClient,
    queryKey: ["user"],
    syncMode: "on-demand"
  })
)
