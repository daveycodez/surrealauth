import { useMemo } from "react"
import type { RecordId } from "surrealdb"

import { parseRecordId } from "../lib/token-helpers"
import { useTokenClaims } from "./use-token-claims"

// The signed-in record ($auth), or null for no session or a token that isn't for a record.
export function useAuthId(): RecordId | null {
  const id = useTokenClaims()?.ID

  // Keyed on the ID, so renewing the token doesn't make a new RecordId.
  return useMemo(() => (id ? parseRecordId(id) : null), [id])
}
