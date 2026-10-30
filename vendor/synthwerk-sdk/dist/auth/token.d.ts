import type { Auth, TokenAuthOptions } from './types.ts';
/** The auth surface plus the hooks the transport uses. */
export interface TokenAuth extends Auth {
    /** A token for the next request, or `null` (signed out or no session). */
    token(): Promise<string | null>;
    /** A new token after a 401. Parallel callers share one `getToken({ refresh: true })`. */
    refresh(): Promise<string | null>;
    /** The API answered 401 twice: the session is gone. */
    expire(): void;
}
export declare function createTokenAuth(options: TokenAuthOptions): TokenAuth;
