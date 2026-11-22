import { Button, Card, Form, Input, Label, TextField } from "@heroui/react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"

import { AuthError, errorMessage } from "../components/auth-result"
import { useAuth } from "../hooks/use-auth"

export const Route = createFileRoute("/sign-up")({
  component: SignUp
})

function SignUp() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(undefined)

    try {
      await register(String(form.get("email")), String(form.get("password")))
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
          <Card.Title>Sign up</Card.Title>
          <Card.Description>
            Creates a record user through the <code>user</code> access method.
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
              Sign up
            </Button>
          </Form>
          <AuthError message={error} />
        </Card.Content>
        <Card.Footer className="text-sm">
          Already have an account?&nbsp;<Link to="/sign-in">Sign in</Link>
        </Card.Footer>
      </Card>
    </main>
  )
}
