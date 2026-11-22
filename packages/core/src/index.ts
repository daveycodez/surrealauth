export { createSurrealAuth, type SurrealAuth, type SurrealAuthConfig } from "./create-surreal-auth"
export {
  type AuthCookie,
  DEFAULT_AUTH_COOKIE,
  getAuthCookie,
  readAuthCookie,
  removeAuthCookie,
  setAuthCookie,
  subscribeAuthCookie
} from "./lib/cookie"
export { isTokenExpired, parseRecordId, type TokenClaims, tokenClaims } from "./lib/token-helpers"
