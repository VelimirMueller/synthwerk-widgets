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

/** A full, valid settings answer of identity (contracts WidgetSettings). */
export const studioSettings = {
  position: 'bottom-left',
  theme: 'contrast',
  mode: 'dark',
  lang: 'de',
  accent: 'venture',
  greeting: 'Moin! Fragen Sie uns.'
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
  /** Studio widget settings of identity (public, no token). */
  settings: (reply: Route['reply'] = () => json(studioSettings)): Route => ({
    match: (url, r) => r.method === 'GET' && url.pathname.endsWith('/widget-settings'),
    reply
  }),
  message: (reply: Route['reply']): Route => ({
    match: (url) => url.pathname.endsWith('/messages'),
    reply
  })
}

/** A classification in the shape of synthwerk-vision `ClassificationOut`. */
export function classification(overrides: Record<string, unknown> = {}) {
  const label = (id: string, name: string, score: number, path: string[]) => ({
    id,
    label: name,
    score,
    topic: path[path.length - 2] ?? 'animal',
    path
  })
  return {
    request_id: 'req-1',
    image: {
      sha256: 'ab'.repeat(32),
      content_type: 'image/jpeg',
      size_bytes: 12345,
      width: 640,
      height: 480
    },
    model: { name: 'siglip2', taxonomy_version: 3 },
    primary: label('n02088364', 'beagle', 0.81, ['animal', 'mammal', 'dog', 'beagle']),
    topic: { id: 'animal', parent: null, depth: 0, score: 0.97 },
    labels: [
      label('n02088364', 'beagle', 0.81, ['animal', 'mammal', 'dog', 'beagle']),
      label('n02089973', 'English foxhound', 0.09, ['animal', 'mammal', 'dog', 'English foxhound']),
      label('n02089867', 'Walker hound', 0.05, ['animal', 'mammal', 'dog', 'Walker hound'])
    ],
    topics: [{ id: 'animal', parent: null, depth: 0, score: 0.97 }],
    uncertain: false,
    correction: null,
    timings_ms: { inference: 35, total: 40 },
    ...overrides
  }
}

export const storedImage = {
  id: '0f1e2d3c-4b5a-4978-8f1e-2d3c4b5a6978',
  content_type: 'image/jpeg',
  size_bytes: 12345,
  width: 640,
  height: 480
}

/** A FastAPI error body: `{detail}`, no problem `code`. */
export function detail(status: number, text = 'refused'): Response {
  return new Response(JSON.stringify({ detail: text }), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

export const visionRoutes = {
  classify: (reply: Route['reply'] = () => json(classification())): Route => ({
    match: (url, r) => r.method === 'POST' && url.pathname === '/vision/v1/classifications',
    reply
  }),
  store: (reply: Route['reply'] = () => json(storedImage, 201)): Route => ({
    match: (url, r) => r.method === 'POST' && url.pathname === '/vision/v1/images',
    reply
  })
}
