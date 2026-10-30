---
title: Embeddable chat widget
slug: chat-widget
status: beta
epic: E3
owner: widgets
paths: ["src/**", "demo/**", "vite.config.ts", "scripts/release/**"]
api: ["GET /identity/v1/apps/{appId}/widget-settings", "POST /identity/v1/apps/{appId}/widget-tokens", "POST /llm/v1/conversations", "POST /llm/v1/conversations/{id}/messages"]
events: []
mcp: []
updated: 2026-10-30
---

# Embeddable chat widget

> **In 30 seconds**
> - One script tag and one `<synthwerk-chat>` element put a chat launcher on any page (synthwerk#34).
> - Signed-in users chat. The answer streams in as safe Markdown. Raw HTML stays text.
> - Signed-out visitors see a sign-in prompt. The widget sends only the public settings request.
> - Error, offline and quota states show. German and English.
> - Look, language and greeting come from the studio settings of the app (widgets#34). Attributes win.
> - Each version has its own immutable URL and an SRI hash (widgets#32). The host is not live yet.

## What it does

- `dist/synthwerk-chat.js` is one ES module. It holds Vue, `@synthwerk/sdk`, `@synthwerk/ui-vue` and the styles.
- The element renders into an open shadow root. Host CSS and widget CSS do not mix.
- Desktop: a round launcher at the page edge and a panel above it. Below 640 px: a full-screen sheet.
- Colours, type and radii come from `@synthwerk/tokens` (service `widgets`). Theme and accent group come from the settings.
- The host hands in the user token with `getUserToken`. No hook or no token: sign-in view, no token or AI request.
- The widget trades the user token for a widget token: `POST /identity/v1/apps/{appId}/widget-tokens` (identity#14).
- The llm service gets only the widget token. It is bound to the page origin and lives 15 minutes or less.
- The widget token stays in memory and is reused until 30 s before it expires. Parallel calls share one trade.
- The first message creates a conversation. It stays in memory for the life of the element.
- `sw.llm.chat()` of the SDK streams the answer. Each `delta` is added to the view as it arrives.
- Model output is parsed into Vue nodes: paragraphs, lists, quotes, headings, code, bold, italic, links.
- No `v-html`, no `innerHTML`. CI fails when `src` uses either.
- Links open only `http`, `https` and `mailto`, in a new tab with `rel="noopener noreferrer nofollow"`.
- Styles go in as a constructable style sheet. A strict CSP without `unsafe-inline` or `unsafe-eval` works.
- The widget writes nothing to `localStorage`, `sessionStorage` or cookies.

## Studio settings

- On start the widget loads `GET /identity/v1/apps/{appId}/widget-settings`. No token, no cookie.
- Identity answers only to an origin on the app allow-list. A signed-out visitor gets the right look too and makes no AI call.
- Each field is checked against the allowed values. An unknown value gets the default for that field. The widget never uses a value as CSS.
- `theme` sets `data-theme`, `accent` sets `data-group` of `@synthwerk/tokens`. The launcher uses the accent colour.
- The greeting is plain text, 1 to 280 characters, line breaks allowed. It renders as a text node, never as HTML. A control character or a bidi override: the built-in greeting.
- An attribute wins over the studio value. A `lang` attribute that is not `de` or `en` falls through to the studio language.
- Failure (network, 403, 5xx, bad JSON, no answer in 3 s): the defaults. No error shows.
- One request per app and API for the life of the page, shared by all widgets on it. A failure is not retried. A reload asks again.
- The launcher stays hidden until the settings are in or failed, so it does not jump to the other corner.

## How to use

1. Register the app with your page origin in identity (`POST /v1/orgs/{orgId}/apps`).
2. Add the snippet to the page:

   ```html
   <script type="module" src="https://<widget host>/widgets/v0.2.0/synthwerk-chat.js"></script>
   <synthwerk-chat app-id="<app id>" api-url="https://<edge>"></synthwerk-chat>
   ```

3. After sign-in, hand in the user token. Set it again after sign-out:

   ```js
   const chat = document.querySelector('synthwerk-chat')
   chat.getUserToken = () => auth.accessToken ?? null
   ```

4. Optional: listen for `synthwerk-sign-in` to start your sign-in, or set `sign-in-url`.
5. Try it local: `pnpm demo` serves the test page at `http://127.0.0.1:4174/`. Add `?signed-in` or `?lang=de`.

| Attribute | Value | Default |
|---|---|---|
| `app-id` | App id from identity. Required | none: config error |
| `api-url` | Edge base URL. Services at `/identity` and `/llm`. Required | none: config error |
| `lang` | `de` or `en` | studio, then browser language, else `en` |
| `mode` | `system`, `light` or `dark` | studio, else `system` |
| `position` | `bottom-right` or `bottom-left` | studio, else `bottom-right` |
| `theme` | `default` or `contrast` | studio, else `default` |
| `accent` | `flagship`, `lab`, `ops` or `venture` | studio, else `flagship` |
| `sign-in-url` | `https` link, or `http` on the same origin | none: sends `synthwerk-sign-in` |

| Member | Kind | Use |
|---|---|---|
| `getUserToken` | property | `() => string \| null \| Promise<…>`. The user access token, or `null`. |
| `refreshSession()` | method | The host session changed. The widget asks `getUserToken` again. |
| `synthwerk-sign-in` | event | The visitor pressed "Sign in". Bubbles out of the shadow root. |

## Hosting and SRI

- URL scheme: `https://<widget host>/widgets/v<X.Y.Z>/synthwerk-chat.js`. One path per version. The bytes behind a path never change.
- `pnpm build && node scripts/release/sri.ts` writes `dist/release.json` (version, path, size, `sha384` integrity). CI puts the hash in the build job summary.
- The build is reproducible: the same commit gives the same hash.
- Snippet with SRI:

  ```html
  <script type="module" src="https://<widget host>/widgets/v0.2.0/synthwerk-chat.js"
          integrity="sha384-…" crossorigin="anonymous"></script>
  ```

- The host must send: `Content-Type: text/javascript`, `Cache-Control: public, max-age=31536000, immutable`, `Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`, `X-Content-Type-Options: nosniff`. A module script with `integrity` needs the CORS header.

### Decision: the edge on the IONOS VPS

| Option | Result | Reason |
|---|---|---|
| GitHub Release asset as the script URL | no | Served as `application/octet-stream` with `attachment` and no CORS header. A browser refuses it as a module script |
| GitHub Pages | no | Fixed `max-age=600`, no own headers. Not the dev host |
| jsDelivr from npm or a GitHub tag | not now | New vendor (third-party.md needs a line first). npm needs a publish identity (fleet GOV-ENV-10) |
| Edge on the IONOS VPS, versioned path from an image | yes | Provider in use. Same edge as `/identity` and `/llm`. Own headers |

- Store of record: one GitHub Release per tag `vX.Y.Z`, with `synthwerk-chat.js`, `release.json` and the integrity in the notes.
- Serving: a small static image (unprivileged nginx) under `/widgets/` on the edge. It holds every released version. The build of the image fetches each release asset and checks it against its recorded integrity.

### Open before the URL is live

- The edge (Traefik and the WAF) is not on the VPS yet. Today only SSH is public (synthwerk-infra).
- The repo moves from tier `library` to `deploys`: `deploy.yml`, `promote.yml`, a `dev` environment with `DEPLOY_ENV`, `fleet check` (fleet-standard templates).
- A release step that makes the GitHub Release from CI needs a workflow-name exception (WF-FILE-02) or a fleet release stage.
- Then: a route `PathPrefix(/widgets/)` in synthwerk-infra, a check from another origin on dev, and `NUXT_PUBLIC_WIDGET_SCRIPT_URL` plus `NUXT_PUBLIC_WIDGET_SCRIPT_INTEGRITY` in the studio.

## Rules and limits

| Rule | Value |
|---|---|
| Message length | 8000 characters (input `maxlength`, server 413 above) |
| Widget token reuse | until 30 s before `expires_in`; `expires_in` counts as 900 s at most |
| Conversation | one per element, in memory only |
| Stored data | none (no storage, no cookie) |
| Settings request | one per app and API per page load, 3 s timeout, no retry |
| Greeting | plain text, 280 characters at most |
| Raw HTML in model output | shown as text |
| Bundle | one ES module, about 120 kB (40 kB gzip) |

## Events

| Type | When |
|---|---|
| None. | The widget sends no bus event. The DOM event `synthwerk-sign-in` is listed above. |

## Errors

| Status | Problem type | Cause |
|---|---|---|
| 401 | `unauthenticated` | User token gone. The widget shows sign-in again. |
| 403 | `origin_not_allowed`, `forbidden` | Page origin not on the app allow-list. "This site cannot use the chat." |
| 413 | `input_too_large` | Message too long. |
| 429 | `quota_exhausted` | Quota used up. The input locks. The reset time comes from `Retry-After`. |
| 429 | `too_many_streams`, `rate_limited` | "The chat is busy." |
| 503 | `model_unavailable` | "The chat is busy." Mid-stream: the partial answer stays. |
| none | `offline` | Browser offline. The input locks until the browser is online. |
| none | `stream_stalled`, `stream_interrupted` | "The answer stopped." |

## Tests

- `tests/unit/settings.test.ts` — `values outside the token lists - each one becomes the default, never raw CSS`
- `tests/unit/settings.test.ts` — `many widgets and a failing API - one request for the page, no retry`
- `tests/unit/settings.test.ts` — `attributes set - the attribute wins over the studio value`
- `tests/unit/widget.test.ts` — `studio settings - greeting, position, mode, theme, accent and language of the app`
- `tests/unit/widget.test.ts` — `greeting with HTML - shown as text, no element made`
- `tests/unit/widget.test.ts` — `settings load fails - defaults, the launcher shows, no error`
- `tests/e2e/chat.spec.ts` — `studio settings - greeting, corner and language of the app`
- `tests/unit/widget.test.ts` — `signed-out visitor opens the chat - sign-in view, only the public settings request`
- `tests/unit/widget.test.ts` — `signed-in user - the answer streams into the view`
- `tests/unit/widget.test.ts` — `quota used up - quota state with the reset time, input blocked`
- `tests/unit/widget.test.ts` — `browser goes offline - offline state, send disabled`
- `tests/unit/markdown.test.ts` — `raw HTML in model output - shown as text, no element made`
- `tests/unit/session.test.ts` — `signed in - trades the user token for a widget token, llm gets only the widget token`
- `tests/unit/chat.test.ts` — `answer - streams into the assistant message piece by piece`
- `tests/e2e/chat.spec.ts` — `signed-in user - chats and sees the streamed answer` (strict CSP page)
- `tests/e2e/chat.spec.ts` — `signed-out visitor - sign-in prompt, only the public settings request`

## Changes

| Date | Change |
|---|---|
| 2026-10-29 | First version (synthwerk#34). |
| 2026-10-30 | Studio settings (widgets#34). Versioned URL scheme and SRI in CI (widgets#32). Version 0.2.0. |
