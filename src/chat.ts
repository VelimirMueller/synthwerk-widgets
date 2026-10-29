// The chat state: messages, the open stream and the last error. One conversation per
// widget instance, created on the first message and kept in memory only.
import type { Synthwerk } from '@synthwerk/sdk'
import { reactive } from 'vue'
import { classify, problemError, type WidgetError } from './errors.ts'

export type MessageState = 'streaming' | 'done' | 'error' | 'stopped'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  state: MessageState
}

export interface ChatState {
  messages: ChatMessage[]
  streaming: boolean
  error: WidgetError | null
  /** A message that failed before any answer came. It is not in `messages`: give it back to the input. */
  failedText: string | null
}

export interface Chat {
  state: ChatState
  send(text: string): Promise<void>
  stop(): void
  /** Hides the error. */
  dismiss(): void
  /** Returns `failedText` once and clears it. */
  takeFailedText(): string | null
  dispose(): void
}

export interface ChatOptions {
  sw: Pick<Synthwerk, 'api' | 'llm'>
  now?: () => number
}

export function createChat(options: ChatOptions): Chat {
  const now = options.now ?? Date.now
  const state = reactive<ChatState>({
    messages: [],
    streaming: false,
    error: null,
    failedText: null
  })
  let conversationId: string | null = null
  let controller: AbortController | null = null
  let nextId = 1

  async function conversation(): Promise<string> {
    if (conversationId) return conversationId
    const { data, error, response } = await options.sw.api.llm.POST('/v1/conversations', {
      body: {}
    })
    if (!data) throw problemError(error, response)
    conversationId = data.id
    return data.id
  }

  async function send(raw: string): Promise<void> {
    const text = raw.trim()
    if (text === '' || state.streaming) return
    state.error = null
    state.failedText = null
    state.messages.push({ id: nextId++, role: 'user', text, state: 'done' })
    state.messages.push({ id: nextId++, role: 'assistant', text: '', state: 'streaming' })
    // The reactive copies: writes to them update the view.
    const question = state.messages[state.messages.length - 2] as ChatMessage
    const answer = state.messages[state.messages.length - 1] as ChatMessage
    state.streaming = true
    const current = new AbortController()
    controller = current
    let started = false
    try {
      const id = await conversation()
      for await (const event of options.sw.llm.chat(
        { conversationId: id, content: text },
        { signal: current.signal }
      )) {
        started = true
        if (event.type === 'delta') answer.text += event.text
        else if (event.type === 'done') answer.state = 'done'
        else if (event.type === 'error') {
          answer.state = 'error'
          state.error = classify(event.error, now())
        }
      }
      if (answer.state === 'streaming') answer.state = current.signal.aborted ? 'stopped' : 'done'
      // A finished answer without any text: say so, do not leave the question unanswered.
      if (answer.state === 'done' && answer.text === '') state.error = { kind: 'generic' }
    } catch (error) {
      if (current.signal.aborted) {
        answer.state = 'stopped'
      } else {
        answer.state = 'error'
        state.error = classify(error, now())
        if (!started) {
          // Nothing reached the model: the message goes back to the input, not into the list.
          state.messages.splice(state.messages.indexOf(question), 1)
          state.failedText = text
        }
      }
    } finally {
      // No text came: drop the empty answer bubble, the error banner tells the rest.
      if (answer.text === '' && answer.state !== 'streaming') {
        state.messages.splice(state.messages.indexOf(answer), 1)
      }
      state.streaming = false
      if (controller === current) controller = null
    }
  }

  return {
    state,
    send,
    stop() {
      controller?.abort()
    },
    dismiss() {
      state.error = null
    },
    takeFailedText() {
      const text = state.failedText
      state.failedText = null
      return text
    },
    dispose() {
      controller?.abort()
    }
  }
}
