import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SIGN_IN_EVENT } from '../../src/element.ts'
import { defineVision, SynthwerkVisionElement, VISION_TAG } from '../../src/vision-element.ts'
import {
  API,
  APP_ID,
  classification,
  detail,
  fakeFetch,
  json,
  routes,
  visionRoutes
} from '../support/api.ts'

const photo = {
  blob: new Blob([new Uint8Array(2048)], { type: 'image/jpeg' }),
  width: 640,
  height: 480,
  canvas: {} as HTMLCanvasElement
}

vi.mock('../../src/vision/image.ts', () => ({
  prepareFile: vi.fn(async () => photo),
  compress: vi.fn(async () => photo),
  snapshot: vi.fn(() => ({ source: {}, width: 640, height: 480 }))
}))

const image = await import('../../src/vision/image.ts')

beforeAll(() => defineVision())

let tracks: { stop: ReturnType<typeof vi.fn> }[] = []
let getUserMedia: ReturnType<typeof vi.fn>

function stubCamera(impl?: () => Promise<MediaStream>) {
  tracks = [{ stop: vi.fn() }]
  getUserMedia = vi.fn(
    impl ?? (async () => ({ getTracks: () => tracks }) as unknown as MediaStream)
  )
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia }
  })
}

beforeEach(() => {
  stubCamera()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  // happy-dom has no MediaStream: keep the fake stream on the element as it is.
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    get(this: { _src?: unknown }) {
      return this._src ?? null
    },
    set(this: { _src?: unknown }, value: unknown) {
      this._src = value
    }
  })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    configurable: true,
    value: 640
  })
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.mocked(image.prepareFile).mockImplementation(async () => photo)
})

const flush = async (rounds = 8) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0))
}

function embed(attrs: Record<string, string> = {}, signedIn = true): SynthwerkVisionElement {
  const el = document.createElement(VISION_TAG) as SynthwerkVisionElement
  el.setAttribute('app-id', APP_ID)
  el.setAttribute('api-url', API)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (signedIn) el.getUserToken = () => 'user-token'
  document.body.append(el)
  return el
}

const root = (el: SynthwerkVisionElement) => el.shadowRoot as ShadowRoot
const $ = <T extends Element = HTMLElement>(el: SynthwerkVisionElement, selector: string) =>
  root(el).querySelector(selector) as T | null
const text = (el: SynthwerkVisionElement, selector: string) =>
  $(el, selector)?.textContent?.trim() ?? null

function stubApi(...extra: ReturnType<typeof visionRoutes.classify>[]) {
  const api = fakeFetch([routes.token(), ...extra])
  vi.stubGlobal('fetch', api.fetch)
  return api
}

async function choose(el: SynthwerkVisionElement): Promise<void> {
  const input = $<HTMLInputElement>(el, 'input[type=file]')
  if (!input) throw new Error('no file input')
  const file = new File(['x'], 'photo.png', { type: 'image/png' })
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  input.dispatchEvent(new Event('change'))
  await flush()
}

const paths = (api: ReturnType<typeof stubApi>) => api.calls.map((r) => new URL(r.url).pathname)

async function openCamera(el: SynthwerkVisionElement): Promise<void> {
  $(el, '.sw-vision__camera')?.click()
  await flush()
  const video = $(el, 'video.sw-camera__video')
  if (!video) throw new Error('camera view not shown')
  video.dispatchEvent(new Event('loadeddata'))
  await flush(1)
}

describe('<synthwerk-vision>', () => {
  it('signed-out visitor - sign-in view, no camera, no request at all', async () => {
    const api = stubApi(visionRoutes.classify())
    const el = embed({}, false)
    await flush()
    expect($(el, '.sw-vision')?.dataset.auth).toBe('signed_out')
    expect(text(el, '.sw-signin__title')).toBe('Sign in to label photos')
    expect($(el, 'input[type=file]')).toBeNull()
    expect($(el, '.sw-vision__camera')).toBeNull()
    expect(api.calls).toHaveLength(0)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('sign-in button - sends the sign-in event to the host', async () => {
    const el = embed({}, false)
    await flush()
    const seen = vi.fn()
    el.addEventListener(SIGN_IN_EVENT, seen)
    $(el, 'button.sw-signin__button')?.click()
    expect(seen).toHaveBeenCalledOnce()
  })

  it('no app-id - not-allowed state, no request', async () => {
    const api = stubApi()
    const el = document.createElement(VISION_TAG) as SynthwerkVisionElement
    el.getUserToken = () => 'user-token'
    document.body.append(el)
    await flush()
    expect(text(el, '.sw-banner--not_allowed')).toBe('This site cannot use image labels.')
    expect(api.calls).toHaveLength(0)
  })

  it('signed in - upload and camera buttons, nothing sent and no camera before a click', async () => {
    const api = stubApi()
    const el = embed()
    await flush()
    expect(text(el, '.sw-vision__choose')).toBe('Choose photo')
    expect(text(el, '.sw-vision__camera')).toBe('Use camera')
    expect($<HTMLInputElement>(el, 'input[type=file]')?.accept).toContain('image/jpeg')
    expect(api.calls).toHaveLength(0)
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(root(el).adoptedStyleSheets.length + root(el).querySelectorAll('style').length).toBe(1)
  })

  it('choose button - opens the file picker', async () => {
    const el = embed()
    await flush()
    const input = $<HTMLInputElement>(el, 'input[type=file]') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    $(el, '.sw-vision__choose')?.click()
    expect(click).toHaveBeenCalledOnce()
  })

  it('photo chosen - top label, score, topic path and other labels', async () => {
    const api = stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await choose(el)
    expect(paths(api)).toEqual([
      `/identity/v1/apps/${APP_ID}/widget-tokens`,
      '/vision/v1/classifications'
    ])
    expect(text(el, '.sw-result__best')).toBe('beagle')
    expect(text(el, '.sw-result__primary .sw-result__score')).toBe('81% match')
    expect(text(el, '.sw-result__topic')).toBe('Topic: animal › mammal › dog › beagle')
    const others = [...root(el).querySelectorAll('.sw-result__label .sw-result__name')]
    expect(others.map((n) => n.textContent)).toEqual(['English foxhound', 'Walker hound'])
    expect($(el, '.sw-result__uncertain')).toBeNull()
    expect($(el, 'canvas.sw-vision__preview')?.hasAttribute('hidden')).toBe(false)
    expect($(el, '.sw-result__save')).toBeNull()
  })

  it('uncertain result with a team correction - correction first, "Not sure" shown', async () => {
    stubApi(
      visionRoutes.classify(() =>
        json(
          classification({
            uncertain: true,
            correction: {
              feedback_id: 3,
              label: {
                id: 'h',
                label: 'harrier',
                score: 0.02,
                topic: 'dog',
                path: ['animal', 'dog', 'harrier']
              },
              distance: 1
            }
          })
        )
      )
    )
    const el = embed()
    await flush()
    await choose(el)
    expect(text(el, '.sw-result__best')).toBe('harrier')
    expect(text(el, '.sw-result__note')).toBe('Corrected by your team')
    expect(text(el, '.sw-result__uncertain')).toBe('Not sure')
    const others = [...root(el).querySelectorAll('.sw-result__label .sw-result__name')]
    expect(others.map((n) => n.textContent)).toContain('beagle')
  })

  it('try another photo - back to the start', async () => {
    stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await choose(el)
    $(el, '.sw-vision__again')?.click()
    await flush()
    expect($(el, '.sw-result')).toBeNull()
    expect(text(el, '.sw-vision__intro')).toContain('Choose a photo')
  })

  it.each([
    [403, 'This site cannot use image labels.', false],
    [413, 'The photo is too large. Choose a smaller one.', false],
    [415, 'This file is not a photo we can read. Use JPEG, PNG or WebP.', false],
    [503, 'Image labels are busy. Try again in a moment.', true],
    [500, 'Something went wrong. Try again.', true]
  ])(
    'vision answers %i - the error state, retry only when it can help',
    async (status, message, retry) => {
      stubApi(visionRoutes.classify(() => detail(status)))
      const el = embed()
      await flush()
      await choose(el)
      expect(text(el, '[role=alert] p')).toBe(message)
      expect(Boolean($(el, '[role=alert] button'))).toBe(retry)
    }
  )

  it('identity refuses the trade with 403 origin_not_allowed - not-allowed state, no vision call', async () => {
    // A real browser can read this answer since identity makes it readable (widgets#41).
    const api = fakeFetch([
      routes.token(() => json({ code: 'origin_not_allowed', title: 'Origin not allowed' }, 403)),
      visionRoutes.classify()
    ])
    vi.stubGlobal('fetch', api.fetch)
    const el = embed()
    await flush()
    await choose(el)
    expect(text(el, '[role=alert] p')).toBe('This site cannot use image labels.')
    expect(api.calls.some((r) => r.url.includes('/vision/'))).toBe(false)
  })

  it('retry - the same photo again', async () => {
    let first = true
    const api = stubApi(
      visionRoutes.classify(() => {
        if (first) {
          first = false
          return detail(503)
        }
        return json(classification())
      })
    )
    const el = embed()
    await flush()
    await choose(el)
    $(el, '[role=alert] button')?.click()
    await flush()
    expect(text(el, '.sw-result__best')).toBe('beagle')
    expect(paths(api).filter((p) => p.endsWith('/classifications'))).toHaveLength(2)
    expect(image.prepareFile).toHaveBeenCalledTimes(2)
  })

  it('vision answers 401 again after a new token - sign-in view, state dropped', async () => {
    stubApi(visionRoutes.classify(() => detail(401)))
    const el = embed()
    await flush()
    await choose(el)
    expect($(el, '.sw-vision')?.dataset.auth).toBe('signed_out')
    expect($(el, '.sw-result')).toBeNull()
  })

  it('unreadable file - the unsupported state, no request', async () => {
    const { SynthwerkError } = await import('@synthwerk/sdk')
    vi.mocked(image.prepareFile).mockRejectedValueOnce(
      new SynthwerkError({ code: 'unsupported_media_type', title: 'x' })
    )
    const api = stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await choose(el)
    expect(text(el, '[role=alert] p')).toContain('not a photo we can read')
    expect(paths(api)).toEqual([])
  })

  it('save-photos - stores the photo and says so', async () => {
    const api = stubApi(visionRoutes.classify(), visionRoutes.store())
    const el = embed({ 'save-photos': '' })
    await flush()
    await choose(el)
    expect(paths(api)).toContain('/vision/v1/images')
    expect(text(el, '.sw-result__save')).toBe('Photo saved.')
  })

  it('save-photos and the storage quota is full (507) - labels stay, quota note', async () => {
    stubApi(
      visionRoutes.classify(),
      visionRoutes.store(() => detail(507))
    )
    const el = embed({ 'save-photos': '' })
    await flush()
    await choose(el)
    expect(text(el, '.sw-result__best')).toBe('beagle')
    expect(text(el, '.sw-result__save')).toBe(
      'The photo storage of your team is full. The labels are still shown.'
    )
  })

  it('save-photos and another failure - labels stay, reason given', async () => {
    stubApi(
      visionRoutes.classify(),
      visionRoutes.store(() => detail(413))
    )
    const el = embed({ 'save-photos': '' })
    await flush()
    await choose(el)
    expect(text(el, '.sw-result__save')).toBe(
      'The photo was not saved. The labels are still shown. The photo is too large. Choose a smaller one.'
    )
  })

  it('offline - offline state, buttons disabled, nothing sent', async () => {
    const api = stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    window.dispatchEvent(new Event('offline'))
    await flush()
    expect(text(el, '.sw-banner--offline')).toBe('You are offline. Check your connection.')
    expect($<HTMLButtonElement>(el, '.sw-vision__choose')?.disabled).toBe(true)
    await choose(el)
    expect(api.calls).toHaveLength(0)
    window.dispatchEvent(new Event('online'))
    await flush()
    expect($(el, '.sw-banner--offline')).toBeNull()
  })

  it('camera - starts on click, photo taken, every track stopped before the upload', async () => {
    const api = stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await openCamera(el)
    expect(getUserMedia).toHaveBeenCalledOnce()
    const video = $<HTMLVideoElement>(el, 'video.sw-camera__video')
    expect(video?.getAttribute('aria-label')).toBe('Camera view')
    $(el, '.sw-camera__capture')?.click()
    expect(tracks[0]?.stop).toHaveBeenCalledOnce()
    await flush()
    expect($(el, 'video')).toBeNull()
    expect(image.compress).toHaveBeenCalled()
    expect(paths(api)).toContain('/vision/v1/classifications')
    expect(text(el, '.sw-result__best')).toBe('beagle')
  })

  it('camera without a frame yet - "Take photo" waits', async () => {
    const el = embed()
    await flush()
    $(el, '.sw-vision__camera')?.click()
    await flush()
    expect($<HTMLButtonElement>(el, '.sw-camera__capture')?.disabled).toBe(true)
    $(el, 'video')?.dispatchEvent(new Event('loadeddata'))
    await flush(1)
    expect($<HTMLButtonElement>(el, '.sw-camera__capture')?.disabled).toBe(false)
  })

  it('frame cannot be read - camera stops, message, nothing sent', async () => {
    vi.mocked(image.snapshot).mockImplementationOnce(() => {
      throw new Error('no frame')
    })
    const api = stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await openCamera(el)
    $(el, '.sw-camera__capture')?.click()
    await flush()
    expect(tracks[0]?.stop).toHaveBeenCalledOnce()
    expect(text(el, '[role=alert] p')).toBe(
      'The camera is in use by another app. Close it, or choose a photo.'
    )
    expect(api.calls).toHaveLength(0)
  })

  it('error while offline - no retry until the connection is back', async () => {
    stubApi(visionRoutes.classify(() => detail(503)))
    const el = embed()
    await flush()
    await choose(el)
    expect($(el, '[role=alert] button')).not.toBeNull()
    window.dispatchEvent(new Event('offline'))
    await flush()
    expect($(el, '[role=alert] button')).toBeNull()
    window.dispatchEvent(new Event('online'))
    await flush()
    expect($(el, '[role=alert] button')).not.toBeNull()
  })

  it('camera closed - tracks stop, no photo, no request', async () => {
    const api = stubApi()
    const el = embed()
    await flush()
    await openCamera(el)
    $(el, '.sw-camera__close')?.click()
    await flush()
    expect(tracks[0]?.stop).toHaveBeenCalledOnce()
    expect($(el, 'video')).toBeNull()
    expect(api.calls).toHaveLength(0)
  })

  it('Escape - closes the camera', async () => {
    const el = embed()
    await flush()
    await openCamera(el)
    $(el, '.sw-camera')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flush()
    expect(tracks[0]?.stop).toHaveBeenCalledOnce()
  })

  it('page hidden - the camera stops', async () => {
    const el = embed()
    await flush()
    await openCamera(el)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(tracks[0]?.stop).toHaveBeenCalledOnce()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    expect($(el, 'video')).toBeNull()
  })

  it('element removed - the camera stops', async () => {
    const el = embed()
    await flush()
    await openCamera(el)
    el.remove()
    expect(tracks[0]?.stop).toHaveBeenCalled()
  })

  it('host signs out - camera stops, result dropped, sign-in view', async () => {
    stubApi(visionRoutes.classify())
    const el = embed()
    await flush()
    await choose(el)
    await openCamera(el)
    el.getUserToken = () => null
    await flush()
    expect(tracks[0]?.stop).toHaveBeenCalled()
    expect($(el, '.sw-result')).toBeNull()
    expect($(el, '.sw-vision')?.dataset.auth).toBe('signed_out')
  })

  it.each([
    [
      'NotAllowedError',
      'The camera is blocked. Allow it in the browser settings, or choose a photo.'
    ],
    ['NotFoundError', 'No camera found. Choose a photo instead.'],
    ['NotReadableError', 'The camera is in use by another app. Close it, or choose a photo.']
  ])('camera refused with %s - message, upload still works', async (name, message) => {
    stubCamera(() => Promise.reject(new DOMException('no', name)))
    const el = embed()
    await flush()
    $(el, '.sw-vision__camera')?.click()
    await flush()
    expect($(el, 'video')).toBeNull()
    expect(text(el, '[role=alert] p')).toBe(message)
    expect($<HTMLButtonElement>(el, '.sw-vision__choose')?.disabled).toBe(false)
  })

  it('no camera API (insecure page) - no camera button', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    const el = embed()
    await flush()
    expect($(el, '.sw-vision__choose')).not.toBeNull()
    expect($(el, '.sw-vision__camera')).toBeNull()
  })

  it('German - text follows the lang attribute', async () => {
    const el = embed({ lang: 'de' })
    await flush()
    expect(text(el, '.sw-vision__title')).toBe('Bild-Labels')
    expect(text(el, '.sw-vision__camera')).toBe('Kamera nutzen')
  })

  it('second define - harmless', () => {
    expect(() => defineVision()).not.toThrow()
    expect(customElements.get(VISION_TAG)).toBe(SynthwerkVisionElement)
  })
})
