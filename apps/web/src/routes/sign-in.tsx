import { Button, Card, Form, Input, Label, TextField } from "@heroui/react"
import { useAuth } from "@surrealauth/react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"

import { AuthError, errorMessage } from "../components/auth-result"

export const Route = createFileRoute("/sign-in")({
  component: SignIn
})

function SignIn() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(undefined)

    try {
      await login(String(form.get("email")), String(form.get("password")))
      await navigate({ to: "/" })
    } catch (error) {
      setError(errorMessage(error))
      setPending(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Sign in</Card.Title>
          <Card.Description>
            Signs in a record user through the <code>user</code> access method.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <TextField isRequired variant="secondary" name="email" type="email">
              <Label>Email</Label>
              <Input placeholder="john.doe@example.com" />
            </TextField>
            <TextField isRequired variant="secondary" name="password" type="password">
              <Label>Password</Label>
              <Input />
            </TextField>
            <Button isPending={pending} type="submit">
              Sign in
            </Button>
          </Form>
          <AuthError message={error} />
        </Card.Content>
        <Card.Footer className="text-sm">
          No account yet?&nbsp;<Link to="/sign-up">Sign up</Link>
        </Card.Footer>
      </Card>
    </main>
  )
}
