// <synthwerk-vision> settings: the element attributes, then the defaults. The vision card
// does not load the studio widget settings (those are the chat launcher's look and greeting).
import { readAttributes, attributes as shared } from '../config.ts'
import { type Lang, resolveLang } from '../i18n.ts'
import type { Accent, Mode, Theme } from '../settings.ts'

/** What the attributes say. `null` = not set or not an allowed value. */
export interface VisionAttrs {
  appId: string
  apiUrl: string
  lang: string | null
  mode: Mode | null
  theme: Theme | null
  accent: Accent | null
  signInUrl: string | null
  /** `save-photos`: also store each photo for the org (`POST /v1/images`). Off by default. */
  savePhotos: boolean
}

/** The settings the vision card renders with. */
export interface VisionConfig {
  appId: string
  apiUrl: string
  lang: Lang
  mode: Mode
  theme: Theme
  accent: Accent
  signInUrl: string | null
  savePhotos: boolean
}

export const visionAttributes = [
  ...shared.filter((name) => name !== 'position'),
  'save-photos'
] as const

type Name = (typeof visionAttributes)[number]

export function readVisionAttributes(
  get: (name: Name) => string | null,
  base: string
): VisionAttrs {
  const { position: _position, ...rest } = readAttributes(
    (name) => (name === 'position' ? null : get(name)),
    base
  )
  const save = get('save-photos')
  return { ...rest, savePhotos: save !== null && save !== 'false' }
}

/** Attribute wins, then the default. `lang`: attribute, then the browser, then English. */
export function resolveVisionConfig(
  attrs: VisionAttrs,
  browserLanguages: readonly string[] = []
): VisionConfig {
  return {
    appId: attrs.appId,
    apiUrl: attrs.apiUrl,
    lang: resolveLang(attrs.lang, browserLanguages),
    mode: attrs.mode ?? 'system',
    theme: attrs.theme ?? 'default',
    accent: attrs.accent ?? 'flagship',
    signInUrl: attrs.signInUrl,
    savePhotos: attrs.savePhotos
  }
}
