// Trades the access token of a signed-in user for a short-lived widget token
// (identity `POST /v1/apps/{appId}/widget-tokens`, synthwerk-contracts `identity.createWidgetToken`).
// It does not use the SDK transport: that transport sends the widget token, and this call
// needs the user token. The caller keeps the tokens; the SDK stores neither.
import { clientError, fromFetchFailure } from "../client/errors.js";
import { trimSlash } from "../client/url.js";
/** Identity never issues a widget token for longer than 15 minutes. */
const MAX_EXPIRES_IN_S = 900;
const MAX_TOKEN_LENGTH = 4096;
function readGrant(body) {
    if (typeof body !== 'object' || body === null)
        return null;
    const { access_token: token, expires_in: expiresIn } = body;
    if (typeof token !== 'string' || token === '' || token.length > MAX_TOKEN_LENGTH)
        return null;
    if (typeof expiresIn !== 'number' || !Number.isInteger(expiresIn) || expiresIn < 1)
        return null;
    return { token, expiresIn: Math.min(expiresIn, MAX_EXPIRES_IN_S) };
}
/**
 * Asks identity for a widget token for `appId`. The browser sets `Origin`; identity binds
 * the token to it. No cookies, no HTTP cache.
 * - 2xx with a valid body: `{ data }`.
 * - Any other status: `{ error, response }`. Nothing is thrown.
 * - A 2xx body that is not a widget token: throws `bad_gateway` (status 502).
 * - A rejected fetch: throws `aborted`, `offline` or `network`.
 */
export async function requestWidgetToken(options) {
    const send = options.fetch ?? ((input) => globalThis.fetch(input));
    const base = trimSlash(options.identityUrl);
    const url = `${base}/v1/apps/${encodeURIComponent(options.appId)}/widget-tokens`;
    const request = new Request(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${options.userToken}`, accept: 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        ...(options.signal ? { signal: options.signal } : {})
    });
    let response;
    try {
        response = await send(request);
    }
    catch (cause) {
        throw fromFetchFailure(cause, options.signal);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok)
        return { error: body, response };
    const data = readGrant(body);
    if (!data)
        throw clientError('bad_gateway', 502);
    return { data, response };
}
