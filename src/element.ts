// <synthwerk-chat>: the custom element. It mounts the Vue widget into its shadow root.
import { type App, createApp, reactive } from 'vue'
import { ChatWidget, type WidgetHost } from './components/chat-widget.ts'
import { attributes, readConfig, type WidgetConfig } from './config.ts'
import type { GetUserToken } from './session.ts'
import { applyStyles } from './styles.ts'

export const TAG = 'synthwerk-chat'
/** Sent when a signed-out visitor presses "Sign in" and no `sign-in-url` is set. */
export const SIGN_IN_EVENT = 'synthwerk-sign-in'

export class SynthwerkChatElement extends HTMLElement {
  static readonly observedAttributes = attributes

  readonly #config: WidgetConfig
  readonly #host: WidgetHost
  #app: App | null = null

  constructor() {
    super()
    this.#config = reactive(this.#read())
    this.#host = reactive<WidgetHost>({
      version: 0,
      getUserToken: null,
      requestSignIn: () => {
        this.dispatchEvent(new CustomEvent(SIGN_IN_EVENT, { bubbles: true, composed: true }))
      }
    })
  }

  /**
   * Host hook: returns the access token of the signed-in user, or `null`. Set it after
   * sign-in and sign-out. Without it, the widget shows sign-in and sends no request.
   */
  get getUserToken(): GetUserToken | null {
    return this.#host.getUserToken
  }

  set getUserToken(value: GetUserToken | null) {
    this.#host.getUserToken = typeof value === 'function' ? value : null
    this.#host.version++
  }

  /** Tells the widget that the host session changed (sign-in or sign-out). */
  refreshSession(): void {
    this.#host.version++
  }

  connectedCallback(): void {
    this.#upgrade('getUserToken')
    if (this.#app) return
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    applyStyles(root)
    const mount = document.createElement('div')
    root.append(mount)
    this.#app = createApp(ChatWidget, { config: this.#config, host: this.#host })
    this.#app.mount(mount)
  }

  disconnectedCallback(): void {
    this.#app?.unmount()
    this.#app = null
    this.shadowRoot?.replaceChildren()
  }

  attributeChangedCallback(): void {
    Object.assign(this.#config, this.#read())
  }

  #read(): WidgetConfig {
    return readConfig((name) => this.getAttribute(name), {
      languages: globalThis.navigator?.languages ?? [],
      base: globalThis.location?.href ?? 'http://localhost/'
    })
  }

  /** A property set before the element was defined hides the setter: apply it now. */
  #upgrade(name: 'getUserToken'): void {
    if (!Object.hasOwn(this, name)) return
    const value = (this as Record<string, unknown>)[name] as GetUserToken | null
    delete (this as Record<string, unknown>)[name]
    this.getUserToken = value
  }
}

/** Defines `<synthwerk-chat>` once. A second script tag is harmless. */
export function define(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(TAG)) registry.define(TAG, SynthwerkChatElement)
}
