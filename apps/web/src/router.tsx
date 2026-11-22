import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { createIDBPersister } from "./lib/idb-persister"
import { routeTree } from "./routeTree.gen"

// Saves the app-wide QueryClient to IndexedDB. The session lives in the auth cookie
// (@surrealauth/react). TanStack DB collections use their own QueryClient and persist to SQLite.
const persister = createIDBPersister()
const persistOptions = {
  persister,
  // Bumped when the token moved to the cookie, discarding caches that still hold it.
  buster: "cookie-token"
}

export function getRouter() {
  // The app-wide QueryClient (useQuery). TanStack DB collections use their own.
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    Wrap: ({ children }) => (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    )
  })
  setupRouterSsrQueryIntegration({
    router,
    queryClient
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
