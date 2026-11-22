import { useMemo } from "react"

import { type TokenClaims, tokenClaims } from "../lib/token-helpers"
import { useToken } from "./use-token"

export function useTokenClaims(): TokenClaims | null {
  const token = useToken()
  return useMemo(() => (token ? tokenClaims(token) : null), [token])
}
