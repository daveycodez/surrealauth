import { Card } from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"

import { ThemeSwitcher } from "../components/theme-switcher"

export const Route = createFileRoute("/")({
  component: Home
})

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>SurrealAuth</Card.Title>
          <Card.Description>
            A barebones TanStack Start app exploring SurrealDB&apos;s built-in auth.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <ThemeSwitcher />
        </Card.Footer>
      </Card>
    </main>
  )
}
