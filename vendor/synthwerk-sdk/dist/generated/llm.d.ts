export interface paths {
    "/v1/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a conversation
         * @description Creates an empty conversation for the caller in the org of the token.
         */
        post: operations["llm.createConversation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/conversations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Conversation id. */
                id: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        /**
         * Get a conversation
         * @description The conversation with its messages, oldest first.
         *     An unknown id and another owner's id both answer 404 with the same body.
         */
        get: operations["llm.getConversation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/conversations/{id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Conversation id. */
                id: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a message and stream the answer
         * @description Stores the user message and streams the assistant answer as Server-Sent Events.
         *     - Refusals before the first byte answer with a status code and `application/problem+json`.
         *     - After the first byte the status stays 200. A failure is an `error` event, then the stream ends.
         *     - Order of events: zero or more `delta`, then `usage`, then `done`. Or an `error` event at any point.
         *     - Cancel: the client closes the connection. The server stops the model call and keeps the partial answer.
         *     - Headers: `Cache-Control: no-store`, `X-Accel-Buffering: no`. A comment line (`: ping`) every 15 s keeps the connection open.
         */
        post: operations["llm.sendMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description Model alias, for example `default`. Never a provider model name. */
        ModelAlias: string;
        CreateConversationRequest: {
            model?: components["schemas"]["ModelAlias"];
        };
        SendMessageRequest: {
            /** @description The user message. Plain text. Above the server limit the answer is 413. */
            content: string;
            model?: components["schemas"]["ModelAlias"];
        };
        Conversation: {
            /** Format: uuid */
            id: string;
            model: components["schemas"]["ModelAlias"];
            /** Format: date-time */
            created_at: string;
            /** @description Messages, oldest first. */
            messages: components["schemas"]["Message"][];
        };
        /** @enum {string} */
        MessageRole: "user" | "assistant";
        /**
         * @description - `streaming`: the answer is still being written.
         *     - `completed`: the answer is complete.
         *     - `failed`: the model call failed. `content` holds the partial answer.
         *     - `canceled`: the client closed the stream. `content` holds the partial answer.
         * @enum {string}
         */
        MessageStatus: "streaming" | "completed" | "failed" | "canceled";
        Message: {
            /** Format: uuid */
            id: string;
            role: components["schemas"]["MessageRole"];
            /** @description Plain text. Never HTML. */
            content: string;
            status: components["schemas"]["MessageStatus"];
            /** Format: date-time */
            created_at: string;
        };
        /** @description One Server-Sent Event of the answer stream. `event` is the SSE event name. */
        StreamEvent: components["schemas"]["DeltaEvent"] | components["schemas"]["UsageEvent"] | components["schemas"]["DoneEvent"] | components["schemas"]["ErrorEvent"];
        DeltaEvent: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            event: "delta";
            data: components["schemas"]["Delta"];
        };
        /** @description The next piece of the answer. Append `text` to the text so far. */
        Delta: {
            text: string;
        };
        UsageEvent: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            event: "usage";
            data: components["schemas"]["Usage"];
        };
        /** @description Token use of this answer, from the provider. Sent once, before `done`. */
        Usage: {
            input_tokens: number;
            output_tokens: number;
            model: components["schemas"]["ModelAlias"];
        };
        DoneEvent: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            event: "done";
            data: components["schemas"]["Done"];
        };
        /** @description The last event of a stream that did not fail. */
        Done: {
            /**
             * Format: uuid
             * @description Id of the stored assistant message.
             */
            message_id: string;
            /**
             * @description - `stop`: the model finished the answer.
             *     - `length`: the answer hit the output token limit.
             * @enum {string}
             */
            finish_reason: "stop" | "length";
        };
        ErrorEvent: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            event: "error";
            data: components["schemas"]["Problem"];
        };
        /**
         * @description RFC 9457 problem details with the stable Synthwerk `code`.
         *     Clients branch on `code`, never on `title` or `detail`, and must accept unknown codes.
         *
         *     | Code | Status | Cause |
         *     |---|---|---|
         *     | `invalid_request` | 400 | Body or parameter not valid. |
         *     | `unauthenticated` | 401 | Token missing or not valid. |
         *     | `forbidden` | 403 | Scope or origin does not allow the call. |
         *     | `not_found` | 404 | Unknown id or another owner's id. |
         *     | `input_too_large` | 413 | Message above the input limit. |
         *     | `too_many_streams` | 429 | Owner has the max number of open streams. |
         *     | `quota_exhausted` | 429 | Reserved (D-46). Not sent in M2. |
         *     | `model_unavailable` | 503 | Provider down or busy. Also as an `error` event mid-stream. |
         */
        Problem: {
            /**
             * Format: uri
             * @description `https://schemas.synthwerk.dev/problems/<code>`.
             */
            type: string;
            /** @description Short summary of the problem type. Same for every instance. */
            title: string;
            /** @description HTTP status. In an `error` event the HTTP status stays 200; this field holds the status the error maps to. */
            status: number;
            /** @description Stable machine code, for example `model_unavailable`. */
            code: string;
            /** @description Explanation for this instance. No secrets, no personal data, no provider error text. */
            detail?: string;
            /** @description URI of this instance, for example the request path. */
            instance?: string;
            /** @description W3C trace id of the request, for support. */
            trace_id?: string;
        };
    };
    responses: {
        /** @description The body or a parameter is not valid. Code `invalid_request`. */
        InvalidRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/invalid_request",
                 *       "title": "Invalid request",
                 *       "status": 400,
                 *       "code": "invalid_request",
                 *       "detail": "content must not be empty.",
                 *       "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description No token, bad signature, expired, wrong issuer or audience. Code `unauthenticated`. */
        Unauthenticated: {
            headers: {
                /** @description Always `Bearer`. */
                "WWW-Authenticate"?: string;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/unauthenticated",
                 *       "title": "Unauthenticated",
                 *       "status": 401,
                 *       "code": "unauthenticated"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The token scope or origin does not allow the call. Code `forbidden`. The body is generic. */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/forbidden",
                 *       "title": "Forbidden",
                 *       "status": 403,
                 *       "code": "forbidden"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Unknown id or another owner's id. Same body in both cases. Code `not_found`. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/not_found",
                 *       "title": "Not found",
                 *       "status": 404,
                 *       "code": "not_found"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The message is above the input limit (default 8000 characters). Code `input_too_large`. */
        InputTooLarge: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/input_too_large",
                 *       "title": "Input too large",
                 *       "status": 413,
                 *       "code": "input_too_large"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /**
         * @description - `too_many_streams`: the owner already has the max number of open streams (default 2).
         *     - `quota_exhausted`: reserved (D-46). M2 has no quotas and never sends it. Clients must handle it already.
         */
        TooManyRequests: {
            headers: {
                /** @description Seconds to wait before a retry. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/too_many_streams",
                 *       "title": "Too many streams",
                 *       "status": 429,
                 *       "code": "too_many_streams"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The model cannot answer now (provider down or busy). Code `model_unavailable`. */
        ModelUnavailable: {
            headers: {
                /** @description Seconds to wait before a retry. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/model_unavailable",
                 *       "title": "Model unavailable",
                 *       "status": 503,
                 *       "code": "model_unavailable"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        /** @description Conversation id. */
        ConversationId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    "llm.createConversation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "model": "default"
                 *     }
                 */
                "application/json": components["schemas"]["CreateConversationRequest"];
            };
        };
        responses: {
            /** @description Conversation created. */
            201: {
                headers: {
                    /** @description Path of the new conversation. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
                     *       "model": "default",
                     *       "created_at": "2026-10-23T09:00:00Z",
                     *       "messages": []
                     *     }
                     */
                    "application/json": components["schemas"]["Conversation"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            503: components["responses"]["ModelUnavailable"];
        };
    };
    "llm.getConversation": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Conversation id. */
                id: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The conversation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
                     *       "model": "default",
                     *       "created_at": "2026-10-23T09:00:00Z",
                     *       "messages": [
                     *         {
                     *           "id": "0199f3b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
                     *           "role": "user",
                     *           "content": "What does pulse check?",
                     *           "status": "completed",
                     *           "created_at": "2026-10-23T09:00:05Z"
                     *         },
                     *         {
                     *           "id": "0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10",
                     *           "role": "assistant",
                     *           "content": "Pulse reads /readyz of every service.",
                     *           "status": "completed",
                     *           "created_at": "2026-10-23T09:00:05Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Conversation"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "llm.sendMessage": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Conversation id. */
                id: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "content": "What does pulse check?"
                 *     }
                 */
                "application/json": components["schemas"]["SendMessageRequest"];
            };
        };
        responses: {
            /**
             * @description The answer as a `text/event-stream`. Each frame is one `StreamEvent`:
             *     the SSE `event:` field holds `event`, the `data:` field holds `data` as one line of JSON,
             *     and the `id:` field holds `<message_id>:<sequence>`. On the wire:
             *
             *     ```text
             *     id: 0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10:1
             *     event: delta
             *     data: {"text":"Pulse reads "}
             *
             *     id: 0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10:2
             *     event: delta
             *     data: {"text":"/readyz of every service."}
             *
             *     id: 0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10:3
             *     event: usage
             *     data: {"input_tokens":412,"output_tokens":9,"model":"default"}
             *
             *     id: 0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10:4
             *     event: done
             *     data: {"message_id":"0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10","finish_reason":"stop"}
             *     ```
             */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["StreamEvent"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            413: components["responses"]["InputTooLarge"];
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["ModelUnavailable"];
        };
    };
}
