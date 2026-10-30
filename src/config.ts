// Widget settings: element attributes first, then the studio settings, then the defaults.
import { type Lang, resolveLang } from './i18n.ts'
import {
  type Accent,
  accents,
  type Mode,
  modes,
  oneOf,
  type Position,
  positions,
  type StudioSettings,
  type Theme,
  themes
} from './settings.ts'

export type { Accent, Mode, Position, Theme } from './settings.ts'
export { accents, modes, positions, themes } from './settings.ts'

/** What the attributes say. `null` = not set or not an allowed value: the studio decides. */
export interface AttributeConfig {
  appId: string
  apiUrl: string
  lang: string | null
  mode: Mode | null
  position: Position | null
  theme: Theme | null
  accent: Accent | null
  /** A page where the visitor signs in. Only `https:`, or `http:` on the same origin. */
  signInUrl: string | null
}

/** The settings the widget renders with. */
export interface WidgetConfig {
  appId: string
  apiUrl: string
  lang: Lang
  mode: Mode
  position: Position
  theme: Theme
  accent: Accent
  /** The studio greeting, or `null` for the built-in one. */
  greeting: string | null
  signInUrl: string | null
}

export const attributes = [
  'app-id',
  'api-url',
  'lang',
  'mode',
  'position',
  'theme',
  'accent',
  'sign-in-url'
] as const

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

export function readAttributes(
  get: (name: (typeof attributes)[number]) => string | null,
  base: string
): AttributeConfig {
  const lang = get('lang')?.trim()
  return {
    appId: (get('app-id') ?? '').trim(),
    apiUrl: (get('api-url') ?? '').trim(),
    lang: lang ? lang : null,
    mode: oneOf(get('mode'), modes),
    position: oneOf(get('position'), positions),
    theme: oneOf(get('theme'), themes),
    accent: oneOf(get('accent'), accents),
    signInUrl: safeSignInUrl(get('sign-in-url'), base)
  }
}

/** Attribute wins, then the studio value, then the default. */
export function resolveConfig(
  attrs: AttributeConfig,
  studio: StudioSettings | null,
  browserLanguages: readonly string[] = []
): WidgetConfig {
  return {
    appId: attrs.appId,
    apiUrl: attrs.apiUrl,
    // An unknown `lang` attribute falls through to the studio language, then the browser.
    lang: resolveLang(attrs.lang, [...(studio?.lang ? [studio.lang] : []), ...browserLanguages]),
    mode: attrs.mode ?? studio?.mode ?? 'system',
    position: attrs.position ?? studio?.position ?? 'bottom-right',
    theme: attrs.theme ?? studio?.theme ?? 'default',
    accent: attrs.accent ?? studio?.accent ?? 'flagship',
    greeting: studio?.greeting ?? null,
    signInUrl: attrs.signInUrl
  }
}
