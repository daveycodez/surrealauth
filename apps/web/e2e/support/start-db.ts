import { spawn, spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const port = process.env["E2E_DB_PORT"] ?? "8100"
const host = `http://127.0.0.1:${port}`
// Outside the app folder so SurrealKit can't load its .env or rewrite generated types.
const workDir = mkdtempSync(join(tmpdir(), "surrealauth-e2e-"))
const schemaFolder = join(workDir, "database")
cpSync(join(import.meta.dirname, "../../database"), schemaFolder, { recursive: true })

// A short token so the suite exercises real renewals.
const accessFile = join(schemaFolder, "schema/access.surql")
const accessSchema = readFileSync(accessFile, "utf8")
const shortToken = accessSchema.replace("DURATION FOR TOKEN 15m", "DURATION FOR TOKEN 12s")
if (shortToken === accessSchema) throw new Error("Couldn't shorten the e2e token")
writeFileSync(accessFile, shortToken)

const server = spawn(
  "surreal",
  ["start", "--bind", `127.0.0.1:${port}`, "--user", "root", "--pass", "root", "memory"],
  { stdio: ["ignore", "ignore", "inherit"] }
)

function stop(code: number) {
  server.kill()
  rmSync(workDir, { recursive: true, force: true })
  process.exit(code)
}

server.on("error", (error) => {
  console.error(`Couldn't start surreal (is it installed?): ${error.message}`)
  stop(1)
})
server.on("exit", () => stop(1))
process.on("SIGINT", () => stop(0))
process.on("SIGTERM", () => stop(0))

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const healthy = await fetch(`${host}/health`).then(
      (response) => response.ok,
      () => false
    )
    if (healthy) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error("SurrealDB did not become healthy")
}

await waitForHealth()

const created = await fetch(`${host}/sql`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from("root:root").toString("base64")}`
  },
  body: "DEFINE NAMESPACE main; USE NS main; DEFINE DATABASE main;"
})
if (!created.ok) {
  console.error(`Couldn't create the e2e database: ${await created.text()}`)
  stop(1)
}

const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith("SURREALDB_") && !key.startsWith("SURREALKIT_")
  )
)
const sync = spawnSync(
  "surrealkit",
  [
    "sync",
    "--host",
    host,
    "--ns",
    "main",
    "--db",
    "main",
    "--user",
    "root",
    "--pass",
    "root",
    "--auth-level",
    "root",
    "--folder",
    schemaFolder,
    "--var",
    "JWT_SECRET=e2e-only-secret"
  ],
  { cwd: workDir, env, stdio: ["ignore", "ignore", "inherit"] }
)
if (sync.status !== 0) stop(sync.status ?? 1)

console.log("e2e database ready")
