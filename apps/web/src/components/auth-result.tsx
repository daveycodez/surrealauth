import { Alert } from "@heroui/react"

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

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
