import { randomUUID } from "node:crypto"

import { expect, type Page } from "@playwright/test"

export const password = "e2e-password"

export function uniqueEmail() {
  return `e2e-${randomUUID()}@example.com`
}

export function accountMenu(page: Page) {
  return page.getByRole("button", { name: "Account menu" })
}

export function headerSignIn(page: Page) {
  return page.locator("header").getByRole("link", { name: "Sign in" })
}

// The header's account area only leaves its skeleton once hydrated, so forms are safe to submit.
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await expect(headerSignIn(page).or(accountMenu(page))).toBeVisible()
}

async function submitCredentials(page: Page, action: string, email: string, secret: string) {
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(secret)
  await page.getByRole("main").getByRole("button", { name: action }).click()
}

export async function signUp(page: Page, email = uniqueEmail()) {
  await gotoHydrated(page, "/sign-up")
  await submitCredentials(page, "Sign up", email, password)
  await expect(accountMenu(page)).toBeVisible()
  return email
}

export async function signIn(page: Page, email: string, secret = password) {
  await gotoHydrated(page, "/sign-in")
  await submitCredentials(page, "Sign in", email, secret)
}

export async function signOut(page: Page) {
  await accountMenu(page).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(headerSignIn(page)).toBeVisible()
}

export async function submitSignUp(page: Page, email: string) {
  await gotoHydrated(page, "/sign-up")
  await submitCredentials(page, "Sign up", email, password)
}
