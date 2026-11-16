// The chat state: messages, the open stream and the last error. One conversation at a
// time: created on the first message, or a past one opened from the history list
// (synthwerk#54). llm stores it; the widget keeps only the open one in memory.
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
  /** A past conversation is loading. `send` waits for it to end. */
  loading: boolean
}

export interface Chat {
  state: ChatState
  send(text: string): Promise<void>
  stop(): void
  /** Hides the error. */
  dismiss(): void
  /** Loads a past conversation of the user and continues it. Stops a running answer. */
  open(id: string): Promise<void>
  /** Starts an empty chat: the next message creates a new conversation. Stops a running answer. */
  reset(): void
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
    failedText: null,
    loading: false
  })
  let conversationId: string | null = null
  let controller: AbortController | null = null
  let nextId = 1
  let loading = 0
  /** Counts clear(): a send or a create of an older chat never writes into a newer one. */
  let generation = 0

  /** Stored message status (contract MessageStatus) to the view state. */
  function viewState(status: string): MessageState {
    if (status === 'failed') return 'error'
    if (status === 'canceled') return 'stopped'
    return 'done'
  }

  function clear(): void {
    generation++
    controller?.abort()
    controller = null
    conversationId = null
    state.messages.splice(0)
    state.streaming = false
    state.error = null
    state.failedText = null
    state.loading = false
  }

  async function open(id: string): Promise<void> {
    clear()
    const run = ++loading
    state.loading = true
    try {
      const { data, error, response } = await options.sw.api.llm.GET('/v1/conversations/{id}', {
        params: { path: { id } }
      })
      if (!data) throw problemError(error, response)
      if (run !== loading) return
      conversationId = data.id
      for (const m of data.messages) {
        // An empty stored answer (failed before any text) shows no bubble, like a live one.
        if (m.role === 'assistant' && m.content === '') continue
        state.messages.push({
          id: nextId++,
          role: m.role,
          text: m.content,
          state: viewState(m.status)
        })
      }
    } catch (error) {
      if (run === loading) state.error = classify(error, now())
    } finally {
      if (run === loading) state.loading = false
    }
  }

  async function conversation(): Promise<string> {
    if (conversationId) return conversationId
    const mine = generation
    const { data, error, response } = await options.sw.api.llm.POST('/v1/conversations', {
      body: {}
    })
    if (!data) throw problemError(error, response)
    // A reset meanwhile: the new chat must not adopt this conversation.
    if (mine === generation) conversationId = data.id
    return data.id
  }

  async function send(raw: string): Promise<void> {
    const text = raw.trim()
    if (text === '' || state.streaming || state.loading) return
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
    const mine = generation
    /** False once open() or reset() replaced this chat: then write nothing more. */
    const live = () => mine === generation
    let started = false
    try {
      const id = await conversation()
      // Stopped, opened or reset while the conversation was created: no model call.
      if (current.signal.aborted) throw new DOMException('aborted', 'AbortError')
      for await (const event of options.sw.llm.chat(
        { conversationId: id, content: text },
        { signal: current.signal }
      )) {
        started = true
        if (event.type === 'delta') answer.text += event.text
        else if (event.type === 'done') answer.state = 'done'
        else if (event.type === 'error') {
          answer.state = 'error'
          if (live()) state.error = classify(event.error, now())
        }
      }
      if (answer.state === 'streaming') answer.state = current.signal.aborted ? 'stopped' : 'done'
      // A finished answer without any text: say so, do not leave the question unanswered.
      if (answer.state === 'done' && answer.text === '' && live()) state.error = { kind: 'generic' }
    } catch (error) {
      if (current.signal.aborted) {
        answer.state = 'stopped'
      } else {
        answer.state = 'error'
        if (live()) {
          state.error = classify(error, now())
          if (!started) {
            // Nothing reached the model: the message goes back to the input, not into the list.
            state.messages.splice(state.messages.indexOf(question), 1)
            state.failedText = text
          }
        }
      }
    } finally {
      // No text came: drop the empty answer bubble, the error banner tells the rest.
      if (live() && answer.text === '' && answer.state !== 'streaming') {
        state.messages.splice(state.messages.indexOf(answer), 1)
      }
      if (controller === current) {
        controller = null
        state.streaming = false
      }
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
    open,
    reset() {
      loading++
      clear()
    },
    takeFailedText() {
      const text = state.failedText
      state.failedText = null
      return text
    },
    dispose() {
      loading++
      generation++
      controller?.abort()
    }
  }
}
