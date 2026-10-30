// The sign-in state of a widget and its session (src/session.ts), shared by every widget.
// Each host session change drops the session and its cached widget token: a new user never
// sees or uses the data of the old one.

import { SwButton } from '@synthwerk/ui-vue'
import {
  computed,
  h,
  onBeforeUnmount,
  type Ref,
  ref,
  type ShallowRef,
  shallowRef,
  type VNode,
  watch
} from 'vue'
import { createSession, type GetUserToken, userToken, type WidgetSession } from '../session.ts'

/** What the element hands to the widget. `version` changes when the host session may have changed. */
export interface WidgetHost {
  version: number
  getUserToken: GetUserToken | null
  /** Browser languages, best first (`navigator.languages`). */
  languages: readonly string[]
  requestSignIn: () => void
  fetch?: (input: Request) => Promise<Response>
}

export type AuthState = 'unknown' | 'checking' | 'signed_in' | 'signed_out'

/** The settings every widget reads. */
export interface SessionConfig {
  appId: string
  apiUrl: string
  signInUrl: string | null
}

export interface SessionHooks {
  /** True when the widget shows its content. Only then a host change checks the session again. */
  active: () => boolean
  /** A new session started (signed in). Build the widget state on it. */
  onStart: (session: WidgetSession) => void
  /** The session ends (sign-out, other user, new settings, unmount). Drop all widget state. */
  onStop: () => void
}

export interface UseSession {
  auth: Ref<AuthState>
  session: ShallowRef<WidgetSession | null>
  configured: Readonly<Ref<boolean>>
  /** Asks the host for the user token. No token: `signed_out` and no request at all. */
  check: () => Promise<void>
  /** The API said the user is signed out: drop everything and show sign-in. */
  signOut: () => void
}

/** `config` is a getter: the chat resolves its config from attributes and studio settings. */
export function useSession(
  props: { config: () => SessionConfig; host: WidgetHost },
  hooks: SessionHooks
): UseSession {
  const auth = ref<AuthState>('unknown')
  const session = shallowRef<WidgetSession | null>(null)
  const configured = computed(() => props.config().appId !== '' && props.config().apiUrl !== '')
  let run = 0

  /** Ends the widget state, the session and its cached widget token. */
  function drop(): void {
    // A check() still waiting for the host token must not bring the dropped state back.
    run++
    hooks.onStop()
    session.value?.reset()
    session.value = null
  }

  async function check(): Promise<void> {
    const mine = ++run
    if (!configured.value) return
    auth.value = 'checking'
    const token = await userToken(props.host.getUserToken)
    if (mine !== run) return
    if (!token) {
      drop()
      auth.value = 'signed_out'
      return
    }
    auth.value = 'signed_in'
    if (!session.value) {
      const created = createSession({
        appId: props.config().appId,
        apiUrl: props.config().apiUrl,
        getUserToken: () => props.host.getUserToken?.() ?? null,
        ...(props.host.fetch ? { fetch: props.host.fetch } : {})
      })
      session.value = created
      hooks.onStart(created)
    }
  }

  function restart(): void {
    drop()
    auth.value = 'unknown'
    if (hooks.active()) void check()
  }

  // New settings or a host session change (maybe another user): never keep the old state.
  watch(() => [props.config().appId, props.config().apiUrl], restart)
  watch(() => props.host.version, restart)
  onBeforeUnmount(drop)

  return {
    auth,
    session,
    configured,
    check,
    signOut() {
      drop()
      auth.value = 'signed_out'
    }
  }
}

/** The sign-in view: a link to `sign-in-url`, else a button that sends the sign-in event. */
export function renderSignIn(
  signInUrl: string | null,
  host: WidgetHost,
  text: { signInTitle: string; signInText: string; signIn: string }
): VNode {
  const action = signInUrl
    ? h('a', { class: 'sw-button sw-button--primary sw-button--md', href: signInUrl }, text.signIn)
    : h(
        SwButton,
        { class: 'sw-signin__button', onClick: () => host.requestSignIn() },
        () => text.signIn
      )
  return h('div', { class: 'sw-signin' }, [
    h('p', { class: 'sw-signin__title' }, text.signInTitle),
    h('p', { class: 'sw-signin__text' }, text.signInText),
    action
  ])
}
