// The host page side of <synthwerk-chat mode="iframe"> (widgets#33, D-13). The element shows
// an iframe of the chat frame page on the widget host and answers its requests:
// - The parent keeps the user token. It trades it for a widget token (bound to the host page
//   origin, which the app allow-list knows) and hands only the widget token to the frame.
// - The parent loads the public studio settings (identity answers only to the host origin).
// - The frame renders the chat. Messages and answers never leave the frame.
import { errorFromResult, isSynthwerkError, requestWidgetToken } from '@synthwerk/sdk'
import { effectScope, watch } from 'vue'
import type { WidgetHost } from '../components/use-session.ts'
import type { AttributeConfig } from '../config.ts'
import { type GetUserToken, userToken } from '../session.ts'
import { loadSettings, NO_SETTINGS, oneOf, positions } from '../settings.ts'
import {
  FRAME_FILE,
  type FrameError,
  type FrameMessage,
  frameMessage,
  originOf,
  type ParentMessage,
  PROTOCOL
} from './protocol.ts'

/** A new widget token this many seconds before the old one expires. */
const EXPIRY_MARGIN_S = 30
/** The contract maximum of `expires_in`. */
const MAX_EXPIRES_S = 900
/** Same breakpoint as the full-screen sheet of the widget. */
const COMPACT = '(max-width: 639.98px)'

export interface TokenBroker {
  /** The widget token, `null` when signed out. Throws a SynthwerkError when the trade fails. */
  token(refresh: boolean): Promise<string | null>
  /** Drops the cached token and any running trade (sign-out, other user). */
  reset(): void
}

export interface TokenBrokerOptions {
  appId: string
  apiUrl: string
  getUserToken: () => GetUserToken | null
  fetch?: (input: Request) => Promise<Response>
  now?: () => number
}

/**
 * The widget-token trade of the parent, with the session rules of the SDK
 * `createWidgetSession`: one cached token per user token, one trade per user token at a
 * time, and a reset that a running trade never undoes.
 */
export function createTokenBroker(options: TokenBrokerOptions): TokenBroker {
  const now = options.now ?? Date.now
  const identityUrl = `${options.apiUrl.replace(/\/+$/, '')}/identity`
  let cached: { token: string; expiresAt: number; user: string } | null = null
  let pending: { user: string; promise: Promise<string | null> } | null = null
  let generation = 0

  async function exchange(user: string): Promise<string | null> {
    const started = generation
    const result = await requestWidgetToken({
      identityUrl,
      appId: options.appId,
      userToken: user,
      ...(options.fetch ? { fetch: options.fetch } : {})
    })
    if (result.response.status === 401) {
      if (started === generation && cached?.user === user) cached = null
      return null
    }
    if (!result.data) throw errorFromResult(result.error, result.response)
    if (started !== generation) return null
    const seconds = Math.min(result.data.expiresIn, MAX_EXPIRES_S)
    cached = { token: result.data.token, expiresAt: now() + seconds * 1000, user }
    return result.data.token
  }

  return {
    async token(refresh) {
      const started = generation
      const user = await userToken(options.getUserToken())
      if (started !== generation) return null
      if (!user) {
        cached = null
        return null
      }
      const valid = cached && cached.expiresAt - EXPIRY_MARGIN_S * 1000 > now()
      if (!refresh && valid && cached?.user === user) return cached.token
      if (pending?.user === user) return pending.promise
      const run = { user, promise: Promise.resolve<string | null>(null) }
      run.promise = exchange(user).finally(() => {
        if (pending === run) pending = null
      })
      pending = run
      return run.promise
    },
    reset() {
      generation++
      cached = null
      pending = null
    }
  }
}

function toFrameError(error: unknown): FrameError {
  if (!isSynthwerkError(error)) return { code: 'network', status: null }
  return error.retryAfter === undefined
    ? { code: error.code, status: error.status }
    : { code: error.code, status: error.status, retryAfter: error.retryAfter }
}

/** The URL of the frame page next to the running bundle. */
export function frameUrlOf(bundleUrl: string): URL {
  // A variable, not a literal: Vite must not treat this as an asset import.
  const file = FRAME_FILE
  return new URL(file, bundleUrl)
}

export interface MountFrameOptions {
  attrs: AttributeConfig
  host: WidgetHost
  frameUrl: URL
  /** The window of the host page. Tests pass a fake. */
  window?: Window
}

/** Shows the frame in the shadow root and answers it. Returns the unmount function. */
export function mountFrame(root: ShadowRoot, options: MountFrameOptions): () => void {
  const win = options.window ?? window
  const { attrs, host } = options
  const frameOrigin = originOf(options.frameUrl.href)
  const scope = effectScope()
  let teardown: (() => void) | null = null

  function start(): void {
    teardown?.()
    teardown = frame()
  }

  function frame(): () => void {
    const doc = root.ownerDocument
    const iframe = doc.createElement('iframe')
    const apiUrl = attrs.apiUrl === '' ? '' : (resolveUrl(attrs.apiUrl, win.location.href) ?? '')
    if (attrs.apiUrl !== '' && apiUrl === '') {
      console.warn('synthwerk-chat: api-url is not an http(s) URL, the chat shows a config error')
    }
    const broker = createTokenBroker({
      appId: attrs.appId,
      apiUrl,
      getUserToken: () => host.getUserToken,
      ...(host.fetch ? { fetch: host.fetch } : {})
    })
    const compact = win.matchMedia?.(COMPACT)
    let ready = false
    let closed = false

    if (frameOrigin === win.location.origin) {
      console.warn(
        'synthwerk-chat: the frame page has the origin of this page, so it is not isolated'
      )
    }
    iframe.className = 'sw-frame'
    iframe.title = 'Chat'
    // Scripts, its own origin (for its llm calls), the composer form and new-tab links.
    // No top navigation, no downloads, no modals, no camera or microphone.
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    )
    iframe.setAttribute('allow', '')
    iframe.referrerPolicy = 'no-referrer'
    const params = new URLSearchParams({ origin: win.location.origin })
    iframe.src = `${options.frameUrl.href.split('#')[0]}#${params}`
    place(oneOf(attrs.position, positions) ?? 'bottom-right')
    if (compact?.matches) iframe.dataset.compact = ''

    function place(position: string): void {
      iframe.dataset.position = oneOf(position, positions) ?? 'bottom-right'
    }

    function post(message: ParentMessage): void {
      // Before `ready` the iframe may still show about:blank: nothing to tell yet.
      if (closed || !ready || !frameOrigin) return
      iframe.contentWindow?.postMessage(message, frameOrigin)
    }

    async function answer(message: FrameMessage): Promise<void> {
      switch (message.type) {
        case 'ready': {
          // Each frame document says ready once. A reloaded frame page gets init again.
          ready = true
          post({
            sw: PROTOCOL,
            type: 'init',
            attrs: {
              appId: attrs.appId,
              apiUrl,
              lang: attrs.lang,
              mode: attrs.mode,
              position: attrs.position,
              theme: attrs.theme,
              accent: attrs.accent
            },
            languages: [...host.languages],
            compact: compact?.matches ?? false
          })
          // loadSettings never rejects; keep the frame going on any surprise anyway.
          const settings = await loadSettings({
            appId: attrs.appId,
            apiUrl,
            ...(host.fetch ? { fetch: host.fetch } : {})
          }).catch(() => NO_SETTINGS)
          if (!attrs.position && settings.position) place(settings.position)
          post({ sw: PROTOCOL, type: 'settings', settings })
          return
        }
        case 'auth-request': {
          const signedIn = (await userToken(host.getUserToken)) !== null
          post({ sw: PROTOCOL, type: 'auth', id: message.id, signedIn })
          return
        }
        case 'token-request':
          try {
            const token = await broker.token(message.refresh)
            post({ sw: PROTOCOL, type: 'token', id: message.id, token })
          } catch (error) {
            post({
              sw: PROTOCOL,
              type: 'token',
              id: message.id,
              token: null,
              error: toFrameError(error)
            })
          }
          return
        case 'layout':
          place(message.position)
          iframe.toggleAttribute('data-open', message.open)
          iframe.toggleAttribute('data-ready', message.ready)
          return
        case 'sign-in':
          if (attrs.signInUrl) win.location.assign(attrs.signInUrl)
          else host.requestSignIn()
          return
      }
    }

    function onMessage(event: MessageEvent): void {
      // Only the frame window, only from the widget host origin. Anything else: ignored.
      if (!frameOrigin || event.origin !== frameOrigin) return
      if (!iframe.contentWindow || event.source !== iframe.contentWindow) return
      const message = frameMessage(event.data)
      // answer() handles its own failures; a surprise must not become an unhandled rejection.
      if (message) answer(message).catch(() => undefined)
    }

    function onCompact(event: MediaQueryListEvent): void {
      iframe.toggleAttribute('data-compact', event.matches)
      post({ sw: PROTOCOL, type: 'compact', compact: event.matches })
    }

    win.addEventListener('message', onMessage)
    compact?.addEventListener?.('change', onCompact)
    root.append(iframe)
    const stopSession = watch(
      () => host.version,
      () => {
        broker.reset()
        post({ sw: PROTOCOL, type: 'session' })
      }
    )

    return () => {
      closed = true
      stopSession()
      broker.reset()
      win.removeEventListener('message', onMessage)
      compact?.removeEventListener?.('change', onCompact)
      iframe.remove()
    }
  }

  scope.run(() => {
    // New attributes: a new frame. The old one and its state go away.
    watch(
      () => [
        attrs.appId,
        attrs.apiUrl,
        attrs.lang,
        attrs.mode,
        attrs.position,
        attrs.theme,
        attrs.accent,
        attrs.signInUrl
      ],
      start
    )
  })
  start()

  return () => {
    scope.stop()
    teardown?.()
    teardown = null
  }
}

function resolveUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
