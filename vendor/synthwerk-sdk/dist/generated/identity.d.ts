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
        /**
         * Delete the own account
         * @description Deletes the caller's account (synthwerk#41). Emits `dev.synthwerk.identity.user.deleted.v1`; the other services delete the user's rows when they get it.
         *     - Needs a recent sign-in with MFA, else 403 `recent_mfa_required`: sign in again, then retry. The access token must have `amr` `mfa`. The proof of the recent sign-in is the header `X-Synthwerk-Id-Token`, see below. Zitadel access tokens carry no `sid` and no `auth_time`, so a delete without this header always gets 403.
         *     - `X-Synthwerk-Id-Token`: an ID token of the same sign-in flow, from an OIDC client that identity accepts (the studio). Identity checks its signature, `iss`, `aud` (an accepted client id), `exp`, the same `sub` as the access token, and `auth_time` at most 15 minutes old (identity setting). The sign-in must have MFA: the ID token has `amr` `mfa`, or the user's newest gated sign-in is of the same session (`sid`) and at most 15 minutes old. Get a fresh ID token with `prompt=login` and `max_age`. The client keeps the ID token server side and sends it to identity only.
         *     - Last owner rule: an org with other members must keep an owner. When the caller is its only owner, the answer is 409 `last_owner` and nothing changes. Make another member `owner` first.
         *     - An org where the caller is the only member closes with the account. Identity deletes it with its apps and entitlements. `deleted_org_ids` lists these orgs.
         *     - Identity deletes its own rows of the user in one transaction with the event. The Zitadel user is removed after the answer, with retries. A token issued before stays valid until it expires.
         *     - An `operator` gets 403 `forbidden`: platform users are never removed through this route.
         *     - A repeat while the old token is still valid answers 202 again, with the first `requested_at` and an empty `deleted_org_ids`. It changes nothing.
         */
        delete: operations["identity.deleteMe"];
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
         * @description All data Synthwerk keeps about the caller, as one JSON document (synthwerk#41, GDPR Art. 15 and 20).
         *     - `identity`: the memberships in every org and the newest MFA evidence.
         *     - `services`: identity asks every service that keeps user rows (today: llm) with the caller's token and puts each answer here unchanged. A service that does not answer has `status` `unavailable`, and `complete` is false. Retry later for a full export.
         *     - Profile data (email, name, passkeys) lives in Zitadel. The user reads it in the Zitadel account console.
         *     - Any signed-in user may call it. Operators too: it shows only the caller's own data.
         */
        get: operations["identity.exportMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/entitlements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the entitlements of the caller's org
         * @description The plan and the limits of the org the token acts in. Any org role may read it. The stored membership must be active.
         *     - A service that acts for a user (for example llm for quotas) forwards the caller's token. It needs no org id of its own.
         *     - An unknown org, a token without an org role, or a deactivated or invited member answers 404.
         */
        get: operations["identity.getMyEntitlements"];
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
         * @description Org detail. Needs an active membership in the org, or the role `operator`. A deactivated or invited member gets 404, same as an unknown org.
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
    "/v1/orgs/{orgId}/entitlements": {
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
         * Get the entitlements of an org
         * @description The plan and the limits of the org. Needs an org role in the org (any role) and an active membership, or the role `operator`. A deactivated or invited member gets 404.
         */
        get: operations["identity.getOrgEntitlements"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/members": {
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
         * List members
         * @description Members of the org, their org roles and their status. Deactivated members are listed too. An invitee is listed after the first sign-in to the org; pending invitations are in `listInvitations`. Needs the role `owner` or `admin` in the org, or `operator`. The stored membership must also be an active `owner` or `admin`, so a token issued before a demotion or a deactivation gets 403. Cursor paging, max 100 per page.
         */
        get: operations["identity.listMembers"];
        put?: never;
        /**
         * Invite a member
         * @description Creates a pending invitation. Emits `dev.synthwerk.identity.member.invited.v1` with the invitation id.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` gets 403. An `operator` gets 403: operator access is read only.
         *     - Only an `owner` invites an `owner`.
         *     - A new email: identity also creates the Zitadel user and its user grant, and Zitadel sends the invite mail (Mailpit in local, Resend in dev and prd).
         *     - An email of a user of another org: adding users of another org is not supported yet. The invitation stays pending and is never accepted.
         *     - Both cases look the same: the same 202 answer, the same pending item in `listInvitations`, the same audit event, and no item in `listMembers`. The API does not show which emails have an account.
         *     - The invitee shows in `listMembers` after the first sign-in to the org. Then the invitation is no longer pending.
         *     - The email has a pending invitation in the org already: 202 with that invitation, unchanged. Zitadel is not called again and no event is written. To change its role, revoke it and invite again.
         *     - The email is an active or deactivated member of this org: 409 `member_exists`.
         *     - Rate limit per caller and per org: 429 `rate_limited` with `Retry-After`.
         */
        post: operations["identity.inviteMember"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/members/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Change the role of a member
         * @description Sets the org role of a member. Emits `dev.synthwerk.identity.member.role_changed.v1` when the role changes.
         *     - `owner` and `admin` may set `admin` or `member` on a member that is not an owner.
         *     - Only an `owner` grants `owner` or changes the role of an owner.
         *     - A `member` gets 403. An `operator` gets 403: operator access is read only.
         *     - The last owner keeps the role (409 `last_owner`). Nobody changes their own role (409 `own_role`).
         *     - The same role again answers 200 and emits nothing.
         */
        patch: operations["identity.changeMemberRole"];
        trace?: never;
    };
    "/v1/orgs/{orgId}/members/{userId}:deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Deactivate a member
         * @description Deactivates the Zitadel user grant of the member. The member keeps the row and the role, but the next token has no org role in this org. Emits `dev.synthwerk.identity.member.deactivated.v1`.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` or an `operator` gets 403.
         *     - Only an `owner` deactivates an `owner`. The last active owner stays active (409 `last_owner`).
         *     - Nobody deactivates their own membership (409 `own_membership`).
         *     - A token issued before the change keeps working at other services until it expires. Identity checks the stored status at once.
         *     - A member that is deactivated already answers 200 and emits nothing.
         */
        post: operations["identity.deactivateMember"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/members/{userId}:reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reactivate a member
         * @description Reactivates the Zitadel user grant of a deactivated member, with the role it had. Emits `dev.synthwerk.identity.member.reactivated.v1`.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` or an `operator` gets 403.
         *     - Only an `owner` reactivates an `owner`.
         *     - A member that is active already answers 200 and emits nothing.
         */
        post: operations["identity.reactivateMember"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/invitations": {
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
         * List pending invitations
         * @description Pending invitations of the org, newest first. An invitation stops being pending when the invitee signs in to the org or an admin revokes it.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must be an active `owner` or `admin`. A `member` or an `operator` gets 403.
         *     - It holds the email the admin typed. It never says whether the email has an account.
         *     - Cursor paging, max 100 per page.
         */
        get: operations["identity.listInvitations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/invitations/{invitationId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Id of the invitation. */
                invitationId: components["parameters"]["InvitationId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revoke a pending invitation
         * @description Revokes a pending invitation. Emits `dev.synthwerk.identity.member.invite_revoked.v1` with the invitation id.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must be an active `owner` or `admin`. A `member` or an `operator` gets 403.
         *     - Only an `owner` revokes an invitation for the role `owner`.
         *     - When identity created a Zitadel user for the invitation, identity deletes that user. The invitee cannot sign in to the org.
         *     - The invitee does not become a member later: a revoked invitation is never accepted.
         *     - An invitation that is not pending (accepted, revoked or unknown): 404.
         */
        delete: operations["identity.revokeInvitation"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/audit-events": {
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
         * List the audit events of an org
         * @description The admin actions of the org, newest first. Each item is an event identity wrote to its outbox for the org, kept after the outbox row is gone, or an AI settings change of llm that identity received from `EVT_LLM` (synthwerk#39).
         *     - Needs the role `owner` or `admin` in the org. The stored membership must be an active `owner` or `admin`. A `member` gets 403. An `operator` gets 403.
         *     - Event types: `org.created`, `member.invited`, `member.role_changed`, `member.deactivated`, `member.reactivated`, `app.created`, `org.entitlements_changed`, `dev.synthwerk.llm.ai_settings.changed.v1`, and later org events. Clients must accept types they do not know.
         *     - `data` is the event data, as its schema in `events/identity` or `events/llm` says. No email, no personal name, no system prompt text.
         *     - An llm event shows a few seconds after the change: identity reads it from the bus.
         *     - Cursor paging, max 100 per page.
         */
        get: operations["identity.listAuditEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/apps": {
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
         * List apps
         * @description Apps of the org, oldest first. Needs an active membership in the org, or the role `operator`. A deactivated or invited member gets 404. Cursor paging, max 100 per page.
         */
        get: operations["identity.listApps"];
        put?: never;
        /**
         * Create an app
         * @description Creates an app with its origin allow-list. Emits `dev.synthwerk.identity.app.created.v1`.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` gets 403. An `operator` gets 403: operator access is read only.
         *     - Each origin is `scheme://host[:port]`, nothing more. The rules are in `AppOrigin`.
         *     - The org may have `apps_per_org` apps (entitlements, `0` = no limit). One more gets 403 `app_limit_reached`.
         *     - A new app gets the default widget settings (`WidgetSettings`).
         */
        post: operations["identity.createApp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/orgs/{orgId}/apps/{appId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        /**
         * Get an app
         * @description One app with its origin allow-list. Needs an active membership in the org, or the role `operator`. A deactivated or invited member gets 404.
         */
        get: operations["identity.getApp"];
        put?: never;
        post?: never;
        /**
         * Delete an app
         * @description Deletes the app. Its widgets get no new token.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` or an `operator` gets 403.
         *     - A widget token issued before the delete stays valid until it expires (15 minutes or less).
         *     - Emits no event yet.
         */
        delete: operations["identity.deleteApp"];
        options?: never;
        head?: never;
        /**
         * Update an app
         * @description Sets the name, the origin allow-list or the widget settings of an app. A new list replaces the old list. New widget settings replace the old settings as a whole.
         *     - Needs the role `owner` or `admin` in the org. The stored membership must agree. A `member` or an `operator` gets 403.
         *     - A widget token issued before the change stays valid until it expires (15 minutes or less).
         *     - Emits no event yet.
         */
        patch: operations["identity.updateApp"];
        trace?: never;
    };
    "/v1/apps/{appId}/widget-settings": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        /**
         * Get the widget settings
         * @description The widget settings of an app, for the widget on the page. No token: a signed-out visitor gets them too, and the widget makes no AI call for them.
         *     - The `Origin` header must equal one entry of the allow-list of the app. Else 403 `origin_not_allowed`.
         *     - Only an allowed origin gets `Access-Control-Allow-Origin`.
         *     - The answer holds the settings only: no origins, no org, no name.
         *     - `Cache-Control: no-cache`: a change in the studio shows on the next page load.
         *     - Every answer of this route, the CORS preflight included, sends `Vary: Origin`: a shared cache never serves the answer of one origin to another. A refusal sends `Cache-Control: no-store`.
         */
        get: operations["identity.getWidgetSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/apps/{appId}/widget-tokens": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Issue a widget token
         * @description Issues a short-lived widget token for the signed-in caller, bound to the app and to the request origin.
         *     - The Bearer token is the Zitadel access token of the signed-in user. A widget token never gets a new widget token.
         *     - The caller must be an active member of the app's org (token and stored membership). A deactivated or invited member gets 404, same as an unknown app.
         *     - The `Origin` header must equal one entry of the allow-list: same scheme, host and port. No prefix, suffix or wildcard match. Else 403 `origin_not_allowed`.
         *     - The token is a JWT (`typ` `at+jwt`, `alg` `ES256`), signed by identity. It lives 15 minutes or less (`expires_in`).
         *     - Claims: `iss` (identity), `aud`, `sub` (the user), `urn:zitadel:iam:user:resourceowner:id` (the Zitadel org), `client_id` (the app id), `synthwerk:origin` (the canonical origin), `iat`, `nbf`, `exp`, `jti`. No roles: a widget token is never an admin token.
         *     - Verify it with the key set at `/.well-known/jwks.json` of identity (RFC 7517). A service that accepts it must also compare `synthwerk:origin` with the `Origin` header.
         *     - Browsers send a CORS preflight first. Identity answers it with the CORS headers only for an allowed origin.
         *     - Every answer of this route, the CORS preflight included, sends `Vary: Origin` and `Cache-Control: no-store`.
         */
        post: operations["identity.createWidgetToken"];
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
        /** @description The plan of an org and the limits it gives. Identity owns them. */
        Entitlements: {
            /** Format: uuid */
            org_id: string;
            /**
             * @description Plan name. `free` today; paid plans come in M5.
             *     Clients must accept plan names they do not know and read `limits`, never the name.
             */
            plan: string;
            limits: components["schemas"]["EntitlementLimits"];
            /**
             * Format: int64
             * @description Goes up by one on every change. A consumer drops an event with a version lower than the one it holds.
             */
            version: number;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description Limits of the plan. `0` means no limit. A day is a UTC day.
         *     The schema is closed. A new limit comes with a new spec minor version and regenerated clients.
         */
        EntitlementLimits: {
            /**
             * Format: int64
             * @description LLM tokens one user may use in this org per UTC day.
             */
            llm_tokens_per_user_per_day: number;
            /**
             * Format: int64
             * @description LLM tokens all users of the org may use together per UTC day.
             */
            llm_tokens_per_org_per_day: number;
            /**
             * Format: int32
             * @description Apps the org may have.
             */
            apps_per_org: number;
        };
        /**
         * @description An org role. `operator` is never an org role.
         * @enum {string}
         */
        OrgRole: "owner" | "admin" | "member";
        /**
         * @description - `active`: the Zitadel user grant is active. Tokens carry the org role.
         *     - `deactivated`: the grant is deactivated. The member keeps the row and the role, but tokens carry no org role.
         * @enum {string}
         */
        MemberStatus: "active" | "deactivated";
        Member: {
            /** @description Subject id (token `sub`). Never an email. */
            user_id: string;
            role: components["schemas"]["OrgRole"];
            status: components["schemas"]["MemberStatus"];
            /** Format: date-time */
            updated_at: string;
        };
        MemberPage: {
            items: components["schemas"]["Member"][];
            /** @description Cursor of the next page. Absent on the last page. */
            next_cursor?: string;
        };
        InviteMemberRequest: {
            /**
             * Format: email
             * @description Where Zitadel sends the invite mail. Identity passes it to Zitadel and stores it nowhere.
             */
            email: string;
            role: components["schemas"]["OrgRole"];
        };
        /** @description A pending invitation. It never says whether the email has an account. */
        Invitation: {
            /** Format: uuid */
            id: string;
            /**
             * Format: email
             * @description The email the admin typed. Only owners and admins of the org see it.
             */
            email: string;
            role: components["schemas"]["OrgRole"];
            /** @description Subject id of the owner or admin who invited. */
            invited_by: string;
            /** Format: date-time */
            created_at: string;
        };
        InvitationPage: {
            items: components["schemas"]["Invitation"][];
            /** @description Cursor of the next page. Absent on the last page. */
            next_cursor?: string;
        };
        /** @description One org event, as identity wrote it to its outbox or received it from llm (AI settings, synthwerk#39). */
        AuditEvent: {
            /**
             * Format: uuid
             * @description The CloudEvents id.
             */
            id: string;
            /** @description The CloudEvents type. Clients must accept types they do not know. */
            type: string;
            /** Format: date-time */
            time: string;
            /** @description Who did it. `user:<sub>`, `service:<name>` or `system` (a change from Zitadel). */
            actor: string;
            /** @description The CloudEvents subject, the id of the main entity. Absent when the event has none. */
            subject?: string;
            /** @description The event data. Its schema is the event schema in `events/identity` or `events/llm`. */
            data: {
                [key: string]: unknown;
            };
        };
        AuditEventPage: {
            items: components["schemas"]["AuditEvent"][];
            /** @description Cursor of the next page. Absent on the last page. */
            next_cursor?: string;
        };
        ChangeMemberRoleRequest: {
            role: components["schemas"]["OrgRole"];
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
         * @description A web origin: `scheme://host[:port]`. Identity stores and returns the canonical form.
         *     - Scheme `https`. Scheme `http` only for `localhost`, `127.0.0.1` and `[::1]`.
         *     - Host: a DNS name (ASCII; use punycode for other characters), an IPv4 address or a bracketed IPv6 address. Identity stores it in lower case.
         *     - Port: optional, 1 to 65535. The default port (443 for https, 80 for http) is removed.
         *     - No path (not even `/`), no query, no fragment, no user info, no wildcard. `null` is not an origin.
         *     - Match is exact on the canonical form: `https://shop.example` does not match `https://shop.example.evil.test`, `https://a.shop.example` or `http://shop.example`.
         */
        AppOrigin: string;
        App: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            org_id: string;
            /** @description Display name. */
            name: string;
            /** @description Origins that may get a widget token for this app. Canonical form. */
            allowed_origins: components["schemas"]["AppOrigin"][];
            widget_settings: components["schemas"]["WidgetSettings"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        AppPage: {
            items: components["schemas"]["App"][];
            /** @description Cursor of the next page. Absent on the last page. */
            next_cursor?: string;
        };
        CreateAppRequest: {
            name: string;
            /** @description Two entries with the same canonical form are refused (400). */
            allowed_origins: components["schemas"]["AppOrigin"][];
        };
        /** @description At least one field. A field that is absent keeps its value. */
        UpdateAppRequest: {
            name?: string;
            /** @description Replaces the whole list. Two entries with the same canonical form are refused (400). */
            allowed_origins?: components["schemas"]["AppOrigin"][];
            widget_settings?: components["schemas"]["WidgetSettings"];
        };
        /**
         * @description How the widget of an app looks (synthwerk#38). The studio sets them; the widget loads them (widgets#34).
         *     - An attribute on `<synthwerk-chat>` wins over the stored value.
         *     - Colours come only from `@synthwerk/tokens`: a theme and an accent group. No free CSS.
         *     - A new app gets the defaults: `bottom-right`, `default`, `system`, `auto`, `flagship`, empty greeting.
         */
        WidgetSettings: {
            /**
             * @description Corner of the launcher.
             * @enum {string}
             */
            position: "bottom-right" | "bottom-left";
            /**
             * @description Token theme (`data-theme`).
             * @enum {string}
             */
            theme: "default" | "contrast";
            /**
             * @description Colour mode. `system` follows the visitor's system setting.
             * @enum {string}
             */
            mode: "system" | "light" | "dark";
            /**
             * @description Widget language. `auto` uses the browser language, else `en`.
             * @enum {string}
             */
            lang: "auto" | "de" | "en";
            /**
             * @description Token accent group (`data-group`).
             * @enum {string}
             */
            accent: "flagship" | "lab" | "ops" | "venture";
            /** @description First message of the chat, plain text. Empty = the widget's own greeting. Never rendered as HTML. */
            greeting: string;
        };
        WidgetToken: {
            /** @description The widget token (JWT). Send it in the header `Authorization` as `Bearer <token>`, from the same origin. Never log it. */
            access_token: string;
            /** @enum {string} */
            token_type: "Bearer";
            /** @description Seconds until the token expires. Never more than 900 (15 minutes). */
            expires_in: number;
            /** Format: date-time */
            expires_at: string;
            /** Format: uuid */
            app_id: string;
            origin: components["schemas"]["AppOrigin"];
        };
        /** @description The answer to `DELETE /v1/me`. */
        AccountDeletion: {
            /** @description Subject id (token `sub`) of the deleted user. */
            user_id: string;
            /**
             * @description `accepted`: identity deleted its rows and published the fact. The Zitadel user is removed next, with retries.
             * @enum {string}
             */
            status: "accepted";
            /**
             * Format: date-time
             * @description When identity took the first delete request of this user.
             */
            requested_at: string;
            /** @description Orgs that closed with the account, because the caller was their only member. */
            deleted_org_ids: string[];
        };
        /** @description Everything Synthwerk keeps about one user. Machine-readable (GDPR Art. 20). */
        UserExport: {
            /**
             * @description Version of this document format. A new field keeps 1; a removed or renamed field gives 2.
             * @enum {integer}
             */
            format_version: 1;
            /** @description Token `sub` of the caller. */
            subject: string;
            /** Format: date-time */
            exported_at: string;
            /** @description False when at least one service in `services` has `status` `unavailable`. */
            complete: boolean;
            identity: components["schemas"]["IdentityExport"];
            /** @description One entry per service that keeps user rows. Order by `service`. */
            services: components["schemas"]["ServiceExport"][];
        };
        /** @description The rows identity keeps about the user. */
        IdentityExport: {
            /** @description Every org membership of the user, by org name. */
            memberships: components["schemas"]["ExportMembership"][];
            mfa_evidence?: components["schemas"]["ExportMfaEvidence"];
        };
        ExportMembership: {
            /** Format: uuid */
            org_id: string;
            org_name: string;
            org_slug: string;
            role: components["schemas"]["OrgRole"];
            /** Format: date-time */
            joined_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description The newest sign-in with MFA that the MFA gate stored. Absent when there is none. It holds no session token. */
        ExportMfaEvidence: {
            /** @description Zitadel session id. Not a credential. */
            session_id: string;
            amr: string[];
            /** Format: date-time */
            checked_at: string;
        };
        ServiceExport: {
            /** @description Service name, for example `llm`. */
            service: string;
            /**
             * @description `unavailable`: the service did not answer in time, or answered with an error. `data` is absent.
             * @enum {string}
             */
            status: "ok" | "unavailable";
            /** @description The service's own export, unchanged. Its schema is in the service's spec, for example `LlmExport` in `openapi/llm`. */
            data?: {
                [key: string]: unknown;
            };
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
         *     | `not_found` | 404 | Unknown org or member, or no membership. |
         *     | `slug_taken` | 409 | Another org has the slug. |
         *     | `last_owner` | 409 | The org would lose its last owner (role change or account delete). |
         *     | `own_role` | 409 | The caller tried to change their own role. |
         *     | `own_membership` | 409 | The caller tried to deactivate their own membership. |
         *     | `member_exists` | 409 | The email is an active or deactivated member of this org. |
         *     | `rate_limited` | 429 | Too many invites. Retry after `Retry-After` seconds. |
         *     | `origin_not_allowed` | 403 | The `Origin` header is not in the allow-list of the app. |
         *     | `app_limit_reached` | 403 | The org has `apps_per_org` apps already. |
         *     | `upstream_unavailable` | 502 | Zitadel did not take the change. Nothing changed. |
         *     | `upstream_unavailable` | 503 | The Zitadel setup is not finished (no project id yet). Nothing changed. Retry after `Retry-After` seconds. |
         *     | `recent_mfa_required` | 403 | Account delete without a sign-in with MFA in the last 15 minutes. |
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
        /** @description Unknown org or member, or an org the caller does not belong to. Same body in every case. Code `not_found`. */
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
        /**
         * @description The role change breaks an org rule.
         *     - `last_owner`: the org would lose its last owner.
         *     - `own_role`: the caller tried to change their own role.
         */
        RoleConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/last_owner",
                 *       "title": "Last owner",
                 *       "status": 409,
                 *       "code": "last_owner"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /**
         * @description The app was not created.
         *     - `forbidden`: the caller's role does not allow the call. The body is generic.
         *     - `app_limit_reached`: the org has `apps_per_org` apps already. Delete an app or change the plan.
         */
        CreateAppForbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/app_limit_reached",
                 *       "title": "App limit reached",
                 *       "status": 403,
                 *       "code": "app_limit_reached",
                 *       "detail": "The plan of this org allows 3 apps."
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /**
         * @description The member change breaks an org rule.
         *     - `member_exists`: the email is an active or deactivated member of this org.
         *     - `last_owner`: the org would lose its last active owner.
         *     - `own_membership`: the caller tried to deactivate their own membership.
         */
        MemberConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/member_exists",
                 *       "title": "Member exists",
                 *       "status": 409,
                 *       "code": "member_exists"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Too many invites from this caller or for this org. Code `rate_limited`. Retry after the seconds in `Retry-After`. */
        RateLimited: {
            headers: {
                /** @description Seconds until the next invite is allowed. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/rate_limited",
                 *       "title": "Rate limited",
                 *       "status": 429,
                 *       "code": "rate_limited"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The `Origin` header is missing, not valid, or not in the allow-list of the app. Code `origin_not_allowed`. The body never lists the allowed origins. */
        OriginNotAllowed: {
            headers: {
                /** @description Always `no-store`. */
                "Cache-Control"?: string;
                /** @description Always `Origin`. */
                Vary?: string;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/origin_not_allowed",
                 *       "title": "Origin not allowed",
                 *       "status": 403,
                 *       "code": "origin_not_allowed"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /**
         * @description - `recent_mfa_required`: the token has no `amr` `mfa`, the `X-Synthwerk-Id-Token` header is missing or fails a check, or the sign-in with MFA is older than 15 minutes. Sign in again with MFA, then retry.
         *     - `forbidden`: the caller is an `operator`. Platform users are not removed here.
         */
        RecentMFARequired: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/recent_mfa_required",
                 *       "title": "Recent MFA required",
                 *       "status": 403,
                 *       "code": "recent_mfa_required",
                 *       "detail": "Sign in again with MFA, then retry."
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The caller is the only owner of an org that has other members. Code `last_owner`. Nothing changed. Make another member `owner` first. */
        LastOwner: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/last_owner",
                 *       "title": "Last owner",
                 *       "status": 409,
                 *       "code": "last_owner",
                 *       "detail": "Make another member owner of org 0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60 first."
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Zitadel did not take the change. Nothing changed. Code `upstream_unavailable`. Retry later. */
        UpstreamUnavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/upstream_unavailable",
                 *       "title": "Upstream unavailable",
                 *       "status": 502,
                 *       "code": "upstream_unavailable"
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The Zitadel setup is not finished, so identity does not know the project id yet. Code `upstream_unavailable`. Nothing changed. Retry after the seconds in `Retry-After`. */
        ZitadelNotReady: {
            headers: {
                /** @description Seconds until the next try. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://schemas.synthwerk.dev/problems/upstream_unavailable",
                 *       "title": "Upstream unavailable",
                 *       "status": 503,
                 *       "code": "upstream_unavailable",
                 *       "detail": "The Zitadel setup is not finished. Retry later."
                 *     }
                 */
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        /** @description Org id. */
        OrgId: string;
        /** @description Subject id (token `sub`) of the member. */
        UserId: string;
        /** @description Id of the invitation. */
        InvitationId: string;
        /** @description App id. */
        AppId: string;
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
    "identity.deleteMe": {
        parameters: {
            query?: never;
            header?: {
                /** @description A fresh OIDC ID token of the caller (compact JWS). The proof of a recent sign-in with MFA. Without it, or when it fails a check, the answer is 403 `recent_mfa_required`. */
                "X-Synthwerk-Id-Token"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The account is deleted in identity. The Zitadel user is removed next. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "user_id": "396370217707541255",
                     *       "status": "accepted",
                     *       "requested_at": "2026-10-30T10:00:00Z",
                     *       "deleted_org_ids": [
                     *         "019a3c20-1a2b-7c3d-8e4f-5a6b7c8d9e0f"
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["AccountDeletion"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["RecentMFARequired"];
            409: components["responses"]["LastOwner"];
        };
    };
    "identity.exportMe": {
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
                    /** @description `attachment; filename="synthwerk-export.json"`. */
                    "Content-Disposition"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "format_version": 1,
                     *       "subject": "396370217707541255",
                     *       "exported_at": "2026-10-30T10:00:00Z",
                     *       "complete": true,
                     *       "identity": {
                     *         "memberships": [
                     *           {
                     *             "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *             "org_name": "Synthwerk",
                     *             "org_slug": "synthwerk",
                     *             "role": "member",
                     *             "joined_at": "2026-10-23T08:30:00Z",
                     *             "updated_at": "2026-10-28T09:00:00Z"
                     *           }
                     *         ],
                     *         "mfa_evidence": {
                     *           "session_id": "396370299912345678",
                     *           "amr": [
                     *             "pwd",
                     *             "otp",
                     *             "mfa"
                     *           ],
                     *           "checked_at": "2026-10-30T09:55:00Z"
                     *         }
                     *       },
                     *       "services": [
                     *         {
                     *           "service": "llm",
                     *           "status": "ok",
                     *           "data": {
                     *             "conversations": [],
                     *             "quota_usage": []
                     *           }
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["UserExport"];
                };
            };
            401: components["responses"]["Unauthenticated"];
        };
    };
    "identity.getMyEntitlements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The entitlements of the caller's org. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "plan": "free",
                     *       "limits": {
                     *         "llm_tokens_per_user_per_day": 50000,
                     *         "llm_tokens_per_org_per_day": 500000,
                     *         "apps_per_org": 3
                     *       },
                     *       "version": 1,
                     *       "updated_at": "2026-10-29T08:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Entitlements"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
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
    "identity.getOrgEntitlements": {
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
            /** @description The entitlements of the org. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "plan": "free",
                     *       "limits": {
                     *         "llm_tokens_per_user_per_day": 50000,
                     *         "llm_tokens_per_org_per_day": 500000,
                     *         "apps_per_org": 3
                     *       },
                     *       "version": 1,
                     *       "updated_at": "2026-10-29T08:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Entitlements"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.listMembers": {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description The `next_cursor` of the previous page. */
                cursor?: string;
            };
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of members. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "user_id": "283746192837461928",
                     *           "role": "owner",
                     *           "status": "active",
                     *           "updated_at": "2026-10-23T08:30:00Z"
                     *         },
                     *         {
                     *           "user_id": "396370217707541255",
                     *           "role": "member",
                     *           "status": "deactivated",
                     *           "updated_at": "2026-10-28T09:00:00Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["MemberPage"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.inviteMember": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "email": "ada@example.com",
                 *       "role": "member"
                 *     }
                 */
                "application/json": components["schemas"]["InviteMemberRequest"];
            };
        };
        responses: {
            /** @description The pending invitation. The same answer for every email outside the org. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "019a3c1e-7a1b-7c2d-8e3f-4a5b6c7d8e9f",
                     *       "email": "ada@example.com",
                     *       "role": "member",
                     *       "invited_by": "283746192837461928",
                     *       "created_at": "2026-10-30T09:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Invitation"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["MemberConflict"];
            429: components["responses"]["RateLimited"];
            502: components["responses"]["UpstreamUnavailable"];
            503: components["responses"]["ZitadelNotReady"];
        };
    };
    "identity.changeMemberRole": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "role": "admin"
                 *     }
                 */
                "application/json": components["schemas"]["ChangeMemberRoleRequest"];
            };
        };
        responses: {
            /** @description The member with the new role. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "user_id": "396370217707541255",
                     *       "role": "admin",
                     *       "status": "active",
                     *       "updated_at": "2026-10-28T09:15:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Member"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["RoleConflict"];
            502: components["responses"]["UpstreamUnavailable"];
            503: components["responses"]["ZitadelNotReady"];
        };
    };
    "identity.deactivateMember": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The member with the new status. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "user_id": "396370217707541255",
                     *       "role": "member",
                     *       "status": "deactivated",
                     *       "updated_at": "2026-10-30T09:30:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Member"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["MemberConflict"];
            502: components["responses"]["UpstreamUnavailable"];
            503: components["responses"]["ZitadelNotReady"];
        };
    };
    "identity.reactivateMember": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Subject id (token `sub`) of the member. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The member with the new status. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "user_id": "396370217707541255",
                     *       "role": "member",
                     *       "status": "active",
                     *       "updated_at": "2026-10-30T09:30:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Member"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["MemberConflict"];
            502: components["responses"]["UpstreamUnavailable"];
            503: components["responses"]["ZitadelNotReady"];
        };
    };
    "identity.listInvitations": {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description The `next_cursor` of the previous page. */
                cursor?: string;
            };
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of pending invitations. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "id": "019a3c1e-7a1b-7c2d-8e3f-4a5b6c7d8e9f",
                     *           "email": "ada@example.com",
                     *           "role": "member",
                     *           "invited_by": "283746192837461928",
                     *           "created_at": "2026-10-30T09:00:00Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["InvitationPage"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.revokeInvitation": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description Id of the invitation. */
                invitationId: components["parameters"]["InvitationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Invitation revoked. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            502: components["responses"]["UpstreamUnavailable"];
            503: components["responses"]["ZitadelNotReady"];
        };
    };
    "identity.listAuditEvents": {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description The `next_cursor` of the previous page. */
                cursor?: string;
            };
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of audit events, newest first. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "id": "019a3c20-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
                     *           "type": "dev.synthwerk.identity.member.role_changed.v1",
                     *           "time": "2026-10-30T09:15:00Z",
                     *           "actor": "user:283746192837461928",
                     *           "subject": "396370217707541255",
                     *           "data": {
                     *             "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *             "user_sub": "396370217707541255",
                     *             "old_role": "member",
                     *             "new_role": "admin"
                     *           }
                     *         },
                     *         {
                     *           "id": "019a3c1f-0a1b-7c2d-8e3f-4a5b6c7d8e9f",
                     *           "type": "dev.synthwerk.identity.member.invited.v1",
                     *           "time": "2026-10-30T09:00:00Z",
                     *           "actor": "user:283746192837461928",
                     *           "subject": "019a3c1e-7a1b-7c2d-8e3f-4a5b6c7d8e9f",
                     *           "data": {
                     *             "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *             "invitation_id": "019a3c1e-7a1b-7c2d-8e3f-4a5b6c7d8e9f",
                     *             "role": "member"
                     *           }
                     *         }
                     *       ],
                     *       "next_cursor": "MTI"
                     *     }
                     */
                    "application/json": components["schemas"]["AuditEventPage"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.listApps": {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description The `next_cursor` of the previous page. */
                cursor?: string;
            };
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of apps. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "id": "019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b",
                     *           "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *           "name": "Shop website",
                     *           "allowed_origins": [
                     *             "https://shop.example",
                     *             "http://localhost:3000"
                     *           ],
                     *           "created_at": "2026-10-29T10:00:00Z",
                     *           "widget_settings": {
                     *             "position": "bottom-right",
                     *             "theme": "default",
                     *             "mode": "system",
                     *             "lang": "auto",
                     *             "accent": "flagship",
                     *             "greeting": ""
                     *           },
                     *           "updated_at": "2026-10-29T10:00:00Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["AppPage"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.createApp": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "name": "Shop website",
                 *       "allowed_origins": [
                 *         "https://shop.example",
                 *         "http://localhost:3000"
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["CreateAppRequest"];
            };
        };
        responses: {
            /** @description App created. */
            201: {
                headers: {
                    /** @description Path of the new app. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b",
                     *       "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "name": "Shop website",
                     *       "allowed_origins": [
                     *         "https://shop.example",
                     *         "http://localhost:3000"
                     *       ],
                     *       "created_at": "2026-10-29T10:00:00Z",
                     *       "widget_settings": {
                     *         "position": "bottom-right",
                     *         "theme": "default",
                     *         "mode": "system",
                     *         "lang": "auto",
                     *         "accent": "flagship",
                     *         "greeting": ""
                     *       },
                     *       "updated_at": "2026-10-29T10:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["App"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["CreateAppForbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.getApp": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The app. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b",
                     *       "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "name": "Shop website",
                     *       "allowed_origins": [
                     *         "https://shop.example",
                     *         "http://localhost:3000"
                     *       ],
                     *       "created_at": "2026-10-29T10:00:00Z",
                     *       "widget_settings": {
                     *         "position": "bottom-right",
                     *         "theme": "default",
                     *         "mode": "system",
                     *         "lang": "auto",
                     *         "accent": "flagship",
                     *         "greeting": ""
                     *       },
                     *       "updated_at": "2026-10-29T10:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["App"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.deleteApp": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description App deleted. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.updateApp": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Org id. */
                orgId: components["parameters"]["OrgId"];
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "allowed_origins": [
                 *         "https://shop.example",
                 *         "https://www.shop.example"
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["UpdateAppRequest"];
            };
        };
        responses: {
            /** @description The app after the change. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b",
                     *       "org_id": "0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60",
                     *       "name": "Shop website",
                     *       "allowed_origins": [
                     *         "https://shop.example",
                     *         "https://www.shop.example"
                     *       ],
                     *       "created_at": "2026-10-29T10:00:00Z",
                     *       "widget_settings": {
                     *         "position": "bottom-left",
                     *         "theme": "default",
                     *         "mode": "dark",
                     *         "lang": "de",
                     *         "accent": "lab",
                     *         "greeting": "Hallo! Wie kann ich helfen?"
                     *       },
                     *       "updated_at": "2026-10-29T11:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["App"];
                };
            };
            400: components["responses"]["InvalidRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.getWidgetSettings": {
        parameters: {
            query?: never;
            header: {
                /** @description The page origin. Browsers set it. Compared exactly with the allow-list after the default port is removed. */
                Origin: string;
            };
            path: {
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The widget settings. */
            200: {
                headers: {
                    /** @description Always `no-cache`. A cache must check again before it reuses the answer. */
                    "Cache-Control"?: string;
                    /** @description Always `Origin`. The CORS headers depend on the request origin. */
                    Vary?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "position": "bottom-left",
                     *       "theme": "default",
                     *       "mode": "dark",
                     *       "lang": "de",
                     *       "accent": "lab",
                     *       "greeting": "Hallo! Wie kann ich helfen?"
                     *     }
                     */
                    "application/json": components["schemas"]["WidgetSettings"];
                };
            };
            403: components["responses"]["OriginNotAllowed"];
            404: components["responses"]["NotFound"];
        };
    };
    "identity.createWidgetToken": {
        parameters: {
            query?: never;
            header: {
                /** @description The page origin. Browsers set it. Compared exactly with the allow-list after the default port is removed. */
                Origin: string;
            };
            path: {
                /** @description App id. */
                appId: components["parameters"]["AppId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Widget token issued. */
            201: {
                headers: {
                    /** @description Always `no-store`. */
                    "Cache-Control"?: string;
                    /** @description Always `Origin`. The CORS headers depend on the request origin. */
                    Vary?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6IjNxV2lxIiwidHlwIjoiYXQrand0In0.e30.c2lnbmF0dXJl",
                     *       "token_type": "Bearer",
                     *       "expires_in": 600,
                     *       "expires_at": "2026-10-29T10:10:00Z",
                     *       "app_id": "019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b",
                     *       "origin": "https://shop.example"
                     *     }
                     */
                    "application/json": components["schemas"]["WidgetToken"];
                };
            };
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["OriginNotAllowed"];
            404: components["responses"]["NotFound"];
        };
    };
}
