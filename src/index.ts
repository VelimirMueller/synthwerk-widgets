// Entry of the embed bundle: one script tag defines <synthwerk-chat>. On the chat frame page of
// the widget host (public/synthwerk-chat-frame.html, widgets#33) it starts the chat frame instead.
import { define } from './element.ts'
import { bootFrame } from './frame/child.ts'

export { IFRAME_MODE, SIGN_IN_EVENT, SynthwerkChatElement, TAG } from './element.ts'
export type { GetUserToken } from './session.ts'

const FRAME_MARK = 'meta[name="synthwerk-frame"][content="chat"]'

if (typeof document !== 'undefined' && document.querySelector(FRAME_MARK)) bootFrame()
else if (typeof customElements !== 'undefined') define()
