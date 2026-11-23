const CLOSE_TIMEOUT_MS = 1000

// Browsers can wait about 60s for a close handshake, and the SDK refuses requests until it ends.
function createPromptCloseWebSocket(url: string | URL, protocols?: string | string[]) {
  const socket = new WebSocket(url, protocols)
  const closeSocket = socket.close.bind(socket)
  let closed = false

  socket.addEventListener("close", (event) => {
    if (closed) event.stopImmediatePropagation()
    closed = true
  })

  socket.close = (code, reason) => {
    closeSocket(code, reason)
    setTimeout(() => {
      if (!closed) socket.dispatchEvent(new CloseEvent("close", { code: 1006 }))
    }, CLOSE_TIMEOUT_MS)
  }

  return socket
}

export const PromptCloseWebSocket = Object.assign(createPromptCloseWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}) as unknown as typeof WebSocket
