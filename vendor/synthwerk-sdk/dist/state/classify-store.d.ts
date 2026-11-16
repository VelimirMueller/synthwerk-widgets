import type { components } from '../generated/vision.ts';
import type { WidgetSession } from '../identity/widget-session.ts';
import { type ErrorState } from './error-state.ts';
import { type Readable } from './store.ts';
type Classification = components['schemas']['Classification'];
export type ClassifyStatus = 'idle' | 'pending' | 'success' | 'error';
export interface ClassifySnapshot {
    status: ClassifyStatus;
    data: Classification | null;
    error: ErrorState | null;
}
export interface ClassifySource {
    /** The widget-token session, or `null` when the app has no app id. */
    widget(): Pick<WidgetSession, 'sw'> | null;
    onUserChange?: (listener: () => void) => () => void;
}
export interface ClassifyStore extends Readable<ClassifySnapshot> {
    /**
     * Classifies `image` (JPEG, PNG or WebP). Aborts a running call. Resolves with the
     * classification, or `null` on failure or abort (see `error`). Never rejects.
     */
    classify(image: Blob): Promise<Classification | null>;
    /** Aborts and goes back to `idle`. */
    reset(): void;
    /** Follows user changes (reset on switch). The returned function stops that and aborts. */
    connect(): () => void;
}
export declare function createClassifyStore(source: ClassifySource, options?: {
    now?: () => number;
}): ClassifyStore;
export {};
