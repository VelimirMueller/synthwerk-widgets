// Entry of the embed bundle: one script tag defines <synthwerk-chat>.
import { define } from './element.ts'

export { SIGN_IN_EVENT, SynthwerkChatElement, TAG } from './element.ts'
export type { GetUserToken } from './session.ts'

if (typeof customElements !== 'undefined') define()
