import {
  createSurrealAuth as createCoreSurrealAuth,
  type SurrealAuth as CoreSurrealAuth,
  type SurrealAuthConfig,
  type TokenClaims
} from "@surrealauth/core"
import { useSyncExternalStore } from "react"
import type { ConnectionStatus, RecordId } from "surrealdb"

export type SurrealAuth = ReturnType<typeof withHooks>

const instances = new WeakMap<CoreSurrealAuth, SurrealAuth>()

export function createSurrealAuth(config: SurrealAuthConfig): SurrealAuth {
  const core = createCoreSurrealAuth(config)

  let instance = instances.get(core)
  if (!instance) {
    instance = withHooks(core)
    instances.set(core, instance)
  }
  return instance
}

function withHooks(core: CoreSurrealAuth) {
  function useToken(): string | null {
    return useSyncExternalStore(core.subscribeToken, core.getToken, () => null)
  }

  function useTokenClaims(): TokenClaims | null {
    return useSyncExternalStore(core.subscribeToken, core.getTokenClaims, () => null)
  }

  function useAuthId(): RecordId | null {
    return useSyncExternalStore(core.subscribeToken, core.getAuthId, () => null)
  }

  function useConnection() {
    const status = useSyncExternalStore<ConnectionStatus>(
      core.subscribeStatus,
      core.getStatus,
      () => "disconnected"
    )

    return {
      status,
      isConnected: status === "connected",
      isConnecting: status === "connecting" || status === "reconnecting"
    }
  }

  return { ...core, useToken, useTokenClaims, useAuthId, useConnection }
}
