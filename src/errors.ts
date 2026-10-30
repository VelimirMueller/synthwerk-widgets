// Maps every failure to one UI state. The SDK gives a SynthwerkError with a stable code.
import { isSynthwerkError, SynthwerkError } from '@synthwerk/sdk'

export type ErrorKind =
  | 'signed_out'
  | 'offline'
  | 'quota'
  | 'busy'
  | 'not_allowed'
  | 'too_long'
  | 'interrupted'
  | 'generic'

export interface WidgetError {
  kind: ErrorKind
  /** Quota only: when the quota is full again (from `Retry-After`). */
  resetsAt?: Date
}

const KIND_BY_CODE: Record<string, ErrorKind> = {
  unauthenticated: 'signed_out',
  offline: 'offline',
  quota_exhausted: 'quota',
  too_many_streams: 'busy',
  rate_limited: 'busy',
  model_unavailable: 'busy',
  origin_not_allowed: 'not_allowed',
  forbidden: 'not_allowed',
  input_too_large: 'too_long',
  stream_stalled: 'interrupted',
  stream_interrupted: 'interrupted'
}

/** The UI state of a failure. `now` is in milliseconds since the epoch. */
export function classify(error: unknown, now: number = Date.now()): WidgetError {
  if (!isSynthwerkError(error)) return { kind: 'generic' }
  const kind = KIND_BY_CODE[error.code] ?? 'generic'
  if (kind === 'quota' && error.retryAfter !== undefined) {
    return { kind, resetsAt: new Date(now + error.retryAfter * 1000) }
  }
  return { kind }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CODE = /^[a-z][a-z0-9_]{0,63}$/

/**
 * A SynthwerkError from a problem body and its response. The body is never copied into
 * the error: only the stable `code` and a short `title` (no prompt, no token).
 */
export function problemError(body: unknown, response: Response | undefined): SynthwerkError {
  const status = response?.status ?? null
  const raw = response?.headers.get('retry-after')?.trim()
  const retryAfter = raw && /^\d+$/.test(raw) ? Number(raw) : undefined
  const code =
    isRecord(body) && typeof body.code === 'string' && CODE.test(body.code)
      ? body.code
      : status === 401
        ? 'unauthenticated'
        : status === 403
          ? 'forbidden'
          : status === 429
            ? 'rate_limited'
            : 'bad_gateway'
  const title = isRecord(body) && typeof body.title === 'string' ? body.title.slice(0, 128) : code
  return new SynthwerkError({
    code,
    title,
    status,
    ...(retryAfter === undefined ? {} : { retryAfter })
  })
}
