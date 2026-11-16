import { isSynthwerkError } from '@synthwerk/sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { WidgetHost } from '../../src/components/use-session.ts'
import type { AttributeConfig } from '../../src/config.ts'
import { define, type SynthwerkChatElement, TAG } from '../../src/element.ts'
import { createFrameBridge, frameConfig, parentOriginOf } from '../../src/frame/child.ts'
import { createTokenBroker, mountFrame } from '../../src/frame/parent.ts'
import { frameMessage, PROTOCOL, parentMessage, tokenOrigin } from '../../src/frame/protocol.ts'
import { clearSettingsCache } from '../../src/settings.ts'
import { API, APP_ID, fakeFetch, json, routes } from '../support/api.ts'

const HOST = 'https://shop.example'
const WIDGETS = 'https://edge.example'

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const tokenFor = (origin: string) =>
  `${b64url({ alg: 'ES256' })}.${b64url({ 'synthwerk:origin': origin })}.sig`

const flush = async (rounds = 6) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0))
}

afterEach(() => {
  clearSettingsCache()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('protocol (widgets#33)', () => {
  it('unknown or malformed data - not a message', () => {
    expect(frameMessage(null)).toBeNull()
    expect(frameMessage({ type: 'ready' })).toBeNull()
    expect(frameMessage({ sw: 'other/1', type: 'ready' })).toBeNull()
    expect(frameMessage({ sw: PROTOCOL, type: 'token-request', id: -1, refresh: false })).toBeNull()
    expect(
      frameMessage({ sw: PROTOCOL, type: 'layout', open: 'yes', position: 'x', ready: true })
    ).toBeNull()
    expect(parentMessage({ sw: PROTOCOL, type: 'token', id: 1, token: 7 })).toBeNull()
    expect(
      parentMessage({ sw: PROTOCOL, type: 'init', attrs: { appId: 1 }, compact: false })
    ).toBeNull()
  })

  it('a frame message - only the known fields are kept', () => {
    expect(
      frameMessage({ sw: PROTOCOL, type: 'token-request', id: 3, refresh: true, extra: 'x' })
    ).toEqual({
      sw: PROTOCOL,
      type: 'token-request',
      id: 3,
      refresh: true
    })
  })

  it('token claim - read from the payload, null when missing or broken', () => {
    expect(tokenOrigin(tokenFor(HOST))).toBe(HOST)
    expect(tokenOrigin(`${b64url({})}.${b64url({ sub: 'u' })}.s`)).toBeNull()
    expect(tokenOrigin('widget.jwt')).toBeNull()
    expect(tokenOrigin('')).toBeNull()
  })
})

/** A fake window pair: what the frame posts, and a way to send it messages. */
function frameWindows() {
  const parent = { postMessage: vi.fn() } as unknown as Window
  const target = new EventTarget()
  const self = Object.assign(target, {
    location: new URL(`${WIDGETS}/widgets/v0.4.0/synthwerk-chat-frame.html`)
  }) as unknown as Window
  const send = (data: unknown, origin = HOST, source: unknown = parent) =>
    target.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }))
  return { parent, self, send }
}

describe('frame side (widgets#33)', () => {
  function bridge() {
    const w = frameWindows()
    const onInit = vi.fn()
    const onSession = vi.fn()
    const b = createFrameBridge({
      self: w.self,
      parent: w.parent,
      parentOrigin: HOST,
      frameOrigin: WIDGETS,
      onInit,
      onCompact: vi.fn(),
      onSession,
      timeoutMs: 200
    })
    const lastId = () => {
      const calls = (w.parent.postMessage as ReturnType<typeof vi.fn>).mock.calls
      const last = calls.at(-1)?.[0] as { id: number } | undefined
      if (!last) throw new Error('nothing posted')
      return last.id
    }
    return { ...w, b, onInit, onSession, lastId }
  }

  const init = {
    sw: PROTOCOL,
    type: 'init',
    attrs: {
      appId: APP_ID,
      apiUrl: `${WIDGETS}/`,
      lang: null,
      mode: null,
      position: null,
      theme: null,
      accent: null
    },
    languages: ['de'],
    compact: false
  }

  it('messages from another origin or another window - ignored', () => {
    const { send, onInit, onSession } = bridge()
    send(init, 'https://evil.example')
    send(init, HOST, {})
    send({ sw: PROTOCOL, type: 'session' }, 'https://evil.example')
    expect(onInit).not.toHaveBeenCalled()
    expect(onSession).not.toHaveBeenCalled()
    send(init)
    send(init)
    expect(onInit).toHaveBeenCalledOnce()
  })

  it('posts only to the parent origin', async () => {
    const { b, parent, send, lastId } = bridge()
    const pending = b.signedIn()
    expect(parent.postMessage).toHaveBeenCalledWith(
      { sw: PROTOCOL, type: 'auth-request', id: 1 },
      HOST
    )
    send({ sw: PROTOCOL, type: 'auth', id: lastId(), signedIn: true })
    await expect(pending).resolves.toBe(true)
  })

  it('a token answer from an unknown origin - ignored, the request times out', async () => {
    const { b, send, lastId } = bridge()
    const pending = b.token(false)
    send(
      { sw: PROTOCOL, type: 'token', id: lastId(), token: tokenFor(HOST) },
      'https://evil.example'
    )
    await expect(pending).rejects.toMatchObject({ code: 'network' })
  })

  it('a token bound to another page - refused as origin_not_allowed', async () => {
    const { b, send, lastId } = bridge()
    const pending = b.token(false)
    send({ sw: PROTOCOL, type: 'token', id: lastId(), token: tokenFor('https://evil.example') })
    const error = await pending.catch((e: unknown) => e)
    expect(isSynthwerkError(error) && error.code).toBe('origin_not_allowed')
  })

  it('a failed trade - the error comes back as a SynthwerkError', async () => {
    const { b, send, lastId } = bridge()
    const pending = b.token(true)
    send({
      sw: PROTOCOL,
      type: 'token',
      id: lastId(),
      token: null,
      error: { code: 'quota_exhausted', status: 429, retryAfter: 60 }
    })
    await expect(pending).rejects.toMatchObject({
      code: 'quota_exhausted',
      status: 429,
      retryAfter: 60
    })
  })

  it('an API on another origin than the frame - counts as not set', () => {
    const base = `${WIDGETS}/widgets/v0.4.0/synthwerk-chat-frame.html`
    expect(
      frameConfig({ ...init.attrs, apiUrl: 'https://other.example' }, WIDGETS, base).apiUrl
    ).toBe('')
    expect(frameConfig(init.attrs, WIDGETS, base).apiUrl).toBe(`${WIDGETS}/`)
    expect(frameConfig({ ...init.attrs, mode: 'iframe' }, WIDGETS, base).mode).toBeNull()
  })

  it('parent origin - only from #origin=, only when framed, only the canonical form', () => {
    const page = (hash: string, framed = true) => {
      const win = { location: new URL(`${WIDGETS}/f.html${hash}`) } as unknown as {
        parent: unknown
        location: URL
      }
      win.parent = framed ? {} : win
      return win as unknown as Window
    }
    expect(parentOriginOf(page(`#origin=${encodeURIComponent(HOST)}`))).toBe(HOST)
    expect(parentOriginOf(page(`#origin=${encodeURIComponent(HOST)}`, false))).toBeNull()
    expect(parentOriginOf(page(`#origin=${encodeURIComponent(`${HOST}/path`)}`))).toBeNull()
    expect(parentOriginOf(page('#origin=javascript%3Aalert(1)'))).toBeNull()
    expect(parentOriginOf(page(''))).toBeNull()
  })
})

describe('host side (widgets#33)', () => {
  function attrs(): AttributeConfig {
    return reactive({
      appId: APP_ID,
      apiUrl: API,
      lang: null,
      mode: null,
      position: null,
      theme: null,
      accent: null,
      signInUrl: null
    })
  }

  function mount(getUserToken: WidgetHost['getUserToken'] = null) {
    const api = fakeFetch([
      routes.settings(() => json({ position: 'bottom-left' })),
      routes.token(() =>
        json({ access_token: tokenFor(HOST), token_type: 'Bearer', expires_in: 600 }, 201)
      )
    ])
    const requestSignIn = vi.fn()
    const host = reactive<WidgetHost>({
      version: 0,
      getUserToken,
      languages: ['en'],
      requestSignIn,
      fetch: api.fetch
    })
    const target = new EventTarget()
    const win = Object.assign(target, { location: new URL(`${HOST}/page`) }) as unknown as Window
    const el = document.createElement('div')
    document.body.append(el)
    const root = el.attachShadow({ mode: 'open' })
    const unmount = mountFrame(root, {
      attrs: attrs(),
      host,
      frameUrl: new URL(`${WIDGETS}/widgets/v0.4.0/synthwerk-chat-frame.html`),
      window: win
    })
    const iframe = root.querySelector('iframe') as HTMLIFrameElement
    const frameWindow = { postMessage: vi.fn() }
    Object.defineProperty(iframe, 'contentWindow', { value: frameWindow })
    const send = (data: unknown, origin = WIDGETS, source: unknown = frameWindow) =>
      target.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }))
    const posted = () =>
      frameWindow.postMessage.mock.calls.map((c) => c[0] as { type: string; token?: string })
    return { api, host, iframe, send, posted, requestSignIn, frameWindow, unmount }
  }

  it('the iframe - widget host URL with the page origin, sandboxed, no top navigation', () => {
    const { iframe } = mount()
    expect(iframe.src).toBe(
      `${WIDGETS}/widgets/v0.4.0/synthwerk-chat-frame.html#origin=${encodeURIComponent(HOST)}`
    )
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation')
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts')
  })

  it('messages from another origin or another window - ignored', async () => {
    const { send, posted, requestSignIn } = mount(() => 'user-token')
    send({ sw: PROTOCOL, type: 'ready' }, 'https://evil.example')
    send({ sw: PROTOCOL, type: 'ready' }, WIDGETS, {})
    send({ sw: PROTOCOL, type: 'sign-in' }, HOST, window)
    await flush()
    expect(posted()).toEqual([])
    expect(requestSignIn).not.toHaveBeenCalled()
  })

  it('ready - init with the absolute API URL, then the studio settings; the frame posts go to the widget host only', async () => {
    const { send, posted, frameWindow, iframe } = mount()
    send({ sw: PROTOCOL, type: 'ready' })
    await flush()
    expect(posted().map((m) => m.type)).toEqual(['init', 'settings'])
    expect(frameWindow.postMessage.mock.calls.every((c) => c[1] === WIDGETS)).toBe(true)
    expect((posted()[0] as unknown as { attrs: { apiUrl: string } }).attrs.apiUrl).toBe(`${API}/`)
    expect(iframe.dataset.position).toBe('bottom-left')
  })

  it('token request - the parent trades the user token, the frame gets only the widget token', async () => {
    const { send, posted, api } = mount(() => 'user-token')
    send({ sw: PROTOCOL, type: 'ready' })
    send({ sw: PROTOCOL, type: 'token-request', id: 1, refresh: false })
    await flush()
    const answer = posted().find((m) => m.type === 'token')
    expect(answer?.token).toBe(tokenFor(HOST))
    expect(JSON.stringify(posted())).not.toContain('user-token')
    expect(
      api.calls.find((r) => r.url.includes('widget-tokens'))?.headers.get('authorization')
    ).toBe('Bearer user-token')
  })

  it('host session change - the frame hears it, the cached token is gone', async () => {
    const { send, posted, host, api } = mount(() => 'user-token')
    send({ sw: PROTOCOL, type: 'ready' })
    send({ sw: PROTOCOL, type: 'token-request', id: 1, refresh: false })
    await flush()
    host.version++
    await flush()
    expect(posted().some((m) => m.type === 'session')).toBe(true)
    send({ sw: PROTOCOL, type: 'token-request', id: 2, refresh: false })
    await flush()
    expect(api.calls.filter((r) => r.url.includes('widget-tokens'))).toHaveLength(2)
  })

  it('sign-in from the frame - the host gets the sign-in request', async () => {
    const { send, requestSignIn } = mount()
    send({ sw: PROTOCOL, type: 'ready' })
    send({ sw: PROTOCOL, type: 'sign-in' })
    await flush()
    expect(requestSignIn).toHaveBeenCalledOnce()
  })

  it('unmount - the iframe is gone and later messages get no answer', async () => {
    const { send, posted, unmount, iframe } = mount()
    unmount()
    send({ sw: PROTOCOL, type: 'ready' })
    await flush()
    expect(iframe.isConnected).toBe(false)
    expect(posted()).toEqual([])
  })
})

describe('token broker (widgets#33)', () => {
  it('one trade per user token, reused until 30 s before expiry, reset drops it', async () => {
    let clock = 0
    const api = fakeFetch([
      routes.token(() =>
        json({ access_token: tokenFor(HOST), token_type: 'Bearer', expires_in: 3600 }, 201)
      )
    ])
    const broker = createTokenBroker({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => () => 'u1',
      fetch: api.fetch,
      now: () => clock
    })
    await Promise.all([broker.token(false), broker.token(false)])
    expect(api.calls).toHaveLength(1)
    clock = (900 - 31) * 1000
    await broker.token(false)
    expect(api.calls).toHaveLength(1)
    clock = (900 - 29) * 1000
    await broker.token(false)
    expect(api.calls).toHaveLength(2)
    broker.reset()
    await broker.token(false)
    expect(api.calls).toHaveLength(3)
  })

  it('signed out - null and no request', async () => {
    const api = fakeFetch([])
    const broker = createTokenBroker({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => null,
      fetch: api.fetch
    })
    await expect(broker.token(false)).resolves.toBeNull()
    expect(api.calls).toHaveLength(0)
  })

  it('403 origin_not_allowed - throws the readable error', async () => {
    const api = fakeFetch([
      routes.token(() => json({ title: 'no', status: 403, code: 'origin_not_allowed' }, 403))
    ])
    const broker = createTokenBroker({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => () => 'u1',
      fetch: api.fetch
    })
    await expect(broker.token(false)).rejects.toMatchObject({
      code: 'origin_not_allowed',
      status: 403
    })
  })
})

describe('<synthwerk-chat mode="iframe"> (widgets#33)', () => {
  it('iframe mode - only an iframe in the shadow root; another mode mounts the widget again', async () => {
    define()
    vi.stubGlobal('fetch', fakeFetch([]).fetch)
    const el = document.createElement(TAG) as SynthwerkChatElement
    el.setAttribute('app-id', APP_ID)
    el.setAttribute('api-url', API)
    el.setAttribute('mode', 'iframe')
    document.body.append(el)
    const root = el.shadowRoot as ShadowRoot
    expect(root.querySelector('iframe.sw-frame')).not.toBeNull()
    expect(root.querySelector('.sw-root')).toBeNull()

    el.setAttribute('mode', 'dark')
    await flush()
    expect(root.querySelector('iframe')).toBeNull()
    expect(root.querySelector('.sw-root')?.getAttribute('data-mode')).toBe('dark')

    el.setAttribute('mode', 'iframe')
    await flush()
    expect(root.querySelector('iframe.sw-frame')).not.toBeNull()
  })
})
