import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { define, SIGN_IN_EVENT, SynthwerkChatElement, TAG } from '../../src/element.ts'
import {
  API,
  APP_ID,
  answer,
  fakeFetch,
  frame,
  json,
  quotaProblem,
  routes,
  sse
} from '../support/api.ts'

beforeAll(() => define())

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const flush = async (rounds = 6) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0))
}

function embed(attrs: Record<string, string> = {}): SynthwerkChatElement {
  const el = document.createElement(TAG) as SynthwerkChatElement
  el.setAttribute('app-id', APP_ID)
  el.setAttribute('api-url', API)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.append(el)
  return el
}

const root = (el: SynthwerkChatElement) => el.shadowRoot as ShadowRoot
const $ = <T extends Element = HTMLElement>(el: SynthwerkChatElement, selector: string) =>
  root(el).querySelector<T & Element>(selector) as T | null

async function openPanel(el: SynthwerkChatElement): Promise<void> {
  $(el, '.sw-launcher')?.click()
  await flush()
}

async function sendText(el: SynthwerkChatElement, text: string): Promise<void> {
  const input = $<HTMLInputElement>(el, '.sw-composer input')
  if (!input) throw new Error('no input')
  input.value = text
  input.dispatchEvent(new Event('input'))
  await flush(1)
  $<HTMLFormElement>(el, '.sw-composer')?.dispatchEvent(new Event('submit', { cancelable: true }))
  await flush(12)
}

function stubApi(message: Parameters<typeof routes.message>[0]) {
  const api = fakeFetch([routes.token(), routes.conversation(), routes.message(message)])
  vi.stubGlobal('fetch', api.fetch)
  return api
}

describe('<synthwerk-chat>', () => {
  it('script and element only - launcher in an open shadow root with styles', () => {
    const el = embed()
    const launcher = $(el, 'button.sw-launcher')
    expect(launcher?.getAttribute('aria-label')).toBe('Open chat')
    expect(launcher?.getAttribute('aria-expanded')).toBe('false')
    expect(root(el).adoptedStyleSheets.length + root(el).querySelectorAll('style').length).toBe(1)
  })

  it('signed-out visitor opens the chat - sign-in view and no request at all', async () => {
    const api = stubApi(() => answer('x'))
    const el = embed()
    await openPanel(el)
    expect($(el, '.sw-panel')?.dataset.auth).toBe('signed_out')
    expect($(el, '.sw-signin__title')?.textContent).toBe('Sign in to chat')
    expect($(el, '.sw-composer')).toBeNull()
    expect(api.calls).toHaveLength(0)
  })

  it('sign-in button without a sign-in URL - sends the sign-in event to the host', async () => {
    const el = embed()
    const onSignIn = vi.fn()
    document.addEventListener(SIGN_IN_EVENT, onSignIn)
    await openPanel(el)
    $(el, 'button.sw-signin__button')?.click()
    document.removeEventListener(SIGN_IN_EVENT, onSignIn)
    expect(onSignIn).toHaveBeenCalledOnce()
  })

  it('sign-in URL - a link; an unsafe URL is dropped', async () => {
    const el = embed({ 'sign-in-url': 'https://app.example.com/login' })
    await openPanel(el)
    expect($(el, '.sw-signin a')?.getAttribute('href')).toBe('https://app.example.com/login')
    el.setAttribute('sign-in-url', 'javascript:alert(1)')
    await flush()
    expect($(el, '.sw-signin a')).toBeNull()
  })

  it('signed-in user - the answer streams into the view', async () => {
    const api = stubApi(() => answer('Hello', ' there'))
    const el = embed()
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    await sendText(el, 'Hi')
    const messages = [...root(el).querySelectorAll('.sw-msg')].map((m) => m.textContent)
    expect(messages).toEqual(['You: Hi', 'Assistant: Hello there'])
    const llm = api.calls.filter((r) => r.url.includes('/llm/'))
    expect(llm.map((r) => r.headers.get('authorization'))).toEqual([
      'Bearer widget.jwt.token',
      'Bearer widget.jwt.token'
    ])
  })

  it('raw HTML in model output - shown as text', async () => {
    stubApi(() => answer('<img src=x onerror="alert(1)">', '<b>bold</b>'))
    const el = embed()
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    await sendText(el, 'Hi')
    const md = $(el, '.sw-msg--assistant .sw-md')
    expect(md?.querySelector('img, b')).toBeNull()
    expect(md?.textContent).toBe('<img src=x onerror="alert(1)"><b>bold</b>')
  })

  it('quota used up - quota state with the reset time, input blocked', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 29, 13, 0).getTime())
    stubApi(() => json(quotaProblem, 429, { 'retry-after': '3900' }))
    const el = embed()
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    await sendText(el, 'Hi')
    expect($(el, '.sw-banner--quota')?.textContent).toBe(
      'You used all of your chat quota. It resets at 14:05.'
    )
    expect($<HTMLInputElement>(el, '.sw-composer input')?.disabled).toBe(true)
    expect($<HTMLInputElement>(el, '.sw-composer input')?.value).toBe('Hi')
  })

  it('error mid-stream - error state with a retry button that clears it', async () => {
    stubApi(() =>
      sse([
        frame('delta', { text: 'Par' }),
        frame('error', { code: 'model_unavailable', title: 'Down', status: 503 })
      ])
    )
    const el = embed()
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    await sendText(el, 'Hi')
    expect($(el, '.sw-banner--busy')?.getAttribute('role')).toBe('alert')
    expect($(el, '.sw-msg--assistant.sw-msg--error')?.textContent).toContain('Par')
    $(el, '.sw-banner button')?.click()
    await flush()
    expect($(el, '.sw-banner')).toBeNull()
  })

  it('browser goes offline - offline state, send disabled', async () => {
    const el = embed()
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    window.dispatchEvent(new Event('offline'))
    await flush()
    expect($(el, '.sw-banner--offline')?.textContent).toBe(
      'You are offline. Check your connection.'
    )
    expect($<HTMLInputElement>(el, '.sw-composer input')?.disabled).toBe(true)
    window.dispatchEvent(new Event('online'))
    await flush()
    expect($(el, '.sw-banner--offline')).toBeNull()
  })

  it('identity token refused with 401 on send - back to sign-in, no llm call', async () => {
    const api = fakeFetch([routes.token(() => json({ code: 'unauthenticated', title: 'x' }, 401))])
    vi.stubGlobal('fetch', api.fetch)
    const el = embed()
    el.getUserToken = () => 'stale.jwt'
    await openPanel(el)
    await sendText(el, 'Hi')
    expect($(el, '.sw-panel')?.dataset.auth).toBe('signed_out')
    expect(api.calls.some((r) => r.url.includes('/llm/'))).toBe(false)
  })

  it('lang="de" - German text', async () => {
    const el = embed({ lang: 'de' })
    expect($(el, '.sw-launcher')?.getAttribute('aria-label')).toBe('Chat öffnen')
    await openPanel(el)
    expect($(el, '.sw-signin__title')?.textContent).toBe('Zum Chatten anmelden')
    expect($(el, '.sw-signin__button')?.textContent).toBe('Anmelden')
  })

  it('host signs in while open - chat replaces sign-in', async () => {
    const el = embed()
    await openPanel(el)
    expect($(el, '.sw-signin')).not.toBeNull()
    el.getUserToken = async () => 'user.jwt'
    await flush()
    expect($(el, '.sw-composer')).not.toBeNull()
    el.getUserToken = null
    await flush()
    expect($(el, '.sw-signin')).not.toBeNull()
    el.refreshSession()
    await flush()
    expect($(el, '.sw-signin')).not.toBeNull()
  })

  it('property set before the element is defined - still used', async () => {
    const tag = 'synthwerk-chat-late'
    const el = document.createElement(tag) as SynthwerkChatElement
    el.setAttribute('app-id', APP_ID)
    el.setAttribute('api-url', API)
    el.getUserToken = () => 'user.jwt'
    document.body.append(el)
    customElements.define(tag, class extends SynthwerkChatElement {})
    await openPanel(el)
    expect($(el, '.sw-composer')).not.toBeNull()
  })

  it('no app-id - config error, no request', async () => {
    const api = stubApi(() => answer('x'))
    const el = document.createElement(TAG) as SynthwerkChatElement
    document.body.append(el)
    el.getUserToken = () => 'user.jwt'
    await openPanel(el)
    expect($(el, '.sw-banner--not_allowed')?.textContent).toBe('This site cannot use the chat.')
    expect(api.calls).toHaveLength(0)
  })

  it('mode, position and Escape - data attributes and close', async () => {
    const el = embed({ mode: 'dark', position: 'bottom-left' })
    const widget = $(el, '.sw-root')
    expect(widget?.dataset.mode).toBe('dark')
    expect(widget?.dataset.position).toBe('bottom-left')
    expect(widget?.dataset.theme).toBe('default')
    await openPanel(el)
    widget?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()
    expect($(el, '.sw-panel')).toBeNull()
  })

  it('removed from the page - unmounted', () => {
    const el = embed()
    el.remove()
    expect(root(el).childElementCount).toBe(0)
  })
})
