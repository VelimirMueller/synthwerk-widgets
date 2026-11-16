import { errorFromResult } from "../client/errors.js";
import { toErrorState } from "./error-state.js";
import { createStore } from "./store.js";
function initial(conversationId) {
    return {
        conversationId,
        messages: [],
        streaming: false,
        error: null,
        usage: null,
        failedText: null
    };
}
export function createChatStore(source, options = {}) {
    const now = options.now ?? Date.now;
    const store = createStore(initial(options.conversationId ?? null));
    let controller = null;
    /** Bumped by reset(): a send that started before never writes into the new state. */
    let epoch = 0;
    let nextId = 1;
    function patchMessage(id, patch) {
        const { messages } = store.getSnapshot();
        store.update({ messages: messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
    }
    function message(id) {
        return store.getSnapshot().messages.find((m) => m.id === id);
    }
    async function conversation(signal) {
        const known = store.getSnapshot().conversationId;
        if (known)
            return known;
        const { data, error, response } = await source.sw.api.llm.POST('/v1/conversations', {
            body: {},
            signal
        });
        if (!data)
            throw errorFromResult(error, response);
        return data.id;
    }
    async function send(raw) {
        const text = raw.trim();
        if (text === '' || store.getSnapshot().streaming)
            return;
        const mine = epoch;
        const live = () => mine === epoch;
        const questionId = `m${nextId++}`;
        const answerId = `m${nextId++}`;
        const current = new AbortController();
        controller = current;
        store.update({
            error: null,
            failedText: null,
            streaming: true,
            messages: [
                ...store.getSnapshot().messages,
                { id: questionId, role: 'user', text, status: 'done' },
                { id: answerId, role: 'assistant', text: '', status: 'streaming' }
            ]
        });
        let started = false;
        try {
            const id = await conversation(current.signal);
            if (!live())
                return;
            store.update({ conversationId: id });
            for await (const event of source.sw.llm.chat({ conversationId: id, content: text }, { signal: current.signal })) {
                if (!live())
                    return;
                started = true;
                if (event.type === 'delta') {
                    patchMessage(answerId, { text: (message(answerId)?.text ?? '') + event.text });
                }
                else if (event.type === 'usage') {
                    store.update({ usage: event.usage });
                }
                else if (event.type === 'done') {
                    patchMessage(answerId, { status: 'done' });
                }
                else {
                    patchMessage(answerId, { status: 'error' });
                    store.update({ error: toErrorState(event.error, now()) });
                }
            }
            if (!live())
                return;
            const answer = message(answerId);
            if (answer?.status === 'streaming') {
                patchMessage(answerId, { status: current.signal.aborted ? 'stopped' : 'done' });
            }
            // A finished answer without text: say so, never leave the question unanswered.
            const done = message(answerId);
            if (done?.status === 'done' && done.text === '') {
                // One update: the empty bubble goes in the same snapshot that shows the error.
                store.update({
                    error: { kind: 'generic', code: 'empty_answer', error: null },
                    messages: store.getSnapshot().messages.filter((m) => m.id !== answerId)
                });
            }
        }
        catch (error) {
            if (!live())
                return;
            if (current.signal.aborted) {
                patchMessage(answerId, { status: 'stopped' });
            }
            else {
                patchMessage(answerId, { status: 'error' });
                store.update({ error: toErrorState(error, now()) });
                if (!started) {
                    // Nothing reached the model: the message goes back to the input, not into the list.
                    store.update({
                        messages: store.getSnapshot().messages.filter((m) => m.id !== questionId),
                        failedText: text
                    });
                }
            }
        }
        finally {
            // Only the send that still owns the stream ends it: a newer send keeps `streaming`.
            const owner = controller === current;
            if (owner)
                controller = null;
            if (live()) {
                // No text came: drop the empty answer bubble; the error tells the rest.
                const answer = message(answerId);
                const messages = store.getSnapshot().messages;
                store.update({
                    ...(owner ? { streaming: false } : {}),
                    messages: answer && answer.text === '' ? messages.filter((m) => m.id !== answerId) : messages
                });
            }
        }
    }
    function stop() {
        controller?.abort();
    }
    function reset() {
        epoch++;
        stop();
        controller = null;
        store.set(initial(null));
    }
    return {
        getSnapshot: store.getSnapshot,
        subscribe: store.subscribe,
        send,
        stop,
        dismiss() {
            store.update({ error: null });
        },
        reset,
        connect() {
            const unsubscribe = source.onUserChange?.(reset);
            return () => {
                unsubscribe?.();
                stop();
            };
        }
    };
}
