import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

// App-wide providers. The QueryClient (and its IndexedDB persistence) comes from router.tsx.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}
