// The vision state: one photo at a time, its labels and the last error. Memory only.
import { reactive } from 'vue'
import { classify, type WidgetError } from '../errors.ts'
import type { Classification, VisionApi } from './api.ts'
import type { Prepared } from './image.ts'

export type Phase = 'idle' | 'preparing' | 'working' | 'done' | 'error'
export type SaveState = 'off' | 'saving' | 'saved' | 'failed'

export interface VisionState {
  phase: Phase
  result: Classification | null
  error: WidgetError | null
  save: SaveState
  saveError: WidgetError | null
}

export interface Vision {
  state: VisionState
  /**
   * Prepares the photo, gets its labels and, with `save`, stores it. A new call cancels
   * the running one. `onPrepared` gets the photo before it is sent, for the preview.
   */
  analyse(prepare: () => Promise<Prepared>, onPrepared?: (photo: Prepared) => void): Promise<void>
  /** Back to the start: no photo, no result, no error. */
  reset(): void
  dispose(): void
}

export interface VisionOptions {
  api: VisionApi
  save: () => boolean
  now?: () => number
}

export function createVision(options: VisionOptions): Vision {
  const now = options.now ?? Date.now
  const state = reactive<VisionState>({
    phase: 'idle',
    result: null,
    error: null,
    save: 'off',
    saveError: null
  })
  let controller: AbortController | null = null

  function clear(phase: Phase): void {
    state.phase = phase
    state.result = null
    state.error = null
    state.save = 'off'
    state.saveError = null
  }

  async function analyse(
    prepare: () => Promise<Prepared>,
    onPrepared?: (photo: Prepared) => void
  ): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    const { signal } = current
    clear('preparing')
    try {
      const photo = await prepare()
      if (signal.aborted) return
      onPrepared?.(photo)
      state.phase = 'working'
      const result = await options.api.classify(photo.blob, signal)
      if (signal.aborted) return
      state.result = result
      state.phase = 'done'
      if (!options.save()) return
      state.save = 'saving'
      try {
        await options.api.store(photo.blob, signal)
        if (!signal.aborted) state.save = 'saved'
      } catch (error) {
        // Aborted only by reset() (state cleared) or dispose() (element gone).
        if (signal.aborted) return
        state.save = 'failed'
        state.saveError = classify(error, now())
      }
    } catch (error) {
      if (signal.aborted) return
      state.phase = 'error'
      state.error = classify(error, now())
    } finally {
      if (controller === current) controller = null
    }
  }

  return {
    state,
    analyse,
    reset() {
      controller?.abort()
      controller = null
      clear('idle')
    },
    dispose() {
      controller?.abort()
      controller = null
    }
  }
}
