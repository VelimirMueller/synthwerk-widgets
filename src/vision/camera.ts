// The camera: it starts only after a click on "Use camera" and stops every track on close,
// after the photo, on sign-out, when the page is hidden and when the element leaves the page.

export type CameraProblem = 'camera_denied' | 'camera_missing' | 'camera_busy'

export interface Camera {
  /** Asks for the camera. `null` when `stop()` ran meanwhile: the new stream is already stopped. */
  start(): Promise<MediaStream | null>
  /** Stops every track. Safe to call at any time. */
  stop(): void
  readonly active: boolean
}

type Media = Pick<MediaDevices, 'getUserMedia'>

function devices(): Media | null {
  const media = globalThis.navigator?.mediaDevices
  return media && typeof media.getUserMedia === 'function' ? media : null
}

/** True when the browser offers a camera API (a secure context with `mediaDevices`). */
export function cameraSupported(media: Media | null = devices()): boolean {
  return media !== null
}

function stopTracks(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop()
}

/** The UI state of a failed `getUserMedia`. */
export function cameraProblem(error: unknown): CameraProblem {
  const name = (error as { name?: unknown } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'camera_denied'
  if (name === 'NotReadableError' || name === 'AbortError') return 'camera_busy'
  return 'camera_missing'
}

export const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 1280 }
  }
}

export function createCamera(media: Media | null = devices()): Camera {
  let stream: MediaStream | null = null
  /** Bumped by stop(): a stream that arrives after it is stopped at once. */
  let run = 0

  return {
    async start() {
      if (!media) throw Object.assign(new Error('no camera API'), { name: 'NotFoundError' })
      stopTracks(stream)
      stream = null
      const mine = ++run
      const next = await media.getUserMedia(CONSTRAINTS)
      if (mine !== run) {
        stopTracks(next)
        return null
      }
      stream = next
      return next
    },
    stop() {
      run++
      stopTracks(stream)
      stream = null
    },
    get active() {
      return stream !== null
    }
  }
}
