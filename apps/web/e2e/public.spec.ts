import { expect, test } from "@playwright/test"

import { gotoHydrated, headerSignIn } from "./support/auth"

test("home page renders signed out", async ({ page }) => {
  await gotoHydrated(page, "/")

  await expect(page.getByRole("main").getByText("SurrealAuth")).toBeVisible()
  await expect(headerSignIn(page)).toBeVisible()
})

test("moves between sign in and sign up", async ({ page }) => {
  await gotoHydrated(page, "/")

  await headerSignIn(page).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click()
  await expect(page).toHaveURL(/\/sign-up$/)

  await page.getByRole("main").getByRole("link", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test("sign in requires an email and password", async ({ page }) => {
  await gotoHydrated(page, "/sign-in")

  await page.getByRole("main").getByRole("button", { name: "Sign in" }).click()

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByLabel("Email")).toHaveJSProperty("validity.valid", false)
})

test("todos asks signed out visitors to sign in", async ({ page }) => {
  await gotoHydrated(page, "/todos")

  await expect(page.getByText("You are not signed in.")).toBeVisible()
  await expect(page.getByLabel("New todo")).toHaveCount(0)
})

test("theme switcher applies and remembers the theme", async ({ page }) => {
  await gotoHydrated(page, "/")

  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})
