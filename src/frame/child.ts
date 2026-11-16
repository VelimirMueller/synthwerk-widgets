// The frame side of <synthwerk-chat mode="iframe"> (widgets#33, D-13): the chat frame page on
// the widget host. It renders the chat widget and asks its parent for the sign-in state, the
// studio settings and the widget token. It accepts messages only from its parent window on the
// origin named in its URL, and only a token bound to that origin.
import { createSynthwerk, SynthwerkError } from '@synthwerk/sdk'
import { createApp, reactive } from 'vue'
import { ChatWidget } from '../components/chat-widget.ts'
import type { WidgetHost } from '../components/use-session.ts'
import { type AttributeConfig, type attributes, readAttributes } from '../config.ts'
import { NO_SETTINGS, parseSettings, type StudioSettings } from '../settings.ts'
import { applyStyles, widgetStyles } from '../styles.ts'
import {
  type FrameAttrs,
  type FrameMessage,
  originOf,
  PROTOCOL,
  parentMessage,
  tokenOrigin
} from './protocol.ts'

/** The host page loads the settings with a 3 s timeout; after this the frame uses the defaults. */
const SETTINGS_WAIT_MS = 5_000

/** A request to the parent without an answer in this time fails. */
const REQUEST_TIMEOUT_MS = 20_000

/** The frame page CSS: a transparent page without margins. The widget has its own shadow root. */
const PAGE_CSS = 'html,body{margin:0;padding:0;background:transparent;overflow:hidden}'

export interface FrameBridgeOptions {
  /** The frame window. */
  self: Window
  /** The parent window: the only accepted message source. */
  parent: Window
  /** The only accepted message origin, and the origin a token must be bound to. */
  parentOrigin: string
  /** The origin of the frame page. The API must sit here (CSP connect-src 'self'). */
  frameOrigin: string
  /** Called once with the first valid `init`. */
  onInit: (init: { attrs: AttributeConfig; languages: string[]; compact: boolean }) => void
  onCompact: (compact: boolean) => void
  /** The host session changed. */
  onSession: () => void
  timeoutMs?: number
}

export interface FrameBridge {
  post(message: FrameMessage): void
  signedIn(): Promise<boolean>
  token(refresh: boolean): Promise<string | null>
  settings: Promise<StudioSettings>
}

/** The attributes of the chat from an `init`. An API on another origin counts as not set. */
export function frameConfig(attrs: FrameAttrs, frameOrigin: string, base: string): AttributeConfig {
  const values: Record<(typeof attributes)[number], string | null> = {
    'app-id': attrs.appId,
    'api-url': originOf(attrs.apiUrl) === frameOrigin ? attrs.apiUrl : '',
    lang: attrs.lang,
    mode: attrs.mode,
    position: attrs.position,
    theme: attrs.theme,
    accent: attrs.accent,
    // The parent handles sign-in: a link here would navigate the frame.
    'sign-in-url': null
  }
  return readAttributes((name) => values[name], base)
}

export function createFrameBridge(options: FrameBridgeOptions): FrameBridge {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  const waiting = new Map<number, (message: unknown) => void>()
  let nextId = 1
  let initialised = false
  let resolveSettings: (settings: StudioSettings) => void = () => undefined
  const settings = new Promise<StudioSettings>((resolve) => {
    resolveSettings = resolve
  })
  // No settings from the host page in time: the defaults, so the launcher still shows.
  setTimeout(() => resolveSettings(NO_SETTINGS), SETTINGS_WAIT_MS)

  function post(message: FrameMessage): void {
    options.parent.postMessage(message, options.parentOrigin)
  }

  function request<T>(
    make: (id: number) => FrameMessage,
    read: (answer: unknown) => T
  ): Promise<T> {
    const id = nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting.delete(id)
        reject(
          new SynthwerkError({
            code: 'network',
            title: 'No answer from the host page',
            status: null
          })
        )
      }, timeoutMs)
      waiting.set(id, (answer) => {
        clearTimeout(timer)
        waiting.delete(id)
        try {
          resolve(read(answer))
        } catch (error) {
          reject(error)
        }
      })
      post(make(id))
    })
  }

  function onMessage(event: MessageEvent): void {
    // Only the parent window, only from the origin in the frame URL. Anything else: ignored.
    if (event.source !== options.parent || event.origin !== options.parentOrigin) return
    const message = parentMessage(event.data)
    if (!message) return
    switch (message.type) {
      case 'init':
        if (initialised) return
        initialised = true
        options.onInit({
          attrs: frameConfig(message.attrs, options.frameOrigin, options.self.location.href),
          languages: message.languages,
          compact: message.compact
        })
        return
      case 'settings':
        resolveSettings(parseSettings(message.settings))
        return
      case 'compact':
        options.onCompact(message.compact)
        return
      case 'session':
        options.onSession()
        return
      case 'auth':
      case 'token':
        waiting.get(message.id)?.(message)
        return
    }
  }

  options.self.addEventListener('message', onMessage)

  return {
    post,
    settings,
    signedIn() {
      return request(
        (id) => ({ sw: PROTOCOL, type: 'auth-request', id }),
        (answer) => (answer as { signedIn: boolean }).signedIn
      )
    },
    token(refresh) {
      return request(
        (id) => ({ sw: PROTOCOL, type: 'token-request', id, refresh }),
        (answer) => {
          const { token, error } = answer as {
            token: string | null
            error?: { code: string; status: number | null; retryAfter?: number }
          }
          if (error) {
            throw new SynthwerkError({
              code: error.code,
              title: error.code,
              status: error.status,
              ...(error.retryAfter === undefined ? {} : { retryAfter: error.retryAfter })
            })
          }
          if (token === null) return null
          // A token for another page: never use it.
          if (tokenOrigin(token) !== options.parentOrigin) {
            throw new SynthwerkError({
              code: 'origin_not_allowed',
              title: 'origin_not_allowed',
              status: 403
            })
          }
          return token
        }
      )
    }
  }
}

/** The parent origin from the frame URL (`#origin=`), or `null` when the page is not framed right. */
export function parentOriginOf(win: Window): string | null {
  if (win.parent === win) return null
  const raw = new URLSearchParams(win.location.hash.slice(1)).get('origin') ?? ''
  const origin = originOf(raw)
  if (!origin || origin !== raw) return null
  // Chromium and WebKit name the real parent origin: it must be the same.
  const ancestors = win.location.ancestorOrigins
  if (ancestors && ancestors.length > 0 && ancestors[0] !== origin) return null
  return origin
}

/** Starts the chat in the frame page. Does nothing when the page is not framed right. */
export function bootFrame(win: Window = window): void {
  const parentOrigin = parentOriginOf(win)
  if (!parentOrigin) return
  const doc = win.document
  const page = new CSSStyleSheet()
  page.replaceSync(PAGE_CSS)
  doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, page]

  const host = reactive<WidgetHost>({
    version: 0,
    getUserToken: null,
    languages: [],
    frame: 'card',
    requestSignIn: () => bridge.post({ sw: PROTOCOL, type: 'sign-in' }),
    signedIn: () => bridge.signedIn(),
    loadSettings: () => bridge.settings.catch(() => NO_SETTINGS),
    createSession: (config) => ({
      sw: createSynthwerk({
        apiUrl: config.apiUrl,
        auth: { mode: 'token', getToken: ({ refresh }) => bridge.token(refresh) }
      }),
      // The parent holds the token cache. A host session change resets it there.
      reset: () => undefined
    }),
    onLayout: (layout) => bridge.post({ sw: PROTOCOL, type: 'layout', ...layout })
  })

  const bridge = createFrameBridge({
    self: win,
    parent: win.parent,
    parentOrigin,
    frameOrigin: win.location.origin,
    onInit: ({ attrs, languages, compact }) => {
      host.languages = languages
      host.frame = compact ? 'sheet' : 'card'
      const mount = doc.createElement('div')
      doc.body.append(mount)
      const shadow = mount.attachShadow({ mode: 'open' })
      applyStyles(shadow, widgetStyles)
      const inner = doc.createElement('div')
      shadow.append(inner)
      createApp(ChatWidget, { attrs: reactive(attrs), host }).mount(inner)
    },
    onCompact: (compact) => {
      host.frame = compact ? 'sheet' : 'card'
    },
    onSession: () => {
      host.version++
    }
  })
  bridge.post({ sw: PROTOCOL, type: 'ready' })
}
