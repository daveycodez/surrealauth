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
    return null
  }
}
