import { type BrowserContext, expect, type Page, type Route, test } from '@playwright/test'
import { classification } from '../support/api.ts'
import { jpegSize, png } from './images.ts'

// synthwerk#43 "Done looks like": a photo shows its primary label and alternatives.
// A signed-out visitor triggers no vision call. The camera is Chromium's fake device
// (`--use-fake-device-for-media-stream`). The API is mocked in the shape of
// synthwerk-vision `ClassificationOut`. The page sends a strict CSP header
// (tests/e2e/serve.ts): any CSP violation is a console error and fails the test.

const EDGE_LIMIT = 1024 * 1024

interface Seen {
  api: string[]
  problems: string[]
  uploads: {
    auth: string | null
    type: string | null
    size: number
    jpeg: { width: number; height: number } | null
  }[]
}

/** Counts getUserMedia calls and keeps the streams, to prove when the camera runs and stops. */
async function watchCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { cameraCalls: number; cameraStreams: MediaStream[] }
    w.cameraCalls = 0
    w.cameraStreams = []
    const media = navigator.mediaDevices
    if (!media) return
    const original = media.getUserMedia.bind(media)
    media.getUserMedia = async (constraints) => {
      w.cameraCalls++
      const stream = await original(constraints)
      w.cameraStreams.push(stream)
      return stream
    }
  })
}

const camera = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { cameraCalls: number; cameraStreams: MediaStream[] }
    return {
      calls: w.cameraCalls,
      live: w.cameraStreams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live')
        .length,
      audio: w.cameraStreams.flatMap((s) => s.getAudioTracks()).length
    }
  })

async function watch(page: Page): Promise<Seen> {
  const seen: Seen = { api: [], problems: [], uploads: [] }
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname
    if (path.startsWith('/api/')) seen.api.push(`${r.method()} ${path}`)
  })
  page.on('console', (m) => {
    if (m.type() === 'error') seen.problems.push(m.text())
  })
  page.on('pageerror', (e) => seen.problems.push(e.message))
  await watchCamera(page)
  return seen
}

async function fakeBackend(
  page: Page,
  seen: Seen,
  answers: {
    classify?: (route: Route) => Promise<void>
    store?: (route: Route) => Promise<void>
  } = {}
) {
  await page.route('**/api/identity/v1/apps/*/widget-tokens', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'widget.jwt', token_type: 'Bearer', expires_in: 600 })
    })
  )
  const record = (route: Route) => {
    const request = route.request()
    const body = request.postDataBuffer() ?? Buffer.alloc(0)
    seen.uploads.push({
      auth: request.headers().authorization ?? null,
      type: request.headers()['content-type'] ?? null,
      size: body.length,
      jpeg: jpegSize(body)
    })
  }
  await page.route('**/api/vision/v1/classifications', async (route) => {
    record(route)
    if (answers.classify) return answers.classify(route)
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(classification())
    })
  })
  await page.route('**/api/vision/v1/images', async (route) => {
    record(route)
    if (answers.store) return answers.store(route)
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-1',
        content_type: 'image/jpeg',
        size_bytes: 1,
        width: 1,
        height: 1
      })
    })
  })
}

const detail = (status: number) => (route: Route) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ detail: 'x' }) })

async function upload(page: Page, file = png(320, 240), name = 'photo.png') {
  await page.locator('synthwerk-vision input[type=file]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: file
  })
}

async function allowCamera(context: BrowserContext) {
  const origin = new URL(test.info().project.use.baseURL ?? '').origin
  await context.grantPermissions(['camera'], { origin })
}

test('signed-out visitor - sign-in prompt, no vision call, no camera', async ({ page }) => {
  const seen = await watch(page)
  await page.goto('/demo/vision.html')
  await expect(page.getByText('Sign in to label photos')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use camera' })).toHaveCount(0)
  await expect(page.locator('synthwerk-vision input[type=file]')).toHaveCount(0)
  expect(seen.api).toEqual([])
  expect((await camera(page)).calls).toBe(0)
  expect(seen.problems).toEqual([])
})

test('signed-in user - large photo resized below 1 MiB, primary label and alternatives', async ({
  page
}) => {
  const seen = await watch(page)
  await fakeBackend(page, seen)
  await page.goto('/demo/vision.html?signed-in')
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeVisible()
  const big = png(2400, 1600, true)
  expect(big.length).toBeGreaterThan(EDGE_LIMIT)
  await upload(page, big)

  const result = page.locator('synthwerk-vision .sw-result')
  await expect(result.locator('.sw-result__best')).toHaveText('beagle')
  await expect(result.locator('.sw-result__primary .sw-result__score')).toHaveText('81% match')
  await expect(result.locator('.sw-result__topic')).toHaveText(
    'Topic: animal › mammal › dog › beagle'
  )
  await expect(result.getByRole('listitem')).toHaveText([/English foxhound/, /Walker hound/])
  await expect(page.getByRole('img', { name: 'Your photo' })).toBeVisible()

  expect(seen.api).toEqual([
    'POST /api/identity/v1/apps/0192f0a0-0000-7000-8000-000000000001/widget-tokens',
    'POST /api/vision/v1/classifications'
  ])
  const [sent] = seen.uploads
  expect(sent?.auth).toBe('Bearer widget.jwt')
  expect(sent?.type).toMatch(/^multipart\/form-data; boundary=/)
  expect(sent?.size).toBeLessThan(EDGE_LIMIT)
  expect(Math.max(sent?.jpeg?.width ?? 0, sent?.jpeg?.height ?? 0)).toBeLessThanOrEqual(1280)
  expect(sent?.jpeg?.width).toBeGreaterThan(0)
  expect(seen.problems).toEqual([])
})

test('camera - starts only on click, photo from the fake camera, tracks stop', async ({
  page,
  context
}) => {
  await allowCamera(context)
  const seen = await watch(page)
  await fakeBackend(page, seen)
  await page.goto('/demo/vision.html?signed-in')
  await expect(page.getByRole('button', { name: 'Use camera' })).toBeVisible()
  expect((await camera(page)).calls).toBe(0)

  await page.getByRole('button', { name: 'Use camera' }).click()
  const video = page.locator('synthwerk-vision video')
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0)
  expect(await camera(page)).toEqual({ calls: 1, live: 1, audio: 0 })

  await page.getByRole('button', { name: 'Take photo' }).click()
  await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
  await expect(video).toHaveCount(0)
  expect((await camera(page)).live).toBe(0)
  expect(seen.uploads[0]?.jpeg?.width).toBeGreaterThan(0)
  expect(seen.uploads[0]?.size).toBeLessThan(EDGE_LIMIT)
  expect(seen.problems).toEqual([])
})

test('camera closed - tracks stop, nothing sent', async ({ page, context }) => {
  await allowCamera(context)
  const seen = await watch(page)
  await fakeBackend(page, seen)
  await page.goto('/demo/vision.html?signed-in')
  await page.getByRole('button', { name: 'Use camera' }).click()
  await expect(page.locator('synthwerk-vision video')).toBeVisible()
  await page.getByRole('button', { name: 'Close camera' }).click()
  await expect(page.locator('synthwerk-vision video')).toHaveCount(0)
  await expect.poll(async () => (await camera(page)).live).toBe(0)
  expect(seen.uploads).toEqual([])
  await expect(page.getByRole('button', { name: 'Use camera' })).toBeFocused()
})

test('camera permission denied - message, upload still works', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, seen)
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
  })
  await page.goto('/demo/vision.html?signed-in')
  await page.getByRole('button', { name: 'Use camera' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'The camera is blocked. Allow it in the browser settings, or choose a photo.'
  )
  await upload(page)
  await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
})

test('widget token for another origin (403) - not-allowed state', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, seen, { classify: detail(403) })
  await page.goto('/demo/vision.html?signed-in')
  await upload(page)
  await expect(page.getByRole('alert')).toHaveText('This site cannot use image labels.')
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})

test('session gone (401 after a new token) - sign-in prompt', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, seen, { classify: detail(401) })
  await page.goto('/demo/vision.html?signed-in')
  await upload(page)
  await expect(page.getByText('Sign in to label photos')).toBeVisible()
})

test('edge body limit (413) - too-large state', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, seen, { classify: detail(413) })
  await page.goto('/demo/vision.html?signed-in')
  await upload(page)
  await expect(page.getByRole('alert')).toHaveText('The photo is too large. Choose a smaller one.')
})

test('save-photos and a full storage quota (507) - labels stay, quota note', async ({ page }) => {
  const seen = await watch(page)
  await fakeBackend(page, seen, { store: detail(507) })
  await page.goto('/demo/vision.html?signed-in&save-photos')
  await upload(page)
  await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
  await expect(page.locator('synthwerk-vision .sw-result__save')).toHaveText(
    'The photo storage of your team is full. The labels are still shown.'
  )
  expect(seen.api.at(-1)).toBe('POST /api/vision/v1/images')
})

test('offline - offline state and the buttons are disabled', async ({ page, context }) => {
  await page.goto('/demo/vision.html?signed-in')
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeEnabled()
  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: 'offline' })).toHaveText(
    'You are offline. Check your connection.'
  )
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeDisabled()
  await context.setOffline(false)
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeEnabled()
})

test('German - text follows the lang attribute', async ({ page }) => {
  await page.goto('/demo/vision.html?signed-in&lang=de')
  await expect(page.getByRole('heading', { name: 'Bild-Labels' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Foto wählen' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kamera nutzen' })).toBeVisible()
})

test('below 640 px - the card fits the screen, no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  const seen = await watch(page)
  await fakeBackend(page, seen)
  await page.goto('/demo/vision.html?signed-in')
  await upload(page)
  await expect(page.locator('synthwerk-vision .sw-result__best')).toHaveText('beagle')
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scroll).toBeLessThanOrEqual(360)
})
