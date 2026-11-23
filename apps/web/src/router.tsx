import { DbClient, DbProvider } from "@tanstack/react-db"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { createIDBPersister } from "./lib/idb-persister"
import { startOfflineWrites } from "./lib/offline"
import { routeTree } from "./routeTree.gen"

const persister = createIDBPersister()
const persistOptions = {
  persister,
  buster: "cookie-token"
}

export function getRouter() {
  const queryClient = new QueryClient()
  const dbClient = new DbClient()
  startOfflineWrites(dbClient)

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    Wrap: ({ children }) => (
      <DbProvider client={dbClient}>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          {children}
        </PersistQueryClientProvider>
      </DbProvider>
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
