import { type QuotaExceeded, type SynthwerkError } from '../client/errors.ts';
export type ErrorKind = 
/** No user token, or the API answered 401 twice. Show sign-in. */
'signed_out' | 'offline'
/** `quota_exhausted`: the user or org quota is used up until `resetsAt`. */
 | 'quota'
/** Too many streams, rate limited or no model: try again later. */
 | 'busy'
/** 403: the token scope, the role or the page origin does not allow the call. */
 | 'not_allowed' | 'too_long'
/** The stream stalled or dropped after the answer started. */
 | 'interrupted' | 'unsupported' | 'storage_full' | 'generic';
export interface ErrorState {
    kind: ErrorKind;
    /** The error code (`quota_exhausted`, `forbidden`, …), or `unknown` for a non-SDK error. */
    code: string;
    /** `quota` only: when the quota is full again (from the problem `quota.resets_at`, else `Retry-After`). */
    resetsAt?: Date;
    /** `quota` only: which quota ran out (`user` or `org`) and its limit. */
    quota?: QuotaExceeded;
    /** The original error. Never shows a token or a prompt. */
    error: SynthwerkError | unknown;
}
/** The UI state of a failure. `now` is in milliseconds since the epoch. */
export declare function toErrorState(error: unknown, now?: number): ErrorState;
