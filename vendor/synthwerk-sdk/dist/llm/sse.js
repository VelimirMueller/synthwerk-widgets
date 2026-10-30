// Reads a text/event-stream body as SSE frames. fetch + ReadableStream, not EventSource:
// EventSource cannot send an Authorization header (architecture 3.3).
import { createParser } from 'eventsource-parser';
import { clientError } from "../client/errors.js";
/**
 * Yields one frame per SSE event. Comment lines (`: ping`) only reset the stall timer.
 * The consumer pulls: a slow consumer pauses the reader (backpressure).
 * Returning early (break, abort) cancels the reader.
 */
export async function* readSse(body, options) {
    const reader = body.getReader();
    const onAbort = () => {
        reader.cancel().catch(() => undefined);
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const decoder = new TextDecoder();
    const queue = [];
    const parser = createParser({
        onEvent: (event) => {
            queue.push({ event: event.event, id: event.id, data: event.data });
        }
    });
    async function read() {
        let timer;
        const stalled = new Promise((_, reject) => {
            timer = setTimeout(() => reject(clientError('stream_stalled')), options.stallTimeoutMs);
        });
        try {
            const next = reader.read();
            // A read that loses the race may reject later (cancel); keep that rejection handled.
            next.catch(() => undefined);
            return await Promise.race([next, stalled]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    try {
        while (true) {
            const { done, value } = await read();
            parser.feed(done ? decoder.decode() : decoder.decode(value, { stream: true }));
            while (queue.length > 0) {
                const frame = queue.shift();
                if (frame)
                    yield frame;
            }
            if (done)
                return;
        }
    }
    finally {
        options.signal?.removeEventListener('abort', onAbort);
        await reader.cancel().catch(() => undefined);
    }
}
