// <synthwerk-vision>: the vision custom element. It mounts the Vue vision widget into its shadow root.
import type { Component } from 'vue'
import { VisionWidget } from './components/vision-widget.ts'
import { visionStyles } from './styles.ts'
import { readVisionAttributes, type VisionAttrs, visionAttributes } from './vision/config.ts'
import { WidgetElement } from './widget-element.ts'

export { SIGN_IN_EVENT } from './widget-element.ts'

export const VISION_TAG = 'synthwerk-vision'

export class SynthwerkVisionElement extends WidgetElement<VisionAttrs> {
  static readonly observedAttributes = visionAttributes

  protected widget(): Component {
    return VisionWidget
  }

  protected styles(): string {
    return visionStyles
  }

  protected readAttrs(): VisionAttrs {
    return readVisionAttributes((name) => this.getAttribute(name), this.base())
  }
}

/** Defines `<synthwerk-vision>` once. A second script tag is harmless. */
export function defineVision(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(VISION_TAG)) registry.define(VISION_TAG, SynthwerkVisionElement)
}
