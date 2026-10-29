// Fake identity and llm answers for unit tests. No network.
export const APP_ID = '0192f0a0-0000-7000-8000-000000000001'
export const API = 'https://api.test'
export const CONVERSATION_ID = '0192f0a0-0000-7000-8000-0000000000c1'

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': status >= 400 ? 'application/problem+json' : 'application/json',
      ...headers
    }
  })
}

export function widgetToken(expiresIn = 600): Response {
  return json(
    { access_token: 'widget.jwt.token', token_type: 'Bearer', expires_in: expiresIn },
    201
  )
}

export function frame(event: string, data: unknown, id?: string): string {
  return `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** An SSE answer. Each chunk is sent after the previous one was read. */
export function sse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let i = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[i++]
      if (chunk === undefined) controller.close()
      else controller.enqueue(encoder.encode(chunk))
    }
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

export function answer(...pieces: string[]): Response {
  return sse([
    ...pieces.map((text, n) => frame('delta', { text }, `m1:${n}`)),
    frame('done', { message_id: 'm1', finish_reason: 'stop' })
  ])
}

export const quotaProblem = {
  type: 'https://schemas.synthwerk.dev/problems/quota_exhausted',
  title: 'Quota exhausted',
  status: 429,
  code: 'quota_exhausted',
  quota: { scope: 'user', unit: 'tokens', limit: 50000, resets_at: '2026-10-30T00:00:00Z' }
}

export interface Route {
  match: (url: URL, request: Request) => boolean
  reply: (request: Request) => Response | Promise<Response>
}

/** A fetch that answers from routes and records every request. */
export function fakeFetch(routes: Route[]) {
  const calls: Request[] = []
  const fetch = async (input: Request): Promise<Response> => {
    calls.push(input)
    const url = new URL(input.url)
    const route = routes.find((r) => r.match(url, input))
    if (!route) throw new TypeError(`no route for ${input.method} ${url.pathname}`)
    return route.reply(input)
  }
  return { fetch, calls }
}

export const routes = {
  token: (reply: Route['reply'] = () => widgetToken()): Route => ({
    match: (url) => url.pathname.endsWith('/widget-tokens'),
    reply
  }),
  conversation: (
    reply: Route['reply'] = () =>
      json(
        { id: CONVERSATION_ID, model: 'default', created_at: '2026-10-29T10:00:00Z', messages: [] },
        201
      )
  ): Route => ({
    match: (url, r) => r.method === 'POST' && url.pathname === '/llm/v1/conversations',
    reply
  }),
  message: (reply: Route['reply']): Route => ({
    match: (url) => url.pathname.endsWith('/messages'),
    reply
  })
}
