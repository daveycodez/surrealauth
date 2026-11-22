import { Button, Card, Form, Input, Label, TextField } from "@heroui/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"

import { AuthResult, type AuthState, errorMessage } from "../components/auth-result"
import { DATABASE, getDb, NAMESPACE } from "../lib/surreal"

export const Route = createFileRoute("/sign-up")({
  component: SignUp
})

function SignUp() {
  const [state, setState] = useState<AuthState>({ status: "idle" })
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      const db = await getDb()

      // https://surrealdb.com/docs/learn/security/authentication/users#sign-up-as-a-user-record
      await db.signup({
        namespace: NAMESPACE,
        database: DATABASE,

        // Provide the name of the access method
        access: "user",

        // Provide the variables used by the signup query
        variables: {
          name: String(form.get("name")),
          email: String(form.get("email")),
          password: String(form.get("password"))
        }
      })

      setState({ status: "success", user: await db.auth() })
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Sign up</Card.Title>
          <Card.Description>
            Creates a record user through the <code>user</code> access method.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <TextField isRequired variant="secondary" name="name">
              <Label>Name</Label>
              <Input placeholder="John Doe" />
            </TextField>
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
          <AuthResult state={state} />
        </Card.Content>
        <Card.Footer className="text-sm">
          Already have an account?&nbsp;<Link to="/sign-in">Sign in</Link>
        </Card.Footer>
      </Card>
    </main>
  )
}
