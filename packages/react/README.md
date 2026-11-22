# @surrealauth/react

React bindings for SurrealDB.

- `SurrealProvider` connects the client.
- `useToken()` is the saved tokens (`{ access, refresh }`) from the auth cookie, or `null`. It works offline and before the client connects.
- `tokenClaims` and `isTokenExpired` read a SurrealDB access token. `getAuthCookie`, `setAuthCookie` and `removeAuthCookie` handle the cookie. Consumed from source by the apps in this workspace.
