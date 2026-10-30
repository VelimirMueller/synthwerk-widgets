---
title: Embeddable chat widget
slug: chat-widget
status: beta
epic: E3
owner: widgets
paths: ["src/**", "demo/**", "vite.config.ts"]
api: ["POST /identity/v1/apps/{appId}/widget-tokens", "POST /llm/v1/conversations", "POST /llm/v1/conversations/{id}/messages"]
events: []
mcp: []
updated: 2026-10-29
---

# Embeddable chat widget

> **In 30 seconds**
> - One script tag and one `<synthwerk-chat>` element put a chat launcher on any page (synthwerk#34).
> - Signed-in users chat. The answer streams in as safe Markdown. Raw HTML stays text.
> - Signed-out visitors see a sign-in prompt. The widget then sends no request.
> - Error, offline and quota states show. German and English.

## What it does

- `dist/synthwerk-chat.js` is one ES module. It holds Vue, `@synthwerk/sdk`, `@synthwerk/ui-vue` and the styles.
- The element renders into an open shadow root. Host CSS and widget CSS do not mix.
- Desktop: a round launcher at the page edge and a panel above it. Below 640 px: a full-screen sheet.
- Colours, type and radii come from `@synthwerk/tokens` (theme `default`, service `widgets`).
- The host hands in the user token with `getUserToken`. No hook or no token: sign-in view, no request.
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

## How to use

1. Register the app with your page origin in identity (`POST /v1/orgs/{orgId}/apps`).
2. Add the snippet to the page:

   ```html
   <script type="module" src="https://<host>/synthwerk-chat.js"></script>
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
| `lang` | `de` or `en` | browser language, else `en` |
| `mode` | `system`, `light` or `dark` | `system` |
| `position` | `bottom-right` or `bottom-left` | `bottom-right` |
| `sign-in-url` | `https` link, or `http` on the same origin | none: sends `synthwerk-sign-in` |

| Member | Kind | Use |
|---|---|---|
| `getUserToken` | property | `() => string \| null \| Promise<…>`. The user access token, or `null`. |
| `refreshSession()` | method | The host session changed. The widget asks `getUserToken` again. |
| `synthwerk-sign-in` | event | The visitor pressed "Sign in". Bubbles out of the shadow root. |

## Rules and limits

| Rule | Value |
|---|---|
| Message length | 8000 characters (input `maxlength`, server 413 above) |
| Widget token reuse | until 30 s before `expires_in`; `expires_in` counts as 900 s at most |
| Conversation | one per element, in memory only |
| Stored data | none (no storage, no cookie) |
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

- `tests/unit/widget.test.ts` — `signed-out visitor opens the chat - sign-in view and no request at all`
- `tests/unit/widget.test.ts` — `signed-in user - the answer streams into the view`
- `tests/unit/widget.test.ts` — `quota used up - quota state with the reset time, input blocked`
- `tests/unit/widget.test.ts` — `browser goes offline - offline state, send disabled`
- `tests/unit/markdown.test.ts` — `raw HTML in model output - shown as text, no element made`
- `tests/unit/session.test.ts` — `signed in - trades the user token for a widget token, llm gets only the widget token`
- `tests/unit/chat.test.ts` — `answer - streams into the assistant message piece by piece`
- `tests/e2e/chat.spec.ts` — `signed-in user - chats and sees the streamed answer` (strict CSP page)
- `tests/e2e/chat.spec.ts` — `signed-out visitor - sign-in prompt and no request to identity or llm`

## Changes

| Date | Change |
|---|---|
| 2026-10-29 | First version (synthwerk#34). |
