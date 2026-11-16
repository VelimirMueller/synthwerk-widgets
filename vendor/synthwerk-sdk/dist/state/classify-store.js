// Vision classification state: one image at a time, latest call wins. Needs a widget token,
// so the source is the widget session of SynthwerkApp (an app id is required).
import { errorFromResult } from "../client/errors.js";
import { toErrorState } from "./error-state.js";
import { createStore } from "./store.js";
const IDLE = { status: 'idle', data: null, error: null };
export function createClassifyStore(source, options = {}) {
    const now = options.now ?? Date.now;
    const store = createStore(IDLE);
    let controller = null;
    function abort() {
        controller?.abort();
        controller = null;
    }
    async function classify(image) {
        abort();
        const current = new AbortController();
        controller = current;
        const live = () => controller === current;
        store.set({ status: 'pending', data: null, error: null });
        try {
            const widget = source.widget();
            if (!widget) {
                throw new TypeError('@synthwerk/sdk: classify needs an appId (widget token)');
            }
            const { data, error, response } = await widget.sw.api.vision.POST('/v1/classifications', {
                body: { image },
                signal: current.signal
            });
            if (!data)
                throw errorFromResult(error, response);
            if (!live())
                return null;
            controller = null;
            store.set({ status: 'success', data, error: null });
            return data;
        }
        catch (error) {
            if (!live() || current.signal.aborted)
                return null;
            controller = null;
            store.set({ status: 'error', data: null, error: toErrorState(error, now()) });
            return null;
        }
    }
    function reset() {
        abort();
        store.set(IDLE);
    }
    return {
        getSnapshot: store.getSnapshot,
        subscribe: store.subscribe,
        classify,
        reset,
        connect() {
            const unsubscribe = source.onUserChange?.(reset);
            return () => {
                unsubscribe?.();
                // Unmount during a call: abort it and do not leave `pending` behind.
                if (store.getSnapshot().status === 'pending')
                    reset();
                else
                    abort();
            };
        }
    };
}
