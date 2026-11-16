import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test'
import { classification } from '../support/api.ts'
import { png } from './images.ts'

// widgets#43: the card in an installed host page. demo/vision-app.html is the customer page with
// its own web app manifest (display: standalone). Chromium opens it as an app window (`--app=`),
// which puts the page in the real `display-mode: standalone`: the DevTools media emulation has no
// display-mode feature. The page sends a strict CSP header (tests/e2e/serve.ts): any CSP violation
// is a console error and fails the test.

interface Seen {
  api: string[]
  problems: string[]
}

interface App {
  context: BrowserContext
  page: Page
  seen: Seen
}

/** Opens the installed page in an app window, with the API mocked and every request watched. */
async function openApp(query = '?signed-in', camera = false): Promise<App> {
  const base = test.info().project.use.baseURL
  if (!base) throw new Error('vision-standalone needs use.baseURL (playwright.config.ts)')
  const url = `${base}/demo/vision-app.html${query}`
  // A fresh profile per test in the test output folder (Playwright clears it).
  const dir = test.info().outputPath('profile')
  const context = await chromium.launchPersistentContext(dir, {
    channel: 'chromium',
    args: [`--app=${url}`, '--use-fake-device-for-media-stream']
  })
  if (camera) await context.grantPermissions(['camera'], { origin: new URL(base).origin })
  const seen: Seen = { api: [], problems: [] }
  await context.route('**/api/identity/v1/apps/*/widget-tokens', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'widget.jwt', token_type: 'Bearer', expires_in: 600 })
    })
  )
  await context.route('**/api/vision/v1/classifications', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(classification()) })
  )
  const page = context.pages()[0] ?? (await context.waitForEvent('page'))
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname
    if (path.startsWith('/api/')) seen.api.push(`${r.method()} ${path}`)
  })
  page.on('console', (m) => {
    if (m.type() === 'error') seen.problems.push(m.text())
  })
  page.on('pageerror', (e) => seen.problems.push(e.message))
  // Load again with the watchers on: the app window opened the page at launch.
  await page.goto(url)
  expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true)
  return { context, page, seen }
}

const APP = '0192f0a0-0000-7000-8000-000000000001'

test('installed page - own manifest with display standalone, no Synthwerk manifest', async () => {
  const { context, page, seen } = await openApp()
  try {
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    const body = await page.evaluate(async (url) => (await fetch(url ?? '')).json(), href)
    expect(body).toMatchObject({ display: 'standalone', start_url: '/demo/vision-app.html' })
    // The widget adds no manifest and no service worker of its own.
    expect(await page.locator('link[rel="manifest"]').count()).toBe(1)
    expect(await page.evaluate(() => navigator.serviceWorker?.controller ?? null)).toBeNull()
    await expect(page.getByRole('button', { name: 'Choose photo' })).toBeEnabled()
    expect(seen.problems).toEqual([])
  } finally {
    await context.close()
  }
})

test('standalone - file picker: the photo gets its labels', async () => {
  const { context, page, seen } = await openApp()
  try {
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Choose photo' }).click()
    await (await chooser).setFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: png(320, 240)
    })
    await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
    expect(seen.api).toEqual([
      `POST /api/identity/v1/apps/${APP}/widget-tokens`,
      'POST /api/vision/v1/classifications'
    ])
    expect(seen.problems).toEqual([])
  } finally {
    await context.close()
  }
})

test('standalone - camera: photo from the fake camera gets its labels', async () => {
  const { context, page, seen } = await openApp('?signed-in', true)
  try {
    await page.getByRole('button', { name: 'Use camera' }).click()
    const video = page.locator('synthwerk-vision video')
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Take photo' }).click()
    await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
    await expect(video).toHaveCount(0)
    expect(seen.api.at(-1)).toBe('POST /api/vision/v1/classifications')
    expect(seen.problems).toEqual([])
  } finally {
    await context.close()
  }
})

test('standalone offline - offline state, buttons disabled, a photo sends no request', async () => {
  const { context, page, seen } = await openApp()
  try {
    await expect(page.getByRole('button', { name: 'Choose photo' })).toBeEnabled()
    await context.setOffline(true)
    await expect(page.getByRole('status').filter({ hasText: 'offline' })).toHaveText(
      'You are offline. Check your connection.'
    )
    await expect(page.getByRole('button', { name: 'Choose photo' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Use camera' })).toBeDisabled()
    // A photo that still reaches the input (drag and drop, an old picker): no request at all.
    await page.locator('synthwerk-vision input[type=file]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: png(320, 240)
    })
    await page.waitForTimeout(300)
    expect(seen.api).toEqual([])
    await expect(page.locator('synthwerk-vision .sw-result')).toHaveCount(0)

    await context.setOffline(false)
    await expect(page.getByRole('button', { name: 'Choose photo' })).toBeEnabled()
    expect(seen.api).toEqual([])
  } finally {
    await context.close()
  }
})
