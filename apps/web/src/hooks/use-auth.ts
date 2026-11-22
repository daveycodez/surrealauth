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
        return client.invalidate();
    }

    return { login, register, logout };
}
