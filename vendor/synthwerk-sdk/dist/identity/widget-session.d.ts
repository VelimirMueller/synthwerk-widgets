import { type Synthwerk } from '../client/create.ts';
/** Host hook: the access token of the signed-in user, or `null` when signed out. */
export type GetUserToken = () => string | null | undefined | Promise<string | null | undefined>;
export interface WidgetSessionOptions {
    /** Edge base URL. Identity sits under `<apiUrl>/identity`, vision under `<apiUrl>/vision`. */
    apiUrl: string;
    /** The app id (UUID) the widget token is for. */
    appId: string;
    getUserToken: GetUserToken;
    fetch?: (input: Request) => Promise<Response>;
    /** Per-service base URLs. Default: `<apiUrl>/identity` and `<apiUrl>/vision`. */
    services?: {
        identity?: string;
        vision?: string;
    };
    /** Clock in milliseconds since the epoch. Tests set it. */
    now?: () => number;
}
export interface WidgetSession {
    /** A client that sends the widget token. Use `sw.api.vision`. */
    sw: Synthwerk;
    /** Drops the cached widget token and any running trade (sign-out, other user). */
    reset(): void;
}
/** A new widget token this many seconds before the old one expires. */
export declare const WIDGET_TOKEN_EXPIRY_MARGIN_S = 30;
/** The user token, or `null`. A host hook that throws counts as signed out. */
export declare function readUserToken(get: GetUserToken | null | undefined): Promise<string | null>;
export declare function createWidgetSession(options: WidgetSessionOptions): WidgetSession;
