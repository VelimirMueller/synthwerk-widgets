const RETRYABLE = new Set([
    'network',
    'offline',
    'stream_stalled',
    'stream_interrupted',
    'bad_gateway',
    'model_unavailable',
    'too_many_streams',
    'rate_limited'
]);
export class SynthwerkError extends Error {
    name = 'SynthwerkError';
    code;
    title;
    status;
    detail;
    traceId;
    retryAfter;
    /** `quota_exhausted` only: the scope, the limit and the reset time of the quota that ran out. */
    quota;
    /** True when the same call can succeed later without a change by the user. */
    retryable;
    constructor(init) {
        super(`${init.code}: ${init.title}`, init.cause === undefined ? undefined : { cause: init.cause });
        this.code = init.code;
        this.title = init.title;
        this.status = init.status ?? null;
        this.detail = init.detail;
        this.traceId = init.traceId;
        this.retryAfter = init.retryAfter;
        this.quota = init.quota;
        this.retryable = RETRYABLE.has(init.code);
    }
}
export function isSynthwerkError(value) {
    return value instanceof SynthwerkError;
}
const TITLES = {
    unauthenticated: 'Unauthenticated',
    network: 'Network error',
    offline: 'Offline',
    aborted: 'Aborted',
    stream_stalled: 'Stream stalled',
    stream_interrupted: 'Stream interrupted',
    invalid_event: 'Invalid stream event',
    bad_gateway: 'Bad gateway',
    rate_limited: 'Rate limited'
};
export function clientError(code, status = null, cause) {
    return new SynthwerkError({ code, title: TITLES[code], status, cause });
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const CODE = /^[a-z][a-z0-9_]*$/;
const MAX_QUOTA_LIMIT = 1_000_000_000_000;
/**
 * The `quota` member of a problem, or `undefined` when it does not fit `QuotaExceeded`.
 * A bad member never fails the error: the code and the status still count.
 */
function readQuota(value) {
    if (!isRecord(value))
        return undefined;
    const { scope, unit, limit, resets_at: resetsAt } = value;
    if (scope !== 'user' && scope !== 'org')
        return undefined;
    if (unit !== 'tokens')
        return undefined;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1)
        return undefined;
    if (limit > MAX_QUOTA_LIMIT)
        return undefined;
    if (typeof resetsAt !== 'string' || resetsAt.length > 40 || Number.isNaN(Date.parse(resetsAt))) {
        return undefined;
    }
    return { scope, unit, limit, resets_at: resetsAt };
}
/**
 * A SynthwerkError from a problem object, or `null` when the value is not a problem.
 * `status` is the HTTP status and wins; the body `status` counts only when there is none
 * (an SSE `error` event, where HTTP stays 200).
 */
export function fromProblem(value, status, retryAfter) {
    if (!isRecord(value))
        return null;
    const { code, title, detail, trace_id: traceId } = value;
    if (typeof code !== 'string' || !CODE.test(code) || code.length > 64)
        return null;
    const problemStatus = status ?? (typeof value.status === 'number' ? value.status : null);
    const quota = code === 'quota_exhausted' ? readQuota(value.quota) : undefined;
    return new SynthwerkError({
        code,
        title: typeof title === 'string' ? title.slice(0, 128) : code,
        status: problemStatus,
        ...(typeof detail === 'string' ? { detail: detail.slice(0, 512) } : {}),
        ...(typeof traceId === 'string' ? { traceId } : {}),
        ...(retryAfter === undefined ? {} : { retryAfter }),
        ...(quota === undefined ? {} : { quota })
    });
}
function retryAfterOf(response) {
    const raw = response.headers.get('retry-after');
    if (raw === null || !/^\d+$/.test(raw.trim()))
        return undefined;
    return Number(raw.trim());
}
/**
 * The error for a non-2xx response. Reads the body.
 * - problem+json (or JSON with a valid `code`): the server code.
 * - Anything else (an HTML proxy page): a code from the status. The body never reaches the error.
 */
export async function fromResponse(response) {
    const retryAfter = retryAfterOf(response);
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('json')) {
        try {
            const problem = fromProblem(await response.json(), response.status, retryAfter);
            if (problem)
                return problem;
        }
        catch {
            // Not JSON after all: fall through to the status mapping.
        }
    }
    else {
        await response.body?.cancel().catch(() => undefined);
    }
    const code = response.status === 401
        ? 'unauthenticated'
        : response.status === 403
            ? 'forbidden'
            : response.status === 429
                ? 'rate_limited'
                : 'bad_gateway';
    return new SynthwerkError({
        code,
        title: code === 'forbidden' ? 'Forbidden' : TITLES[code],
        status: response.status,
        ...(retryAfter === undefined ? {} : { retryAfter })
    });
}
/** Maps a rejected `fetch` (or `read`) to `aborted`, `offline` or `network`. */
export function fromFetchFailure(cause, signal) {
    if (isSynthwerkError(cause))
        return cause;
    if (signal?.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
        return clientError('aborted', null, cause);
    }
    const nav = globalThis.navigator;
    return clientError(nav?.onLine === false ? 'offline' : 'network', null, cause);
}
/**
 * Codes for an answer without a problem body: the edge (Traefik) and vision (FastAPI
 * `{detail}`) answer with a status only. Branch on the status, never on `detail`.
 */
const CODE_BY_STATUS = {
    401: 'unauthenticated',
    403: 'forbidden',
    413: 'input_too_large',
    415: 'unsupported_media_type',
    429: 'rate_limited',
    503: 'model_unavailable',
    507: 'storage_full'
};
/**
 * The SynthwerkError of a typed-client result that is not 2xx (`{ error, response }` of
 * `sw.api.*`). A problem body gives its code (and `quota`); any other body gives a code
 * from the status. The body itself never reaches the error.
 */
export function errorFromResult(body, response) {
    const status = response?.status ?? null;
    const retryAfter = response ? retryAfterOf(response) : undefined;
    const problem = fromProblem(body, status, retryAfter);
    if (problem)
        return problem;
    const code = (status !== null && CODE_BY_STATUS[status]) || 'bad_gateway';
    return new SynthwerkError({
        code,
        title: code,
        status,
        ...(retryAfter === undefined ? {} : { retryAfter })
    });
}
