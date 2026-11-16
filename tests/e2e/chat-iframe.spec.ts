import { expect, type Frame, type Page, test } from '@playwright/test'

// widgets#33 "Done looks like": the test page runs the chat in iframe mode. The host page is
// http://127.0.0.1:4174, the widget host http://localhost:4174 (another origin). Both pages
// send a strict CSP header (tests/e2e/serve.ts); any CSP violation fails the test.

const HOST = 'http://127.0.0.1:4174'
const WIDGET_HOST = 'http://localhost:4174'
const APP = '0192f0a0-0000-7000-8000-000000000001'
const CONVERSATION = '0192f0a0-0000-7000-8000-0000000000c1'
const QUESTION = 'What is the secret plan?'
const ANSWER = 'The plan stays in the frame'

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
/** A widget token as identity makes it, bound to the host page origin (not signed: llm is fake). */
const tokenFor = (origin: string) =>
  `${b64url({ alg: 'ES256', typ: 'at+jwt' })}.${b64url({ 'synthwerk:origin': origin, sub: 'u1' })}.c2ln`
const TOKEN = tokenFor(HOST)

const CORS = {
  'access-control-allow-origin': HOST,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  vary: 'Origin'
}

const sse = (pieces: string[]) =>
  [
    ...pieces.map((text, i) => `id: m1:${i}\nevent: delta\ndata: ${JSON.stringify({ text })}\n\n`),
    `event: done\ndata: ${JSON.stringify({ message_id: 'm1', finish_reason: 'stop' })}\n\n`
  ].join('')

interface Seen {
  /** Every API request: `<origin of the page that sent it> <method> <path>`. */
  api: string[]
  /** The Authorization header of every llm request. */
  llmAuth: string[]
  problems: string[]
}

async function backend(page: Page, token = TOKEN): Promise<Seen> {
  const seen: Seen = { api: [], llmAuth: [], problems: [] }
  // Identity answers the host page origin (the app allow-list), with CORS.
  await page.route('**/api/identity/v1/apps/*/widget-settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { ...CORS, 'cache-control': 'no-cache' },
      body: JSON.stringify({
        position: 'bottom-right',
        theme: 'default',
        mode: 'system',
        lang: 'auto',
        accent: 'flagship',
        greeting: ''
      })
    })
  )
  await page.route('**/api/identity/v1/apps/*/widget-tokens', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 201,
          contentType: 'application/json',
          headers: { ...CORS, 'cache-control': 'no-store' },
          body: JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 600 })
        })
  )
  // llm is on the widget host origin: the frame calls it same-origin.
  await page.route('**/api/llm/v1/conversations', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: CONVERSATION,
        model: 'default',
        created_at: '2026-11-16T10:00:00Z',
        messages: []
      })
    })
  )
  await page.route('**/api/llm/v1/conversations/*/messages', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse(['The plan', ' stays in', ' the frame'])
    })
  )
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (!url.pathname.startsWith('/api/') || r.method() === 'OPTIONS') return
    const from = new URL(r.frame().url()).origin
    seen.api.push(`${from} ${r.method()} ${url.pathname}`)
    if (url.pathname.startsWith('/api/llm/')) seen.llmAuth.push(r.headers().authorization ?? '')
  })
  page.on('console', (m) => {
    if (m.type() === 'error') seen.problems.push(m.text())
  })
  page.on('pageerror', (e) => seen.problems.push(e.message))
  return seen
}

/** Host-page script: records every message the host window gets, from load on. */
async function spyOnMessages(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: string[] = []
    ;(window as unknown as { seenMessages: string[] }).seenMessages = log
    window.addEventListener('message', (event) => {
      log.push(`${event.origin} ${JSON.stringify(event.data)}`)
    })
  })
}

/**
 * Chromium routes a click to a cross-site frame by the hit-test data of the last compositor
 * frame: after the iframe shows or changes size, let two frames pass, or the click lands on
 * the host page.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  )
}

/** The chat frame, once it is shown in its corner. */
async function chatFrame(page: Page): Promise<Frame> {
  const iframe = page.locator('synthwerk-chat iframe')
  await expect(iframe).toHaveAttribute('data-ready', '')
  await settle(page)
  const frame = await (await iframe.elementHandle())?.contentFrame()
  if (!frame) throw new Error('no chat frame')
  return frame
}

/** Opens the chat and waits until the host page has sized the iframe for the panel. */
async function open(page: Page): Promise<Frame> {
  const frame = await chatFrame(page)
  await frame.getByRole('button', { name: 'Open chat' }).click()
  await expect(page.locator('synthwerk-chat iframe')).toHaveAttribute('data-open', '')
  await expect(frame.getByRole('dialog', { name: 'Chat' })).toBeVisible()
  await settle(page)
  return frame
}

async function openAndSend(page: Page): Promise<Frame> {
  const frame = await open(page)
  await frame.getByRole('textbox', { name: 'Write a message' }).fill(QUESTION)
  await frame.getByRole('button', { name: 'Send' }).click()
  await expect(frame.locator('.sw-msg--assistant.sw-msg--done')).toContainText(ANSWER)
  return frame
}

test('iframe mode - the chat runs in a frame on the widget host and streams the answer', async ({
  page
}) => {
  const seen = await backend(page)
  await page.goto('/demo/iframe.html?signed-in')
  const iframe = page.locator('synthwerk-chat iframe')
  await expect(iframe).toBeVisible()
  expect(new URL((await iframe.getAttribute('src')) ?? '').origin).toBe(WIDGET_HOST)
  const sandbox = (await iframe.getAttribute('sandbox')) ?? ''
  expect(sandbox).not.toContain('allow-top-navigation')
  expect(sandbox.split(' ')).toEqual(expect.arrayContaining(['allow-scripts', 'allow-same-origin']))

  await openAndSend(page)
  // Open: the iframe takes the panel corner.
  const box = await iframe.boundingBox()
  expect(box?.width).toBeGreaterThan(400)

  expect(seen.api).toEqual([
    `${HOST} GET /api/identity/v1/apps/${APP}/widget-settings`,
    `${HOST} POST /api/identity/v1/apps/${APP}/widget-tokens`,
    `${WIDGET_HOST} POST /api/llm/v1/conversations`,
    `${WIDGET_HOST} POST /api/llm/v1/conversations/${CONVERSATION}/messages`
  ])
  // llm gets only the widget token, never the user token.
  expect(seen.llmAuth).toEqual([`Bearer ${TOKEN}`, `Bearer ${TOKEN}`])
  expect(seen.problems).toEqual([])
})

test('host page script - cannot read the messages or the widget token of the frame', async ({
  page
}) => {
  await spyOnMessages(page)
  const seen = await backend(page)
  await page.goto('/demo/iframe.html?signed-in')
  await openAndSend(page)

  const probe = await page.evaluate(
    ({ question, answer }) => {
      const element = document.querySelector('synthwerk-chat')
      const iframe = element?.shadowRoot?.querySelector('iframe')
      if (!iframe) throw new Error('no iframe')
      let windowRead = 'blocked'
      try {
        windowRead = String(iframe.contentWindow?.document.body.textContent)
      } catch {
        windowRead = 'blocked'
      }
      const page = `${document.documentElement.outerHTML}${element?.shadowRoot?.innerHTML ?? ''}`
      const messages = (window as unknown as { seenMessages: string[] }).seenMessages
      return {
        contentDocument: iframe.contentDocument === null,
        windowRead,
        pageHasText: page.includes(question) || page.includes(answer),
        messages
      }
    },
    { question: QUESTION, answer: ANSWER }
  )
  expect(probe.contentDocument).toBe(true)
  expect(probe.windowRead).toBe('blocked')
  expect(probe.pageHasText).toBe(false)
  // The frame sends the host only requests and its layout: no text, no answer, no token.
  expect(probe.messages.length).toBeGreaterThan(0)
  for (const message of probe.messages) {
    expect(message.startsWith(`${WIDGET_HOST} `)).toBe(true)
    expect(message).not.toContain(QUESTION)
    expect(message).not.toContain(ANSWER)
    expect(message).not.toContain(TOKEN)
    expect(message).not.toContain('demo-user-token')
  }
  expect(seen.problems).toEqual([])
})

test('a message from an unknown source - ignored by the host side', async ({ page }) => {
  const seen = await backend(page)
  await page.goto('/demo/iframe.html')
  await chatFrame(page)
  const signIns = await page.evaluate(async () => {
    let count = 0
    document.addEventListener('synthwerk-sign-in', () => {
      count++
    })
    // Same protocol, but from the host window itself: not the frame, not the widget host.
    window.postMessage({ sw: 'synthwerk-chat/1', type: 'sign-in' }, '*')
    await new Promise((resolve) => setTimeout(resolve, 300))
    return count
  })
  expect(signIns).toBe(0)
  expect(seen.problems).toEqual([])
})

test('a token bound to another page - the frame refuses it, llm gets no call', async ({ page }) => {
  const seen = await backend(page, tokenFor('https://evil.example'))
  await page.goto('/demo/iframe.html?signed-in')
  const frame = await open(page)
  await frame.getByRole('textbox', { name: 'Write a message' }).fill(QUESTION)
  await frame.getByRole('button', { name: 'Send' }).click()
  await expect(frame.getByRole('alert')).toContainText('This site cannot use the chat.')
  expect(seen.api.filter((r) => r.includes('/api/llm/'))).toEqual([])
})

test('signed-out visitor - the sign-in button in the frame reaches the host page', async ({
  page
}) => {
  const seen = await backend(page)
  await page.goto('/demo/iframe.html')
  await page.evaluate(() => {
    ;(window as unknown as { signIns: number }).signIns = 0
    document.addEventListener('synthwerk-sign-in', () => {
      ;(window as unknown as { signIns: number }).signIns++
    })
  })
  const frame = await open(page)
  await frame.getByRole('button', { name: 'Sign in' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { signIns: number }).signIns))
    .toBe(1)
  expect(seen.api).toEqual([`${HOST} GET /api/identity/v1/apps/${APP}/widget-settings`])
  expect(seen.problems).toEqual([])
})

test('iframe mode below 640 px - the open frame fills the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await backend(page)
  await page.goto('/demo/iframe.html?signed-in')
  const frame = await open(page)
  await expect(frame.getByRole('dialog', { name: 'Chat' })).toBeVisible()
  await expect
    .poll(async () => page.locator('synthwerk-chat iframe').boundingBox())
    .toEqual({ x: 0, y: 0, width: 390, height: 780 })
})

test('past chats in the frame - a same-origin GET with the widget token and no Origin header', async ({
  page
}) => {
  const seen = await backend(page)
  const gets: Record<string, string>[] = []
  // A same-origin GET carries no Origin header. llm accepts a widget token without Origin only
  // with `Sec-Fetch-Site: same-origin` (synthwerk-llm#39). The browser adds that header in the
  // network stack, after this route, so this test cannot see it.
  await page.route(
    (url) => url.pathname === '/api/llm/v1/conversations' && url.searchParams.has('limit'),
    async (route) => {
      gets.push(await route.request().allHeaders())
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: CONVERSATION,
              model: 'default',
              title: 'Opening hours',
              created_at: '2026-11-16T09:00:00Z'
            }
          ]
        })
      })
    }
  )
  await page.goto('/demo/iframe.html?signed-in')
  const frame = await open(page)
  await frame.getByRole('button', { name: 'Past chats' }).click()
  await expect(
    frame.getByRole('list', { name: 'Past chats' }).getByRole('button', { name: /Opening hours/ })
  ).toBeVisible()
  expect(gets).toHaveLength(1)
  expect(gets[0]?.origin).toBeUndefined()
  expect(gets[0]?.authorization).toBe(`Bearer ${TOKEN}`)
  expect(seen.problems).toEqual([])
})
