// One UI state per failure, the same in every adapter and widget. The SDK gives a
// SynthwerkError with a stable code; this maps it to what a user interface shows.
import { isSynthwerkError } from "../client/errors.js";
const KIND_BY_CODE = {
    unauthenticated: 'signed_out',
    offline: 'offline',
    quota_exhausted: 'quota',
    too_many_streams: 'busy',
    rate_limited: 'busy',
    model_unavailable: 'busy',
    origin_not_allowed: 'not_allowed',
    forbidden: 'not_allowed',
    input_too_large: 'too_long',
    unsupported_media_type: 'unsupported',
    storage_full: 'storage_full',
    stream_stalled: 'interrupted',
    stream_interrupted: 'interrupted'
};
/** The UI state of a failure. `now` is in milliseconds since the epoch. */
export function toErrorState(error, now = Date.now()) {
    if (!isSynthwerkError(error))
        return { kind: 'generic', code: 'unknown', error };
    const kind = KIND_BY_CODE[error.code] ?? 'generic';
    if (kind !== 'quota')
        return { kind, code: error.code, error };
    const fromQuota = error.quota ? new Date(error.quota.resets_at) : undefined;
    const fromHeader = error.retryAfter === undefined ? undefined : new Date(now + error.retryAfter * 1000);
    // Never hand an Invalid Date to a UI: fall back to Retry-After, else leave it out.
    const resetsAt = [fromQuota, fromHeader].find((d) => d && !Number.isNaN(d.getTime()));
    return {
        kind,
        code: error.code,
        error,
        ...(resetsAt === undefined ? {} : { resetsAt }),
        ...(error.quota === undefined ? {} : { quota: error.quota })
    };
}
