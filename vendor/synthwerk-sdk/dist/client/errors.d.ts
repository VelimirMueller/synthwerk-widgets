import type { components as LlmComponents } from '../generated/llm.ts';
/** Codes the SDK sets itself. Server codes (for example `quota_exhausted`) pass through as they are. */
export type ClientErrorCode = 'unauthenticated' | 'network' | 'offline' | 'aborted' | 'stream_stalled' | 'stream_interrupted' | 'invalid_event' | 'bad_gateway' | 'rate_limited';
/** A client code, a known server code or any other server code (clients must accept unknown codes). */
export type ErrorCode = ClientErrorCode | 'invalid_request' | 'forbidden' | 'not_found' | 'input_too_large' | 'too_many_streams' | 'quota_exhausted' | 'model_unavailable' | (string & {});
/**
 * The quota that ran out (`quota` of a `quota_exhausted` problem, synthwerk-contracts
 * `QuotaExceeded`). `scope` `user`: the caller's own quota. `org`: the shared org quota.
 */
export type QuotaExceeded = LlmComponents['schemas']['QuotaExceeded'];
export interface SynthwerkErrorInit {
    code: ErrorCode;
    title: string;
    /** HTTP status, or the status an SSE `error` event maps to. `null` when no response came. */
    status?: number | null;
    detail?: string;
    traceId?: string;
    /** Seconds from `Retry-After`. */
    retryAfter?: number;
    /** `quota_exhausted` only: the quota that ran out. */
    quota?: QuotaExceeded;
    cause?: unknown;
}
export declare class SynthwerkError extends Error {
    readonly name = "SynthwerkError";
    readonly code: ErrorCode;
    readonly title: string;
    readonly status: number | null;
    readonly detail: string | undefined;
    readonly traceId: string | undefined;
    readonly retryAfter: number | undefined;
    /** `quota_exhausted` only: the scope, the limit and the reset time of the quota that ran out. */
    readonly quota: QuotaExceeded | undefined;
    /** True when the same call can succeed later without a change by the user. */
    readonly retryable: boolean;
    constructor(init: SynthwerkErrorInit);
}
export declare function isSynthwerkError(value: unknown): value is SynthwerkError;
export declare function clientError(code: ClientErrorCode, status?: number | null, cause?: unknown): SynthwerkError;
/**
 * A SynthwerkError from a problem object, or `null` when the value is not a problem.
 * `status` is the HTTP status and wins; the body `status` counts only when there is none
 * (an SSE `error` event, where HTTP stays 200).
 */
export declare function fromProblem(value: unknown, status: number | null, retryAfter?: number): SynthwerkError | null;
/**
 * The error for a non-2xx response. Reads the body.
 * - problem+json (or JSON with a valid `code`): the server code.
 * - Anything else (an HTML proxy page): a code from the status. The body never reaches the error.
 */
export declare function fromResponse(response: Response): Promise<SynthwerkError>;
/** Maps a rejected `fetch` (or `read`) to `aborted`, `offline` or `network`. */
export declare function fromFetchFailure(cause: unknown, signal?: AbortSignal): SynthwerkError;
/**
 * The SynthwerkError of a typed-client result that is not 2xx (`{ error, response }` of
 * `sw.api.*`). A problem body gives its code (and `quota`); any other body gives a code
 * from the status. The body itself never reaches the error.
 */
export declare function errorFromResult(body: unknown, response: Response | undefined): SynthwerkError;
