// Widget settings from the element attributes.
import { type Lang, resolveLang } from './i18n.ts'

export const modes = ['system', 'light', 'dark'] as const
export type Mode = (typeof modes)[number]
export const positions = ['bottom-right', 'bottom-left'] as const
export type Position = (typeof positions)[number]

export interface WidgetConfig {
  appId: string
  apiUrl: string
  lang: Lang
  mode: Mode
  position: Position
  /** A page where the visitor signs in. Only `https:`, or `http:` on the same origin. */
  signInUrl: string | null
}

export const attributes = ['app-id', 'api-url', 'lang', 'mode', 'position', 'sign-in-url'] as const

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback
}

/** The sign-in link when it is safe to show, else `null`. */
export function safeSignInUrl(raw: string | null, base: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw, base)
    if (url.protocol === 'https:') return url.href
    if (url.protocol === 'http:' && url.origin === new URL(base).origin) return url.href
    return null
  } catch {
    return null
  }
}

export function readConfig(
  get: (name: (typeof attributes)[number]) => string | null,
  env: { languages: readonly string[]; base: string }
): WidgetConfig {
  return {
    appId: (get('app-id') ?? '').trim(),
    apiUrl: (get('api-url') ?? '').trim(),
    lang: resolveLang(get('lang'), env.languages),
    mode: oneOf(get('mode'), modes, 'system'),
    position: oneOf(get('position'), positions, 'bottom-right'),
    signInUrl: safeSignInUrl(get('sign-in-url'), env.base)
  }
}
