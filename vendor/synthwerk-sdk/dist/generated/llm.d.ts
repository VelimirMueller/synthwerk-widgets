export interface paths {
    "/v1/ai-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the AI settings of the org
         * @description The AI settings of the org the token acts in, and the bounds they must stay in (synthwerk#39).
         *     - Needs the org role `owner` or `admin` in the token and an active stored membership (llm asks identity with the caller's token). A `member`, an `operator` and a widget token get 403.
         *     - An org that never saved settings gets the defaults with `version` 0: the default alias, every alias of the service, the service system prompt, the service input limit, no extra token cap.
         *     - `bounds` holds the aliases of the service, the input limit of the service and the per-user token limit of the org's plan.
         *     - 503 `settings_unavailable`: llm cannot reach identity, or identity is not configured.
         */
        get: operations["llm.getAiSettings"];
        /**
         * Replace the AI settings of the org
         * @description Replaces every AI setting of the token's org in one step (synthwerk#39). Same access rules as `llm.getAiSettings`.
         *     - `version` must be the version the caller read. Another version: 409 `version_conflict`, nothing changes. Read again and retry.
         *     - `model` and every item of `allowed_models` must be an alias of the service (`bounds.models`). `allowed_models` must hold `model`. An org can never pick a model outside the service allow-list.
         *     - `max_input_chars` must be at most `bounds.max_input_chars`. `user_tokens_per_day` must be at most `bounds.user_tokens_per_day` when the plan has a limit.
         *     - `system_prompt` is plain text: line breaks and tabs are allowed, other control characters are refused. Empty means the service prompt.
         *     - A value outside the bounds: 400 `invalid_request`; `detail` names the field.
         *     - An absent `temperature` clears a stored one (the model default again); that is a change.
         *     - A change emits `dev.synthwerk.llm.ai_settings.changed.v1` in the same transaction. The same values again change nothing: same version, no event.
         *     - The next send of every user of the org uses the new values. A conversation whose model is no longer allowed gets 400 on its next send.
         */
        put: operations["llm.updateAiSettings"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export the own data
         * @description Every conversation, message and quota row of the caller, in every org (synthwerk#41).
         *     - The owner comes from the token `sub` only. Rows of other users never appear, also not the shared org row of a quota.
         *     - Every conversation llm still keeps is in it, also one marked deleted.
         *     - Any signed-in user may call it with the Zitadel access token. A widget token (claim `synthwerk:origin`) gets 403: the export is for the user, not for an embedded widget.
         */
        get: operations["llm.exportMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
         *     - Without `model` the conversation gets the default model of the org (AI settings).
         *     - A `model` the org does not allow: 400 `invalid_request`.
         *     - CORS (infra#21): llm answers the preflight (`OPTIONS`, no token). An allowed origin with `Access-Control-Request-Method: POST` gets 204 with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: POST`, `Access-Control-Allow-Headers: Authorization, Content-Type` and `Access-Control-Max-Age: 600`. Else 403 without CORS headers.
         *     - Allowed origin: a first-party origin of llm's static list, or an origin that an app of an active org lists in identity. No `Access-Control-Allow-Credentials`.
         *     - Every answer sends `Vary: Origin`. An allowed origin also gets `Access-Control-Allow-Origin` and `Access-Control-Expose-Headers: Retry-After`, refusals included.
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
         *     - CORS (infra#21): llm answers the preflight (`OPTIONS`, no token). An allowed origin with `Access-Control-Request-Method: GET` gets 204 with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: GET`, `Access-Control-Allow-Headers: Authorization, Content-Type` and `Access-Control-Max-Age: 600`. Else 403 without CORS headers.
         *     - Allowed origin: a first-party origin of llm's static list, or an origin that an app of an active org lists in identity. No `Access-Control-Allow-Credentials`.
         *     - Every answer sends `Vary: Origin`. An allowed origin also gets `Access-Control-Allow-Origin` and `Access-Control-Expose-Headers: Retry-After`, refusals included.
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
         *     - CORS (infra#21): llm answers the preflight (`OPTIONS`, no token). An allowed origin with `Access-Control-Request-Method: POST` gets 204 with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: POST`, `Access-Control-Allow-Headers: Authorization, Content-Type` and `Access-Control-Max-Age: 600`. Else 403 without CORS headers.
         *     - Allowed origin: a first-party origin of llm's static list, or an origin that an app of an active org lists in identity. No `Access-Control-Allow-Credentials`.
         *     - Every answer sends `Vary: Origin`. An allowed origin also gets `Access-Control-Allow-Origin` and `Access-Control-Expose-Headers: Retry-After`, refusals included.
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
        /**
         * @description The system prompt of the org. Plain text, never HTML. Line breaks and tabs are allowed; other control characters are refused.
         *     Empty: the system prompt of the service.
         */
        AiSystemPrompt: string;
        /**
         * @description The AI settings of one org (synthwerk#39). llm applies them to every create and send of the org.
         *     The schema is closed. A new setting (for example AI tools) comes with a new spec minor version.
         */
        AiSettings: {
            model: components["schemas"]["ModelAlias"];
            /** @description The aliases the users of the org may pick. Holds `model`. Always a subset of `bounds.models`. */
            allowed_models: components["schemas"]["ModelAlias"][];
            system_prompt: components["schemas"]["AiSystemPrompt"];
            /**
             * Format: int32
             * @description Max characters of one user message in this org. A longer message gets 413 `input_too_large`.
             */
            max_input_chars: number;
            /**
             * Format: int64
             * @description Tokens one user may use in this org per UTC day, below the plan. `0`: the plan limit only.
             *     The smaller of this cap and the plan limit applies.
             */
            user_tokens_per_day: number;
            /**
             * Format: float
             * @description Sampling temperature of the model. Absent means the model default.
             */
            temperature?: number;
            /**
             * Format: int64
             * @description Goes up by one on every saved change. `0` means the org never saved settings and gets the defaults.
             */
            version: number;
            /**
             * Format: date-time
             * @description Time of the last saved change. Absent with `version` 0.
             */
            updated_at?: string;
            bounds: components["schemas"]["AiSettingsBounds"];
        };
        /** @description The limits the settings must stay in. The service and the org's plan set them, never the org. */
        AiSettingsBounds: {
            /** @description Every model alias of the service (the operator's allow-list). */
            models: components["schemas"]["ModelAlias"][];
            /**
             * Format: int32
             * @description The input limit of the service.
             */
            max_input_chars: number;
            /**
             * Format: int64
             * @description Tokens per user per UTC day of the org's plan (identity entitlements). `0` means no limit.
             */
            user_tokens_per_day: number;
            /**
             * Format: int32
             * @description Max characters of `system_prompt`.
             */
            system_prompt_max_chars: number;
            /**
             * Format: float
             * @description Max `temperature`.
             */
            temperature_max: number;
        };
        /** @description Every AI setting of the org. Absent `temperature` means the model default. */
        UpdateAiSettingsRequest: {
            /**
             * Format: int64
             * @description The `version` the caller read.
             */
            version: number;
            model: components["schemas"]["ModelAlias"];
            allowed_models: components["schemas"]["ModelAlias"][];
            system_prompt: components["schemas"]["AiSystemPrompt"];
            /** Format: int32 */
            max_input_chars: number;
            /** Format: int64 */
            user_tokens_per_day: number;
            /** Format: float */
            temperature?: number;
        };
        /** @description Model alias, for example `default`. Never a provider model name. */
        ModelAlias: string;
        CreateConversationRequest: {
            model?: components["schemas"]["ModelAlias"];
        };
        SendMessageRequest: {
            /** @description The user message. Plain text. Above the input limit of the org (AI settings, at most the server limit) the answer is 413. */
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
        /** @description Every row llm keeps about one user. Identity embeds it in `UserExport` as the `data` of service `llm`. */
        LlmExport: {
            /** @description Conversations of the user in every org, oldest first. */
            conversations: components["schemas"]["ExportConversation"][];
            /** @description The user's own token use per org and UTC day, oldest first. Never the shared org row. */
            quota_usage: components["schemas"]["ExportQuotaUsage"][];
        };
        ExportConversation: {
            /** Format: uuid */
            id: string;
            /** @description The org of the token that created the conversation (Zitadel org id). */
            org_id: string;
            model: components["schemas"]["ModelAlias"];
            /** Format: date-time */
            created_at: string;
            /** @description Messages, oldest first. */
            messages: components["schemas"]["ExportMessage"][];
        };
        ExportMessage: {
            /** Format: uuid */
            id: string;
            role: components["schemas"]["MessageRole"];
            /** @description Plain text. Never HTML. */
            content: string;
            status: components["schemas"]["MessageStatus"];
            /**
             * Format: int32
             * @description Input tokens of the answer. Only on assistant messages that finished.
             */
            tokens_in?: number;
            /**
             * Format: int32
             * @description Output tokens of the answer. Only on assistant messages that finished.
             */
            tokens_out?: number;
            /** Format: date-time */
            created_at: string;
        };
        ExportQuotaUsage: {
            /** @description Zitadel org id. */
            org_id: string;
            /**
             * Format: date
             * @description The UTC day.
             */
            window_start: string;
            /**
             * Format: int64
             * @description Tokens the user used in the org that day.
             */
            used: number;
        };
        /**
         * @description RFC 9457 problem details with the stable Synthwerk `code`.
         *     Clients branch on `code`, never on `title` or `detail`, and must accept unknown codes.
         *
         *     | Code | Status | Cause |
         *     |---|---|---|
         *     | `invalid_request` | 400 | Body or parameter not valid. |
         *     | `unauthenticated` | 401 | Token missing or not valid. |
         *     | `forbidden` | 403 | Scope, role or origin does not allow the call. |
         *     | `not_found` | 404 | Unknown id or another owner's id. |
         *     | `version_conflict` | 409 | The AI settings changed since the caller read them. |
         *     | `input_too_large` | 413 | Message above the input limit. |
         *     | `too_many_streams` | 429 | Owner has the max number of open streams. |
         *     | `quota_exhausted` | 429 | User or org quota used up. `quota` names the scope and the reset. |
         *     | `model_unavailable` | 503 | Provider down or busy. Also as an `error` event mid-stream. |
         *     | `settings_unavailable` | 503 | llm cannot check the membership and the plan for the AI settings now. |
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
            quota?: components["schemas"]["QuotaExceeded"];
        };
        /**
         * @description The quota that ran out. Only in a `quota_exhausted` problem.
         *     No usage numbers of other users: a member sees the org limit, never the use of a peer.
         */
        QuotaExceeded: {
            /**
             * @description - `user`: the caller used up the own quota in this org.
             *     - `org`: the org used up the shared quota of all its users.
             * @enum {string}
             */
            scope: "user" | "org";
            /**
             * @description What the quota counts. Input plus output tokens of every answer.
             * @enum {string}
             */
            unit: "tokens";
            /**
             * Format: int64
             * @description Tokens per window for this scope.
             */
            limit: number;
            /**
             * Format: date-time
             * @description Start of the next window (UTC). The quota is full again from then.
             */
            resets_at: string;
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
        /** @description The token scope, role or origin does not allow the call. Code `forbidden`. The body is generic. */
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
         *     - `quota_exhausted`: the user or the org used up its token quota of the window (D-46, #33). The model sees no call.
         *       The body holds `quota`: the scope that ran out, its limit and when the window resets.
         *       `Retry-After` is the number of seconds until that reset.
         */
        TooManyRequests: {
            headers: {
                /** @description Seconds to wait before a retry. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The AI settings changed since the caller read them. Code `version_conflict`. Nothing changed. */
        VersionConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/version_conflict",
                 *       "title": "Version conflict",
                 *       "status": 409,
                 *       "code": "version_conflict",
                 *       "detail": "The settings changed. Read them again."
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description llm cannot check the membership and the plan of the org now (identity down or not configured). Code `settings_unavailable`. */
        SettingsUnavailable: {
            headers: {
                /** @description Seconds to wait before a retry. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/settings_unavailable",
                 *       "title": "Settings unavailable",
                 *       "status": 503,
                 *       "code": "settings_unavailable"
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
    "llm.getAiSettings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The AI settings and their bounds. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "model": "default",
                     *       "allowed_models": [
                     *         "default",
                     *         "small"
                     *       ],
                     *       "system_prompt": "You answer questions about the shop. Answer briefly.",
                     *       "max_input_chars": 2000,
                     *       "user_tokens_per_day": 20000,
                     *       "temperature": 0.3,
                     *       "version": 3,
                     *       "updated_at": "2026-10-30T10:00:00Z",
                     *       "bounds": {
                     *         "models": [
                     *           "default",
                     *           "small"
                     *         ],
                     *         "max_input_chars": 8000,
                     *         "user_tokens_per_day": 50000,
                     *         "system_prompt_max_chars": 4000,
                     *         "temperature_max": 2
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["AiSettings"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            503: components["responses"]["SettingsUnavailable"];
        };
    };
    "llm.updateAiSettings": {
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
                 *       "version": 2,
                 *       "model": "default",
                 *       "allowed_models": [
                 *         "default",
                 *         "small"
                 *       ],
                 *       "system_prompt": "You answer questions about the shop. Answer briefly.",
                 *       "max_input_chars": 2000,
                 *       "user_tokens_per_day": 20000,
                 *       "temperature": 0.3
                 *     }
                 */
                "application/json": components["schemas"]["UpdateAiSettingsRequest"];
            };
        };
        responses: {
            /** @description The saved AI settings. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "model": "default",
                     *       "allowed_models": [
                     *         "default",
                     *         "small"
                     *       ],
                     *       "system_prompt": "You answer questions about the shop. Answer briefly.",
                     *       "max_input_chars": 2000,
                     *       "user_tokens_per_day": 20000,
                     *       "temperature": 0.3,
                     *       "version": 3,
                     *       "updated_at": "2026-10-30T10:00:00Z",
                     *       "bounds": {
                     *         "models": [
                     *           "default",
                     *           "small"
                     *         ],
                     *         "max_input_chars": 8000,
                     *         "user_tokens_per_day": 50000,
                     *         "system_prompt_max_chars": 4000,
                     *         "temperature_max": 2
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["AiSettings"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["VersionConflict"];
            503: components["responses"]["SettingsUnavailable"];
        };
    };
    "llm.exportMe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The export. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "conversations": [
                     *         {
                     *           "id": "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
                     *           "org_id": "396370208765350663",
                     *           "model": "default",
                     *           "created_at": "2026-10-23T09:00:00Z",
                     *           "messages": [
                     *             {
                     *               "id": "0199f3b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
                     *               "role": "user",
                     *               "content": "What does pulse check?",
                     *               "status": "completed",
                     *               "created_at": "2026-10-23T09:00:05Z"
                     *             },
                     *             {
                     *               "id": "0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10",
                     *               "role": "assistant",
                     *               "content": "Pulse reads /readyz of every service.",
                     *               "status": "completed",
                     *               "tokens_in": 12,
                     *               "tokens_out": 9,
                     *               "created_at": "2026-10-23T09:00:05Z"
                     *             }
                     *           ]
                     *         }
                     *       ],
                     *       "quota_usage": [
                     *         {
                     *           "org_id": "396370208765350663",
                     *           "window_start": "2026-10-23",
                     *           "used": 21
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["LlmExport"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
        };
    };
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
                    /** @description Always `Origin`. The CORS headers depend on the request origin (infra#21). */
                    Vary?: string;
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
                    /** @description Always `Origin`. The CORS headers depend on the request origin (infra#21). */
                    Vary?: string;
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
                    /** @description Always `Origin`. The CORS headers depend on the request origin (infra#21). */
                    Vary?: string;
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
