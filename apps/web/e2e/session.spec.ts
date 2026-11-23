import { expect, test } from "@playwright/test"

import { accountMenu, headerSignIn, password, signIn, signUp, uniqueEmail } from "./support/auth"
import {
  addTodo,
  authCookie,
  databaseGate,
  expectSignedIn,
  expireAccessToken,
  openTodos,
  todoInput
} from "./support/session"

test.describe("sessions @db", () => {
  test("keeps the session through a reconnect", async ({ context, page }) => {
    const gate = await databaseGate(context)
    await signUp(page)
    await openTodos(page)

    await gate.down()
    await page.waitForTimeout(1500)
    gate.up()
    await page.waitForTimeout(6000)

    expect(await authCookie(context)).toBeDefined()
    await expectSignedIn(page)
    await page.reload()
    await expectSignedIn(page)
  })

  test("keeps the session when the token expires during an outage", async ({ context, page }) => {
    const gate = await databaseGate(context)
    await signUp(page)
    await openTodos(page)

    await gate.down()
    await page.waitForTimeout(14_000)
    gate.up()
    await page.waitForTimeout(8000)

    expect(await authCookie(context)).toBeDefined()
    await expectSignedIn(page)
    await addTodo(page, "after expiry")
    await page.reload()
    await expect(todoInput(page, "after expiry")).toBeVisible()
  })

  test("keeps LIVE updates across token renewals", async ({ context, page }) => {
    await signUp(page)
    await openTodos(page)
    const other = await context.newPage()
    await openTodos(other)

    for (const text of ["first renewal", "second renewal"]) {
      await page.waitForTimeout(13_000)
      await addTodo(other, text)
      await expect(todoInput(page, text)).toBeVisible({ timeout: 10_000 })
    }
    await expectSignedIn(page)
    await expectSignedIn(other)
  })

  test("two tabs loading on an expired token both stay signed in", async ({ context, page }) => {
    await signUp(page)
    const other = await context.newPage()
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    other.on("pageerror", (error) => pageErrors.push(error.message))
    await page.goto("/src/lib/surreal.ts")
    await other.goto("/src/lib/surreal.ts")
    await expireAccessToken(context)

    await Promise.all([page.goto("/todos"), other.goto("/todos")])

    await expectSignedIn(page)
    await expectSignedIn(other)
    await expect(page.getByPlaceholder("What needs doing?")).toBeVisible()
    await expect(other.getByPlaceholder("What needs doing?")).toBeVisible()
    expect(pageErrors).toEqual([])
  })

  test("signing out signs out other tabs", async ({ context, page }) => {
    await signUp(page)
    await openTodos(page)
    const other = await context.newPage()
    await openTodos(other)
    await addTodo(other, "private")

    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()

    await expect(other.getByText("You are not signed in")).toBeVisible({ timeout: 10_000 })
    await expect(todoInput(other, "private")).toHaveCount(0)
    await expect(headerSignIn(other)).toBeVisible()
  })

  test("signing out offline stays signed out after reconnecting", async ({ context, page }) => {
    const gate = await databaseGate(context)
    await signUp(page)
    await openTodos(page)
    await gate.down()
    await page.waitForTimeout(500)

    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
    await expect(headerSignIn(page)).toBeVisible({ timeout: 10_000 })

    gate.up()
    await page.waitForTimeout(5000)
    expect(await authCookie(context)).toBeUndefined()
    await page.reload()
    await expect(headerSignIn(page)).toBeVisible()
  })

  test("never puts credentials in the URL before hydration", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill(uniqueEmail())
    await page.getByLabel("Password").fill(password)
    await page.getByLabel("Password").press("Enter")
    await page.waitForTimeout(300)

    expect(page.url()).not.toContain("password=")
    await context.close()
  })
})

test.describe("offline writes @db", () => {
  test("leader writes land once after a reload", async ({ browser, context, page }) => {
    const gate = await databaseGate(context)
    const email = await signUp(page)
    await openTodos(page)
    await addTodo(page, "to delete")

    await gate.down()
    await page.waitForTimeout(500)
    await addTodo(page, "offline add")
    await page.getByRole("button", { name: "Delete to delete" }).click()
    await expect(todoInput(page, "to delete")).toHaveCount(0)
    await page.waitForTimeout(800)
    await page.reload()
    await expect(todoInput(page, "offline add")).toBeVisible()
    gate.up()
    await page.waitForTimeout(6000)
    await expectSignedIn(page)
    await addTodo(page, "after reconnect")

    const verify = await browser.newContext()
    const reader = await verify.newPage()
    await signIn(reader, email)
    await expect(accountMenu(reader)).toBeVisible()
    await openTodos(reader)
    await expect(todoInput(reader, "offline add")).toHaveCount(1)
    await expect(todoInput(reader, "after reconnect")).toHaveCount(1)
    await expect(todoInput(reader, "to delete")).toHaveCount(0)
    await verify.close()
  })

  for (const closeFirst of [false, true]) {
    test(`non-leader write lands when the tab ${closeFirst ? "closes first" : "stays open"}`, async ({
      context,
      page
    }) => {
      const gate = await databaseGate(context)
      await signUp(page)
      await openTodos(page)
      const follower = await context.newPage()
      await openTodos(follower)

      await gate.down()
      await follower.waitForTimeout(500)
      await addTodo(follower, "follower write")
      await follower.waitForTimeout(500)
      if (closeFirst) await follower.close()
      gate.up()

      await expect(todoInput(page, "follower write")).toHaveCount(1, { timeout: 15_000 })
      await page.reload()
      await expect(todoInput(page, "follower write")).toHaveCount(1)
    })
  }

  test("another tab takes over when the leader closes", async ({ context, page }) => {
    const gate = await databaseGate(context)
    await signUp(page)
    await openTodos(page)
    const follower = await context.newPage()
    await openTodos(follower)

    await page.close()
    await follower.waitForTimeout(500)
    await gate.down()
    await follower.waitForTimeout(500)
    await addTodo(follower, "after failover")
    await follower.waitForTimeout(800)
    await follower.reload()
    await expect(todoInput(follower, "after failover")).toBeVisible()
    gate.up()

    await follower.waitForTimeout(6000)
    await follower.reload()
    await expect(todoInput(follower, "after failover")).toHaveCount(1)
  })
})
