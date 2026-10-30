import { afterEach, describe, expect, it, vi } from 'vitest'
import { readAttributes, resolveConfig } from '../../src/config.ts'
import {
  clearSettingsCache,
  loadSettings,
  MAX_GREETING,
  NO_SETTINGS,
  parseSettings,
  settingsUrl
} from '../../src/settings.ts'
import { API, APP_ID, fakeFetch, json, routes, studioSettings } from '../support/api.ts'

afterEach(() => {
  clearSettingsCache()
  vi.useRealTimers()
})

describe('parseSettings', () => {
  it('valid answer - every field kept', () => {
    expect(parseSettings(studioSettings)).toEqual({
      position: 'bottom-left',
      theme: 'contrast',
      mode: 'dark',
      lang: 'de',
      accent: 'venture',
      greeting: 'Moin! Fragen Sie uns.'
    })
  })

  it('values outside the token lists - each one becomes the default, never raw CSS', () => {
    const parsed = parseSettings({
      position: 'top-left',
      theme: 'neon',
      mode: 'DARK',
      lang: 'fr',
      accent: 'red; background: url(https://evil.test/x)',
      greeting: 42
    })
    expect(parsed).toEqual(NO_SETTINGS)
  })

  it('lang auto and the empty greeting - defaults (browser language, built-in greeting)', () => {
    const parsed = parseSettings({ ...studioSettings, lang: 'auto', greeting: '   ' })
    expect(parsed.lang).toBeNull()
    expect(parsed.greeting).toBeNull()
    expect(parsed.accent).toBe('venture')
  })

  it('greeting - plain text kept as is, too long or control characters refused', () => {
    expect(parseSettings({ greeting: '<b>Hi</b>\r\nzweite Zeile' }).greeting).toBe(
      '<b>Hi</b>\nzweite Zeile'
    )
    expect(parseSettings({ greeting: 'ä'.repeat(MAX_GREETING) }).greeting).toHaveLength(
      MAX_GREETING
    )
    expect(parseSettings({ greeting: 'x'.repeat(MAX_GREETING + 1) }).greeting).toBeNull()
    expect(parseSettings({ greeting: 'bell\u0007' }).greeting).toBeNull()
    expect(parseSettings({ greeting: 'evil‮txt.exe' }).greeting).toBeNull()
  })

  it('not an object - all defaults', () => {
    for (const body of [null, 'x', 1, ['bottom-left']])
      expect(parseSettings(body)).toEqual(NO_SETTINGS)
  })
})

describe('loadSettings', () => {
  it('GET without token or cookie - the settings of the app', async () => {
    const api = fakeFetch([routes.settings()])
    const settings = await loadSettings({ apiUrl: `${API}/`, appId: APP_ID, fetch: api.fetch })
    expect(settings.position).toBe('bottom-left')
    expect(api.calls).toHaveLength(1)
    const [request] = api.calls
    expect(request?.url).toBe(`${API}/identity/v1/apps/${APP_ID}/widget-settings`)
    expect(request?.method).toBe('GET')
    expect(request?.headers.get('authorization')).toBeNull()
    expect(request?.credentials).toBe('omit')
  })

  it('app id with URL characters - encoded in the path', () => {
    expect(settingsUrl(API, '../x?y')).toBe(`${API}/identity/v1/apps/..%2Fx%3Fy/widget-settings`)
  })

  it.each([
    ['403 origin not allowed', () => json({ code: 'origin_not_allowed', title: 'x' }, 403)],
    ['500', () => json({ code: 'internal', title: 'x' }, 500)],
    ['bad JSON', () => new Response('{nope', { status: 200 })],
    ['a huge body', () => new Response(`"${'x'.repeat(10_000)}"`, { status: 200 })],
    [
      'network error',
      () => {
        throw new TypeError('Failed to fetch')
      }
    ]
  ])('%s - defaults, no throw', async (_name, reply) => {
    const api = fakeFetch([routes.settings(reply)])
    await expect(loadSettings({ apiUrl: API, appId: APP_ID, fetch: api.fetch })).resolves.toEqual(
      NO_SETTINGS
    )
  })

  it('no answer - defaults after the timeout', async () => {
    vi.useFakeTimers()
    const fetch = (input: Request) =>
      new Promise<Response>((_resolve, reject) =>
        input.signal.addEventListener('abort', () => reject(input.signal.reason))
      )
    const pending = loadSettings({ apiUrl: API, appId: APP_ID, fetch, timeoutMs: 3000 })
    await vi.advanceTimersByTimeAsync(3000)
    await expect(pending).resolves.toEqual(NO_SETTINGS)
  })

  it('many widgets and a failing API - one request for the page, no retry', async () => {
    const api = fakeFetch([routes.settings(() => json({ code: 'internal', title: 'x' }, 503))])
    const options = { apiUrl: API, appId: APP_ID, fetch: api.fetch }
    await Promise.all([loadSettings(options), loadSettings(options), loadSettings(options)])
    await loadSettings(options)
    expect(api.calls).toHaveLength(1)
  })

  it('no app id or API - no request', async () => {
    const api = fakeFetch([routes.settings()])
    await loadSettings({ apiUrl: '', appId: APP_ID, fetch: api.fetch })
    await loadSettings({ apiUrl: API, appId: '', fetch: api.fetch })
    expect(api.calls).toHaveLength(0)
  })
})

describe('resolveConfig', () => {
  const attrs = (values: Record<string, string>) =>
    readAttributes((name) => values[name] ?? null, 'https://site.test/')

  it('no attributes - the studio values', () => {
    const config = resolveConfig(attrs({}), parseSettings(studioSettings), ['en-US'])
    expect(config).toMatchObject({
      position: 'bottom-left',
      theme: 'contrast',
      mode: 'dark',
      lang: 'de',
      accent: 'venture',
      greeting: 'Moin! Fragen Sie uns.'
    })
  })

  it('attributes set - the attribute wins over the studio value', () => {
    const config = resolveConfig(
      attrs({
        position: 'bottom-right',
        theme: 'default',
        mode: 'light',
        lang: 'en',
        accent: 'lab'
      }),
      parseSettings(studioSettings),
      ['de']
    )
    expect(config).toMatchObject({
      position: 'bottom-right',
      theme: 'default',
      mode: 'light',
      lang: 'en',
      accent: 'lab'
    })
  })

  it('invalid attribute - the studio value, not the bad value; spaces trimmed', () => {
    const config = resolveConfig(
      attrs({ accent: 'hotpink', lang: 'fr', position: 'middle', mode: ' light ' }),
      parseSettings(studioSettings),
      ['en']
    )
    expect(config).toMatchObject({
      accent: 'venture',
      lang: 'de',
      position: 'bottom-left',
      mode: 'light'
    })
  })

  it('no studio settings - the defaults and the browser language', () => {
    expect(resolveConfig(attrs({}), null, ['de-AT'])).toMatchObject({
      position: 'bottom-right',
      theme: 'default',
      mode: 'system',
      lang: 'de',
      accent: 'flagship',
      greeting: null
    })
  })
})
