// Entry of the vision embed bundle: one script tag defines <synthwerk-vision>.
import { defineVision } from './vision-element.ts'

export type { GetUserToken } from './session.ts'
export { SIGN_IN_EVENT, SynthwerkVisionElement, VISION_TAG } from './vision-element.ts'

if (typeof customElements !== 'undefined') defineVision()
