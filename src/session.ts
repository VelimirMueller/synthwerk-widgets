// The widget session: the host hands in the user token, the widget trades it for a
// short-lived widget token (identity `POST /v1/apps/{appId}/widget-tokens`, synthwerk#30)
// and the SDK sends only the widget token. Tokens stay in memory: no storage, no cookie.
import { createSynthwerk, isSynthwerkError, type Synthwerk, SynthwerkError } from '@synthwerk/sdk'
import { problemError } from './errors.ts'

/** Host hook: the access token of the signed-in user, or `null` when signed out. */
export type GetUserToken = () => string | null | undefined | Promise<string | null | undefined>

export interface SessionOptions {
  appId: string
  apiUrl: string
  getUserToken: GetUserToken
  fetch?: (input: Request) => Promise<Response>
  /** Clock in milliseconds since the epoch. Tests set it. */
  now?: () => number
}

/** A new widget token this many seconds before the old one expires. */
export const EXPIRY_MARGIN_S = 30

interface Cached {
  token: string
  expiresAt: number
  /** The user token it was traded for. Another user token needs a new trade. */
  user: string
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** The user token, or `null`. A host hook that throws counts as signed out. */
export async function userToken(get: GetUserToken | null | undefined): Promise<string | null> {
  if (!get) return null
  try {
    const token = await get()
    return typeof token === 'string' && token !== '' ? token : null
  } catch {
    return null
  }
}

function readWidgetToken(body: unknown): { token: string; expiresIn: number } | null {
  if (typeof body !== 'object' || body === null) return null
  const { access_token: token, expires_in: expiresIn } = body as Record<string, unknown>
  if (typeof token !== 'string' || token === '' || token.length > 4096) return null
  if (typeof expiresIn !== 'number' || !Number.isInteger(expiresIn) || expiresIn < 1) return null
  return { token, expiresIn: Math.min(expiresIn, 900) }
}

export interface WidgetSession {
  sw: Synthwerk
  /** Drops the cached widget token, for example after the host signs out. */
  reset(): void
}

export function createSession(options: SessionOptions): WidgetSession {
  const baseFetch = options.fetch ?? ((input: Request) => globalThis.fetch(input))
  const now = options.now ?? Date.now
  const apiUrl = trimSlash(options.apiUrl)
  const tokenUrl = `${apiUrl}/identity/v1/apps/${encodeURIComponent(options.appId)}/widget-tokens`
  let cached: Cached | null = null
  let pending: Promise<string | null> | null = null
  /** Bumped by reset(): an exchange that started before it never fills the cache. */
  let generation = 0

  async function exchange(): Promise<string | null> {
    const started = generation
    const user = await userToken(options.getUserToken)
    if (!user) {
      cached = null
      return null
    }
    let response: Response
    try {
      response = await baseFetch(
        new Request(tokenUrl, {
          method: 'POST',
          headers: { authorization: `Bearer ${user}`, accept: 'application/json' },
          credentials: 'omit',
          cache: 'no-store'
        })
      )
    } catch (cause) {
      if (isSynthwerkError(cause)) throw cause
      const offline = globalThis.navigator?.onLine === false
      throw new SynthwerkError({
        code: offline ? 'offline' : 'network',
        title: offline ? 'Offline' : 'Network error',
        cause
      })
    }
    // 401: the user token is gone. Signed out, not an error.
    if (response.status === 401) {
      await response.body?.cancel().catch(() => undefined)
      cached = null
      return null
    }
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw problemError(body, response)
    const parsed = readWidgetToken(body)
    if (!parsed) throw problemError(null, new Response(null, { status: 502 }))
    if (started !== generation) return null
    cached = { token: parsed.token, expiresAt: now() + parsed.expiresIn * 1000, user }
    return parsed.token
  }

  /** One exchange at a time: parallel callers share it. */
  function fresh(): Promise<string | null> {
    if (pending) return pending
    const run: Promise<string | null> = exchange().finally(() => {
      if (pending === run) pending = null
    })
    pending = run
    return run
  }

  const sw = createSynthwerk({
    apiUrl,
    fetch: baseFetch,
    auth: {
      mode: 'token',
      getToken: async ({ refresh }) => {
        const started = generation
        const user = await userToken(options.getUserToken)
        if (started !== generation) return null
        if (!user) {
          cached = null
          return null
        }
        const valid = cached && cached.expiresAt - EXPIRY_MARGIN_S * 1000 > now()
        if (!refresh && valid && cached?.user === user) return cached.token
        return fresh()
      }
    }
  })

  return {
    sw,
    reset() {
      generation++
      cached = null
      pending = null
    }
  }
}
