// The two vision routes the widget calls, through the SDK vision client (`sw.api.vision`).
// The types come from the SDK, generated from the synthwerk-contracts vision spec. The
// widget still reads every answer defensively (readClassification) before the view shows it.
import type {
  Classification as ClassificationOut,
  Correction,
  ScoredLabel,
  ScoredTopic,
  Synthwerk,
  VisionImage
} from '@synthwerk/sdk'
import { problemError } from '../errors.ts'

export type VisionLabel = ScoredLabel
export type VisionTopic = ScoredTopic

/** The part of `ClassificationOut` the widget shows. */
export type Classification = Pick<
  ClassificationOut,
  'request_id' | 'primary' | 'topic' | 'labels' | 'topics' | 'uncertain'
> & { correction: Correction | null }

export type StoredImage = VisionImage

/** Limits for text from the API. The view shows it as text only. */
const MAX_TEXT = 200
const MAX_LIST = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value.slice(0, MAX_TEXT) : null
}

function score(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function readLabel(value: unknown): VisionLabel | null {
  if (!isRecord(value)) return null
  const id = text(value.id)
  const label = text(value.label)
  if (!id || !label) return null
  const path = Array.isArray(value.path)
    ? value.path.slice(0, 32).flatMap((part) => text(part) ?? [])
    : []
  return { id, label, score: score(value.score), topic: text(value.topic) ?? '', path }
}

function readTopic(value: unknown): VisionTopic | null {
  if (!isRecord(value)) return null
  const id = text(value.id)
  if (!id) return null
  return {
    id,
    parent: text(value.parent),
    depth: typeof value.depth === 'number' ? value.depth : 0,
    score: score(value.score)
  }
}

function list<T>(value: unknown, read: (item: unknown) => T | null): T[] {
  return Array.isArray(value) ? value.slice(0, MAX_LIST).flatMap((item) => read(item) ?? []) : []
}

/** A classification from the response body, or `null` when the body does not fit. */
export function readClassification(body: unknown): Classification | null {
  if (!isRecord(body)) return null
  const primary = readLabel(body.primary)
  const topic = readTopic(body.topic)
  if (!primary || !topic) return null
  const fix = isRecord(body.correction) ? body.correction : null
  const fixLabel = fix ? readLabel(fix.label) : null
  const correction =
    fix &&
    fixLabel &&
    Number.isInteger(fix.feedback_id) &&
    typeof fix.distance === 'number' &&
    Number.isFinite(fix.distance)
      ? { feedback_id: fix.feedback_id as number, label: fixLabel, distance: fix.distance }
      : null
  return {
    request_id: text(body.request_id) ?? '',
    primary,
    topic,
    labels: list(body.labels, readLabel),
    topics: list(body.topics, readTopic),
    uncertain: body.uncertain === true,
    correction
  }
}

function readStored(body: unknown): StoredImage | null {
  if (!isRecord(body)) return null
  const id = text(body.id)
  if (!id) return null
  return {
    id,
    content_type: text(body.content_type) ?? '',
    size_bytes: Number(body.size_bytes) || 0,
    width: Number(body.width) || 0,
    height: Number(body.height) || 0
  }
}

export interface VisionApi {
  classify(image: Blob, signal?: AbortSignal): Promise<Classification>
  store(image: Blob, signal?: AbortSignal): Promise<StoredImage>
}

function form(body: { image: Blob }): FormData {
  const data = new FormData()
  data.append('image', body.image, 'photo.jpg')
  return data
}

/**
 * The vision calls through the SDK vision client (`<apiUrl>/vision`): the widget token, one
 * new token after a 401, and the offline and network errors come from the SDK transport.
 * The form names the file `photo.jpg`, as before.
 */
export function createVisionApi(sw: Pick<Synthwerk, 'api'>): VisionApi {
  const client = sw.api.vision

  return {
    async classify(image, signal) {
      const { data, error, response } = await client.POST('/v1/classifications', {
        body: { image },
        bodySerializer: form,
        ...(signal ? { signal } : {})
      })
      if (!response.ok) throw problemError(error, response)
      const parsed = readClassification(data)
      if (!parsed) throw problemError(null, new Response(null, { status: 502 }))
      return parsed
    },
    async store(image, signal) {
      const { data, error, response } = await client.POST('/v1/images', {
        body: { image },
        bodySerializer: form,
        ...(signal ? { signal } : {})
      })
      if (!response.ok) throw problemError(error, response)
      const parsed = readStored(data)
      if (!parsed) throw problemError(null, new Response(null, { status: 502 }))
      return parsed
    }
  }
}
