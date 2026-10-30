// Client-side resize and compression. The edge refuses a body above 1 MiB (synthwerk-infra
// Traefik `buffering`), so every photo leaves the browser as a JPEG below UPLOAD_LIMIT.
// Re-encoding also drops the EXIF block of the original file (GPS position, camera serial).
import { SynthwerkError } from '@synthwerk/sdk'

/** The largest JPEG the widget sends: 1 MiB minus room for the multipart envelope. */
export const UPLOAD_LIMIT = 900 * 1024
/** A larger file is refused before it is decoded: decoding it would cost too much memory. */
export const MAX_FILE_BYTES = 40 * 1024 * 1024

/**
 * Long edge and JPEG quality, tried in order until the JPEG fits. The model looks at
 * 384 px or less, so 1280 px loses nothing; the smaller steps only matter for noisy photos.
 */
export const STEPS: readonly { edge: number; quality: number }[] = [
  { edge: 1280, quality: 0.85 },
  { edge: 1280, quality: 0.72 },
  { edge: 1024, quality: 0.7 },
  { edge: 800, quality: 0.65 },
  { edge: 640, quality: 0.6 },
  { edge: 480, quality: 0.5 }
]

/** A decoded picture: a bitmap, a video frame or a canvas. */
export interface Frame {
  source: CanvasImageSource
  width: number
  height: number
}

export interface Prepared {
  blob: Blob
  width: number
  height: number
  /** The encoded picture, for the preview. */
  canvas: HTMLCanvasElement
}

export type Encode = (
  frame: Frame,
  width: number,
  height: number,
  quality: number
) => Promise<{ blob: Blob; canvas: HTMLCanvasElement }>

const tooLarge = () =>
  new SynthwerkError({ code: 'input_too_large', title: 'Image too large', status: null })
const unsupported = (cause?: unknown) =>
  new SynthwerkError({
    code: 'unsupported_media_type',
    title: 'Image not readable',
    status: null,
    cause
  })

/** The size with the long edge at most `edge`. Never larger than the original. */
export function fitWithin(
  width: number,
  height: number,
  edge: number
): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(width, height, 1))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

/** Draws the frame on a canvas (white below transparent parts) and encodes a JPEG. */
export const canvasEncode: Encode = async (frame, width, height, quality) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw unsupported()
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(frame.source, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )
  if (!blob) throw unsupported()
  return { blob, canvas }
}

/** The first step whose JPEG fits below `limit`. None fits: `input_too_large`. */
export async function compress(
  frame: Frame,
  encode: Encode = canvasEncode,
  limit: number = UPLOAD_LIMIT
): Promise<Prepared> {
  if (frame.width < 1 || frame.height < 1) throw unsupported()
  for (const step of STEPS) {
    const size = fitWithin(frame.width, frame.height, step.edge)
    const { blob, canvas } = await encode(frame, size.width, size.height, step.quality)
    if (blob.size <= limit) return { blob, canvas, ...size }
  }
  throw tooLarge()
}

/** Decodes a chosen file. EXIF orientation applies. Not a picture: `unsupported_media_type`. */
export async function decodeFile(file: Blob): Promise<Frame & { close(): void }> {
  if (file.size > MAX_FILE_BYTES) throw tooLarge()
  if (file.size === 0 || (file.type !== '' && !file.type.startsWith('image/'))) throw unsupported()
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (cause) {
    throw unsupported(cause)
  }
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close()
  }
}

/** A chosen file, decoded, resized and compressed. */
export async function prepareFile(file: Blob, encode: Encode = canvasEncode): Promise<Prepared> {
  const frame = await decodeFile(file)
  try {
    return await compress(frame, encode)
  } finally {
    frame.close()
  }
}

/**
 * Copies the current camera frame onto a canvas at most STEPS[0].edge wide. Take it before
 * the camera stops: a stopped video has no frame to compress.
 */
export function snapshot(video: HTMLVideoElement): Frame {
  if (video.videoWidth < 1 || video.videoHeight < 1) throw unsupported()
  const size = fitWithin(video.videoWidth, video.videoHeight, (STEPS[0] as { edge: number }).edge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw unsupported()
  context.drawImage(video, 0, 0, size.width, size.height)
  return { source: canvas, ...size }
}
