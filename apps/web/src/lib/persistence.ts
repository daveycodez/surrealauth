import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase
} from "@tanstack/browser-db-sqlite-persistence"

// Create once, reuse everywhere (one SQLite database for every persisted collection).
// OPFS only exists in the browser, so the server render (SSR and prerendering) gets none.
const sqlite = import.meta.env.SSR
  ? undefined
  : await openBrowserWASQLiteOPFSDatabase({
      databaseName: "tanstack-db.sqlite"
    })

export const persistence = sqlite
  ? createBrowserWASQLitePersistence({
      database: sqlite
    })
  : undefined
