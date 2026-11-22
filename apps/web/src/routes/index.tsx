import { Card } from "@heroui/react"
import { createFileRoute, Link } from "@tanstack/react-router"

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
        <Card.Content className="flex gap-4 text-sm">
          <Link to="/sign-up">Sign up</Link>
          <Link to="/sign-in">Sign in</Link>
        </Card.Content>
        <Card.Footer>
          <ThemeSwitcher />
        </Card.Footer>
      </Card>
    </main>
  )
}
