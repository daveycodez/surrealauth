export { createSurrealAuth, type SurrealAuth } from "./create-surreal-auth"
export {
  type AuthCookie,
  DEFAULT_AUTH_COOKIE,
  getAuthCookie,
  isTokenExpired,
  parseRecordId,
  readAuthCookie,
  removeAuthCookie,
  setAuthCookie,
  subscribeAuthCookie,
  type SurrealAuthConfig,
  type TokenClaims,
  tokenClaims
} from "@surrealauth/core"
