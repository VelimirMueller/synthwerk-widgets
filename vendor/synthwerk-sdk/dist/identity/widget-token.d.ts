import type { components as IdentityComponents } from '../generated/identity.ts';
/** The 201 body of the widget-token route. */
export type WidgetToken = IdentityComponents['schemas']['WidgetToken'];
/** The part of a widget token a client needs. */
export interface WidgetTokenGrant {
    /** The widget token (JWT). Send it as `Authorization: Bearer <token>`. Never log it. */
    token: string;
    /** Seconds until it expires, 1 to 900. A larger server value is capped at 900 (the contract maximum). */
    expiresIn: number;
}
export interface WidgetTokenRequest {
    /** Identity base URL, for example `https://api.example.com/identity`. */
    identityUrl: string;
    /** The app id (UUID) of the widget. */
    appId: string;
    /** The access token of the signed-in user. Never a widget token. */
    userToken: string;
    /** Custom fetch. Default: `globalThis.fetch`. */
    fetch?: (input: Request) => Promise<Response>;
    signal?: AbortSignal;
}
/**
 * `data` on 2xx, else `error` (the parsed body or `null`) and the response. The caller
 * decides what a status means; for example 401 means the user token is no longer valid.
 */
export type WidgetTokenResult = {
    data: WidgetTokenGrant;
    error?: never;
    response: Response;
} | {
    data?: never;
    error: unknown;
    response: Response;
};
/**
 * Asks identity for a widget token for `appId`. The browser sets `Origin`; identity binds
 * the token to it. No cookies, no HTTP cache.
 * - 2xx with a valid body: `{ data }`.
 * - Any other status: `{ error, response }`. Nothing is thrown.
 * - A 2xx body that is not a widget token: throws `bad_gateway` (status 502).
 * - A rejected fetch: throws `aborted`, `offline` or `network`.
 */
export declare function requestWidgetToken(options: WidgetTokenRequest): Promise<WidgetTokenResult>;
