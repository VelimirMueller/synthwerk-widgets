import { type Client } from 'openapi-fetch';
import type { Auth, AuthOptions } from '../auth/types.ts';
import type { paths as IdentityPaths } from '../generated/identity.ts';
import type { paths as LlmPaths } from '../generated/llm.ts';
import type { paths as VisionPaths } from '../generated/vision.ts';
import { type ChatOptions, type ChatRequest } from '../llm/chat.ts';
import type { ChatEvent } from '../llm/events.ts';
export interface SynthwerkOptions {
    /** Edge base URL, for example `https://api.example.com`. Services sit under `/identity`, `/llm` and `/vision`. */
    apiUrl: string;
    auth: AuthOptions;
    /** Per-service base URLs. Default: `<apiUrl>/identity`, `<apiUrl>/llm` and `<apiUrl>/vision` (the edge routes). */
    services?: {
        identity?: string;
        llm?: string;
        vision?: string;
    };
    /** Custom fetch, for tests or a host runtime. Default: `globalThis.fetch`. */
    fetch?: (input: Request) => Promise<Response>;
    /** Send `traceparent` and `X-Request-ID`. Default `false`: the edge CORS does not allow them yet. */
    tracing?: boolean;
}
export interface Synthwerk {
    auth: Auth;
    /**
     * Typed clients generated from synthwerk-contracts (openapi-fetch). They return
     * `{ data, error, response }`; `error` is the problem body. A missing token, a network
     * failure or an abort throws a SynthwerkError.
     */
    api: {
        identity: Client<IdentityPaths>;
        llm: Client<LlmPaths>;
        /**
         * Vision. A body with a Blob (`{ image }`) goes as `multipart/form-data`, other bodies as
         * JSON. Classification and upload need a widget token; the admin routes need the vision
         * admin token and are for servers only. Errors are FastAPI `{detail}` bodies: branch on
         * the status.
         */
        vision: Client<VisionPaths>;
    };
    llm: {
        /** Sends one message and streams the answer. See ChatEvent. */
        chat(request: ChatRequest, options?: ChatOptions): AsyncIterable<ChatEvent>;
    };
}
export declare function createSynthwerk(options: SynthwerkOptions): Synthwerk;
