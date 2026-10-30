import { expect, type Page, test } from '@playwright/test'

// synthwerk#34 "Done looks like": a test page with the snippet. A signed-in user chats.
// A signed-out visitor triggers no request to the llm service. The page sends a strict
// CSP header (tests/e2e/serve.ts); any CSP violation fails the test.

const sse = (pieces: string[]) =>
  [
    ...pieces.map((text, i) => `id: m1:${i}\nevent: delta\ndata: ${JSON.stringify({ text })}\n\n`),
    `event: done\ndata: ${JSON.stringify({ message_id: 'm1', finish_reason: 'stop' })}\n\n`
  ].join('')

interface Seen {
  api: string[]
  problems: string[]
}

async function watch(page: Page): Promise<Seen> {
  const seen: Seen = { api: [], problems: [] }
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname
    if (path.startsWith('/api/')) seen.api.push(`${r.method()} ${path}`)
  })
  page.on('console', (m) => {
    if (m.type() === 'error') seen.problems.push(m.text())
  })
  page.on('pageerror', (e) => seen.problems.push(e.message))
  return seen
}

async function fakeBackend(
  page: Page,
  answer: { status?: number; body: string; headers?: Record<string, string> }
) {
  await page.route('**/api/identity/v1/apps/*/widget-tokens', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'widget.jwt', token_type: 'Bearer', expires_in: 600 })
    })
  )
  await page.route('**/api/llm/v1/conversations', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '0192f0a0-0000-7000-8000-0000000000c1',
        model: 'default',
        created_at: '2026-10-29T10:00:00Z',
        messages: []
      })
    })
  )
  await page.route('**/api/llm/v1/conversations/*/messages', (route) =>
    route.fulfill({
      status: answer.status ?? 200,
      headers: { 'content-type': 'text/event-stream', ...answer.headers },
      body: answer.body
    })
  )
}

async function send(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Write a message' }).fill(text)
  await page.getByRole('button', { name: 'Send' }).click()
}

test('signed-in user - chats and sees the streamed answer', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, { body: sse(['Hello', ' from', ' **Synthwerk**']) })
  await page.goto('/?signed-in')
  await page.getByRole('button', { name: 'Open chat' }).click()
  await send(page, 'Hi')

  const answer = page.locator('.sw-msg--assistant.sw-msg--done')
  await expect(answer).toContainText('Hello from Synthwerk')
  await expect(answer.locator('strong')).toHaveText('Synthwerk')
  expect(seen.api).toEqual([
    'POST /api/identity/v1/apps/0192f0a0-0000-7000-8000-000000000001/widget-tokens',
    'POST /api/llm/v1/conversations',
    'POST /api/llm/v1/conversations/0192f0a0-0000-7000-8000-0000000000c1/messages'
  ])
  expect(seen.problems).toEqual([])
})

test('signed-out visitor - sign-in prompt and no request to identity or llm', async ({ page }) => {
  const seen = await watch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Open chat' }).click()
  await expect(page.getByText('Sign in to chat')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  expect(seen.api).toEqual([])
  expect(seen.problems).toEqual([])
})

test('raw HTML in the answer - shown as text, never run', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, {
    body: sse(['<img src=x onerror="window.pwned=1">', '<script>window.pwned=2</script>'])
  })
  await page.goto('/?signed-in')
  await page.getByRole('button', { name: 'Open chat' }).click()
  await send(page, 'Hi')

  const answer = page.locator('.sw-msg--assistant.sw-msg--done')
  await expect(answer).toContainText('<img src=x onerror="window.pwned=1">')
  await expect(answer.locator('img, script')).toHaveCount(0)
  expect(await page.evaluate(() => (window as { pwned?: number }).pwned)).toBeUndefined()
  expect(seen.problems).toEqual([])
})

test('quota used up - the quota state shows', async ({ page }) => {
  await fakeBackend(page, {
    status: 429,
    headers: { 'content-type': 'application/problem+json', 'retry-after': '600' },
    body: JSON.stringify({
      title: 'Quota exhausted',
      status: 429,
      code: 'quota_exhausted',
      quota: { scope: 'user', unit: 'tokens', limit: 50000, resets_at: '2026-10-30T00:00:00Z' }
    })
  })
  await page.goto('/?signed-in')
  await page.getByRole('button', { name: 'Open chat' }).click()
  await send(page, 'Hi')
  await expect(page.getByRole('alert')).toContainText(
    'You used all of your chat quota. It resets at'
  )
  await expect(page.getByRole('textbox', { name: 'Write a message' })).toBeDisabled()
})

test('offline - the offline state shows', async ({ page, context }) => {
  await page.goto('/?signed-in')
  await page.getByRole('button', { name: 'Open chat' }).click()
  await context.setOffline(true)
  await expect(page.getByRole('status')).toHaveText('You are offline. Check your connection.')
  await context.setOffline(false)
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('German - text follows the lang attribute', async ({ page }) => {
  await page.goto('/?lang=de')
  await page.getByRole('button', { name: 'Chat öffnen' }).click()
  await expect(page.getByText('Zum Chatten anmelden')).toBeVisible()
})

test('below 640 px - the panel is a full-screen sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/?signed-in')
  await page.getByRole('button', { name: 'Open chat' }).click()
  const box = await page.getByRole('dialog', { name: 'Chat' }).boundingBox()
  expect(box).toEqual({ x: 0, y: 0, width: 390, height: 780 })
  await page.getByRole('button', { name: 'Close chat' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
