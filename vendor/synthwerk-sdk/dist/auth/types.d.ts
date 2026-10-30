/**
 * Hands the SDK a Bearer token for one request. The host app or the widget owns the token
 * (D-13: the widget gets it from its host through postMessage).
 * - `refresh: false`: a cached token is fine. Parallel requests call this in parallel: cache it.
 * - `refresh: true`: the API answered 401 with the last token; return a new one if you can.
 * - Return `null` (or an empty string) when there is no session: the call fails with
 *   `unauthenticated` before any network call.
 */
export type GetToken = (options: {
    refresh: boolean;
}) => string | null | Promise<string | null>;
/** Token mode: the caller supplies the token. The SDK keeps no copy beyond one request. */
export interface TokenAuthOptions {
    mode: 'token';
    getToken: GetToken;
}
export type AuthOptions = TokenAuthOptions;
/**
 * The caller, decoded from the JWT payload without verification (the API verifies).
 * `null` when signed out or when the token is not a JWT.
 */
export interface AuthUser {
    /** Token `sub`. */
    subject: string;
    /** Token `exp` in seconds since the epoch, or `null`. */
    expiresAt: number | null;
    /** All payload claims, for example the org claim. Read only. */
    claims: Readonly<Record<string, unknown>>;
}
export interface Auth {
    /** Token mode: clears a previous `signOut()` and asks `getToken` once. Returns the user. */
    signIn(): Promise<AuthUser | null>;
    /** Stops all calls (they fail with `unauthenticated`) until `signIn()`. Notifies listeners. */
    signOut(): void;
    /** The user of the current token (asks `getToken`), or `null`. */
    getUser(): Promise<AuthUser | null>;
    /** The current token from `getToken`, or `null`. Memory only: never stored by the SDK. */
    getAccessToken(): Promise<string | null>;
    /** Calls `listener` when the user changes (sign-in, other subject, sign-out, final 401). */
    onChange(listener: (user: AuthUser | null) => void): () => void;
}
