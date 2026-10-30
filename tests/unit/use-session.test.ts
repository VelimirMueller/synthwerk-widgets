import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { type UseSession, useSession, type WidgetHost } from '../../src/components/use-session.ts'
import { API, APP_ID } from '../support/api.ts'

function setup(getUserToken: WidgetHost['getUserToken']) {
  const host = reactive<WidgetHost>({
    version: 0,
    getUserToken,
    languages: [],
    requestSignIn: () => undefined
  })
  const hooks = { active: () => true, onStart: vi.fn(), onStop: vi.fn() }
  let api: UseSession | null = null
  const wrapper = mount(
    defineComponent(() => {
      api = useSession(
        { config: () => ({ appId: APP_ID, apiUrl: API, signInUrl: null }), host },
        hooks
      )
      return () => h('div')
    })
  )
  return { api: api as unknown as UseSession, hooks, host, wrapper }
}

describe('useSession', () => {
  it('signed in - one session, started once', async () => {
    const { api, hooks } = setup(() => 'user')
    await api.check()
    await api.check()
    expect(api.auth.value).toBe('signed_in')
    expect(hooks.onStart).toHaveBeenCalledOnce()
  })

  it('sign-out while a check waits for the host token - the check does not sign in again', async () => {
    let give: (token: string) => void = () => undefined
    const { api, hooks } = setup(() => new Promise<string>((resolve) => (give = resolve)))
    const pending = api.check()
    api.signOut()
    give('user')
    await pending
    expect(api.auth.value).toBe('signed_out')
    expect(api.session.value).toBeNull()
    expect(hooks.onStart).not.toHaveBeenCalled()
  })

  it('unmount - the session ends', async () => {
    const { api, hooks, wrapper } = setup(() => 'user')
    await api.check()
    const reset = vi.spyOn(api.session.value as NonNullable<typeof api.session.value>, 'reset')
    wrapper.unmount()
    expect(hooks.onStop).toHaveBeenCalled()
    expect(reset).toHaveBeenCalledOnce()
  })
})
