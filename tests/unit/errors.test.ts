import { SynthwerkError } from '@synthwerk/sdk'
import { describe, expect, it } from 'vitest'
import { classify, problemError } from '../../src/errors.ts'

const err = (code: string, retryAfter?: number) =>
  new SynthwerkError({ code, title: code, ...(retryAfter === undefined ? {} : { retryAfter }) })

describe('classify', () => {
  it.each([
    ['unauthenticated', 'signed_out'],
    ['offline', 'offline'],
    ['quota_exhausted', 'quota'],
    ['too_many_streams', 'busy'],
    ['rate_limited', 'busy'],
    ['model_unavailable', 'busy'],
    ['origin_not_allowed', 'not_allowed'],
    ['forbidden', 'not_allowed'],
    ['input_too_large', 'too_long'],
    ['unsupported_media_type', 'unsupported'],
    ['storage_full', 'storage_full'],
    ['stream_stalled', 'interrupted'],
    ['stream_interrupted', 'interrupted'],
    ['network', 'generic'],
    ['some_future_code', 'generic']
  ])('code %s - kind %s', (code, kind) => {
    expect(classify(err(code)).kind).toBe(kind)
  })

  it('quota with Retry-After - reset time from now', () => {
    const now = Date.UTC(2026, 9, 29, 12, 0, 0)
    expect(classify(err('quota_exhausted', 3600), now)).toEqual({
      kind: 'quota',
      resetsAt: new Date(now + 3_600_000)
    })
  })

  it('not a SynthwerkError - generic', () => {
    expect(classify(new Error('boom'))).toEqual({ kind: 'generic' })
  })
})

describe('problemError', () => {
  it('problem body - code, title, status and Retry-After', () => {
    const response = new Response(null, { status: 429, headers: { 'retry-after': '120' } })
    const error = problemError({ code: 'quota_exhausted', title: 'Quota exhausted' }, response)
    expect([error.code, error.title, error.status, error.retryAfter]).toEqual([
      'quota_exhausted',
      'Quota exhausted',
      429,
      120
    ])
  })

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [413, 'input_too_large'],
    [415, 'unsupported_media_type'],
    [429, 'rate_limited'],
    [503, 'model_unavailable'],
    [507, 'storage_full'],
    [500, 'bad_gateway'],
    [422, 'bad_gateway']
  ])('no problem body, status %i - code %s', (status, code) => {
    expect(problemError('<html>proxy</html>', new Response(null, { status })).code).toBe(code)
  })

  it('bad code in the body - status code instead, body never copied', () => {
    const error = problemError(
      { code: 'Bad Code!', detail: 'secret prompt' },
      new Response(null, { status: 403 })
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).not.toContain('secret')
  })

  it('no response - bad_gateway without status', () => {
    expect([
      problemError(undefined, undefined).code,
      problemError(undefined, undefined).status
    ]).toEqual(['bad_gateway', null])
  })
})
