import {
  Button,
  Card,
  Checkbox,
  CloseButton,
  Form,
  Input,
  Skeleton,
  TextField
} from "@heroui/react"
import { eq, useDbClient, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Link, useHydrated } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { RecordId } from "surrealdb"

import { useUser } from "../hooks/use-user"
import { todos } from "../lib/collections"
import { offlineWrite } from "../lib/offline"

export const Route = createFileRoute("/todos")({
  component: Todos
})

function Todos() {
  const hydrated = useHydrated()
  const { data: user, isLoading } = useUser()

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <Card className="w-full max-w-xl">
        <Card.Header>
          <Card.Title>Todos</Card.Title>
          <Card.Description>Only you can see and edit your todos.</Card.Description>
        </Card.Header>
        <Card.Content className="text-sm">
          {(!hydrated || isLoading) && !user ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : user ? (
            <TodoList userId={user.id} />
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

function TodoList({ userId }: { userId: string }) {
  const todosCollection = useDbClient().collection(todos)
  const { data, isLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ todo: todos })
        .where(({ todo }) => eq(todo.userId, userId))
        .orderBy(({ todo }) => todo.createdAt, "asc")
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const text = String(new FormData(form).get("text")).trim()
    if (!text) return

    const now = new Date()
    const id = new RecordId("todo", crypto.randomUUID()).toString()
    offlineWrite(() =>
      todosCollection.insert({ id, text, completed: false, userId, createdAt: now, updatedAt: now })
    )
    form.reset()
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex items-center gap-2" onSubmit={onSubmit}>
        <TextField aria-label="New todo" className="flex-1" name="text" variant="secondary">
          <Input placeholder="What needs doing?" />
        </TextField>
        <Button size="sm" type="submit">
          Add
        </Button>
      </Form>

      {isLoading && !data.length ? (
        <Skeleton className="h-10 w-full rounded-md" />
      ) : data.length ? (
        <ul className="flex flex-col gap-2">
          {data.map((todo) => (
            <li key={todo.id} className="flex items-center gap-2">
              <Checkbox
                aria-label={`Complete ${todo.text}`}
                isSelected={todo.completed}
                variant="secondary"
                onChange={(completed) =>
                  offlineWrite(() =>
                    todosCollection.update(todo.id, (draft) => {
                      draft.completed = completed
                    })
                  )
                }
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
              <TodoText
                key={todo.text}
                completed={todo.completed}
                text={todo.text}
                onSave={(text) =>
                  offlineWrite(() =>
                    todosCollection.update(todo.id, (draft) => {
                      draft.text = text
                    })
                  )
                }
              />
              <CloseButton
                aria-label={`Delete ${todo.text}`}
                onPress={() => offlineWrite(() => todosCollection.delete(todo.id))}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No todos yet.</p>
      )}
    </div>
  )
}

function TodoText({
  completed,
  text,
  onSave
}: {
  completed: boolean
  text: string
  onSave: (text: string) => void
}) {
  const [value, setValue] = useState(text)

  function save() {
    const trimmed = value.trim()
    if (!trimmed) setValue(text)
    else if (trimmed !== text) onSave(trimmed)
  }

  return (
    <TextField
      aria-label="Todo text"
      className="flex-1"
      value={value}
      variant="secondary"
      onChange={setValue}
    >
      <Input
        className={completed ? "text-muted" : undefined}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
      />
    </TextField>
  )
}
