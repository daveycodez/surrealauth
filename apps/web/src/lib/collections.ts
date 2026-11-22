import { surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { createCollection } from "@tanstack/react-db"
import type { RecordId } from "surrealdb"

import type { User as UserRecord } from "../types/schema.generated"
import { db, queryClient } from "./surreal"

// SurrealKit types record ids as RecordId; with `recordIds: "string"` the adapter
// hands TanStack DB their string form instead (e.g. "user:abc").
type StringId<V> = V extends RecordId ? string : V extends (infer U)[] ? StringId<U>[] : V
type StringIds<T> = { [K in keyof T]: StringId<T[K]> }

export type User = StringIds<UserRecord>

// Realtime (LIVE) TanStack DB collection over the `user` table.
// Table permissions only let a record user see their own row.
export const users = createCollection(
  surrealCollectionOptions<User>({
    db,
    table: { name: "user" },
    queryClient,
    queryKey: ["user"],
    syncMode: "on-demand",
    recordIds: "string"
  })
)
