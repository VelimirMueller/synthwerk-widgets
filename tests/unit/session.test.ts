import { isSynthwerkError } from '@synthwerk/sdk'
import { describe, expect, it, vi } from 'vitest'
import { createSession, EXPIRY_MARGIN_S, userToken } from '../../src/session.ts'
import { API, APP_ID, fakeFetch, json, routes, widgetToken } from '../support/api.ts'

const conversation = () => routes.conversation()

function setup(getUserToken: () => string | null, reply = () => widgetToken(600)) {
  let clock = Date.UTC(2026, 9, 29, 12, 0, 0)
  const api = fakeFetch([routes.token(reply), conversation()])
  const session = createSession({
    appId: APP_ID,
    apiUrl: `${API}/`,
    getUserToken,
    fetch: api.fetch,
    now: () => clock
  })
  return { session, api, tick: (s: number) => (clock += s * 1000) }
}

const createConversation = (s: ReturnType<typeof setup>['session']) =>
  s.sw.api.llm.POST('/v1/conversations', { body: {} })

describe('userToken', () => {
  it('no hook, empty, undefined or a throwing hook - signed out', async () => {
    expect(await userToken(null)).toBeNull()
    expect(await userToken(() => '')).toBeNull()
    expect(await userToken(() => undefined)).toBeNull()
    expect(
      await userToken(() => {
        throw new Error('host broke')
      })
    ).toBeNull()
    expect(await userToken(async () => 'u')).toBe('u')
  })
})

describe('createSession', () => {
  it('signed out - unauthenticated before any request', async () => {
    const { session, api } = setup(() => null)
    await expect(createConversation(session)).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(api.calls).toHaveLength(0)
  })

  it('signed in - trades the user token for a widget token, llm gets only the widget token', async () => {
    const { session, api } = setup(() => 'user.jwt')
    const { data } = await createConversation(session)
    expect(data?.id).toBeTruthy()
    const [exchange, llm] = api.calls
    expect(exchange?.url).toBe(`${API}/identity/v1/apps/${APP_ID}/widget-tokens`)
    expect(exchange?.method).toBe('POST')
    expect(exchange?.headers.get('authorization')).toBe('Bearer user.jwt')
    expect(exchange?.credentials).toBe('omit')
    expect(llm?.url).toBe(`${API}/llm/v1/conversations`)
    expect(llm?.headers.get('authorization')).toBe('Bearer widget.jwt.token')
  })

  it('valid widget token - reused, no second exchange', async () => {
    const { session, api, tick } = setup(() => 'user.jwt')
    await createConversation(session)
    tick(600 - EXPIRY_MARGIN_S - 1)
    await createConversation(session)
    expect(api.calls.filter((r) => r.url.endsWith('/widget-tokens'))).toHaveLength(1)
  })

  it('widget token near expiry - new exchange', async () => {
    const { session, api, tick } = setup(() => 'user.jwt')
    await createConversation(session)
    tick(600 - EXPIRY_MARGIN_S + 1)
    await createConversation(session)
    expect(api.calls.filter((r) => r.url.endsWith('/widget-tokens'))).toHaveLength(2)
  })

  it('parallel first calls - one shared exchange', async () => {
    const { session, api } = setup(() => 'user.jwt')
    await Promise.all([createConversation(session), createConversation(session)])
    expect(api.calls.filter((r) => r.url.endsWith('/widget-tokens'))).toHaveLength(1)
  })

  it('reset - next call trades again', async () => {
    const { session, api } = setup(() => 'user.jwt')
    await createConversation(session)
    session.reset()
    await createConversation(session)
    expect(api.calls.filter((r) => r.url.endsWith('/widget-tokens'))).toHaveLength(2)
  })

  it('another user token - new trade, the old widget token is never sent', async () => {
    let user = 'alice.jwt'
    const api = fakeFetch([
      routes.token((r) =>
        json(
          {
            access_token: `widget-for-${r.headers.get('authorization')?.slice(7)}`,
            token_type: 'Bearer',
            expires_in: 600
          },
          201
        )
      ),
      conversation()
    ])
    const session = createSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => user,
      fetch: api.fetch
    })
    await createConversation(session)
    user = 'bob.jwt'
    await createConversation(session)
    const llm = api.calls
      .filter((r) => r.url.includes('/llm/'))
      .map((r) => r.headers.get('authorization'))
    expect(llm).toEqual(['Bearer widget-for-alice.jwt', 'Bearer widget-for-bob.jwt'])
  })

  it('two user tokens back to back - never one shared trade', async () => {
    let user = 'alice.jwt'
    const releases: ((r: Response) => void)[] = []
    const api = fakeFetch([
      routes.token((r) => {
        const who = r.headers.get('authorization')?.slice(7)
        return new Promise<Response>((resolve) => {
          releases.push(() =>
            resolve(
              json(
                { access_token: `widget-for-${who}`, token_type: 'Bearer', expires_in: 600 },
                201
              )
            )
          )
        })
      }),
      conversation()
    ])
    const session = createSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => user,
      fetch: api.fetch
    })
    const alice = createConversation(session).catch((e: unknown) => e)
    await new Promise((r) => setTimeout(r, 0))
    user = 'bob.jwt'
    const bob = createConversation(session)
    await new Promise((r) => setTimeout(r, 0))
    for (const release of releases) release(new Response())
    // Alice's trade finished after Bob asked: her token is discarded, never sent for Bob.
    expect(await alice).toMatchObject({ code: 'unauthenticated' })
    await bob
    const trades = api.calls
      .filter((r) => r.url.endsWith('/widget-tokens'))
      .map((r) => r.headers.get('authorization'))
    expect(trades).toEqual(['Bearer alice.jwt', 'Bearer bob.jwt'])
    const llm = api.calls
      .filter((r) => r.url.includes('/llm/'))
      .map((r) => r.headers.get('authorization'))
    expect(llm).toEqual(['Bearer widget-for-bob.jwt'])
  })

  it('reset during a running exchange - the late token is not cached', async () => {
    let release: (r: Response) => void = () => undefined
    let exchanges = 0
    const api = fakeFetch([
      routes.token(() => {
        exchanges++
        return exchanges === 1
          ? new Promise<Response>((r) => {
              release = r
            })
          : widgetToken()
      }),
      conversation()
    ])
    const session = createSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => 'user.jwt',
      fetch: api.fetch
    })
    const first = createConversation(session).catch((e: unknown) => e)
    await new Promise((r) => setTimeout(r, 0))
    session.reset()
    release(widgetToken())
    expect(await first).toMatchObject({ code: 'unauthenticated' })
    await createConversation(session)
    expect(exchanges).toBe(2)
  })

  it('identity answers 401 - signed out, no llm call', async () => {
    const { session, api } = setup(
      () => 'expired.user.jwt',
      () => json({ code: 'unauthenticated', title: 'Unauthenticated' }, 401)
    )
    await expect(createConversation(session)).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(api.calls.some((r) => r.url.includes('/llm/'))).toBe(false)
  })

  it('origin not on the allow-list - origin_not_allowed', async () => {
    const { session } = setup(
      () => 'user.jwt',
      () => json({ code: 'origin_not_allowed', title: 'Origin not allowed' }, 403)
    )
    await expect(createConversation(session)).rejects.toMatchObject({
      code: 'origin_not_allowed',
      status: 403
    })
  })

  it('token body without a token - bad_gateway', async () => {
    const { session } = setup(
      () => 'user.jwt',
      () => json({ token_type: 'Bearer' }, 201)
    )
    await expect(createConversation(session)).rejects.toMatchObject({ code: 'bad_gateway' })
  })

  it('token lifetime above 15 minutes - capped at 900 s', async () => {
    const { session, api, tick } = setup(
      () => 'user.jwt',
      () => widgetToken(3600)
    )
    await createConversation(session)
    tick(900)
    await createConversation(session)
    expect(api.calls.filter((r) => r.url.endsWith('/widget-tokens'))).toHaveLength(2)
  })

  it('fetch rejects while offline - offline error', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const session = createSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => 'user.jwt',
      fetch: () => Promise.reject(new TypeError('Failed to fetch'))
    })
    const error = await createConversation(session).catch((e: unknown) => e)
    onLine.mockRestore()
    expect(isSynthwerkError(error) && error.code).toBe('offline')
  })

  it('fetch rejects while online - network error', async () => {
    const session = createSession({
      appId: APP_ID,
      apiUrl: API,
      getUserToken: () => 'user.jwt',
      fetch: () => Promise.reject(new TypeError('Failed to fetch'))
    })
    await expect(createConversation(session)).rejects.toMatchObject({ code: 'network' })
  })
})
