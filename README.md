# surrealauth

A playground for building web app auth on top of [SurrealDB](https://surrealdb.com)'s
built-in authentication. The goal is to see how far you can get with SurrealDB alone,
and where npm packages actually help.

## Stack

- [Nx](https://nx.dev) monorepo with [pnpm](https://pnpm.io)
- [TypeScript 7](https://nx.dev/docs/kb/typescript-7): `tsc` is TypeScript 7 (native), while
  tools that need the compiler API get TypeScript 6 via the `typescript` alias (`tsc6`)
- [oxlint](https://oxc.rs/docs/guide/usage/linter) + [oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- `apps/web`: [TanStack Start](https://tanstack.com/start) + [HeroUI v3](https://heroui.com) +
  [next-themes](https://github.com/pacocoursey/next-themes), prerendered and deployed to
  Cloudflare Workers with [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)

## Getting started

```sh
pnpm install
cp apps/web/.env.example apps/web/.env   # then fill in SURREALDB_PASSWORD and JWT_SECRET
pnpm nx run @surrealauth/web:dev         # http://localhost:3000
```

## Tasks

```sh
pnpm nx run @surrealauth/web:build     # vite build + static prerender
pnpm nx run @surrealauth/web:preview   # preview the build in workerd
pnpm nx run @surrealauth/web:deploy    # build + wrangler deploy (worker: surrealauth)
pnpm nx run @surrealauth/web:db:sync   # apply apps/web/database/schema with SurrealKit

pnpm lint                  # oxlint (@nx/oxlint, batched)
pnpm typecheck             # tsc (TypeScript 7)
pnpm format                # nx format:write (oxfmt)
pnpm format:check
```

## Deployment

Every push to `main` deploys `apps/web` to the `surrealauth` Cloudflare Worker via
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
(<https://surrealauth.daveycodez.workers.dev>).
