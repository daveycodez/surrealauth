import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { db, SurrealProvider } from "../lib/surreal-provider"

// App-wide providers. The QueryClientProvider comes from setupRouterSsrQueryIntegration (router.tsx).
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SurrealProvider
        client={db}
        endpoint={import.meta.env.VITE_SURREAL_URL}
        params={{ namespace: "main", database: "main" }}
      >
        {children}
      </SurrealProvider>
    </ThemeProvider>
  )
}
