// The vision UI: an inline card. Choose a photo or take one, then see its labels.
import { SwButton, SwPill } from '@synthwerk/ui-vue'
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
  type VNode
} from 'vue'
import type { ErrorKind, WidgetError } from '../errors.ts'
import type { Lang } from '../i18n.ts'
import { createVisionApi, type VisionLabel } from '../vision/api.ts'
import {
  type CameraProblem,
  cameraProblem,
  cameraSupported,
  createCamera
} from '../vision/camera.ts'
import { resolveVisionConfig, type VisionAttrs } from '../vision/config.ts'
import { formatScore, formatTime, type VisionMessages, visionMessagesFor } from '../vision/i18n.ts'
import { compress, type Prepared, prepareFile, snapshot } from '../vision/image.ts'
import { createVision, type Vision } from '../vision/vision.ts'
import { renderSignIn, useSession, type WidgetHost } from './use-session.ts'

/** The file types the picker offers. Any picture the browser can decode works. */
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/*'
/** The labels the result lists below the best one. */
export const ALTERNATIVES = 4

/** Errors where the same photo can work a moment later. */
const RETRYABLE: ReadonlySet<ErrorKind> = new Set(['offline', 'busy', 'interrupted', 'generic'])

export function visionErrorText(t: VisionMessages, error: WidgetError, lang: Lang): string {
  switch (error.kind) {
    case 'signed_out':
      return t.signedOut
    case 'offline':
      return t.offline
    case 'not_allowed':
      return t.notAllowed
    case 'too_long':
      return t.tooLarge
    case 'unsupported':
      return t.unsupported
    case 'storage_full':
      return t.storageFull
    case 'quota':
      return error.resetsAt ? t.quotaUntil(formatTime(error.resetsAt, lang)) : t.quota
    case 'busy':
      return t.busy
    default:
      return t.error
  }
}

function cameraText(t: VisionMessages, problem: CameraProblem): string {
  if (problem === 'camera_denied') return t.cameraDenied
  if (problem === 'camera_busy') return t.cameraBusy
  return t.cameraMissing
}

export const VisionWidget = defineComponent(
  (props: { attrs: VisionAttrs; host: WidgetHost }) => {
    const config = computed(() => resolveVisionConfig(props.attrs, props.host.languages))
    const t = computed(() => visionMessagesFor(config.value.lang))
    const online = ref(globalThis.navigator?.onLine !== false)
    const vision = shallowRef<Vision | null>(null)
    const camera = createCamera()
    const canUseCamera = cameraSupported()
    const cameraOn = ref(false)
    const cameraStarting = ref(false)
    /** The video shows a frame: only then "Take photo" works. */
    const frameReady = ref(false)
    const problem = ref<CameraProblem | null>(null)
    const hasPhoto = ref(false)
    const video = ref<HTMLVideoElement | null>(null)
    const preview = ref<HTMLCanvasElement | null>(null)
    const fileInput = ref<HTMLInputElement | null>(null)
    const root = ref<HTMLElement | null>(null)
    /** Runs the last photo again (retry). Camera photos are kept as the prepared JPEG. */
    let last: (() => Promise<Prepared>) | null = null

    function stopCamera(): void {
      camera.stop()
      cameraOn.value = false
      cameraStarting.value = false
      frameReady.value = false
      if (video.value) video.value.srcObject = null
    }

    const { auth, configured, check, signOut } = useSession(
      { config: () => config.value, host: props.host },
      {
        active: () => true,
        onStart: (session) => {
          vision.value = createVision({
            api: createVisionApi(session.sw, config.value.apiUrl),
            save: () => config.value.savePhotos
          })
        },
        onStop: () => {
          vision.value?.dispose()
          vision.value = null
          stopCamera()
          problem.value = null
          hasPhoto.value = false
          last = null
        }
      }
    )

    const busy = computed(() => {
      const phase = vision.value?.state.phase
      return phase === 'preparing' || phase === 'working'
    })

    function focus(selector: string): void {
      void nextTick(() => root.value?.querySelector<HTMLElement>(selector)?.focus())
    }

    function drawPreview(photo: Prepared): void {
      hasPhoto.value = true
      const canvas = preview.value
      if (!canvas) return
      canvas.width = photo.width
      canvas.height = photo.height
      canvas.getContext('2d')?.drawImage(photo.canvas, 0, 0)
    }

    async function run(prepare: () => Promise<Prepared>): Promise<void> {
      const current = vision.value
      if (!current || !online.value) return
      last = prepare
      await current.analyse(prepare, drawPreview)
      if (current.state.error?.kind === 'signed_out') signOut()
    }

    function onFile(event: Event): void {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      // Clear it: the same file can be chosen again.
      input.value = ''
      if (!file) return
      stopCamera()
      problem.value = null
      void run(() => prepareFile(file))
    }

    async function startCamera(): Promise<void> {
      if (cameraStarting.value || cameraOn.value) return
      problem.value = null
      cameraStarting.value = true
      try {
        const stream = await camera.start()
        if (!stream) return
        cameraOn.value = true
        await nextTick()
        const el = video.value
        if (!el) {
          stopCamera()
          return
        }
        el.srcObject = stream
        try {
          await el.play()
        } catch {
          // Autoplay of a muted inline video is allowed; a refusal only delays the picture.
        }
        focus('.sw-camera__capture')
      } catch (error) {
        stopCamera()
        problem.value = cameraProblem(error)
      } finally {
        cameraStarting.value = false
      }
    }

    function closeCamera(): void {
      stopCamera()
      focus('.sw-vision__camera')
    }

    function capture(): void {
      const el = video.value
      if (!el || !cameraOn.value) return
      let frame: ReturnType<typeof snapshot>
      try {
        frame = snapshot(el)
      } catch {
        // No frame although the video said it had one: treat the camera as not readable.
        stopCamera()
        problem.value = 'camera_busy'
        return
      }
      // The frame is copied: the camera stops before anything leaves the browser.
      stopCamera()
      let photo: Promise<Prepared> | null = null
      void run(() => {
        photo ??= compress(frame)
        return photo
      })
      focus('.sw-vision__status')
    }

    function again(): void {
      vision.value?.reset()
      hasPhoto.value = false
      last = null
      focus('.sw-vision__choose')
    }

    function retry(): void {
      if (last) void run(last)
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && cameraOn.value) {
        event.stopPropagation()
        closeCamera()
      }
    }

    const setOnline = () => {
      online.value = true
    }
    const setOffline = () => {
      online.value = false
    }
    const onVisibility = () => {
      if (globalThis.document?.visibilityState === 'hidden') stopCamera()
    }
    onMounted(() => {
      globalThis.addEventListener?.('online', setOnline)
      globalThis.addEventListener?.('offline', setOffline)
      globalThis.document?.addEventListener('visibilitychange', onVisibility)
      void check()
    })
    onBeforeUnmount(() => {
      globalThis.removeEventListener?.('online', setOnline)
      globalThis.removeEventListener?.('offline', setOffline)
      globalThis.document?.removeEventListener('visibilitychange', onVisibility)
      stopCamera()
    })

    function renderLabel(label: VisionLabel, text: VisionMessages, lang: Lang): VNode {
      const percent = formatScore(label.score, lang)
      return h('li', { key: label.id, class: 'sw-result__label' }, [
        h('span', { class: 'sw-result__name' }, label.label),
        h('span', { class: 'sw-result__score' }, text.score(percent)),
        h('meter', {
          class: 'sw-result__meter',
          min: 0,
          max: 1,
          value: label.score,
          'aria-hidden': 'true'
        })
      ])
    }

    function renderResult(text: VisionMessages, lang: Lang): VNode | null {
      const state = vision.value?.state
      const result = state?.result
      if (!state || !result) return null
      const best = result.correction?.label ?? result.primary
      const alternatives = result.labels.filter((l) => l.id !== best.id).slice(0, ALTERNATIVES)
      const path = best.path.length > 0 ? best.path.join(' › ') : best.topic
      return h(
        'div',
        { class: 'sw-result', 'data-uncertain': result.uncertain ? 'true' : 'false' },
        [
          h('h3', { class: 'sw-result__title' }, text.result),
          h('p', { class: 'sw-result__primary' }, [
            h('strong', { class: 'sw-result__best' }, best.label),
            ' ',
            h('span', { class: 'sw-result__score' }, text.score(formatScore(best.score, lang))),
            result.uncertain
              ? h(SwPill, { kind: 'neutral', class: 'sw-result__uncertain' }, () => text.uncertain)
              : null
          ]),
          result.correction ? h('p', { class: 'sw-result__note' }, text.correction) : null,
          h('p', { class: 'sw-result__topic' }, `${text.topic}: ${path}`),
          alternatives.length > 0
            ? h('h4', { class: 'sw-result__subtitle' }, text.alternatives)
            : null,
          alternatives.length > 0
            ? h(
                'ol',
                { class: 'sw-result__labels' },
                alternatives.map((l) => renderLabel(l, text, lang))
              )
            : null,
          renderSave(text, lang),
          h(
            SwButton,
            { kind: 'ghost', size: 'sm', class: 'sw-vision__again', onClick: again },
            () => text.again
          )
        ]
      )
    }

    function renderSave(text: VisionMessages, lang: Lang): VNode | null {
      const state = vision.value?.state
      if (!state || state.save === 'off') return null
      const message =
        state.save === 'saving'
          ? text.saving
          : state.save === 'saved'
            ? text.saved
            : state.saveError?.kind === 'storage_full'
              ? text.storageFull
              : state.saveError
                ? `${text.saveFailed} ${visionErrorText(text, state.saveError, lang)}`
                : text.saveFailed
      return h(
        'p',
        { class: ['sw-result__save', `sw-result__save--${state.save}`], role: 'status' },
        message
      )
    }

    function renderError(text: VisionMessages, lang: Lang): VNode | null {
      const error = vision.value?.state.error
      if (!error || error.kind === 'signed_out') return null
      return h('div', { class: ['sw-banner', `sw-banner--${error.kind}`], role: 'alert' }, [
        h('p', visionErrorText(text, error, lang)),
        // Offline: the offline banner says why; the retry comes back with the connection.
        RETRYABLE.has(error.kind) && last && online.value
          ? h(SwButton, { kind: 'ghost', size: 'sm', onClick: retry }, () => text.retry)
          : null
      ])
    }

    function renderCamera(text: VisionMessages): VNode {
      return h('div', { class: 'sw-camera' }, [
        h('video', {
          ref: video,
          class: 'sw-camera__video',
          autoplay: true,
          muted: true,
          playsinline: true,
          'aria-label': text.cameraPreview,
          onLoadeddata: () => {
            frameReady.value = true
          }
        }),
        h('div', { class: 'sw-vision__actions' }, [
          h(
            SwButton,
            {
              class: 'sw-camera__capture',
              disabled: !online.value || !frameReady.value,
              onClick: capture
            },
            () => text.capture
          ),
          h(
            SwButton,
            { kind: 'secondary', class: 'sw-camera__close', onClick: closeCamera },
            () => text.cancel
          )
        ])
      ])
    }

    function renderMain(text: VisionMessages, lang: Lang): (VNode | null)[] {
      const state = vision.value?.state
      const blocked = !online.value || busy.value
      const status =
        state?.phase === 'preparing'
          ? text.preparing
          : state?.phase === 'working'
            ? text.working
            : ''
      return [
        state?.phase === 'idle' && !cameraOn.value && !hasPhoto.value
          ? h('p', { class: 'sw-vision__intro' }, text.intro)
          : null,
        online.value
          ? null
          : h('div', { class: 'sw-banner sw-banner--offline', role: 'status' }, text.offline),
        problem.value
          ? h(
              'div',
              { class: ['sw-banner', `sw-banner--${problem.value}`], role: 'alert' },
              h('p', cameraText(text, problem.value))
            )
          : null,
        cameraOn.value
          ? renderCamera(text)
          : h('div', { class: 'sw-vision__actions' }, [
              h(
                SwButton,
                {
                  class: 'sw-vision__choose',
                  disabled: blocked,
                  onClick: () => fileInput.value?.click()
                },
                () => text.choose
              ),
              canUseCamera
                ? h(
                    SwButton,
                    {
                      kind: 'secondary',
                      class: 'sw-vision__camera',
                      disabled: blocked || cameraStarting.value,
                      onClick: startCamera
                    },
                    () => text.camera
                  )
                : null
            ]),
        h('input', {
          ref: fileInput,
          class: 'sw-visually-hidden',
          type: 'file',
          accept: ACCEPT,
          tabindex: -1,
          'aria-hidden': 'true',
          onChange: onFile
        }),
        h('canvas', {
          ref: preview,
          class: 'sw-vision__preview',
          role: 'img',
          'aria-label': text.preview,
          hidden: !hasPhoto.value || cameraOn.value
        }),
        h('p', { class: 'sw-vision__status', role: 'status', tabindex: -1 }, status),
        renderError(text, lang),
        renderResult(text, lang)
      ]
    }

    function renderBody(text: VisionMessages, lang: Lang): VNode | (VNode | null)[] | undefined {
      if (!configured.value) {
        return h(
          'div',
          { class: 'sw-banner sw-banner--not_allowed', role: 'alert' },
          text.notAllowed
        )
      }
      if (auth.value === 'signed_out') return renderSignIn(config.value.signInUrl, props.host, text)
      if (auth.value === 'signed_in') return renderMain(text, lang)
      return undefined
    }

    return () => {
      const text = t.value
      const current = config.value
      return h(
        'div',
        {
          ref: root,
          class: 'sw-root sw-vision-root',
          'data-theme': current.theme,
          'data-group': current.accent,
          'data-service': 'widgets',
          'data-mode': current.mode === 'system' ? undefined : current.mode,
          lang: current.lang,
          onKeydown
        },
        h(
          'section',
          {
            class: 'sw-vision',
            'aria-label': text.title,
            'aria-busy': busy.value ? 'true' : 'false',
            'data-auth': auth.value
          },
          [
            h('header', { class: 'sw-vision__header' }, [
              h('h2', { class: 'sw-vision__title' }, text.title)
            ]),
            h('div', { class: 'sw-vision__body' }, renderBody(text, current.lang))
          ]
        )
      )
    }
  },
  {
    name: 'VisionWidget',
    props: {
      attrs: { type: Object as PropType<VisionAttrs>, required: true },
      host: { type: Object as PropType<WidgetHost>, required: true }
    }
  }
)
