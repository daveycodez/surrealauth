import {
  type LeaderElection,
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

const LEADER_LOCK = "offline-executor-leader"
const TAB_LOCK = "offline-tab:"
const JOURNAL_LOCK = "offline-journal"
const JOURNAL_PREFIX = "offline-write:"
const RETRY_MS = 2000
const DRAIN_MS = 5000

type SyncParams = Parameters<OfflineConfig["mutationFns"][string]>[0]
type Mutation = SyncParams["transaction"]["mutations"][number]
type JournalMutation = Pick<Mutation, "type" | "key" | "modified" | "changes">
type JournalEntry = { tabId: string; mutations: JournalMutation[] }

const tabId = crypto.randomUUID()
let action: ((mutate: () => void) => Transaction) | undefined
let isLeaderTab = () => false
let journalSequence = 0
let tabWrites: Promise<unknown> = Promise.resolve()

function isRetryable(error: unknown) {
  if (!(error instanceof ServerError) || error instanceof InternalError) return true
  if (!(error instanceof NotAllowedError)) return false
  const authKind = (error.details as { details?: { kind?: string } } | undefined)?.details?.kind
  return error.isTokenExpired || authKind === "SessionExpired"
}

async function sendMutations(mutations: Mutation[], transaction?: SyncParams["transaction"]) {
  for (const mutation of mutations) {
    // Until the session is restored, a write would run as a guest and be rejected for good.
    if (surreal.getStatus() !== "connected") throw new Error("Waiting for connection")
    await surreal.whenSessionReady()

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

function serializeEntry(entry: JournalEntry) {
  return JSON.stringify(entry, function (this: Record<string, unknown>, key, value) {
    const raw = this[key]
    return raw instanceof Date ? { $date: raw.toISOString() } : value
  })
}

function parseEntry(value: string) {
  return JSON.parse(value, (_key, item) =>
    item && typeof item === "object" && typeof item.$date === "string" ? new Date(item.$date) : item
  ) as JournalEntry
}

function addToJournal(mutations: Mutation[]) {
  const order = `${String(Date.now()).padStart(15, "0")}-${String(journalSequence++).padStart(6, "0")}`
  const key = `${JOURNAL_PREFIX}${order}-${crypto.randomUUID()}`
  const entry: JournalEntry = {
    tabId,
    mutations: mutations.map(({ type, key, modified, changes }) => ({
      type,
      key,
      modified,
      changes
    }))
  }
  localStorage.setItem(key, serializeEntry(entry))
  return key
}

// Keeps a non-leader tab's write until it lands, and in the journal in case the tab closes first.
async function sendFromTab(mutations: Mutation[], transaction: SyncParams["transaction"]) {
  const journalKey = addToJournal(mutations)
  try {
    for (;;) {
      try {
        await sendMutations(mutations, transaction)
        return
      } catch (error) {
        if (error instanceof NonRetriableError) throw error
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
      }
    }
  } finally {
    localStorage.removeItem(journalKey)
  }
}

const syncMutations: OfflineConfig["mutationFns"][string] = async ({ transaction }) => {
  if (isLeaderTab()) return sendMutations(transaction.mutations, transaction)

  const write = tabWrites.then(() => sendFromTab(transaction.mutations, transaction))
  tabWrites = write.catch(() => {})
  return write
}

async function drainJournal(collection: Mutation["collection"]) {
  if (surreal.getStatus() !== "connected") return

  await navigator.locks.request(JOURNAL_LOCK, { ifAvailable: true }, async (lock) => {
    if (!lock) return

    const { held = [] } = await navigator.locks.query()
    const liveLocks = new Set(held.map(({ name }) => name))
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(JOURNAL_PREFIX))
      .sort()

    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (!value) continue
      const entry = parseEntry(value)
      if (liveLocks.has(`${TAB_LOCK}${entry.tabId}`)) continue

      try {
        await sendMutations(
          entry.mutations.map((mutation) => ({ ...mutation, collection }) as Mutation)
        )
        localStorage.removeItem(key)
      } catch (error) {
        if (!(error instanceof NonRetriableError)) return
        console.error("Write failed", error)
        localStorage.removeItem(key)
      }
    }
  })
}

// The library's Web Locks leader never takes over when the leader tab closes, so this one queues.
function createFailoverLeader(): LeaderElection {
  let leader = false
  let requested = false
  let release = () => {}
  const listeners = new Set<(isLeader: boolean) => void>()

  function hold() {
    return new Promise<void>((done) => {
      release = done
    })
  }

  return {
    requestLeadership() {
      if (requested) return Promise.resolve(leader)
      requested = true

      return new Promise((resolve) => {
        void navigator.locks.request(LEADER_LOCK, { ifAvailable: true }, (lock) => {
          if (lock) {
            leader = true
            resolve(true)
            return hold()
          }

          resolve(false)
          void navigator.locks.request(LEADER_LOCK, () => {
            leader = true
            listeners.forEach((listener) => listener(true))
            return hold()
          })
          return undefined
        })
      })
    },
    releaseLeadership() {
      release()
      requested = false
      if (!leader) return
      leader = false
      listeners.forEach((listener) => listener(false))
    },
    isLeader: () => leader,
    onLeadershipChange(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    }
  }
}

export const startOfflineWrites = createIsomorphicFn().client((dbClient: DbClient) => {
  if (action) return

  const collection = dbClient.collection(todos)
  void navigator.locks.request(`${TAB_LOCK}${tabId}`, () => new Promise(() => {}))

  const executor = startOfflineExecutor({
    collections: { todo: collection },
    mutationFns: { sync: syncMutations },
    leaderElection: createFailoverLeader()
  })
  isLeaderTab = () => executor.isOfflineEnabled
  action = executor.createOfflineAction<() => void>({
    mutationFnName: "sync",
    onMutate: (mutate) => mutate()
  })

  const journalCollection = collection as unknown as Mutation["collection"]
  surreal.subscribeStatus(() => {
    if (surreal.getStatus() !== "connected") return
    executor.getOnlineDetector().notifyOnline()
    void drainJournal(journalCollection)
  })
  setInterval(() => void drainJournal(journalCollection), DRAIN_MS)
})

export function offlineWrite(mutate: () => void) {
  if (!action) throw new Error("Offline writes have not started")
  action(mutate)
    .when("settled")
    .catch((error: unknown) => console.error("Write failed", error))
}
