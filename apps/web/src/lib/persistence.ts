import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase
} from "@tanstack/browser-db-sqlite-persistence"

import { withRecordIds } from "./record-id-persistence"

// Create once, reuse everywhere (one SQLite database for every persisted collection).
// OPFS only exists in the browser, so the server render (SSR and prerendering) gets none.
const sqlite = import.meta.env.SSR
  ? undefined
  : await openBrowserWASQLiteOPFSDatabase({
      databaseName: "tanstack-db.sqlite"
    })

// withRecordIds: cached rows keep real RecordIds, so queries on record ids work offline.
export const persistence = sqlite
  ? withRecordIds(
      createBrowserWASQLitePersistence({
        database: sqlite
      })
    )
  : undefined
