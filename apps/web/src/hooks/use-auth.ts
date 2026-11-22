import { useSurrealClient } from "../lib/surreal-provider";

export function useAuth() {
    const client = useSurrealClient();

    async function login(email: string, password: string) {
        return client.signin({
            namespace: "main",
            database: "main",
            access: "account",
            variables: { email, pass: password },
        });
    }

    async function register(email: string, password: string) {
        return client.signup({
            namespace: "main",
            database: "main",
            access: "account",
            variables: { email, pass: password },
        });
    }

    async function logout() {
        // Revoke the refresh token first: invalidate() alone leaves it usable on the server.
        // A session without a refresh token has nothing to revoke, so sign out regardless.
        await client.revoke().catch(() => {});
        return client.invalidate();
    }

    return { login, register, logout };
}
