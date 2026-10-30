import { createSynthwerk } from "../client/create.js";
import { createWidgetSession } from "../identity/widget-session.js";
import { createStore } from "../state/store.js";
export function createSynthwerkApp(options) {
    const sw = createSynthwerk({
        apiUrl: options.apiUrl,
        auth: { mode: 'token', getToken: options.getToken },
        ...(options.services ? { services: options.services } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
        ...(options.tracing === undefined ? {} : { tracing: options.tracing })
    });
    const auth = createStore({ status: 'unknown', user: null });
    const userListeners = new Set();
    let session = null;
    /** The subject the app last saw. A change from one user to another (or to none) drops data. */
    let subject = null;
    let check = 0;
    let connections = 0;
    let stopAuth = null;
    function dropUserData() {
        session?.reset();
        for (const listener of [...userListeners])
            listener();
    }
    function seen(user) {
        const next = user?.subject ?? null;
        // null -> user is a first sign-in: nothing to drop. user -> other or none: drop.
        if (subject !== null && next !== subject)
            dropUserData();
        subject = next;
        auth.set({ status: user ? 'signed_in' : 'signed_out', user });
    }
    async function checkAuth() {
        const mine = ++check;
        if (auth.getSnapshot().status !== 'signed_in')
            auth.update({ status: 'checking' });
        let user = null;
        try {
            user = await sw.auth.signIn();
        }
        catch {
            // A getToken that throws counts as signed out.
            user = null;
        }
        if (mine === check)
            seen(user);
        return user;
    }
    return {
        sw,
        auth,
        checkAuth,
        signOut() {
            check++;
            sw.auth.signOut();
            subject = null;
            dropUserData();
            auth.set({ status: 'signed_out', user: null });
        },
        sessionChanged() {
            dropUserData();
            return checkAuth();
        },
        widget() {
            if (!options.appId)
                return null;
            session ??= createWidgetSession({
                apiUrl: options.apiUrl,
                appId: options.appId,
                getUserToken: () => options.getToken({ refresh: false }),
                ...(options.services ? { services: options.services } : {}),
                ...(options.fetch ? { fetch: options.fetch } : {})
            });
            return session;
        },
        onUserChange(listener) {
            userListeners.add(listener);
            return () => {
                userListeners.delete(listener);
            };
        },
        connect() {
            connections++;
            stopAuth ??= sw.auth.onChange((user) => {
                // A request saw another user or a final 401. A running check reports itself.
                seen(user);
            });
            let stopped = false;
            return () => {
                if (stopped)
                    return;
                stopped = true;
                connections--;
                if (connections === 0) {
                    stopAuth?.();
                    stopAuth = null;
                }
            };
        }
    };
}
