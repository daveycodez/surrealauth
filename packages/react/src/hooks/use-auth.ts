import { useSurreal } from "../components/surreal-provider";
import { readAuthCookie, removeAuthCookie } from "../lib/cookie";

export function useAuth() {
    const { client, params, access, cookie } = useSurreal();

    async function login(email: string, password: string) {
        return client.signin({
            namespace: params.namespace,
            database: params.database,
            access,
            variables: { email, pass: password },
        });
    }

    async function register(email: string, password: string) {
        return client.signup({
            namespace: params.namespace,
            database: params.database,
            access,
            variables: { email, pass: password },
        });
    }

    async function logout() {
        // The saved tokens, since the client has no refresh token after signing in with the access token.
        const saved = readAuthCookie(cookie);
        await client.revoke(saved?.refresh ? saved : undefined).catch(() => {});
        removeAuthCookie(cookie);
        return client.invalidate();
    }

    return { login, register, logout };
}
