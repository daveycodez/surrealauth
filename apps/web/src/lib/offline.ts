import {
  NonRetriableError,
  type OfflineConfig,
  startOfflineExecutor
} from "@tanstack/offline-transactions"
import type { DbClient, Transaction } from "@tanstack/react-db"
import { createIsomorphicFn } from "@tanstack/react-start"
import { AlreadyExistsError, InternalError, NotAllowedError, ServerError } from "surrealdb"

import { todos } from "./collections"
import { surreal } from "./surreal"

const handlers = { insert: "onInsert", update: "onUpdate", delete: "onDelete" } as const

let action: ((mutate: () => void) => Transaction) | undefined

function isRetryable(error: unknown) {
  if (!(error instanceof ServerError) || error instanceof InternalError) return true
  return error instanceof NotAllowedError && error.isTokenExpired
}

const syncMutations: OfflineConfig["mutationFns"][string] = async ({ transaction }) => {
  for (const mutation of transaction.mutations) {
    const authId = surreal.getAuthId()?.toString()
    if (!authId) throw new Error("Waiting for sign-in")

    const owner = (mutation.modified as { userId?: string }).userId
    if (owner && owner !== authId) throw new NonRetriableError("Write belongs to another user")

    const handler = mutation.collection.config[handlers[mutation.type as keyof typeof handlers]]
    try {
      await handler?.({
        transaction: { ...transaction, mutations: [mutation] },
        collection: mutation.collection
      } as never)
    } catch (error) {
      // A replayed insert the server already applied.
      if (mutation.type === "insert" && error instanceof AlreadyExistsError) continue
      if (isRetryable(error)) throw error
      throw new NonRetriableError(error instanceof Error ? error.message : String(error))
    }
  }
}

export const startOfflineWrites = createIsomorphicFn().client((dbClient: DbClient) => {
  if (action) return

  const executor = startOfflineExecutor({
    collections: { todo: dbClient.collection(todos) },
    mutationFns: { sync: syncMutations }
  })
  action = executor.createOfflineAction<() => void>({
    mutationFnName: "sync",
    onMutate: (mutate) => mutate()
  })
})

export function offlineWrite(mutate: () => void) {
  if (!action) throw new Error("Offline writes have not started")
  action(mutate)
    .when("settled")
    .catch((error: unknown) => console.error("Write failed", error))
}
