import { surrealCollectionOptions } from "@surrealdb/tanstack-db"
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence"
import { collectionOptions } from "@tanstack/react-db"
import { QueryClient } from "@tanstack/react-query"
import { createIsomorphicFn } from "@tanstack/react-start"

import type { Todo, User } from "../types/schema.generated"
import { tables } from "../types/schema.json"
import { persistence } from "./persistence"
import { surreal } from "./surreal"

const queryClient = new QueryClient()

const withPersistence = createIsomorphicFn()
  .server((options: object) => options)
  .client((options: object) =>
    persistedCollectionOptions({
      ...options,
      persistence,
      schemaVersion: 5,
      initialRender: { strategy: "network-first", networkTimeoutMs: 3000 }
    } as never)
  ) as <T extends object>(options: T) => T

export const users = collectionOptions("user", () =>
  withPersistence(
    surrealCollectionOptions<User>({
      id: "user",
      db: surreal.db,
      table: "user",
      tables,
      queryClient,
      queryKey: ["user"],
      syncMode: "on-demand",
      recordIds: "string"
    })
  )
)

export const todos = collectionOptions("todo", () =>
  withPersistence(
    surrealCollectionOptions<Todo>({
      id: "todo",
      db: surreal.db,
      table: "todo",
      tables,
      queryClient,
      queryKey: ["todo"],
      syncMode: "on-demand",
      recordIds: "string"
    })
  )
)
