import { type ChatEvent, isSynthwerkError } from '@synthwerk/sdk'
import { describe, expect, it } from 'vitest'
import { type ChatOptions, createChat } from '../../src/chat.ts'
import { HISTORY_PAGE, listConversations } from '../../src/history.ts'

// synthwerk#54: the widget lists the user's past conversations and continues one.

type Sw = ChatOptions['sw']

const stored = {
  id: 'c-old',
  model: 'default',
  created_at: '2026-11-01T10:00:00Z',
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'Old question',
      status: 'completed',
      created_at: '2026-11-01T10:00:01Z'
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Old answer',
      status: 'completed',
      created_at: '2026-11-01T10:00:02Z'
    },
    {
      id: 'm3',
      role: 'user',
      content: 'Stopped one',
      status: 'completed',
      created_at: '2026-11-01T10:01:00Z'
    },
    {
      id: 'm4',
      role: 'assistant',
      content: 'Half',
      status: 'canceled',
      created_at: '2026-11-01T10:01:01Z'
    },
    {
      id: 'm5',
      role: 'user',
      content: 'Failed one',
      status: 'completed',
      created_at: '2026-11-01T10:02:00Z'
    },
    {
      id: 'm6',
      role: 'assistant',
      content: '',
      status: 'failed',
      created_at: '2026-11-01T10:02:01Z'
    }
  ]
}

interface Calls {
  get: { path: string; init: unknown }[]
  posts: number
  chats: string[]
}

function fakeSw(reply: (path: string, init: unknown) => { status: number; body: unknown }): Sw & {
  calls: Calls
} {
  const calls: Calls = { get: [], posts: 0, chats: [] }
  const sw = {
    calls,
    api: {
      llm: {
        GET: async (path: string, init: unknown) => {
          calls.get.push({ path, init })
          const { status, body } = reply(path, init)
          return status < 300
            ? { data: body, error: undefined, response: new Response(null, { status }) }
            : { data: undefined, error: body, response: new Response(null, { status }) }
        },
        POST: async () => {
          calls.posts++
          return {
            data: { id: 'c-new' },
            error: undefined,
            response: new Response(null, { status: 201 })
          }
        }
      }
    },
    llm: {
      async *chat(request: { conversationId: string }) {
        calls.chats.push(request.conversationId)
        yield { type: 'delta', id: undefined, text: 'ok' } as ChatEvent
        yield { type: 'done', id: undefined, messageId: 'x', finishReason: 'stop' } as ChatEvent
      }
    }
  }
  return sw as unknown as Sw & { calls: Calls }
}

describe('listConversations', () => {
  it('first page - GET /v1/conversations with the page size, no cursor', async () => {
    const page = {
      items: [{ id: 'c1', model: 'default', title: 'Hi', created_at: '2026-11-16T09:00:00Z' }],
      next_cursor: 'abc'
    }
    const sw = fakeSw(() => ({ status: 200, body: page }))
    await expect(listConversations(sw)).resolves.toEqual(page)
    expect(sw.calls.get).toEqual([
      { path: '/v1/conversations', init: { params: { query: { limit: HISTORY_PAGE } } } }
    ])
  })

  it('next page - sends the cursor', async () => {
    const sw = fakeSw(() => ({ status: 200, body: { items: [] } }))
    await listConversations(sw, 'abc')
    expect(sw.calls.get[0]?.init).toEqual({
      params: { query: { limit: HISTORY_PAGE, cursor: 'abc' } }
    })
  })

  it('401 - throws a SynthwerkError with code unauthenticated', async () => {
    const sw = fakeSw(() => ({
      status: 401,
      body: { code: 'unauthenticated', title: 'Unauthenticated' }
    }))
    const error = await listConversations(sw).catch((e: unknown) => e)
    expect(isSynthwerkError(error) && error.code).toBe('unauthenticated')
  })
})

describe('createChat open and reset', () => {
  it('open - shows the stored messages and the next message continues that conversation', async () => {
    const sw = fakeSw(() => ({ status: 200, body: stored }))
    const chat = createChat({ sw })
    await chat.open('c-old')
    expect(sw.calls.get[0]).toEqual({
      path: '/v1/conversations/{id}',
      init: { params: { path: { id: 'c-old' } } }
    })
    expect(chat.state.messages.map((m) => [m.role, m.text, m.state])).toEqual([
      ['user', 'Old question', 'done'],
      ['assistant', 'Old answer', 'done'],
      ['user', 'Stopped one', 'done'],
      ['assistant', 'Half', 'stopped'],
      ['user', 'Failed one', 'done']
    ])
    expect(chat.state.loading).toBe(false)
    await chat.send('More')
    expect(sw.calls.posts).toBe(0)
    expect(sw.calls.chats).toEqual(['c-old'])
  })

  it('open - another user’s or another site’s id (404) - no messages, error, the next message makes a new conversation', async () => {
    const sw = fakeSw(() => ({ status: 404, body: { code: 'not_found', title: 'Not found' } }))
    const chat = createChat({ sw })
    await chat.open('c-foreign')
    expect(chat.state.messages).toEqual([])
    expect(chat.state.error?.kind).toBe('generic')
    chat.dismiss()
    await chat.send('Hi')
    expect(sw.calls.posts).toBe(1)
    expect(sw.calls.chats).toEqual(['c-new'])
  })

  it('reset - empties the chat and the next message makes a new conversation', async () => {
    const sw = fakeSw(() => ({ status: 200, body: stored }))
    const chat = createChat({ sw })
    await chat.open('c-old')
    chat.reset()
    expect(chat.state.messages).toEqual([])
    await chat.send('Fresh')
    expect(sw.calls.posts).toBe(1)
    expect(sw.calls.chats).toEqual(['c-new'])
  })

  it('reset while a conversation loads - the late answer is dropped', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => {
      release = r
    })
    const sw = fakeSw(() => ({ status: 200, body: stored }))
    const get = sw.api.llm.GET
    ;(sw.api.llm as { GET: unknown }).GET = async (...args: unknown[]) => {
      await gate
      return (get as (...a: unknown[]) => unknown)(...args)
    }
    const chat = createChat({ sw })
    const opening = chat.open('c-old')
    expect(chat.state.loading).toBe(true)
    await chat.send('ignored while loading')
    expect(sw.calls.chats).toEqual([])
    chat.reset()
    release()
    await opening
    expect(chat.state.messages).toEqual([])
    expect(chat.state.loading).toBe(false)
  })
})
