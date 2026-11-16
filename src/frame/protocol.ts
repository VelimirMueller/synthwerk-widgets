// The postMessage protocol between <synthwerk-chat mode="iframe"> on the host page (parent)
// and the chat frame page on the widget host (frame), widgets#33 and D-13.
// Rules on both sides:
// - A message counts only when `event.source` is the expected window AND `event.origin` is the
//   expected origin. Everything else is ignored without an answer.
// - A message is a plain object with `sw: PROTOCOL` and a known `type`. The parent never sends
//   the user token. The frame never sends a message text, an answer or the widget token.
import type { StudioSettings } from '../settings.ts'

/** Marks every message of this protocol. */
export const PROTOCOL = 'synthwerk-chat/1'

/** The frame page next to the bundle on the widget host (public/synthwerk-chat-frame.html). */
export const FRAME_FILE = 'synthwerk-chat-frame.html'

/** The attributes the parent hands to the frame. `signInUrl` stays on the parent. */
export interface FrameAttrs {
  appId: string
  /** Absolute edge URL. The frame calls llm here, so it must be the frame origin. */
  apiUrl: string
  lang: string | null
  mode: string | null
  position: string | null
  theme: string | null
  accent: string | null
}

/** A failed token trade, as the frame rebuilds it (SynthwerkError fields). */
export interface FrameError {
  code: string
  status: number | null
  retryAfter?: number
}

/** Parent → frame. */
export type ParentMessage =
  | { sw: typeof PROTOCOL; type: 'init'; attrs: FrameAttrs; languages: string[]; compact: boolean }
  | { sw: typeof PROTOCOL; type: 'settings'; settings: StudioSettings }
  | { sw: typeof PROTOCOL; type: 'compact'; compact: boolean }
  | { sw: typeof PROTOCOL; type: 'session' }
  | { sw: typeof PROTOCOL; type: 'auth'; id: number; signedIn: boolean }
  | { sw: typeof PROTOCOL; type: 'token'; id: number; token: string | null; error?: FrameError }

/** Frame → parent. */
export type FrameMessage =
  | { sw: typeof PROTOCOL; type: 'ready' }
  | { sw: typeof PROTOCOL; type: 'auth-request'; id: number }
  | { sw: typeof PROTOCOL; type: 'token-request'; id: number; refresh: boolean }
  | { sw: typeof PROTOCOL; type: 'layout'; open: boolean; position: string; ready: boolean }
  | { sw: typeof PROTOCOL; type: 'sign-in' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
const isStringOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'

/** The frame message, or `null` when the data is not one. */
export function frameMessage(data: unknown): FrameMessage | null {
  if (!isRecord(data) || data.sw !== PROTOCOL) return null
  switch (data.type) {
    case 'ready':
    case 'sign-in':
      return { sw: PROTOCOL, type: data.type }
    case 'auth-request':
      return isId(data.id) ? { sw: PROTOCOL, type: 'auth-request', id: data.id } : null
    case 'token-request':
      return isId(data.id) && typeof data.refresh === 'boolean'
        ? { sw: PROTOCOL, type: 'token-request', id: data.id, refresh: data.refresh }
        : null
    case 'layout':
      return typeof data.open === 'boolean' &&
        typeof data.position === 'string' &&
        typeof data.ready === 'boolean'
        ? {
            sw: PROTOCOL,
            type: 'layout',
            open: data.open,
            position: data.position,
            ready: data.ready
          }
        : null
    default:
      return null
  }
}

function frameAttrs(value: unknown): FrameAttrs | null {
  if (!isRecord(value)) return null
  const { appId, apiUrl, lang, mode, position, theme, accent } = value
  if (typeof appId !== 'string' || typeof apiUrl !== 'string') return null
  if (![lang, mode, position, theme, accent].every(isStringOrNull)) return null
  return {
    appId,
    apiUrl,
    lang: lang as string | null,
    mode: mode as string | null,
    position: position as string | null,
    theme: theme as string | null,
    accent: accent as string | null
  }
}

function frameError(value: unknown): FrameError | undefined {
  if (!isRecord(value) || typeof value.code !== 'string') return undefined
  const status = typeof value.status === 'number' ? value.status : null
  return typeof value.retryAfter === 'number'
    ? { code: value.code, status, retryAfter: value.retryAfter }
    : { code: value.code, status }
}

/**
 * The parent message, or `null` when the data is not one. `settings` stays unknown here:
 * the frame checks every field again with parseSettings.
 */
export function parentMessage(data: unknown):
  | (ParentMessage & { type: Exclude<ParentMessage['type'], 'settings'> })
  | {
      sw: typeof PROTOCOL
      type: 'settings'
      settings: unknown
    }
  | null {
  if (!isRecord(data) || data.sw !== PROTOCOL) return null
  switch (data.type) {
    case 'init': {
      const attrs = frameAttrs(data.attrs)
      const languages = Array.isArray(data.languages)
        ? data.languages.filter((l): l is string => typeof l === 'string').slice(0, 20)
        : []
      if (!attrs || typeof data.compact !== 'boolean') return null
      return { sw: PROTOCOL, type: 'init', attrs, languages, compact: data.compact }
    }
    case 'settings':
      return { sw: PROTOCOL, type: 'settings', settings: data.settings }
    case 'compact':
      return typeof data.compact === 'boolean'
        ? { sw: PROTOCOL, type: 'compact', compact: data.compact }
        : null
    case 'session':
      return { sw: PROTOCOL, type: 'session' }
    case 'auth':
      return isId(data.id) && typeof data.signedIn === 'boolean'
        ? { sw: PROTOCOL, type: 'auth', id: data.id, signedIn: data.signedIn }
        : null
    case 'token': {
      if (!isId(data.id) || !isStringOrNull(data.token)) return null
      const error = frameError(data.error)
      return error
        ? { sw: PROTOCOL, type: 'token', id: data.id, token: null, error }
        : { sw: PROTOCOL, type: 'token', id: data.id, token: data.token }
    }
    default:
      return null
  }
}

/** The canonical origin of a URL, or `null` for anything but http(s). */
export function originOf(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw, base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * The `synthwerk:origin` claim of a widget token, or `null`. The frame reads it without
 * checking the signature: llm checks the signature. The frame only refuses a token that is
 * bound to another page than its parent.
 */
export function tokenOrigin(token: string): string | null {
  const payload = token.split('.')[1]
  if (!payload || payload.length > 8192) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) =>
        c.charCodeAt(0)
      )
    )
    const claims: unknown = JSON.parse(json)
    if (!isRecord(claims)) return null
    const origin = claims['synthwerk:origin']
    return typeof origin === 'string' && origin !== '' ? origin : null
  } catch {
    return null
  }
}
