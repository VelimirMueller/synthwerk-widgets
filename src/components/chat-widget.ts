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
import { type AttributeConfig, resolveConfig, type WidgetConfig } from '../config.ts'
import type { WidgetError } from '../errors.ts'
import { formatTime, type Messages, messagesFor } from '../i18n.ts'
import { renderMarkdown } from '../markdown.ts'
import { loadSettings, type StudioSettings } from '../settings.ts'
import { chatIcon, closeIcon } from './icons.ts'
import { renderSignIn, useSession, type WidgetHost } from './use-session.ts'

export type { AuthState, WidgetHost } from './use-session.ts'

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
  (props: { attrs: AttributeConfig; host: WidgetHost }) => {
    const open = ref(false)
    /** Studio settings of the app. `null` until the load ends (success or not). */
    const studio = shallowRef<StudioSettings | null>(null)
    const config = computed<WidgetConfig>(() =>
      resolveConfig(props.attrs, studio.value, props.host.languages)
    )
    const online = ref(globalThis.navigator?.onLine !== false)
    const draft = ref('')
    const chat = shallowRef<Chat | null>(null)
    const panel = ref<HTMLElement | null>(null)
    const t = computed(() => messagesFor(config.value.lang))
    let load = 0
    const {
      auth,
      configured,
      check: checkSession,
      signOut
    } = useSession(
      { config: () => config.value, host: props.host },
      {
        active: () => open.value,
        onStart: (session) => {
          chat.value = createChat({ sw: session.sw })
        },
        onStop: () => {
          chat.value?.dispose()
          chat.value = null
        }
      }
    )

    /** Loads the studio settings once per app. Until then the launcher stays hidden. */
    async function loadStudio(): Promise<void> {
      const run = ++load
      studio.value = null
      const { appId, apiUrl } = props.attrs
      const settings = await loadSettings({
        appId,
        apiUrl,
        ...(props.host.fetch ? { fetch: props.host.fetch } : {})
      })
      if (run === load) studio.value = settings
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
      if (current.state.error?.kind === 'signed_out') signOut()
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
    void loadStudio()
    onMounted(() => {
      globalThis.addEventListener?.('online', setOnline)
      globalThis.addEventListener?.('offline', setOffline)
    })
    onBeforeUnmount(() => {
      globalThis.removeEventListener?.('online', setOnline)
      globalThis.removeEventListener?.('offline', setOffline)
    })

    // New app: new studio settings. useSession drops the session for the same change.
    watch(
      () => [props.attrs.appId, props.attrs.apiUrl],
      () => {
        void loadStudio()
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

    function renderBanner(text: Messages): VNode | null {
      const error = chat.value?.state.error ?? null
      if (!online.value) {
        return h('div', { class: 'sw-banner sw-banner--offline', role: 'status' }, text.offline)
      }
      if (!error) return null
      return h('div', { class: ['sw-banner', `sw-banner--${error.kind}`], role: 'alert' }, [
        h('p', errorText(text, error, config.value.lang)),
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
            ? [
                // A text node: the studio greeting is plain text, never HTML.
                h(
                  'li',
                  { class: 'sw-msg sw-msg--assistant sw-msg--greeting' },
                  config.value.greeting ?? text.greeting
                )
              ]
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
      if (auth.value === 'signed_out') return renderSignIn(config.value.signInUrl, props.host, text)
      if (auth.value === 'signed_in') return renderChat(text)
      return undefined
    }

    return () => {
      const text = t.value
      const current = config.value
      return h(
        'div',
        {
          class: ['sw-root', { 'sw-root--open': open.value }],
          'data-theme': current.theme,
          'data-group': current.accent,
          'data-service': 'widgets',
          'data-mode': current.mode === 'system' ? undefined : current.mode,
          'data-position': current.position,
          // Hidden launcher until the studio settings are in: no jump to another corner.
          'data-ready': studio.value || !configured.value ? 'true' : undefined,
          lang: current.lang,
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
      attrs: { type: Object as PropType<AttributeConfig>, required: true },
      host: { type: Object as PropType<WidgetHost>, required: true }
    }
  }
)
