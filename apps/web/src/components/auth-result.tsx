import { Alert } from "@heroui/react"
import { ConnectionUnavailableError, ServerError, UnexpectedConnectionError } from "surrealdb"

export function AuthError({ message }: { message: string | undefined }) {
  if (!message) return null

  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Title>Something went wrong</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

// The server's auth errors are generic, so each form supplies its own message.
export function errorMessage(error: unknown, rejected: string) {
  if (error instanceof ServerError) return rejected
  if (error instanceof ConnectionUnavailableError || error instanceof UnexpectedConnectionError) {
    return "Can't reach the server. Check your connection and try again."
  }
  return error instanceof Error ? error.message : String(error)
}
