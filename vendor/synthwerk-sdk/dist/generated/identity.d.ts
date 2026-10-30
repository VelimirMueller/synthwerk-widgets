export interface paths {
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the caller
         * @description The subject, the org and the roles of the token.
         */
        get: operations["identity.getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List orgs
         * @description Orgs the caller is a member of. An operator sees every org. Cursor paging, max 100 per page.
         */
        get: operations["identity.listOrgs"];
        put?: never;
        /**
         * Create an org
         * @description Creates an org and its Zitadel org. The caller becomes its `owner`. Emits `dev.synthwerk.identity.org.created.v1`.
         */
        post: operations["identity.createOrg"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        /**
         * Get an org
         * @description Org detail. Needs a membership in the org, or the role `operator`.
         */
        get: operations["identity.getOrg"];
        put?: never;
        post?: never;
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
         * @description - `owner`, `admin`, `member`: org roles.
         *     - `operator`: platform role. It is never an org membership.
         * @enum {string}
         */
        Role: "owner" | "admin" | "member" | "operator";
        Org: {
            /** Format: uuid */
            id: string;
            /** @description Display name. */
            name: string;
            /** @description Unique, URL-safe name. */
            slug: string;
            /** Format: date-time */
            created_at: string;
        };
        OrgPage: {
            items: components["schemas"]["Org"][];
            /** @description Cursor of the next page. Absent on the last page. */
            next_cursor?: string;
        };
        CreateOrgRequest: {
            name: string;
            slug: string;
        };
        Me: {
            /** @description Token `sub`. Never an email. */
            subject: string;
            org: components["schemas"]["Org"];
            /** @description Roles of the caller in `org`, plus `operator` for a platform operator. */
            roles: components["schemas"]["Role"][];
        };
        /**
         * @description RFC 9457 problem details with the stable Synthwerk `code`.
         *     Clients branch on `code`, never on `title` or `detail`, and must accept unknown codes.
         *
         *     | Code | Status | Cause |
         *     |---|---|---|
         *     | `invalid_request` | 400 | Body or parameter not valid. |
         *     | `unauthenticated` | 401 | Token missing or not valid. |
         *     | `forbidden` | 403 | Role does not allow the call. |
         *     | `not_found` | 404 | Unknown org or no membership. |
         *     | `slug_taken` | 409 | Another org has the slug. |
         */
        Problem: {
            /**
             * Format: uri
             * @description `https://schemas.synthwerk.dev/problems/<code>`.
             */
            type: string;
            /** @description Short summary of the problem type. Same for every instance. */
            title: string;
            status: number;
            /** @description Stable machine code, for example `not_found`. */
            code: string;
            /** @description Explanation for this instance. No secrets, no personal data. */
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
                 *       "detail": "slug must match ^[a-z][a-z0-9-]*$."
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
        /** @description The caller's role does not allow the call. Code `forbidden`. The body is generic. */
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
        /** @description Unknown org, or an org the caller does not belong to. Same body in both cases. Code `not_found`. */
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
        /** @description The slug is taken. Code `slug_taken`. */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/slug_taken",
                 *       "title": "Slug taken",
                 *       "status": 409,
                 *       "code": "slug_taken"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        /** @description Org id. */
        OrgId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    "identity.getMe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The caller. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "subject": "283746192837461928",
                     *       "org": {
                     *         "id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *         "name": "Synthwerk",
                     *         "slug": "synthwerk",
                     *         "created_at": "2026-10-23T08:00:00Z"
                     *       },
                     *       "roles": [
                     *         "owner",
                     *         "operator"
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Me"];
                };
            };
            401: components["responses"]["Unauthenticated"];
        };
    };
    "identity.listOrgs": {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description The `next_cursor` of the previous page. */
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of orgs. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *           "name": "Synthwerk",
                     *           "slug": "synthwerk",
                     *           "created_at": "2026-10-23T08:00:00Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["OrgPage"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
        };
    };
    "identity.createOrg": {
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
                 *       "name": "Acme Labs",
                 *       "slug": "acme-labs"
                 *     }
                 */
                "application/json": components["schemas"]["CreateOrgRequest"];
            };
        };
        responses: {
            /** @description Org created. */
            201: {
                headers: {
                    /** @description Path of the new org. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "0199f3a1-2c3d-7e4f-8a5b-6c7d8e9f0a1b",
                     *       "name": "Acme Labs",
                     *       "slug": "acme-labs",
                     *       "created_at": "2026-10-23T08:30:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Org"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
        };
    };
    "identity.getOrg": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The org. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "name": "Synthwerk",
                     *       "slug": "synthwerk",
                     *       "created_at": "2026-10-23T08:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Org"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
        };
    };
}
