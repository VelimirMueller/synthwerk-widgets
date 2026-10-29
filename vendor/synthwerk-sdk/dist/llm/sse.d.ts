import type { SseFrame } from './events.ts';
export interface ReadSseOptions {
    /** No bytes (not even a `: ping`) for this long ends the read with `stream_stalled`. */
    stallTimeoutMs: number;
    /** Abort cancels the reader, even when the fetch implementation does not end the body. */
    signal?: AbortSignal;
}
/**
 * Yields one frame per SSE event. Comment lines (`: ping`) only reset the stall timer.
 * The consumer pulls: a slow consumer pauses the reader (backpressure).
 * Returning early (break, abort) cancels the reader.
 */
export declare function readSse(body: ReadableStream<Uint8Array>, options: ReadSseOptions): AsyncGenerator<SseFrame>;
