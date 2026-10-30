export interface Readable<T> {
    /** The current snapshot. The same object until the next change. */
    getSnapshot(): T;
    /** Calls `listener` after each change. Returns the unsubscribe function. */
    subscribe(listener: () => void): () => void;
}
export interface Store<T> extends Readable<T> {
    set(next: T): void;
    update(patch: Partial<T>): void;
}
export declare function createStore<T extends object>(initial: T): Store<T>;
