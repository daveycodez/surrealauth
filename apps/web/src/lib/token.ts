// Claims SurrealDB puts in a record access token, e.g. { ID: "user:abc", exp: 1700000000 }.
export function tokenClaims(token: string) {
  const payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")
  return JSON.parse(atob(payload)) as { ID: string; exp: number }
}

export function isTokenExpired(token: string) {
  return tokenClaims(token).exp * 1000 <= Date.now()
}
