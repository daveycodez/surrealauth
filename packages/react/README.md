# @surrealauth/react

SurrealDB auth for React, kept in a cookie. Consumed from source by the apps in this workspace.

```ts
export const { db, login, register, logout, useAuthId, useConnection, useToken, useTokenClaims } =
  createSurrealAuth({
    endpoint: "wss://example.surrealdb.cloud/rpc",
    namespace: "main",
    database: "main",
    access: "account"
  })
```

`createSurrealAuth` creates the client, connects it in the browser, and keeps the session in a cookie: every sign in, sign up, renewal and sign out is saved there, and connecting signs in from it. It signs in with the access token while it's valid and uses the refresh token once it has expired. A session the server rejects is forgotten, and the client stays connected as a guest.

Calling it again with the same endpoint, namespace, database, access and cookie name returns the same instance, so hot reload keeps the live connection. Call it once per server to use several, each with its own cookie name.

- `db`: the `Surreal` client, also usable outside React.
- `login`, `register` and `logout`: plain functions. Logout revokes the saved refresh token.
- `useToken()`: the access token, from the session or else the cookie, so it works offline and before connecting.
- `useTokenClaims()`: the token's claims.
- `useAuthId()`: the signed-in record (`$auth`) as a `RecordId`, or `null`.
- `useConnection()`: `{ status, isConnected, isConnecting }`.
- `cookie`: `{ name, options }`, defaulting to `DEFAULT_AUTH_COOKIE` (`auth`, 30 days, secure, strict).
