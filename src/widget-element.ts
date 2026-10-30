// The base of every Synthwerk custom element: the host hook, the attributes and the Vue
// app in an open shadow root. <synthwerk-chat> and <synthwerk-vision> extend it.
import { type App, type Component, createApp, reactive } from 'vue'
import type { WidgetHost } from './components/use-session.ts'
import type { GetUserToken } from './session.ts'
import { applyStyles } from './styles.ts'

/** Sent when a signed-out visitor presses "Sign in" and no `sign-in-url` is set. */
export const SIGN_IN_EVENT = 'synthwerk-sign-in'

export abstract class WidgetElement<Attrs extends object> extends HTMLElement {
  readonly #attrs: Attrs
  readonly #host: WidgetHost
  #app: App | null = null

  constructor() {
    super()
    this.#attrs = reactive(this.readAttrs()) as Attrs
    this.#host = reactive<WidgetHost>({
      version: 0,
      getUserToken: null,
      languages: globalThis.navigator?.languages ?? [],
      requestSignIn: () => {
        this.dispatchEvent(new CustomEvent(SIGN_IN_EVENT, { bubbles: true, composed: true }))
      }
    })
  }

  /** The Vue root component. It gets the props `attrs` and `host`. */
  protected abstract widget(): Component
  /** The CSS of the shadow root. */
  protected abstract styles(): string
  /** The settings from the attributes. */
  protected abstract readAttrs(): Attrs

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
    applyStyles(root, this.styles())
    const mount = document.createElement('div')
    root.append(mount)
    this.#app = createApp(this.widget(), { attrs: this.#attrs, host: this.#host })
    this.#app.mount(mount)
  }

  disconnectedCallback(): void {
    this.#app?.unmount()
    this.#app = null
    this.shadowRoot?.replaceChildren()
  }

  attributeChangedCallback(): void {
    Object.assign(this.#attrs, this.readAttrs())
  }

  /** The page URL, the base for a relative `sign-in-url`. */
  protected base(): string {
    return globalThis.location?.href ?? 'http://localhost/'
  }

  /** A property set before the element was defined hides the setter: apply it now. */
  #upgrade(name: 'getUserToken'): void {
    if (!Object.hasOwn(this, name)) return
    const value = (this as Record<string, unknown>)[name] as GetUserToken | null
    delete (this as Record<string, unknown>)[name]
    this.getUserToken = value
  }
}
