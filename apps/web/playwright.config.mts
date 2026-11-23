import { nxE2EPreset } from "@nx/playwright/preset"
import { defineConfig, devices } from "@playwright/test"

const webPort = 3100
const dbPort = 8100
const baseURL = `http://localhost:${webPort}`
const withDb = !process.env["E2E_NO_DB"]

const webServer = {
  // Not `pnpm exec`: teardown would kill the wrapper and orphan Vite.
  command: `./node_modules/.bin/vite dev --port ${webPort} --strictPort`,
  url: baseURL,
  cwd: import.meta.dirname,
  timeout: 120_000,
  gracefulShutdown: { signal: "SIGTERM" as const, timeout: 5000 },
  // Never reuse a server: an existing one may be connected to the real database.
  reuseExistingServer: false,
  env: { VITE_SURREAL_URL: `ws://127.0.0.1:${dbPort}/rpc` }
}

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: "./e2e" }),
  grepInvert: withDb ? undefined : /@db/,
  // Dev-server hydration can take several seconds on a busy machine or CI runner.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: withDb
    ? [
        {
          command: "node e2e/support/start-db.ts",
          cwd: import.meta.dirname,
          env: { E2E_DB_PORT: String(dbPort) },
          reuseExistingServer: false,
          wait: { stdout: /e2e database ready/ }
        },
        webServer
      ]
    : webServer,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
})
