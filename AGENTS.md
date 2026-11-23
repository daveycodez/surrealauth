You are authorized to sign in as test@example.com on localhost:\* with password test.


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

* For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
* When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
* Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
* You have access to the Nx MCP server and its tools, use them to help the user
* For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
* NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

* For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

* USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
* DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
* The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# SurrealDB conventions

* Each app owns its own SurrealDB: its schema (`apps/<app>/database/`), `surrealkit.toml` and `.env` live inside the app, since apps can use different databases. Run SurrealKit from the app folder.
* Use camelCase for table, field, index, param and access names in `apps/<app>/database/schema/*.surql` (e.g. `updatedAt`, `todoItem`), so SurrealKit-generated TypeScript types match our code with no case conversion. Never add a snake_case/camelCase mapping layer.
* Table names are singular camelCase (e.g. `user`, `todo`, `orgMember`), matching SurrealDB's examples, so SurrealKit's generated interfaces get the natural type names (`user` → `User`).
* Schema is applied with SurrealKit via the app's `db:sync` target (e.g. `pnpm nx run @surrealauth/web:db:sync`), not ad-hoc queries. It loads the app's `.env` and passes `JWT_SECRET` as the `${JWT_SECRET}` template variable (SurrealKit only reads connection settings from `.env` itself, so a bare `surrealkit sync` fails on the missing variable).
* TanStack DB collections use `recordIds: "string"`, so record ids in rows are plain strings like `user:abc`. Pass `tables` from SurrealKit's `src/types/schema.json`, which `db:sync` regenerates. Use the named import `import { tables } from ".../schema.json"`, never the whole document, so access definitions stay out of the client bundle.



# Loading states

* Server renders are signed out (the auth id comes from the cookie on the client), so any UI that shows a skeleton or loading state for user or synced data must also show it before hydration: `(!useHydrated() || isLoading) && !data`. Hooks like `useUser` don't check hydration themselves. Cached data still shows straight away, hence `&& !data`.


