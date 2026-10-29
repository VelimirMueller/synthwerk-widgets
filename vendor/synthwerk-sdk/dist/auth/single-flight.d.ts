/**
 * Runs `task` once for all callers that ask while it is in flight. The next call after it
 * settles starts a new run. Parallel 401s therefore share one token refresh.
 */
export declare function singleFlight<T>(task: () => Promise<T>): () => Promise<T>;
