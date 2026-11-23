import { type BrowserContext, expect, type Page, type WebSocketRoute } from "@playwright/test"

import { accountMenu } from "./auth"

// Cuts only the database socket, so pages can still reload while the database is unreachable.
export async function databaseGate(context: BrowserContext) {
  const sockets = new Set<WebSocketRoute>()
  let offline = false

  await context.routeWebSocket(/\/rpc$/, (socket) => {
    if (offline) {
      void socket.close()
      return
    }
    sockets.add(socket)
    socket.onClose(() => sockets.delete(socket))
    socket.connectToServer()
  })

  return {
    async down() {
      offline = true
      await Promise.all([...sockets].map((socket) => socket.close()))
    },
    up() {
      offline = false
    }
  }
}

export async function authCookie(context: BrowserContext) {
  return (await context.cookies()).find(({ name }) => name === "auth")
}

// Rewrites the saved access token as expired, so the next load must spend the refresh token.
export async function expireAccessToken(context: BrowserContext) {
  const cookie = await authCookie(context)
  if (!cookie) throw new Error("No auth cookie")

  const tokens = JSON.parse(decodeURIComponent(cookie.value)) as { access: string }
  const parts = tokens.access.split(".")
  const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString()) as { exp: number }
  claims.exp = Math.floor(Date.now() / 1000) - 5
  parts[1] = Buffer.from(JSON.stringify(claims)).toString("base64url")
  tokens.access = parts.join(".")
  await context.addCookies([{ ...cookie, value: encodeURIComponent(JSON.stringify(tokens)) }])
}

export function todoInput(page: Page, text: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .getByLabel("Todo text")
    .and(page.locator(`input[value="${text}"]`))
}

export async function addTodo(page: Page, text: string) {
  const input = page.getByPlaceholder("What needs doing?")
  await input.fill(text)
  await input.press("Enter")
  await expect(todoInput(page, text)).toBeVisible()
}

export async function openTodos(page: Page) {
  await page.goto("/todos")
  await expect(accountMenu(page)).toBeVisible()
  await expect(page.getByPlaceholder("What needs doing?")).toBeVisible()
}

export async function expectSignedIn(page: Page) {
  await expect(accountMenu(page)).toBeVisible()
  await expect(page.getByText("You are not signed in")).toHaveCount(0)
}
