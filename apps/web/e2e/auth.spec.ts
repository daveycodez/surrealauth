import { expect, test } from "@playwright/test"

import {
  accountMenu,
  gotoHydrated,
  headerSignIn,
  signIn,
  signOut,
  signUp,
  submitSignUp,
  uniqueEmail
} from "./support/auth"

test.describe("auth @db", () => {
  test("signs up, signs out, and signs back in", async ({ page }) => {
    const email = await signUp(page)
    await expect(page).toHaveURL(/\/$/)

    await signOut(page)

    await signIn(page, email)
    await expect(accountMenu(page)).toBeVisible()
  })

  test("keeps the session across a reload", async ({ page }) => {
    await signUp(page)

    await page.reload()

    await expect(accountMenu(page)).toBeVisible()
  })

  test("rejects a wrong password", async ({ page }) => {
    const email = await signUp(page)
    await signOut(page)

    await signIn(page, email, "wrong-password")

    await expect(page.getByText("Incorrect email or password.")).toBeVisible()
    await expect(headerSignIn(page)).toBeVisible()
  })

  test("rejects a duplicate email", async ({ page }) => {
    const email = await signUp(page)
    await signOut(page)

    await submitSignUp(page, email)

    await expect(page.getByText("The email may already be in use.")).toBeVisible()
  })

  test("signing out stays signed out after a reload", async ({ page }) => {
    await signUp(page, uniqueEmail())
    await signOut(page)

    await gotoHydrated(page, "/todos")

    await expect(page.getByText("You are not signed in.")).toBeVisible()
  })
})
