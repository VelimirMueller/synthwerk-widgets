import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canvasEncode,
  compress,
  decodeFile,
  type Encode,
  fitWithin,
  MAX_FILE_BYTES,
  prepareFile,
  STEPS,
  snapshot,
  UPLOAD_LIMIT
} from '../../src/vision/image.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const code = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return (error as { code: string }).code
  }
  throw new Error('expected a failure')
}

/** An encoder whose JPEG has `sizes[n]` bytes on the n-th call. */
function encoder(sizes: number[]) {
  const calls: { width: number; height: number; quality: number }[] = []
  const encode: Encode = async (_frame, width, height, quality) => {
    calls.push({ width, height, quality })
    const size = sizes[calls.length - 1] ?? 1
    return { blob: new Blob([new Uint8Array(size)]), canvas: {} as HTMLCanvasElement }
  }
  return { encode, calls }
}

const frame = (width: number, height: number) => ({
  source: {} as CanvasImageSource,
  width,
  height
})

describe('fitWithin', () => {
  it.each([
    [4000, 3000, 1280, { width: 1280, height: 960 }],
    [3000, 4000, 1280, { width: 960, height: 1280 }],
    [640, 480, 1280, { width: 640, height: 480 }],
    [5000, 1, 1280, { width: 1280, height: 1 }],
    [0, 0, 1280, { width: 1, height: 1 }]
  ])('%i x %i, edge %i - %o', (w, h, edge, expected) => {
    expect(fitWithin(w, h, edge)).toEqual(expected)
  })
})

describe('compress', () => {
  it('first JPEG fits - one encode at 1280 px and quality 0.85', async () => {
    const { encode, calls } = encoder([200_000])
    const photo = await compress(frame(4032, 3024), encode)
    expect(calls).toEqual([{ width: 1280, height: 960, quality: 0.85 }])
    expect([photo.width, photo.height, photo.blob.size]).toEqual([1280, 960, 200_000])
  })

  it('noisy photo - steps down until the JPEG is below the upload limit', async () => {
    const { encode, calls } = encoder([2_000_000, 1_200_000, UPLOAD_LIMIT])
    const photo = await compress(frame(4000, 3000), encode)
    expect(calls.map((c) => [c.width, c.quality])).toEqual([
      [1280, 0.85],
      [1280, 0.72],
      [1024, 0.7]
    ])
    expect(photo.blob.size).toBeLessThanOrEqual(UPLOAD_LIMIT)
    expect(UPLOAD_LIMIT).toBeLessThan(1024 * 1024)
  })

  it('nothing fits - input_too_large after every step', async () => {
    const { encode, calls } = encoder(STEPS.map(() => 5_000_000))
    expect(await code(compress(frame(4000, 3000), encode))).toBe('input_too_large')
    expect(calls).toHaveLength(STEPS.length)
  })

  it('empty frame - unsupported_media_type', async () => {
    expect(await code(compress(frame(0, 10), encoder([1]).encode))).toBe('unsupported_media_type')
  })
})

describe('decodeFile', () => {
  it('file above the decode limit - input_too_large, never decoded', async () => {
    const decode = vi.fn()
    vi.stubGlobal('createImageBitmap', decode)
    const big = { size: MAX_FILE_BYTES + 1, type: 'image/jpeg' } as Blob
    expect(await code(decodeFile(big))).toBe('input_too_large')
    expect(decode).not.toHaveBeenCalled()
  })

  it.each([
    ['text file', new Blob(['hello'], { type: 'text/plain' })],
    ['empty file', new Blob([], { type: 'image/png' })]
  ])('%s - unsupported_media_type', async (_name, file) => {
    expect(await code(decodeFile(file))).toBe('unsupported_media_type')
  })

  it('decoder refuses the bytes - unsupported_media_type', async () => {
    vi.stubGlobal('createImageBitmap', () =>
      Promise.reject(new DOMException('bad', 'InvalidStateError'))
    )
    expect(await code(decodeFile(new Blob(['x'], { type: 'image/heic' })))).toBe(
      'unsupported_media_type'
    )
  })

  it('photo - EXIF orientation applied, size of the bitmap', async () => {
    const close = vi.fn()
    const decode = vi.fn(async () => ({ width: 3000, height: 2000, close }))
    vi.stubGlobal('createImageBitmap', decode)
    const decoded = await decodeFile(new Blob(['x'], { type: 'image/jpeg' }))
    expect(decode).toHaveBeenCalledWith(expect.any(Blob), { imageOrientation: 'from-image' })
    expect([decoded.width, decoded.height]).toEqual([3000, 2000])
    decoded.close()
    expect(close).toHaveBeenCalledOnce()
  })
})

describe('prepareFile', () => {
  it('decoded, compressed and the bitmap closed', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', async () => ({ width: 3000, height: 2000, close }))
    const { encode } = encoder([100])
    const photo = await prepareFile(new Blob(['x'], { type: 'image/png' }), encode)
    expect([photo.width, photo.height]).toEqual([1280, 853])
    expect(close).toHaveBeenCalledOnce()
  })

  it('compression fails - the bitmap is still closed', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', async () => ({ width: 3000, height: 2000, close }))
    const { encode } = encoder(STEPS.map(() => 5_000_000))
    expect(await code(prepareFile(new Blob(['x'], { type: 'image/png' }), encode))).toBe(
      'input_too_large'
    )
    expect(close).toHaveBeenCalledOnce()
  })
})

/** A fake 2D canvas: records draws, `toBlob` gives `blob`. */
function fakeCanvas(blob: Blob | null, context = true) {
  const draws: unknown[][] = []
  const canvas = {
    width: 0,
    height: 0,
    getContext: () =>
      context
        ? {
            fillStyle: '',
            fillRect: () => undefined,
            drawImage: (...args: unknown[]) => draws.push(args)
          }
        : null,
    toBlob: (done: (b: Blob | null) => void, type: string, quality: number) => {
      draws.push(['toBlob', type, quality])
      done(blob)
    }
  }
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)
  return { canvas, draws }
}

describe('canvasEncode', () => {
  it('draws at the target size and encodes a JPEG', async () => {
    const { canvas, draws } = fakeCanvas(new Blob(['jpeg']))
    const source = {} as CanvasImageSource
    const result = await canvasEncode({ source, width: 100, height: 50 }, 80, 40, 0.7)
    expect([canvas.width, canvas.height]).toEqual([80, 40])
    expect(draws).toEqual([
      [source, 0, 0, 80, 40],
      ['toBlob', 'image/jpeg', 0.7]
    ])
    expect(result.blob.size).toBe(4)
  })

  it.each([
    ['no 2D context', null, false],
    ['encoder gives no blob', null, true]
  ])('%s - unsupported_media_type', async (_name, blob, context) => {
    fakeCanvas(blob, context)
    expect(await code(canvasEncode(frame(10, 10), 10, 10, 0.8))).toBe('unsupported_media_type')
  })
})

describe('snapshot', () => {
  it('camera frame - copied at most 1280 px wide', () => {
    const { canvas, draws } = fakeCanvas(null)
    const video = { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement
    const copy = snapshot(video)
    expect([copy.width, copy.height, canvas.width, canvas.height]).toEqual([1280, 720, 1280, 720])
    expect(draws).toEqual([[video, 0, 0, 1280, 720]])
  })

  it('video without a frame yet - unsupported_media_type', () => {
    expect(() => snapshot({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toThrow()
  })
})
