// <synthwerk-chat>: the chat custom element. It mounts the Vue chat widget into its shadow root,
// or with mode="iframe" an isolated iframe of the chat frame page on the widget host (widgets#33).
import type { Component } from 'vue'
import { ChatWidget } from './components/chat-widget.ts'
import type { WidgetHost } from './components/use-session.ts'
import { type AttributeConfig, attributes, readAttributes } from './config.ts'
import { frameUrlOf, mountFrame } from './frame/parent.ts'
import { frameHostStyles, widgetStyles } from './styles.ts'
import { WidgetElement } from './widget-element.ts'

export { SIGN_IN_EVENT } from './widget-element.ts'

export const TAG = 'synthwerk-chat'

/** `mode="iframe"`: the chat runs in an iframe on the widget host. */
export const IFRAME_MODE = 'iframe'

export class SynthwerkChatElement extends WidgetElement<AttributeConfig> {
  static readonly observedAttributes = attributes

  /** The mode the widget is mounted in. */
  #isolated = false

  protected widget(): Component {
    return ChatWidget
  }

  protected styles(): string {
    return this.#wantsFrame() ? frameHostStyles : widgetStyles
  }

  protected readAttrs(): AttributeConfig {
    return readAttributes((name) => this.getAttribute(name), this.base())
  }

  protected override mount(root: ShadowRoot, attrs: AttributeConfig, host: WidgetHost): () => void {
    this.#isolated = this.#wantsFrame()
    if (!this.#isolated) return super.mount(root, attrs, host)
    return mountFrame(root, { attrs, host, frameUrl: frameUrlOf(import.meta.url) })
  }

  override attributeChangedCallback(): void {
    super.attributeChangedCallback()
    // A switch between the shadow root and the iframe: mount again in the new mode. The open
    // chat and its session go, like after a sign-out.
    if (this.mounted && this.#wantsFrame() !== this.#isolated) this.remount()
  }

  #wantsFrame(): boolean {
    return this.getAttribute('mode')?.trim() === IFRAME_MODE
  }
}

/** Defines `<synthwerk-chat>` once. A second script tag is harmless. */
export function define(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(TAG)) registry.define(TAG, SynthwerkChatElement)
}
