import { IR } from "@tanstack/db"
import { RecordId, TextCodec } from "surrealdb"

// TanStack DB's SQLite persistence stores a RecordId as its fields and loads it back as a plain
// object, so cached rows have no real ids and queries on a record id (eq(user.id, userId)) never
// match offline. This wraps the persistence adapter: a RecordId is stored as a marked string
// ("" + its text form, e.g. "user:⟨abc⟩"), and marked strings load back as RecordIds.
// Query values are converted the same way, so SQLite compares the strings directly.

// A private-use character, so no ordinary string is mistaken for a record id.
const RECORD_ID_MARK = ""

// IR nodes are class instances; copied with their class so the adapter still recognizes them.
const irClasses = [IR.Value, IR.Func, IR.PropRef, IR.Aggregate]

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function mapObject(value: object, map: (entry: unknown) => unknown) {
  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>
  for (const [key, entry] of Object.entries(value)) copy[key] = map(entry)
  return copy
}

// Into SQLite: rows, transactions and query options (including IR expressions).
function toStored(value: unknown): unknown {
  if (value instanceof RecordId) return RECORD_ID_MARK + value.toString()
  if (Array.isArray(value)) return value.map(toStored)
  if (typeof value !== "object" || value === null) return value
  if (isPlainObject(value) || irClasses.some((irClass) => value instanceof irClass)) {
    return mapObject(value, toStored)
  }
  // Anything else (an AbortSignal, a Date, ...) is passed through as it is.
  return value
}

// Out of SQLite: rows, metadata and replay deltas, which are all plain data.
function fromStored(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(RECORD_ID_MARK)) {
    const parsed = TextCodec.parseValue(value.slice(RECORD_ID_MARK.length))
    return parsed instanceof RecordId ? parsed : value
  }
  if (Array.isArray(value)) return value.map(fromStored)
  if (typeof value === "object" && value !== null && isPlainObject(value)) {
    return mapObject(value, fromStored)
  }
  return value
}

type AnyFunction = (...args: never[]) => unknown
type Adapter = Record<string, unknown>

// Same wrapper for the same adapter, since the persistence layer may compare adapters.
const wrappedAdapters = new WeakMap<object, Adapter>()

function wrapAdapter<T extends object>(adapter: T): T {
  const existing = wrappedAdapters.get(adapter)
  if (existing) return existing as T

  const call = (name: string, ...args: unknown[]) =>
    (Reflect.get(adapter, name) as (...args: unknown[]) => unknown).apply(adapter, args)
  const loaded = async (result: unknown) => fromStored(await result)

  // Methods whose rows or query values need converting. The rest pass through unchanged.
  const overrides: Record<string, AnyFunction> = {
    loadSubset: ((target: unknown, options: unknown, ctx: unknown) =>
      loaded(call("loadSubset", target, toStored(options), ctx))) as AnyFunction,
    scanRows: ((target: unknown, options: unknown, ctx: unknown) =>
      loaded(call("scanRows", target, toStored(options), ctx))) as AnyFunction,
    loadResumeSnapshot: ((...args: unknown[]) =>
      loaded(call("loadResumeSnapshot", ...args))) as AnyFunction,
    loadCollectionMetadata: ((...args: unknown[]) =>
      loaded(call("loadCollectionMetadata", ...args))) as AnyFunction,
    pullSince: ((...args: unknown[]) => loaded(call("pullSince", ...args))) as AnyFunction,
    applyCommittedTx: ((target: unknown, tx: unknown) =>
      call("applyCommittedTx", target, toStored(tx))) as AnyFunction,
    reconcileCommittedTx: ((target: unknown, tx: unknown, anchor: unknown) =>
      loaded(call("reconcileCommittedTx", target, toStored(tx), anchor))) as AnyFunction,
    // Scoped work gets its own adapter, which needs the same conversion.
    runInHydrationScope: ((task: (scoped: object) => Promise<unknown>) =>
      call("runInHydrationScope", (scoped: object) => task(wrapAdapter(scoped)))) as AnyFunction
  }

  const regularScope = Reflect.get(adapter, "runInRegularScope") as
    | (AnyFunction & { afterQueuedWork: () => Promise<void> })
    | undefined
  if (regularScope) {
    overrides.runInRegularScope = Object.assign(
      (task: (scoped: object) => Promise<unknown>) =>
        regularScope.call(adapter, ((scoped: object) => task(wrapAdapter(scoped))) as never),
      { afterQueuedWork: () => regularScope.afterQueuedWork() }
    ) as AnyFunction
  }

  const wrapped = new Proxy(adapter, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      if (typeof value !== "function") return value
      if (typeof property === "string" && property in overrides && value) {
        return overrides[property]
      }
      return value.bind(target)
    }
  })

  wrappedAdapters.set(adapter, wrapped as Adapter)
  return wrapped
}

type Persistence = {
  adapter: object
  resolvePersistenceForCollection?: (...args: never[]) => Persistence
  resolvePersistenceForMode?: (...args: never[]) => Persistence
}

const wrappedPersistences = new WeakMap<object, Persistence>()

// Wraps the persistence's adapter, and the adapters of the per-collection and per-mode
// persistences it resolves.
export function withRecordIds<T extends Persistence>(persistence: T): T {
  const existing = wrappedPersistences.get(persistence)
  if (existing) return existing as T

  const { resolvePersistenceForCollection, resolvePersistenceForMode } = persistence
  const wrapped = {
    ...persistence,
    adapter: wrapAdapter(persistence.adapter),
    ...(resolvePersistenceForCollection && {
      resolvePersistenceForCollection: (...args: never[]) =>
        withRecordIds(resolvePersistenceForCollection.apply(persistence, args))
    }),
    ...(resolvePersistenceForMode && {
      resolvePersistenceForMode: (...args: never[]) =>
        withRecordIds(resolvePersistenceForMode.apply(persistence, args))
    })
  }

  wrappedPersistences.set(persistence, wrapped)
  return wrapped
}
