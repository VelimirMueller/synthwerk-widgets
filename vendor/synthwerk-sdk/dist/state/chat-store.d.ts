import type { Synthwerk } from '../client/create.ts';
import type { Usage } from '../llm/events.ts';
import { type ErrorState } from './error-state.ts';
import { type Readable } from './store.ts';
export type ChatMessageStatus = 'streaming' | 'done' | 'error' | 'stopped';
export interface ChatMessage {
    /** Local id, stable for list keys. */
    id: string;
    role: 'user' | 'assistant';
    /** Grows token by token while `status` is `streaming`. */
    text: string;
    status: ChatMessageStatus;
}
export interface ChatSnapshot {
    /** Set by the first send (or by the `conversationId` option). */
    conversationId: string | null;
    messages: readonly ChatMessage[];
    streaming: boolean;
    error: ErrorState | null;
    /** Token use of the last answer. */
    usage: Usage | null;
    /**
     * A message that failed before any answer came (nothing reached the model). It is not in
     * `messages`: put it back into the input. A failure after the answer started keeps the
     * question in `messages` and leaves this `null`.
     */
    failedText: string | null;
}
export interface ChatSource {
    sw: Pick<Synthwerk, 'api' | 'llm'>;
    /** Drops the chat when the user changes (SynthwerkApp.onUserChange). */
    onUserChange?: (listener: () => void) => () => void;
}
export interface ChatStoreOptions {
    /** Continue this conversation. Default: a new one on the first send. */
    conversationId?: string;
    now?: () => number;
}
export interface ChatStore extends Readable<ChatSnapshot> {
    /** Sends `text` and streams the answer. Never rejects: failures land in `error`. Ignored while streaming. */
    send(text: string): Promise<void>;
    /** Aborts the open stream. The partial answer stays with status `stopped`. */
    stop(): void;
    /** Hides the error. */
    dismiss(): void;
    /** Aborts and forgets the conversation. The next send starts a new one. */
    reset(): void;
    /** Follows user changes (reset on switch). The returned function stops that and aborts the stream. */
    connect(): () => void;
}
export declare function createChatStore(source: ChatSource, options?: ChatStoreOptions): ChatStore;
