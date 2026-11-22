import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { createIDBPersister } from "./lib/idb-persister"
import { routeTree } from "./routeTree.gen"

// Saves the app-wide QueryClient to IndexedDB. TanStack DB collections use their own
// QueryClient and persist to SQLite instead.
const persister = createIDBPersister()

export function getRouter() {
  // The app-wide QueryClient (useQuery, useToken). TanStack DB collections use their own.
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    Wrap: ({ children }) => (
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
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
