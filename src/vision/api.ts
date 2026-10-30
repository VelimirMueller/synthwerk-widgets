// The two vision routes the widget calls, typed after synthwerk-vision `schemas.py`
// (`ClassificationOut`, `ImageOut`). synthwerk-contracts has no spec for them yet, so the
// types are hand-written here in the openapi-typescript shape. Replace them with the
// generated ones when the spec and the SDK vision client land.
import type { Synthwerk } from '@synthwerk/sdk'
import type { Client } from 'openapi-fetch'
import { problemError } from '../errors.ts'

export interface VisionLabel {
  id: string
  label: string
  /** Probability of this exact label, 0 to 1. */
  score: number
  topic: string
  /** Root topic → … → topic → label. */
  path: string[]
}

export interface VisionTopic {
  id: string
  parent: string | null
  depth: number
  score: number
}

export interface Classification {
  request_id: string
  primary: VisionLabel
  topic: VisionTopic
  labels: VisionLabel[]
  topics: VisionTopic[]
  uncertain: boolean
  correction: { feedback_id: number; label: VisionLabel; distance: number } | null
}

export interface StoredImage {
  id: string
  content_type: string
  size_bytes: number
  width: number
  height: number
}

interface FastApiError {
  detail: unknown
}

type NoParams = { query?: never; header?: never; path?: never; cookie?: never }
type Json<T> = { headers: Record<string, unknown>; content: { 'application/json': T } }
type Upload = { content: { 'multipart/form-data': { image: Blob } } }

/** The vision paths in the shape openapi-fetch reads. */
export interface VisionPaths {
  '/v1/classifications': {
    parameters: NoParams
    post: {
      parameters: NoParams
      requestBody: Upload
      responses: { 200: Json<unknown>; default: Json<FastApiError> }
    }
  }
  '/v1/images': {
    parameters: NoParams
    post: {
      parameters: NoParams
      requestBody: Upload
      responses: { 201: Json<unknown>; default: Json<FastApiError> }
    }
  }
}

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
 * The vision calls through the SDK transport: the widget token, one new token after a 401,
 * and the offline and network errors. The SDK has no vision client yet, so the calls go
 * through its identity client with the vision base URL per request.
 * - `baseUrl` is a typed per-request option of openapi-fetch 0.17.0 (`RequestOptions.baseUrl`
 *   in its `index.d.ts`; `localBaseUrl` in `createClient`), so the option is type-checked.
 * - The cast changes only the paths type (identity → vision). The transport stays the SDK's.
 * - tests/unit/vision-api.test.ts and tests/e2e/vision.spec.ts assert the request URL
 *   `<apiUrl>/vision/v1/...`: a change in openapi-fetch fails a test, not a user.
 * - Edge route `<apiUrl>/vision`, the same pattern as `/identity` and `/llm`.
 * - Goes away with the SDK vision client (synthwerk-sdk#19).
 */
export function createVisionApi(sw: Pick<Synthwerk, 'api'>, apiUrl: string): VisionApi {
  const client = sw.api.identity as unknown as Client<VisionPaths>
  const baseUrl = `${apiUrl.replace(/\/+$/, '')}/vision`

  return {
    async classify(image, signal) {
      const { data, error, response } = await client.POST('/v1/classifications', {
        baseUrl,
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
        baseUrl,
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
