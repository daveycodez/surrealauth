import { Alert } from "@heroui/react"

export type AuthState =
  | { status: "idle" }
  | { status: "success"; user: unknown }
  | { status: "error"; message: string }

export function AuthResult({ state }: { state: AuthState }) {
  if (state.status === "idle") return null

  if (state.status === "error") {
    return (
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>Something went wrong</Alert.Title>
          <Alert.Description>{state.message}</Alert.Description>
        </Alert.Content>
      </Alert>
    )
  }

  return (
    <Alert status="success">
      <Alert.Content>
        <Alert.Title>Signed in as this record user</Alert.Title>
        <Alert.Description>
          <pre className="overflow-x-auto text-xs">{JSON.stringify(state.user, null, 2)}</pre>
        </Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
