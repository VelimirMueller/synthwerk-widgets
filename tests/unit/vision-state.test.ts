import { SynthwerkError } from '@synthwerk/sdk'
import { describe, expect, it, vi } from 'vitest'
import type { VisionApi } from '../../src/vision/api.ts'
import { readClassification } from '../../src/vision/api.ts'
import type { Prepared } from '../../src/vision/image.ts'
import { createVision } from '../../src/vision/vision.ts'
import { classification } from '../support/api.ts'

const result = readClassification(classification())
const photo: Prepared = {
  blob: new Blob(['jpeg']),
  width: 10,
  height: 10,
  canvas: {} as HTMLCanvasElement
}
const prepare = async () => photo
const fail = (code: string, retryAfter?: number) =>
  new SynthwerkError({ code, title: code, ...(retryAfter ? { retryAfter } : {}) })

function api(overrides: Partial<VisionApi> = {}): VisionApi {
  return {
    classify: vi.fn(async () => result as NonNullable<typeof result>),
    store: vi.fn(async () => ({
      id: 'img',
      content_type: 'image/jpeg',
      size_bytes: 4,
      width: 10,
      height: 10
    })),
    ...overrides
  }
}

describe('createVision', () => {
  it('photo - preview first, then the labels; nothing stored without save-photos', async () => {
    const client = api()
    const vision = createVision({ api: client, save: () => false })
    const onPrepared = vi.fn()
    await vision.analyse(prepare, onPrepared)
    expect(onPrepared).toHaveBeenCalledWith(photo)
    expect(vision.state.phase).toBe('done')
    expect(vision.state.result?.primary.label).toBe('beagle')
    expect(vision.state.save).toBe('off')
    expect(client.store).not.toHaveBeenCalled()
  })

  it('save-photos - the same JPEG is stored after the labels', async () => {
    const client = api()
    const vision = createVision({ api: client, save: () => true })
    await vision.analyse(prepare)
    expect(client.store).toHaveBeenCalledWith(photo.blob, expect.any(AbortSignal))
    expect(vision.state.save).toBe('saved')
  })

  it('storage quota full (507) - labels stay, save failed with storage_full', async () => {
    const vision = createVision({
      api: api({ store: async () => Promise.reject(fail('storage_full')) }),
      save: () => true
    })
    await vision.analyse(prepare)
    expect(vision.state.phase).toBe('done')
    expect(vision.state.save).toBe('failed')
    expect(vision.state.saveError?.kind).toBe('storage_full')
  })

  it.each([
    ['unauthenticated', 'signed_out'],
    ['forbidden', 'not_allowed'],
    ['input_too_large', 'too_long'],
    ['unsupported_media_type', 'unsupported'],
    ['offline', 'offline'],
    ['model_unavailable', 'busy']
  ])('classify fails with %s - error %s', async (code, kind) => {
    const vision = createVision({
      api: api({ classify: () => Promise.reject(fail(code)) }),
      save: () => true
    })
    await vision.analyse(prepare)
    expect(vision.state.phase).toBe('error')
    expect(vision.state.error?.kind).toBe(kind)
    expect(vision.state.result).toBeNull()
  })

  it('preparing fails - error, no request', async () => {
    const client = api()
    const vision = createVision({ api: client, save: () => false })
    await vision.analyse(() => Promise.reject(fail('unsupported_media_type')))
    expect(vision.state.error?.kind).toBe('unsupported')
    expect(client.classify).not.toHaveBeenCalled()
  })

  it('second photo while the first runs - the first answer is dropped', async () => {
    let first: (value: NonNullable<typeof result>) => void = () => undefined
    const other = readClassification(
      classification({ primary: { id: 'cat', label: 'tabby', score: 0.9, topic: 'cat', path: [] } })
    )
    const classify = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (first = resolve)))
      .mockImplementationOnce(async () => other)
    const vision = createVision({ api: api({ classify }), save: () => false })
    const one = vision.analyse(prepare)
    await new Promise((r) => setTimeout(r, 0))
    const signal = classify.mock.calls[0]?.[1] as AbortSignal
    await vision.analyse(prepare)
    expect(signal.aborted).toBe(true)
    first(result as NonNullable<typeof result>)
    await one
    expect(vision.state.result?.primary.label).toBe('tabby')
  })

  it('reset - back to idle, the running call is aborted', async () => {
    const classify = vi.fn(() => new Promise<never>(() => undefined))
    const vision = createVision({ api: api({ classify }), save: () => false })
    void vision.analyse(prepare).catch(() => undefined)
    await new Promise((r) => setTimeout(r, 0))
    vision.reset()
    expect((classify.mock.calls[0] as unknown[])[1]).toHaveProperty('aborted', true)
    expect(vision.state).toEqual({
      phase: 'idle',
      result: null,
      error: null,
      save: 'off',
      saveError: null
    })
    vision.dispose()
  })

  it('dispose during save - no late state change', async () => {
    let finish: () => void = () => undefined
    const vision = createVision({
      api: api({
        store: () => new Promise((_, reject) => (finish = () => reject(fail('aborted'))))
      }),
      save: () => true
    })
    const run = vision.analyse(prepare)
    await new Promise((r) => setTimeout(r, 0))
    vision.dispose()
    finish()
    await run
    expect(vision.state.save).toBe('saving')
  })
})
