import { createWidgetSession } from '@synthwerk/sdk'
import { describe, expect, it } from 'vitest'
import { createVisionApi, readClassification } from '../../src/vision/api.ts'
import {
  API,
  APP_ID,
  classification,
  detail,
  fakeFetch,
  json,
  routes,
  storedImage,
  visionRoutes
} from '../support/api.ts'

const photo = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })

function setup(...extra: ReturnType<typeof visionRoutes.classify>[]) {
  const api = fakeFetch([routes.token(), ...extra])
  const session = createWidgetSession({
    appId: APP_ID,
    apiUrl: `${API}/`,
    getUserToken: () => 'user-token',
    fetch: api.fetch
  })
  return { api, vision: createVisionApi(session.sw) }
}

const failure = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error as { code: string; status: number | null }
  }
  throw new Error('expected a failure')
}

describe('createVisionApi', () => {
  it('classify - multipart photo to <apiUrl>/vision with the widget token only', async () => {
    const { api, vision } = setup(visionRoutes.classify())
    const result = await vision.classify(photo())
    expect(result.primary.label).toBe('beagle')
    const request = api.calls[1] as Request
    expect(request.url).toBe(`${API}/vision/v1/classifications`)
    expect(request.headers.get('authorization')).toBe('Bearer widget.jwt.token')
    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    const form = await request.formData()
    const image = form.get('image') as File
    expect([image.type, image.size]).toEqual(['image/jpeg', 4])
  })

  it('store - POST /v1/images, returns the stored image', async () => {
    const { vision } = setup(visionRoutes.store())
    expect(await vision.store(photo())).toEqual(storedImage)
  })

  it('signed out - unauthenticated before any vision request', async () => {
    const api = fakeFetch([visionRoutes.classify()])
    const session = createWidgetSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => null,
      fetch: api.fetch
    })
    const error = await failure(createVisionApi(session.sw).classify(photo()))
    expect(error.code).toBe('unauthenticated')
    expect(api.calls).toHaveLength(0)
  })

  it('vision answers 401 twice - unauthenticated', async () => {
    const { vision } = setup(visionRoutes.classify(() => detail(401)))
    expect((await failure(vision.classify(photo()))).code).toBe('unauthenticated')
  })

  it.each([
    [403, 'forbidden'],
    [413, 'input_too_large'],
    [415, 'unsupported_media_type'],
    [503, 'model_unavailable'],
    [500, 'bad_gateway']
  ])('classify answers %i - %s', async (status, code) => {
    const { vision } = setup(visionRoutes.classify(() => detail(status)))
    const error = await failure(vision.classify(photo()))
    expect([error.code, error.status]).toEqual([code, status])
  })

  it('store answers 507 - storage_full', async () => {
    const { vision } = setup(visionRoutes.store(() => detail(507, 'quota reached')))
    expect((await failure(vision.store(photo()))).code).toBe('storage_full')
  })

  it('classify body without labels - bad_gateway', async () => {
    const { vision } = setup(visionRoutes.classify(() => json({ hello: 'world' })))
    expect((await failure(vision.classify(photo()))).code).toBe('bad_gateway')
  })

  it('store body without id - bad_gateway', async () => {
    const { vision } = setup(visionRoutes.store(() => json({}, 201)))
    expect((await failure(vision.store(photo()))).code).toBe('bad_gateway')
  })

  it('aborted - the request is cancelled', async () => {
    const { vision } = setup(
      visionRoutes.classify((request) => {
        if (request.signal.aborted) throw new DOMException('aborted', 'AbortError')
        return json(classification())
      })
    )
    const controller = new AbortController()
    controller.abort()
    expect((await failure(vision.classify(photo(), controller.signal))).code).toBe('aborted')
  })
})

describe('readClassification', () => {
  it('contract shape - primary, topic, labels, topics, uncertain', () => {
    const result = readClassification(classification({ uncertain: true }))
    expect(result?.primary).toEqual({
      id: 'n02088364',
      label: 'beagle',
      score: 0.81,
      topic: 'dog',
      path: ['animal', 'mammal', 'dog', 'beagle']
    })
    expect(result?.topic.id).toBe('animal')
    expect(result?.labels).toHaveLength(3)
    expect(result?.uncertain).toBe(true)
    expect(result?.correction).toBeNull()
  })

  it('correction - kept with its label', () => {
    const body = classification({
      correction: {
        feedback_id: 7,
        label: { id: 'x', label: 'harrier', score: 0.01, topic: 'dog', path: [] },
        distance: 2
      }
    })
    expect(readClassification(body)?.correction).toEqual({
      feedback_id: 7,
      label: { id: 'x', label: 'harrier', score: 0.01, topic: 'dog', path: [] },
      distance: 2
    })
  })

  it.each([
    [{ feedback_id: 'x', distance: 1 }],
    [{ feedback_id: 1.5, distance: 1 }],
    [{ feedback_id: 1, distance: 'far' }]
  ])('correction with bad numbers %o - dropped', (fields) => {
    const label = { id: 'x', label: 'harrier', score: 0.01, topic: 'dog', path: [] }
    expect(
      readClassification(classification({ correction: { ...fields, label } }))?.correction
    ).toBeNull()
  })

  it('odd values - scores clamped, long lists and texts cut, bad items dropped', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: `l${i}`,
      label: 'x'.repeat(500),
      score: 7
    }))
    const result = readClassification(
      classification({
        labels: [...many, 'junk', { id: '' }],
        uncertain: 'yes',
        correction: { label: 'no' }
      })
    )
    expect(result?.labels).toHaveLength(20)
    expect(result?.labels[0]?.score).toBe(1)
    expect(result?.labels[0]?.label).toHaveLength(200)
    expect(result?.uncertain).toBe(false)
    expect(result?.correction).toBeNull()
  })

  it.each([
    [null],
    ['text'],
    [[]],
    [classification({ primary: null })],
    [classification({ topic: {} })]
  ])('not a classification %# - null', (body) => {
    expect(readClassification(body)).toBeNull()
  })
})
