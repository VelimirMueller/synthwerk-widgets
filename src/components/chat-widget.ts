// The widget UI: a launcher button and the chat panel (a full-screen sheet below 640 px).
import { SwButton, SwInput } from '@synthwerk/ui-vue'
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  shallowRef,
  type VNode,
  watch
} from 'vue'
import { type Chat, type ChatMessage, createChat } from '../chat.ts'
import type { WidgetConfig } from '../config.ts'
import type { WidgetError } from '../errors.ts'
import { formatTime, type Messages, messagesFor } from '../i18n.ts'
import { renderMarkdown } from '../markdown.ts'
import { createSession, type GetUserToken, userToken, type WidgetSession } from '../session.ts'
import { chatIcon, closeIcon } from './icons.ts'

/** What the element hands to the widget. `version` changes when the host session may have changed. */
export interface WidgetHost {
  version: number
  getUserToken: GetUserToken | null
  requestSignIn: () => void
  fetch?: (input: Request) => Promise<Response>
}

export type AuthState = 'unknown' | 'checking' | 'signed_in' | 'signed_out'

function errorText(t: Messages, error: WidgetError, lang: WidgetConfig['lang']): string {
  switch (error.kind) {
    case 'offline':
      return t.offline
    case 'quota':
      return error.resetsAt ? t.quotaUntil(formatTime(error.resetsAt, lang)) : t.quota
    case 'busy':
      return t.busy
    case 'not_allowed':
      return t.notAllowed
    case 'too_long':
      return t.tooLong
    case 'interrupted':
      return t.interrupted
    default:
      return t.error
  }
}

export const ChatWidget = defineComponent(
  (props: { config: WidgetConfig; host: WidgetHost }) => {
    const open = ref(false)
    const auth = ref<AuthState>('unknown')
    const online = ref(globalThis.navigator?.onLine !== false)
    const draft = ref('')
    const session = shallowRef<WidgetSession | null>(null)
    const chat = shallowRef<Chat | null>(null)
    const panel = ref<HTMLElement | null>(null)
    const t = computed(() => messagesFor(props.config.lang))
    const configured = computed(() => props.config.appId !== '' && props.config.apiUrl !== '')
    let check = 0

    function dropChat(): void {
      chat.value?.dispose()
      chat.value = null
      session.value = null
    }

    /** Asks the host for the user token. No token: sign-in view and no request at all. */
    async function checkSession(): Promise<void> {
      const run = ++check
      if (!configured.value) return
      auth.value = 'checking'
      const token = await userToken(props.host.getUserToken)
      if (run !== check) return
      if (!token) {
        session.value?.reset()
        auth.value = 'signed_out'
        return
      }
      auth.value = 'signed_in'
      if (!chat.value) {
        const created = createSession({
          appId: props.config.appId,
          apiUrl: props.config.apiUrl,
          getUserToken: () => props.host.getUserToken?.() ?? null,
          ...(props.host.fetch ? { fetch: props.host.fetch } : {})
        })
        session.value = created
        chat.value = createChat({ sw: created.sw })
      }
    }

    function focusInput(): void {
      void nextTick(() =>
        panel.value
          ?.querySelector<HTMLElement>('input, .sw-signin a, button.sw-signin__button')
          ?.focus()
      )
    }

    async function toggle(next: boolean): Promise<void> {
      open.value = next
      if (next) {
        await checkSession()
        focusInput()
      }
    }

    async function submit(event: Event): Promise<void> {
      event.preventDefault()
      const current = chat.value
      if (!current || !online.value) return
      const text = draft.value
      if (text.trim() === '' || current.state.streaming) return
      draft.value = ''
      await current.send(text)
      const back = current.takeFailedText()
      if (back !== null && draft.value === '') draft.value = back
      if (current.state.error?.kind === 'signed_out') {
        current.dismiss()
        session.value?.reset()
        auth.value = 'signed_out'
      }
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && open.value) {
        event.stopPropagation()
        void toggle(false)
      }
    }

    const setOnline = () => {
      online.value = true
    }
    const setOffline = () => {
      online.value = false
    }
    onMounted(() => {
      globalThis.addEventListener?.('online', setOnline)
      globalThis.addEventListener?.('offline', setOffline)
    })
    onBeforeUnmount(() => {
      globalThis.removeEventListener?.('online', setOnline)
      globalThis.removeEventListener?.('offline', setOffline)
      dropChat()
    })

    watch(
      () => [props.config.appId, props.config.apiUrl],
      () => {
        dropChat()
        auth.value = 'unknown'
        if (open.value) void checkSession()
      }
    )
    watch(
      () => props.host.version,
      () => {
        if (open.value) void checkSession()
        else auth.value = 'unknown'
      }
    )

    function renderMessage(message: ChatMessage, text: Messages): VNode {
      const assistant = message.role === 'assistant'
      return h(
        'li',
        {
          key: message.id,
          class: ['sw-msg', `sw-msg--${message.role}`, `sw-msg--${message.state}`]
        },
        [
          h('span', { class: 'sw-visually-hidden' }, `${assistant ? text.assistant : text.you}: `),
          assistant
            ? h('div', { class: 'sw-md' }, renderMarkdown(message.text))
            : h('p', { class: 'sw-msg__text' }, message.text),
          message.state === 'stopped' ? h('p', { class: 'sw-msg__note' }, text.stopped) : null,
          message.state === 'streaming'
            ? h('span', { class: 'sw-typing', 'aria-hidden': 'true' })
            : null
        ]
      )
    }

    function renderSignIn(text: Messages): VNode {
      const action = props.config.signInUrl
        ? h(
            'a',
            { class: 'sw-button sw-button--primary sw-button--md', href: props.config.signInUrl },
            text.signIn
          )
        : h(
            SwButton,
            { class: 'sw-signin__button', onClick: () => props.host.requestSignIn() },
            () => text.signIn
          )
      return h('div', { class: 'sw-signin' }, [
        h('p', { class: 'sw-signin__title' }, text.signInTitle),
        h('p', { class: 'sw-signin__text' }, text.signInText),
        action
      ])
    }

    function renderBanner(text: Messages): VNode | null {
      const error = chat.value?.state.error ?? null
      if (!online.value) {
        return h('div', { class: 'sw-banner sw-banner--offline', role: 'status' }, text.offline)
      }
      if (!error) return null
      return h('div', { class: ['sw-banner', `sw-banner--${error.kind}`], role: 'alert' }, [
        h('p', errorText(text, error, props.config.lang)),
        error.kind === 'quota' || error.kind === 'not_allowed'
          ? null
          : h(
              SwButton,
              { kind: 'ghost', size: 'sm', onClick: () => chat.value?.dismiss() },
              () => text.retry
            )
      ])
    }

    function renderChat(text: Messages): (VNode | null)[] {
      const current = chat.value
      const messages = current?.state.messages ?? []
      const streaming = current?.state.streaming ?? false
      const blocked = !online.value || current?.state.error?.kind === 'quota'
      return [
        h(
          'ol',
          { class: 'sw-messages', role: 'log', 'aria-busy': streaming ? 'true' : 'false' },
          messages.length === 0
            ? [h('li', { class: 'sw-msg sw-msg--assistant sw-msg--greeting' }, text.greeting)]
            : messages.map((m) => renderMessage(m, text))
        ),
        renderBanner(text),
        h('form', { class: 'sw-composer', onSubmit: submit }, [
          h(SwInput, {
            modelValue: draft.value,
            'onUpdate:modelValue': (value: string) => {
              draft.value = value
            },
            placeholder: text.placeholder,
            'aria-label': text.placeholder,
            maxlength: 8000,
            autocomplete: 'off',
            disabled: blocked
          }),
          streaming
            ? h(SwButton, { kind: 'secondary', onClick: () => current?.stop() }, () => text.stop)
            : h(
                SwButton,
                { type: 'submit', disabled: blocked || draft.value.trim() === '' },
                () => text.send
              )
        ])
      ]
    }

    function renderBody(text: Messages): VNode | (VNode | null)[] | undefined {
      if (!configured.value) {
        return h(
          'div',
          { class: 'sw-banner sw-banner--not_allowed', role: 'alert' },
          text.notAllowed
        )
      }
      if (auth.value === 'signed_out') return renderSignIn(text)
      if (auth.value === 'signed_in') return renderChat(text)
      return undefined
    }

    return () => {
      const text = t.value
      const { config } = props
      return h(
        'div',
        {
          class: ['sw-root', { 'sw-root--open': open.value }],
          'data-theme': 'default',
          'data-service': 'widgets',
          'data-mode': config.mode === 'system' ? undefined : config.mode,
          'data-position': config.position,
          lang: config.lang,
          onKeydown
        },
        [
          open.value
            ? h(
                'section',
                {
                  ref: panel,
                  class: 'sw-panel',
                  role: 'dialog',
                  'aria-label': text.title,
                  'data-auth': auth.value
                },
                [
                  h('header', { class: 'sw-panel__header' }, [
                    h('p', { class: 'sw-panel__title' }, text.title),
                    h(
                      'button',
                      {
                        class: 'sw-icon-button',
                        type: 'button',
                        'aria-label': text.close,
                        onClick: () => toggle(false)
                      },
                      closeIcon()
                    )
                  ]),
                  h('div', { class: 'sw-panel__body' }, renderBody(text))
                ]
              )
            : null,
          h(
            'button',
            {
              class: 'sw-launcher',
              type: 'button',
              'aria-label': open.value ? text.close : text.open,
              'aria-expanded': open.value ? 'true' : 'false',
              onClick: () => toggle(!open.value)
            },
            open.value ? closeIcon() : chatIcon()
          )
        ]
      )
    }
  },
  {
    name: 'ChatWidget',
    props: {
      config: { type: Object as PropType<WidgetConfig>, required: true },
      host: { type: Object as PropType<WidgetHost>, required: true }
    }
  }
)
