import type { Send } from '../client/transport.ts';
import type { components } from '../generated/llm.ts';
import { type ChatEvent } from './events.ts';
export type SendMessageRequest = components['schemas']['SendMessageRequest'];
export interface ChatRequest extends SendMessageRequest {
    /** The conversation (create one with `sw.api.llm.POST('/v1/conversations', …)`). */
    conversationId: string;
}
export interface ChatOptions {
    /** Abort ends the iteration quietly and closes the connection; the server keeps the partial answer. */
    signal?: AbortSignal;
    /** No bytes for this long (3 missed 15 s pings) gives an `error` event `stream_stalled`. Default 45 000. */
    stallTimeoutMs?: number;
}
export declare const DEFAULT_STALL_TIMEOUT_MS = 45000;
/**
 * Sends one message and yields the answer events.
 * - Before the first byte: throws a SynthwerkError (`unauthenticated`, `network`, `offline`,
 *   or the server problem code such as `quota_exhausted`). A 401 gets one retry with a new token.
 * - After the first byte: failures arrive as one `error` event, then the iteration ends.
 *   No automatic retry: the message is stored, a retry would send it twice.
 * - `done` or `error` ends the iteration. Abort or `break` closes the connection.
 */
export declare function chat(send: Send, llmUrl: string, request: ChatRequest, options?: ChatOptions): AsyncGenerator<ChatEvent, void, undefined>;
