import type { TokenAuth } from '../auth/token.ts';
export interface TransportOptions {
    auth: TokenAuth;
    fetch: (input: Request) => Promise<Response>;
    /**
     * Adds `traceparent` and `X-Request-ID`. Off by default: the edge CORS allows only
     * `Authorization` and `Content-Type`, so a browser preflight fails with these headers.
     */
    tracing: boolean;
}
export type Send = (request: Request) => Promise<Response>;
/**
 * Sends a request with a Bearer token.
 * - No token: throws `unauthenticated` before any network call (D-30).
 * - 401: asks for a new token once (shared by parallel calls) and retries once.
 *   A second 401 ends the session (`onChange(null)`) and returns that response.
 * - A rejected fetch: throws `aborted`, `offline` or `network`.
 */
export declare function createTransport(options: TransportOptions): Send;
