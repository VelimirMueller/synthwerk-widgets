export interface paths {
    "/v1/classifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Classify an image
         * @description Classifies the image. Vision does not store it.
         *     - Answers the top-k labels, each with its topic path (for example animal, mammal, dog, beagle), and the topic scores. A topic score is the sum of the label probabilities below it.
         *     - The label set and the corrections are those of the widget token's org (synthwerk#44).
         *     - `correction` is a stored correction for this picture (resized or re-encoded copies match), else null. Prefer it over `primary`.
         */
        post: operations["vision.createClassification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Store an image for the org of the widget token
         * @description Stores the image under an id that vision generates.
         *     - Each org has a byte quota and a file quota, and all orgs share a total byte quota. A full quota gives 507 and vision stores nothing.
         *     - Nothing deletes old uploads yet.
         */
        post: operations["vision.createImage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        /**
         * Get the label set of an org
         * @description The default set while the org has no own set (`custom` false). `labels` lists the labels added on top of the packaged taxonomy; `topics` lists every topic a new label can go under.
         */
        get: operations["vision.getLabelSet"];
        put?: never;
        /**
         * Add a label to the label set of an org
         * @description Adds a text label. The model embeds the text; it does not retrain.
         *     - The first change of an org copies the default set into the org.
         *     - A text no worker embedded yet loads the text tower: the answer can take about 30 s.
         *     - `new_topic` true creates `topic` under `topic_parent` (null = a root topic).
         *     - The id is `runtime:` and a slug of the name.
         */
        post: operations["vision.createLabel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/labels/{labelId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
                /** @description Id of an added label, `runtime:<slug>`. */
                labelId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Remove an added label from the label set of an org
         * @description Packaged labels stay (409). The first change of an org copies the default set into the org.
         */
        delete: operations["vision.deleteLabel"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Store the correct label of a picture for an org
         * @description Later classifications of the same picture (also resized or re-encoded) by this org get `correction`. Other orgs never see it.
         *     - The label must be in the org's label set (409 otherwise).
         *     - An org gets its own correction first, else a default correction from the operator route `POST /v1/feedback`.
         */
        post: operations["vision.createFeedback"];
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
        ImageUpload: {
            /**
             * Format: binary
             * @description JPEG, PNG or WebP. The vision upload limit applies (default 5 MiB).
             */
            image: Blob;
        };
        Image: {
            /** @description The id vision generated for the stored image (32 hex characters today). */
            id: string;
            /** @description `image/jpeg`, `image/png` or `image/webp`. */
            content_type: string;
            size_bytes: number;
            width: number;
            height: number;
        };
        /** @description The classified image. Vision does not store it. */
        ImageInfo: {
            /** @description SHA-256 of the image bytes, hex. */
            sha256: string;
            content_type: string;
            size_bytes: number;
            width: number;
            height: number;
        };
        ModelInfo: {
            name: string;
            taxonomy_version: number;
        };
        ScoredLabel: {
            /** @description Stable label id. A WordNet synset id for ImageNet labels. */
            id: string;
            label: string;
            /**
             * Format: double
             * @description The probability of this exact label.
             */
            score: number;
            /** @description The most specific topic of the label. */
            topic: string;
            /** @description Root topic, …, topic, label. */
            path: string[];
        };
        ScoredTopic: {
            id: string;
            parent: string | null;
            /** @description 0 for a root topic such as `animal` or `vehicle`. */
            depth: number;
            /**
             * Format: double
             * @description The sum of the probabilities of all labels below the topic.
             */
            score: number;
        };
        /** @description A stored correction for this picture. */
        Correction: {
            feedback_id: number;
            label: components["schemas"]["ScoredLabel"];
            /** @description dHash bits between this picture and the corrected one. */
            distance: number;
        };
        Classification: {
            /** @description The same value as the `X-Request-ID` header. */
            request_id: string;
            image: components["schemas"]["ImageInfo"];
            model: components["schemas"]["ModelInfo"];
            primary: components["schemas"]["ScoredLabel"];
            topic: components["schemas"]["ScoredTopic"];
            /** @description The top-k labels, best first. */
            labels: components["schemas"]["ScoredLabel"][];
            /** @description The topics at or above the minimum score, best first. */
            topics: components["schemas"]["ScoredTopic"][];
            /** @description True when the root topic score is below the threshold. */
            uncertain: boolean;
            /** @description A stored correction for this picture, or null. Prefer it over `primary`. The model scores stay as they are. */
            correction?: components["schemas"]["Correction"] | null;
            /** @description Milliseconds per step, for example `inference`, `rollup` and `total`. */
            timings_ms: {
                [key: string]: number;
            };
        };
        LabelSet: {
            org_id: string;
            /** @description True when the org has its own set. False, the org uses the default set. */
            custom: boolean;
            /** @description Labels added on top of the packaged taxonomy. */
            labels: components["schemas"]["Label"][];
            /** @description Every topic of the set. */
            topics: components["schemas"]["Topic"][];
            /** @description All labels the model scores for the org, packaged and added. */
            total_labels: number;
        };
        Label: {
            id: string;
            name: string;
            topic: string;
            /** @description The text the model embeds instead of the name. */
            prompt?: string | null;
            /** @description Root topic, …, topic, label name. */
            path: string[];
        };
        Topic: {
            id: string;
            parent: string | null;
            /** @description 0 for a root topic. */
            depth: number;
        };
        CreateLabelRequest: {
            /** @description The label as responses show it. */
            name: string;
            /** @description An existing topic, or the new topic when `new_topic` is true. */
            topic: string;
            /** @description The text to embed instead of the name. */
            prompt?: string | null;
            /** @default false */
            new_topic: boolean;
            /** @description Parent of the new topic. Null makes a root topic. */
            topic_parent?: string | null;
        };
        CreateFeedbackRequest: {
            /**
             * Format: binary
             * @description JPEG, PNG or WebP. The vision upload limit applies (default 5 MiB).
             */
            image: Blob;
            /** @description The correct label id. Must be in the org's label set. */
            label_id: string;
        };
        Feedback: {
            id: number;
            label_id: string;
            /** @description The 64-bit difference hash of the picture, hex. */
            dhash: string;
        };
        /** @description FastAPI error body. `detail` is text for people, or the list of validation errors on 422. */
        Error: {
            detail: string | Record<string, never>[];
        };
    };
    responses: {
        /** @description No widget token, a token that is not valid, or not a widget token. The body never names the reason. */
        NoWidgetToken: {
            headers: {
                /** @description `Bearer` without a token, `Bearer error="invalid_token"` with a refused token. */
                "WWW-Authenticate"?: string;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "a valid widget token is required"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The token is valid, but the `Origin` header is missing, different from the token origin, or sent twice. */
        WrongOrigin: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "origin does not match the widget token"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The upload quota of the org, or the total quota, is full. Vision stored nothing. */
        StorageFull: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "upload storage quota reached"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description No or wrong admin token. */
        Unauthenticated: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "invalid token"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Vision has no admin token (the route does not exist), or the label is not in the org set. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "Not Found"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The label clashes, the topic is unknown, the label is packaged, or the model has a fixed label set. */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "label 'runtime:rice-paddy' already exists"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The org id or the body is not valid, for example no `image` field. */
        Invalid: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": [
                 *         {
                 *           "type": "string_pattern_mismatch",
                 *           "loc": [
                 *             "path",
                 *             "org_id"
                 *           ],
                 *           "msg": "String should match pattern '^[A-Za-z0-9_-]{1,64}$'"
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The image is larger than the upload limit. */
        TooLarge: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "upload exceeds 5242880 bytes"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The file is not a JPEG, PNG or WebP image. */
        UnsupportedImage: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "unsupported image format: GIF"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The model is not loaded, the token keys cannot be loaded, the upload storage does not answer, or the feedback store is not available. */
        Unavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "detail": "classification model not loaded"
                 *     }
                 */
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
        OrgId: string;
    };
    requestBodies: never;
    headers: {
        /** @description The request id. A caller value of 1 to 64 characters `[A-Za-z0-9_.-]` is kept, else vision generates one. Every answer has it, errors included. */
        RequestId: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    "vision.createClassification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ImageUpload"];
            };
        };
        responses: {
            /** @description The classification. */
            200: {
                headers: {
                    "X-Request-ID": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "request_id": "da71efe1c2b94f0e8a7d3b6c5e4f2a10",
                     *       "image": {
                     *         "sha256": "99645f6c6ed4a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a",
                     *         "content_type": "image/jpeg",
                     *         "size_bytes": 149115,
                     *         "width": 960,
                     *         "height": 480
                     *       },
                     *       "model": {
                     *         "name": "siglip2-base-patch16-224",
                     *         "taxonomy_version": 1
                     *       },
                     *       "primary": {
                     *         "id": "open:hut",
                     *         "label": "hut",
                     *         "score": 0.3229,
                     *         "topic": "building",
                     *         "path": [
                     *           "building and structure",
                     *           "building",
                     *           "hut"
                     *         ]
                     *       },
                     *       "topic": {
                     *         "id": "building and structure",
                     *         "parent": null,
                     *         "depth": 0,
                     *         "score": 0.815
                     *       },
                     *       "labels": [
                     *         {
                     *           "id": "open:hut",
                     *           "label": "hut",
                     *           "score": 0.3229,
                     *           "topic": "building",
                     *           "path": [
                     *             "building and structure",
                     *             "building",
                     *             "hut"
                     *           ]
                     *         },
                     *         {
                     *           "id": "n02859443",
                     *           "label": "boathouse",
                     *           "score": 0.1376,
                     *           "topic": "building",
                     *           "path": [
                     *             "building and structure",
                     *             "building",
                     *             "boathouse"
                     *           ]
                     *         }
                     *       ],
                     *       "topics": [
                     *         {
                     *           "id": "building and structure",
                     *           "parent": null,
                     *           "depth": 0,
                     *           "score": 0.815
                     *         },
                     *         {
                     *           "id": "building",
                     *           "parent": "building and structure",
                     *           "depth": 1,
                     *           "score": 0.7964
                     *         }
                     *       ],
                     *       "uncertain": false,
                     *       "correction": null,
                     *       "timings_ms": {
                     *         "inference": 31.45,
                     *         "rollup": 0.14,
                     *         "total": 35.72
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Classification"];
                };
            };
            401: components["responses"]["NoWidgetToken"];
            403: components["responses"]["WrongOrigin"];
            413: components["responses"]["TooLarge"];
            415: components["responses"]["UnsupportedImage"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
        };
    };
    "vision.createImage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ImageUpload"];
            };
        };
        responses: {
            /** @description The image is stored. */
            201: {
                headers: {
                    "X-Request-ID": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "3f2b8c1e9d4a4b7e8f60a1b2c3d4e5f6",
                     *       "content_type": "image/jpeg",
                     *       "size_bytes": 149115,
                     *       "width": 960,
                     *       "height": 480
                     *     }
                     */
                    "application/json": components["schemas"]["Image"];
                };
            };
            401: components["responses"]["NoWidgetToken"];
            403: components["responses"]["WrongOrigin"];
            413: components["responses"]["TooLarge"];
            415: components["responses"]["UnsupportedImage"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
            507: components["responses"]["StorageFull"];
        };
    };
    "vision.getLabelSet": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The label set. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "org_id": "283746192837461928",
                     *       "custom": true,
                     *       "labels": [
                     *         {
                     *           "id": "runtime:rice-paddy",
                     *           "name": "rice paddy",
                     *           "topic": "landscape",
                     *           "prompt": "a green rice paddy field",
                     *           "path": [
                     *             "landscape",
                     *             "rice paddy"
                     *           ]
                     *         }
                     *       ],
                     *       "topics": [
                     *         {
                     *           "id": "animal",
                     *           "parent": null,
                     *           "depth": 0
                     *         },
                     *         {
                     *           "id": "landscape",
                     *           "parent": null,
                     *           "depth": 0
                     *         }
                     *       ],
                     *       "total_labels": 1069
                     *     }
                     */
                    "application/json": components["schemas"]["LabelSet"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
        };
    };
    "vision.createLabel": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "name": "rice paddy",
                 *       "topic": "landscape",
                 *       "prompt": "a green rice paddy field"
                 *     }
                 */
                "application/json": components["schemas"]["CreateLabelRequest"];
            };
        };
        responses: {
            /** @description The label is in the set and scored from now on. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "runtime:rice-paddy",
                     *       "name": "rice paddy",
                     *       "topic": "landscape",
                     *       "prompt": "a green rice paddy field",
                     *       "path": [
                     *         "landscape",
                     *         "rice paddy"
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Label"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
        };
    };
    "vision.deleteLabel": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
                /** @description Id of an added label, `runtime:<slug>`. */
                labelId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The label is gone from the org set. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
        };
    };
    "vision.createFeedback": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Zitadel org id, the same value as the `urn:zitadel:iam:user:resourceowner:id` claim of the widget token. Not the identity org UUID. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["CreateFeedbackRequest"];
            };
        };
        responses: {
            /** @description The correction is stored. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": 42,
                     *       "label_id": "runtime:rice-paddy",
                     *       "dhash": "0f1e2d3c4b5a6978"
                     *     }
                     */
                    "application/json": components["schemas"]["Feedback"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            413: components["responses"]["TooLarge"];
            415: components["responses"]["UnsupportedImage"];
            422: components["responses"]["Invalid"];
            503: components["responses"]["Unavailable"];
        };
    };
}
