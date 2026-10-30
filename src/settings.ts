// Widget settings from the studio: identity `GET /identity/v1/apps/{appId}/widget-settings`
// (synthwerk#38). Public, no token: a signed-out visitor gets the right look too. Every field
// is checked against the allowed token values; anything else becomes the default. Shared by
// all widgets of the page: one request per app and API, a failure is not retried.
import { type Lang, languages } from './i18n.ts'

export const positions = ['bottom-right', 'bottom-left'] as const
export type Position = (typeof positions)[number]
export const modes = ['system', 'light', 'dark'] as const
export type Mode = (typeof modes)[number]
/** `data-theme` values of `@synthwerk/tokens`. */
export const themes = ['default', 'contrast'] as const
export type Theme = (typeof themes)[number]
/** `data-group` accent groups of `@synthwerk/tokens` that the contract allows. */
export const accents = ['flagship', 'lab', 'ops', 'venture'] as const
export type Accent = (typeof accents)[number]

/** The longest greeting in characters (contracts WidgetSettings). */
export const MAX_GREETING = 280
/** A settings answer is a few hundred bytes. Anything far bigger is not one. */
const MAX_BODY = 4096
/** After this, the widget shows the defaults. */
export const SETTINGS_TIMEOUT_MS = 3000

/**
 * The studio settings after the check. `null` = no valid studio value: use the default.
 * `lang` is `null` for `auto` too (browser language).
 */
export interface StudioSettings {
  position: Position | null
  mode: Mode | null
  theme: Theme | null
  accent: Accent | null
  lang: Lang | null
  /** Plain text. Rendered as a text node, never as HTML. */
  greeting: string | null
}

export const NO_SETTINGS: StudioSettings = Object.freeze({
  position: null,
  mode: null,
  theme: null,
  accent: null,
  lang: null,
  greeting: null
})

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null
}

/** Trimmed greeting when it is valid plain text of 1 to 280 characters, else `null`. */
export function cleanGreeting(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (text === '' || [...text].length > MAX_GREETING) return null
  // Control characters (other than a line break) and bidi overrides are refused, not stripped.
  if (/[\p{Cc}‪-‮⁦-⁩]/u.test(text.replaceAll('\n', ''))) return null
  return text
}

/** Checks an answer body field by field. Not an object: all defaults. */
export function parseSettings(body: unknown): StudioSettings {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return NO_SETTINGS
  const raw = body as Record<string, unknown>
  return {
    position: oneOf(raw.position, positions),
    mode: oneOf(raw.mode, modes),
    theme: oneOf(raw.theme, themes),
    accent: oneOf(raw.accent, accents),
    lang: oneOf(raw.lang, languages),
    greeting: cleanGreeting(raw.greeting)
  }
}

export interface LoadOptions {
  apiUrl: string
  appId: string
  fetch?: (input: Request) => Promise<Response>
  timeoutMs?: number
}

export function settingsUrl(apiUrl: string, appId: string): string {
  return `${apiUrl.replace(/\/+$/, '')}/identity/v1/apps/${encodeURIComponent(appId)}/widget-settings`
}

async function fetchSettings(options: LoadOptions): Promise<StudioSettings> {
  const doFetch = options.fetch ?? ((input: Request) => globalThis.fetch(input))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SETTINGS_TIMEOUT_MS)
  try {
    const response = await doFetch(
      new Request(settingsUrl(options.apiUrl, options.appId), {
        method: 'GET',
        // No Authorization header and no cookie: the settings are public.
        headers: { accept: 'application/json' },
        credentials: 'omit',
        mode: 'cors',
        signal: controller.signal
      })
    )
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      return NO_SETTINGS
    }
    const text = await response.text()
    if (text.length > MAX_BODY) return NO_SETTINGS
    return parseSettings(JSON.parse(text))
  } catch {
    // Network error, timeout, bad JSON: the defaults, no error shown.
    return NO_SETTINGS
  } finally {
    clearTimeout(timer)
  }
}

const cache = new Map<string, Promise<StudioSettings>>()

/**
 * The studio settings of an app. One request per API and app for the life of the page,
 * shared by every widget on it. It never throws: a failure gives `NO_SETTINGS`, and the
 * failure is kept too, so a broken API gets no retry storm. A reload asks again.
 */
export function loadSettings(options: LoadOptions): Promise<StudioSettings> {
  if (options.appId === '' || options.apiUrl === '') return Promise.resolve(NO_SETTINGS)
  const key = `${options.apiUrl.replace(/\/+$/, '')}\n${options.appId}`
  let pending = cache.get(key)
  if (!pending) {
    pending = fetchSettings(options)
    cache.set(key, pending)
  }
  return pending
}

/** Tests only: forget the loaded settings. */
export function clearSettingsCache(): void {
  cache.clear()
}
