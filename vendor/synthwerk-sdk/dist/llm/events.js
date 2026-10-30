// Chat stream events. Names and payloads follow the synthwerk-contracts llm spec (D-44):
// `delta`, `usage`, `done`, `error`. OpenAPI cannot type a stream, so each frame is checked
// here by hand (no schema library in core: size budget).
import { clientError, fromProblem } from "../client/errors.js";
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isCount(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
function invalid(id) {
    return { type: 'error', id, error: clientError('invalid_event') };
}
/**
 * The ChatEvent of one SSE frame.
 * - Unknown event names: `null` (ignored, later events still arrive).
 * - A known name with bad data: an `error` event with code `invalid_event`.
 */
export function toChatEvent(frame) {
    const name = frame.event ?? 'message';
    if (name !== 'delta' && name !== 'usage' && name !== 'done' && name !== 'error')
        return null;
    const { id } = frame;
    let data;
    try {
        data = JSON.parse(frame.data);
    }
    catch {
        return invalid(id);
    }
    if (!isRecord(data))
        return invalid(id);
    switch (name) {
        case 'delta':
            return typeof data.text === 'string' ? { type: 'delta', id, text: data.text } : invalid(id);
        case 'usage': {
            const { input_tokens, output_tokens, model } = data;
            if (!isCount(input_tokens) || !isCount(output_tokens) || typeof model !== 'string')
                return invalid(id);
            return { type: 'usage', id, usage: { input_tokens, output_tokens, model } };
        }
        case 'done': {
            const { message_id, finish_reason } = data;
            if (typeof message_id !== 'string' ||
                (finish_reason !== 'stop' && finish_reason !== 'length')) {
                return invalid(id);
            }
            return { type: 'done', id, messageId: message_id, finishReason: finish_reason };
        }
        case 'error': {
            const error = fromProblem(data, null);
            return error ? { type: 'error', id, error } : invalid(id);
        }
    }
}
