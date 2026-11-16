import type { AuthUser, GetToken } from '../auth/types.ts';
import { type Synthwerk } from '../client/create.ts';
import { type WidgetSession } from '../identity/widget-session.ts';
import { type Readable } from '../state/store.ts';
export interface SynthwerkAppOptions {
    /** Edge base URL, for example `https://api.example.com`. */
    apiUrl: string;
    /**
     * The access token of the signed-in user, or `null`. Identity and llm calls send it.
     * See GetToken for `refresh`. Called only from effects and calls, never at import or render.
     */
    getToken: GetToken;
    /** The app id (UUID) for widget tokens. Vision needs it; without it `useClassify` fails. */
    appId?: string;
    /** Per-service base URLs (see SynthwerkOptions). */
    services?: {
        identity?: string;
        llm?: string;
        vision?: string;
    };
    fetch?: (input: Request) => Promise<Response>;
    tracing?: boolean;
}
export type AuthStatus = 'unknown' | 'checking' | 'signed_in' | 'signed_out';
export interface AuthSnapshot {
    /** `unknown` until the first check (on mount). Never `signed_in` during SSR. */
    status: AuthStatus;
    user: AuthUser | null;
}
export interface SynthwerkApp {
    /** The one SDK client. It sends the user token. */
    sw: Synthwerk;
    /** The sign-in state. */
    auth: Readable<AuthSnapshot>;
    /** Asks `getToken` once and updates `auth`. Clears a previous signOut(). */
    checkAuth(): Promise<AuthUser | null>;
    /** Stops all calls until checkAuth(), drops all user data (chats, widget token). */
    signOut(): void;
    /** The host session changed (sign-in, sign-out, maybe another user): drop all user data, then check. */
    sessionChanged(): Promise<AuthUser | null>;
    /** The widget-token session for vision, or `null` without `appId`. Built on first use. */
    widget(): WidgetSession | null;
    /** Calls `listener` when user data must go: other user, sign-out, sessionChanged(). */
    onUserChange(listener: () => void): () => void;
    /** Starts to follow `sw.auth` changes. Returns the stop function. Safe to call again. */
    connect(): () => void;
}
export declare function createSynthwerkApp(options: SynthwerkAppOptions): SynthwerkApp;
