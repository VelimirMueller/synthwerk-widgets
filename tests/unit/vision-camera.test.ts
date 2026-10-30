import { describe, expect, it, vi } from 'vitest'
import {
  CONSTRAINTS,
  cameraProblem,
  cameraSupported,
  createCamera
} from '../../src/vision/camera.ts'

function fakeStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks }
}

describe('createCamera', () => {
  it('start - video only, back camera preferred, no audio', async () => {
    const { stream } = fakeStream()
    const getUserMedia = vi.fn(async () => stream)
    const camera = createCamera({ getUserMedia })
    expect(camera.active).toBe(false)
    expect(await camera.start()).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith(CONSTRAINTS)
    expect(CONSTRAINTS.audio).toBe(false)
    expect(camera.active).toBe(true)
  })

  it('stop - every track stops', async () => {
    const { stream, tracks } = fakeStream()
    const camera = createCamera({ getUserMedia: async () => stream })
    await camera.start()
    camera.stop()
    expect(tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
    expect(camera.active).toBe(false)
    camera.stop()
  })

  it('stop while the browser asks - the late stream stops at once', async () => {
    const { stream, tracks } = fakeStream()
    let grant: (s: MediaStream) => void = () => undefined
    const camera = createCamera({
      getUserMedia: () => new Promise<MediaStream>((resolve) => (grant = resolve))
    })
    const started = camera.start()
    camera.stop()
    grant(stream)
    expect(await started).toBeNull()
    expect(tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
    expect(camera.active).toBe(false)
  })

  it('second start - the first stream stops', async () => {
    const first = fakeStream()
    const second = fakeStream()
    const streams = [first.stream, second.stream]
    const camera = createCamera({ getUserMedia: async () => streams.shift() as MediaStream })
    await camera.start()
    await camera.start()
    expect(first.tracks[0]?.stop).toHaveBeenCalledOnce()
    expect(second.tracks[0]?.stop).not.toHaveBeenCalled()
  })

  it('no camera API - start fails as camera_missing', async () => {
    const camera = createCamera(null)
    expect(cameraSupported(null)).toBe(false)
    await expect(camera.start()).rejects.toSatisfy((e) => cameraProblem(e) === 'camera_missing')
  })
})

describe('cameraProblem', () => {
  it.each([
    ['NotAllowedError', 'camera_denied'],
    ['SecurityError', 'camera_denied'],
    ['NotReadableError', 'camera_busy'],
    ['AbortError', 'camera_busy'],
    ['NotFoundError', 'camera_missing'],
    ['OverconstrainedError', 'camera_missing'],
    [undefined, 'camera_missing']
  ])('%s - %s', (name, problem) => {
    expect(cameraProblem(name ? new DOMException('x', name) : null)).toBe(problem)
  })
})
