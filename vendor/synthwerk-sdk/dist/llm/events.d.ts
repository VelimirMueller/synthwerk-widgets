import { type SynthwerkError } from '../client/errors.ts';
import type { components } from '../generated/llm.ts';
export type Usage = components['schemas']['Usage'];
export type FinishReason = components['schemas']['Done']['finish_reason'];
/** One event of a chat answer. Narrow on `type`. `id` is the SSE id (`<message_id>:<sequence>`). */
export type ChatEvent = {
    type: 'delta';
    id: string | undefined;
    text: string;
} | {
    type: 'usage';
    id: string | undefined;
    usage: Usage;
} | {
    type: 'done';
    id: string | undefined;
    messageId: string;
    finishReason: FinishReason;
} | {
    type: 'error';
    id: string | undefined;
    error: SynthwerkError;
};
export interface SseFrame {
    event?: string | undefined;
    id?: string | undefined;
    data: string;
}
/**
 * The ChatEvent of one SSE frame.
 * - Unknown event names: `null` (ignored, later events still arrive).
 * - A known name with bad data: an `error` event with code `invalid_event`.
 */
export declare function toChatEvent(frame: SseFrame): ChatEvent | null;
