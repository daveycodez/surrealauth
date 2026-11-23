import { expect, type Page, test } from "@playwright/test"

import { gotoHydrated, signOut, signUp } from "./support/auth"

async function addTodo(page: Page, text: string) {
  await page.getByLabel("New todo").fill(text)
  await page.getByRole("button", { name: "Add" }).click()
  await expect(page.getByRole("checkbox", { name: `Complete ${text}` })).toBeVisible()
}

test.describe("todos @db", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page)
    await gotoHydrated(page, "/todos")
    await expect(page.getByText("No todos yet.")).toBeVisible()
  })

  test("adds a todo that survives a reload", async ({ page }) => {
    await addTodo(page, "Buy milk")

    await page.reload()

    await expect(page.getByRole("checkbox", { name: "Complete Buy milk" })).toBeVisible()
  })

  test("completes a todo", async ({ page }) => {
    await addTodo(page, "Walk dog")
    const checkbox = page.getByRole("checkbox", { name: "Complete Walk dog" })

    await checkbox.click({ force: true })
    await expect(checkbox).toBeChecked()

    await page.reload()
    await expect(page.getByRole("checkbox", { name: "Complete Walk dog" })).toBeChecked()
  })

  test("edits a todo", async ({ page }) => {
    await addTodo(page, "Draft")

    const text = page.getByLabel("Todo text")
    await text.fill("Final")
    await text.press("Enter")

    await expect(page.getByRole("checkbox", { name: "Complete Final" })).toBeVisible()
  })

  test("deletes a todo", async ({ page }) => {
    await addTodo(page, "Temporary")

    await page.getByRole("button", { name: "Delete Temporary" }).click()

    await expect(page.getByText("No todos yet.")).toBeVisible()
  })

  test("hides todos from other users", async ({ page }) => {
    await addTodo(page, "Private note")
    await signOut(page)

    await signUp(page)
    await gotoHydrated(page, "/todos")

    await expect(page.getByText("No todos yet.")).toBeVisible()
    await expect(page.getByRole("checkbox", { name: "Complete Private note" })).toHaveCount(0)
  })
})
