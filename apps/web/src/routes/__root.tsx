import { QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { Header } from "../components/header"
import { useAuthSubscription } from "../hooks/use-auth-subscription"
import { queryClient } from "../lib/collections"
import { db, SurrealProvider } from "../lib/surreal-provider"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SurrealAuth" }
    ],
    links: [{ rel: "stylesheet", href: appCss }]
  }),
  shellComponent: RootDocument
})

function RootDocument({ children }: { children: ReactNode }) {
  useAuthSubscription()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <SurrealProvider
              client={db}
              endpoint={import.meta.env.VITE_SURREAL_URL}
              params={{ namespace: "main", database: "main" }}
            >
              <div className="flex min-h-screen flex-col">
                <Header />
                {children}
              </div>
            </SurrealProvider>
          </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
