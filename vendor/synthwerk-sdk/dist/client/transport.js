import { clientError, fromFetchFailure } from "./errors.js";
function hex(bytes) {
    const buffer = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}
function withHeaders(request, token, tracing) {
    const headers = new Headers(request.headers);
    headers.set('authorization', `Bearer ${token}`);
    if (tracing) {
        headers.set('traceparent', `00-${hex(16)}-${hex(8)}-01`);
        headers.set('x-request-id', crypto.randomUUID());
    }
    return new Request(request, { headers });
}
/**
 * Sends a request with a Bearer token.
 * - No token: throws `unauthenticated` before any network call (D-30).
 * - 401: asks for a new token once (shared by parallel calls) and retries once.
 *   A second 401 ends the session (`onChange(null)`) and returns that response.
 * - A rejected fetch: throws `aborted`, `offline` or `network`.
 */
export function createTransport(options) {
    const { auth, tracing } = options;
    async function attempt(request, token) {
        try {
            return await options.fetch(withHeaders(request, token, tracing));
        }
        catch (cause) {
            throw fromFetchFailure(cause, request.signal);
        }
    }
    return async (request) => {
        const token = await auth.token();
        if (!token)
            throw clientError('unauthenticated');
        // Keep an unread copy: the body of the first attempt is consumed.
        const retry = request.clone();
        const first = await attempt(request, token);
        if (first.status !== 401)
            return first;
        await first.body?.cancel().catch(() => undefined);
        const fresh = await auth.refresh();
        if (!fresh) {
            auth.expire();
            throw clientError('unauthenticated', 401);
        }
        const second = await attempt(retry, fresh);
        if (second.status === 401)
            auth.expire();
        return second;
    };
}
