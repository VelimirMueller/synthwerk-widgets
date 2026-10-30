// The chat stream client: POST /v1/conversations/{id}/messages, answer as SSE.
// openapi-fetch does not stream, so this uses the shared transport with a raw Request.
import { clientError, fromFetchFailure, fromResponse, isSynthwerkError } from "../client/errors.js";
import { toChatEvent } from "./events.js";
import { readSse } from "./sse.js";
export const DEFAULT_STALL_TIMEOUT_MS = 45_000;
/**
 * Sends one message and yields the answer events.
 * - Before the first byte: throws a SynthwerkError (`unauthenticated`, `network`, `offline`,
 *   or the server problem code such as `quota_exhausted`). A 401 gets one retry with a new token.
 * - After the first byte: failures arrive as one `error` event, then the iteration ends.
 *   No automatic retry: the message is stored, a retry would send it twice.
 * - `done` or `error` ends the iteration. Abort or `break` closes the connection.
 */
export async function* chat(send, llmUrl, request, options = {}) {
    const { conversationId, ...body } = request;
    const controller = new AbortController();
    const outer = options.signal;
    const onAbort = () => controller.abort(outer?.reason);
    if (outer?.aborted)
        return;
    outer?.addEventListener('abort', onAbort, { once: true });
    try {
        const url = `${llmUrl}/v1/conversations/${encodeURIComponent(conversationId)}/messages`;
        let response;
        try {
            response = await send(new Request(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
                body: JSON.stringify(body),
                signal: controller.signal
            }));
        }
        catch (error) {
            if (controller.signal.aborted)
                return;
            throw error;
        }
        if (!response.ok)
            throw await fromResponse(response);
        if (!response.body ||
            !(response.headers.get('content-type') ?? '').includes('text/event-stream')) {
            await response.body?.cancel().catch(() => undefined);
            throw clientError('bad_gateway', response.status);
        }
        const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
        try {
            for await (const frame of readSse(response.body, {
                stallTimeoutMs,
                signal: controller.signal
            })) {
                const event = toChatEvent(frame);
                if (event === null)
                    continue;
                yield event;
                if (event.type === 'done' || event.type === 'error')
                    return;
            }
        }
        catch (error) {
            if (controller.signal.aborted)
                return;
            yield {
                type: 'error',
                id: undefined,
                error: isSynthwerkError(error) ? error : fromFetchFailure(error)
            };
            return;
        }
        if (controller.signal.aborted)
            return;
        // The body ended without `done` or `error`: the connection dropped.
        yield { type: 'error', id: undefined, error: clientError('stream_interrupted') };
    }
    finally {
        outer?.removeEventListener('abort', onAbort);
        controller.abort();
    }
}
