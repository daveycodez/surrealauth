import { RecordId, TextCodec } from "surrealdb"

// SurrealDB's standard claims, plus any custom claims the access method adds.
export type TokenClaims = {
  iss?: string
  iat?: number
  nbf?: number
  exp?: number
  jti?: string
  NS?: string
  DB?: string
  AC?: string
  ID?: string
  RL?: string[]
  [claim: string]: unknown
}

export function tokenClaims(token: string) {
  const payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")
  return JSON.parse(atob(payload)) as TokenClaims
}

export function isTokenExpired(token: string) {
  const { exp } = tokenClaims(token)
  return exp !== undefined && exp * 1000 <= Date.now()
}

// The ID claim is only a record for record access. Others hold a username or a provider's ID.
export function parseRecordId(id: string): RecordId | null {
  try {
    const parsed = TextCodec.parseValue(id)
    return parsed instanceof RecordId ? parsed : null
  } catch {
    // The claim leaves keys unescaped, so a key starting with a digit (user:2b8vv…) fails to
    // parse: the parser reads a number and then hits a letter. Treat the rest as a string key.
    const match = /^([A-Za-z_][A-Za-z0-9_]*):(.+)$/.exec(id)
    return match ? new RecordId(match[1]!, match[2]!) : null
  }
}
