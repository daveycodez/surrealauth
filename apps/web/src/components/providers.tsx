import { SurrealProvider } from "@surrealauth/react"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { db } from "../lib/db"

// App-wide providers. The QueryClient (and its IndexedDB persistence) comes from router.tsx.
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
