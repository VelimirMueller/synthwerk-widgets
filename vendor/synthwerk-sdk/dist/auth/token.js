// Token mode (D-03, D-13): the host supplies the token, the SDK only asks for it.
// No localStorage, sessionStorage or cookie writes. No token copy beyond one request.
import { singleFlight } from "./single-flight.js";
function decodeUser(token) {
    const payload = token.split('.')[1];
    if (!payload)
        return null;
    try {
        const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
        const claims = JSON.parse(json);
        if (typeof claims !== 'object' || claims === null)
            return null;
        const { sub, exp } = claims;
        if (typeof sub !== 'string' || sub === '')
            return null;
        return {
            subject: sub,
            expiresAt: typeof exp === 'number' ? exp : null,
            claims: Object.freeze({ ...claims })
        };
    }
    catch {
        return null;
    }
}
export function createTokenAuth(options) {
    const listeners = new Set();
    let signedOut = false;
    let user = null;
    function setUser(next) {
        const changed = (next?.subject ?? null) !== (user?.subject ?? null);
        user = next;
        if (!changed)
            return;
        for (const listener of [...listeners])
            listener(next);
    }
    async function ask(refresh) {
        if (signedOut)
            return null;
        const token = await options.getToken({ refresh });
        if (signedOut)
            return null;
        if (typeof token !== 'string' || token === '') {
            setUser(null);
            return null;
        }
        setUser(decodeUser(token));
        return token;
    }
    const refresh = singleFlight(() => ask(true));
    return {
        token: () => ask(false),
        refresh,
        expire() {
            setUser(null);
        },
        async signIn() {
            signedOut = false;
            await ask(false);
            return user;
        },
        signOut() {
            signedOut = true;
            setUser(null);
        },
        async getUser() {
            await ask(false);
            return user;
        },
        getAccessToken: () => ask(false),
        onChange(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }
    };
}
