import { type ChatEvent, SynthwerkError } from '@synthwerk/sdk'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { type ChatOptions, createChat } from '../../src/chat.ts'

type Sw = ChatOptions['sw']

interface Script {
  /** Thrown by the conversation call. */
  conversationError?: unknown
  /** Thrown by chat() before the first event. */
  chatError?: unknown
  events?: ChatEvent[]
  /** Waits before each event, so the test can look between events. */
  gate?: () => Promise<void>
}

function fakeSw(script: Script): Sw & { conversations: number } {
  const sw = {
    conversations: 0,
    api: {
      llm: {
        POST: async () => {
          sw.conversations++
          if (script.conversationError) {
            return {
              data: undefined,
              error: script.conversationError,
              response: new Response(null, { status: 429, headers: { 'retry-after': '60' } })
            }
          }
          return {
            data: { id: 'c1' },
            error: undefined,
            response: new Response(null, { status: 201 })
          }
        }
      }
    },
    llm: {
      async *chat(_request: unknown, options?: { signal?: AbortSignal }) {
        if (script.chatError) throw script.chatError
        for (const event of script.events ?? []) {
          await script.gate?.()
          if (options?.signal?.aborted) return
          yield event
        }
      }
    }
  }
  return sw as unknown as Sw & { conversations: number }
}

const delta = (text: string): ChatEvent => ({ type: 'delta', id: undefined, text })
const done: ChatEvent = { type: 'done', id: undefined, messageId: 'm1', finishReason: 'stop' }

describe('createChat', () => {
  it('answer - streams into the assistant message piece by piece', async () => {
    let release: () => void = () => undefined
    const gate = () =>
      new Promise<void>((resolve) => {
        release = resolve
      })
    const chat = createChat({ sw: fakeSw({ events: [delta('Hel'), delta('lo'), done], gate }) })
    const sending = chat.send('  Hi  ')
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 0))
      seen.push(chat.state.messages[1]?.text ?? '')
      release()
    }
    await sending
    expect(seen).toEqual(['', 'Hel', 'Hello'])
    expect(chat.state.messages.map((m) => [m.role, m.text, m.state])).toEqual([
      ['user', 'Hi', 'done'],
      ['assistant', 'Hello', 'done']
    ])
    expect(chat.state.streaming).toBe(false)
  })

  it('second message - same conversation', async () => {
    const sw = fakeSw({ events: [delta('a'), done] })
    const chat = createChat({ sw })
    await chat.send('one')
    await chat.send('two')
    expect(sw.conversations).toBe(1)
    expect(chat.state.messages).toHaveLength(4)
  })

  it('empty text or a running stream - nothing sent', async () => {
    const sw = fakeSw({ events: [done] })
    const chat = createChat({ sw })
    await chat.send('   ')
    expect(sw.conversations).toBe(0)
  })

  it('quota before the answer - quota error, message back to the input', async () => {
    const now = Date.UTC(2026, 9, 29, 12, 0, 0)
    const chat = createChat({
      sw: fakeSw({
        chatError: new SynthwerkError({
          code: 'quota_exhausted',
          title: 'Quota',
          status: 429,
          retryAfter: 600
        })
      }),
      now: () => now
    })
    await chat.send('Hi')
    expect(chat.state.error).toEqual({ kind: 'quota', resetsAt: new Date(now + 600_000) })
    expect(chat.state.messages).toEqual([])
    expect(chat.takeFailedText()).toBe('Hi')
    expect(chat.takeFailedText()).toBeNull()
  })

  it('conversation call refused - error from the problem body', async () => {
    const chat = createChat({
      sw: fakeSw({ conversationError: { code: 'quota_exhausted', title: 'Quota' } })
    })
    await chat.send('Hi')
    expect(chat.state.error?.kind).toBe('quota')
  })

  it('error event mid-stream - partial answer kept, error shown', async () => {
    const chat = createChat({
      sw: fakeSw({
        events: [
          delta('Part'),
          {
            type: 'error',
            id: undefined,
            error: new SynthwerkError({ code: 'model_unavailable', title: 'x' })
          }
        ]
      })
    })
    await chat.send('Hi')
    expect(chat.state.messages[1]).toMatchObject({ text: 'Part', state: 'error' })
    expect(chat.state.error?.kind).toBe('busy')
    expect(chat.state.failedText).toBeNull()
    chat.dismiss()
    expect(chat.state.error).toBeNull()
  })

  it('stop - stream ends, partial answer marked stopped', async () => {
    let release: () => void = () => undefined
    const gate = () =>
      new Promise<void>((resolve) => {
        release = resolve
      })
    const chat = createChat({ sw: fakeSw({ events: [delta('Par'), delta('tial'), done], gate }) })
    const sending = chat.send('Hi')
    await new Promise((r) => setTimeout(r, 0))
    release()
    await new Promise((r) => setTimeout(r, 0))
    chat.stop()
    release()
    await sending
    await nextTick()
    expect(chat.state.messages[1]).toMatchObject({ text: 'Par', state: 'stopped' })
    expect(chat.state.error).toBeNull()
  })

  it('stream ends without done - answer counts as done', async () => {
    const chat = createChat({ sw: fakeSw({ events: [delta('x')] }) })
    await chat.send('Hi')
    expect(chat.state.messages[1]?.state).toBe('done')
  })

  it('dispose while idle - no error', () => {
    const chat = createChat({ sw: fakeSw({}) })
    expect(() => chat.dispose()).not.toThrow()
  })
})
