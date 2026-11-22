import { Card, Skeleton } from "@heroui/react"
import { createFileRoute, Link, useHydrated } from "@tanstack/react-router"

import { useUser } from "../hooks/use-user"

export const Route = createFileRoute("/todos")({
  component: Todos
})

function Todos() {
  const hydrated = useHydrated()
  const { data: user, isLoading } = useUser()

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Todos</Card.Title>
          <Card.Description>Placeholder page.</Card.Description>
        </Card.Header>
        <Card.Content className="text-sm">
          {(!hydrated || isLoading) && !user ? (
            <Skeleton className="h-5 w-48 rounded-md" />
          ) : user ? (
            <p>
              You are signed in as <strong>{user.name ?? user.email}</strong>
              {user.name ? ` (${user.email})` : ""}.
            </p>
          ) : (
            <p>
              You are not signed in. <Link to="/sign-in">Sign in</Link>
            </p>
          )}
        </Card.Content>
      </Card>
    </main>
  )
}
