// <synthwerk-chat>: the chat custom element. It mounts the Vue chat widget into its shadow root.
import type { Component } from 'vue'
import { ChatWidget } from './components/chat-widget.ts'
import { type AttributeConfig, attributes, readAttributes } from './config.ts'
import { widgetStyles } from './styles.ts'
import { WidgetElement } from './widget-element.ts'

export { SIGN_IN_EVENT } from './widget-element.ts'

export const TAG = 'synthwerk-chat'

export class SynthwerkChatElement extends WidgetElement<AttributeConfig> {
  static readonly observedAttributes = attributes

  protected widget(): Component {
    return ChatWidget
  }

  protected styles(): string {
    return widgetStyles
  }

  protected readAttrs(): AttributeConfig {
    return readAttributes((name) => this.getAttribute(name), this.base())
  }
}

/** Defines `<synthwerk-chat>` once. A second script tag is harmless. */
export function define(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(TAG)) registry.define(TAG, SynthwerkChatElement)
}
