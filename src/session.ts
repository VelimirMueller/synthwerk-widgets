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
  /** The running trade and the user token it was started for. */
  let pending: { user: string; promise: Promise<string | null> } | null = null
  /** The user token of the latest getToken call. A trade for an older one is discarded. */
  let latestUser: string | null = null
  /** Bumped by reset(): an exchange that started before it never fills the cache. */
  let generation = 0

  /** Trades `user` for a widget token. */
  async function exchange(user: string): Promise<string | null> {
    const started = generation
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
      if (started === generation && cached?.user === user) cached = null
      return null
    }
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw problemError(body, response)
    const parsed = readWidgetToken(body)
    if (!parsed) throw problemError(null, new Response(null, { status: 502 }))
    // A reset or another user while the trade ran: never hand out or cache this token.
    if (started !== generation || latestUser !== user) return null
    cached = { token: parsed.token, expiresAt: now() + parsed.expiresIn * 1000, user }
    return parsed.token
  }

  /** One trade per user token at a time: parallel callers with the same user token share it. */
  function fresh(user: string): Promise<string | null> {
    if (pending?.user === user) return pending.promise
    const run = { user, promise: Promise.resolve<string | null>(null) }
    run.promise = exchange(user).finally(() => {
      if (pending === run) pending = null
    })
    pending = run
    return run.promise
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
        latestUser = user
        if (!user) {
          cached = null
          return null
        }
        const valid = cached && cached.expiresAt - EXPIRY_MARGIN_S * 1000 > now()
        if (!refresh && valid && cached?.user === user) return cached.token
        return fresh(user)
      }
    }
  })

  return {
    sw,
    reset() {
      generation++
      cached = null
      pending = null
      latestUser = null
    }
  }
}
