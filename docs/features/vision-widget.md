---
title: Embeddable vision widget
slug: vision-widget
status: beta
epic: E5
owner: widgets
paths: ["src/vision/**", "src/vision-element.ts", "src/vision-entry.ts", "src/components/vision-widget.ts", "src/styles/vision.css", "demo/vision.html", "vite.config.ts"]
api: ["POST /identity/v1/apps/{appId}/widget-tokens", "POST /vision/v1/classifications", "POST /vision/v1/images"]
events: []
mcp: []
updated: 2026-10-30
---

# Embeddable vision widget

> **In 30 seconds**
> - One script tag and one `<synthwerk-vision>` element put an image-label card on any page (synthwerk#43).
> - A signed-in user chooses a photo or takes one with the camera. The card shows the best label, its topic path, a "Not sure" flag and other labels with scores.
> - The browser shrinks the photo to a JPEG below 900 KiB before it leaves the page.
> - Signed-out visitors see a sign-in prompt. The widget then sends no request and never opens the camera.

## What it does

- `dist/synthwerk-vision.js` is one ES module. It holds Vue, `@synthwerk/sdk`, `@synthwerk/ui-vue` and the styles. A page that uses only the chat does not load it.
- The element renders an inline card into an open shadow root. Host CSS and widget CSS do not mix.
- The look comes from the attributes only. The card does not load the studio widget settings (`widget-settings`) of the chat launcher.
- The SRI script (`scripts/release/sri.ts`) covers the chat bundle only. The vision bundle gets no `release.json` yet.
- The sign-in, the widget token and the session rules are the same as in the [chat widget](chat-widget.md): same code (`src/session.ts`, `src/components/use-session.ts`).
- Each host session change drops the result, the photo, the session and the cached widget token, and stops the camera.
- "Choose photo" opens the file picker. Any picture the browser can decode works (JPEG, PNG, WebP, HEIC in Safari).
- "Use camera" asks for the camera only after the click. No auto-start. Video only, no audio. The back camera is preferred.
- "Take photo" copies the frame, then stops every camera track before the upload.
- The camera also stops on "Close camera", Escape, sign-out, a hidden page and when the element leaves the page.
- The browser decodes the photo (EXIF orientation applied), draws it on a canvas and encodes a JPEG. Steps: 1280 px at quality 0.85, then lower quality and size until the JPEG is at most 900 KiB.
- Re-encoding drops the EXIF block of the original file (GPS position, camera serial).
- The JPEG goes to `POST /vision/v1/classifications` as `multipart/form-data`, field `image`, with the widget token only. The SDK vision client `sw.api.vision` sends it; the types come from the contracts vision spec.
- The view shows `correction.label` first when the team corrected this picture, else `primary`. The other labels follow, best first.
- With `save-photos`, the widget then stores the same JPEG with `POST /vision/v1/images`. A failed save keeps the labels on screen.
- The preview is a `<canvas>`, not an image URL: the host CSP needs no `img-src blob:`.
- No `v-html`, no HTML strings. Labels from the API are text only, at most 200 characters, at most 20 labels.
- The widget writes nothing to `localStorage`, `sessionStorage` or cookies. The photo stays in memory only.

## How to use

1. Register the app with your page origin in identity (`POST /v1/orgs/{orgId}/apps`).
2. Add the snippet to the page:

   ```html
   <script type="module" src="https://<host>/synthwerk-vision.js"></script>
   <synthwerk-vision app-id="<app id>" api-url="https://<edge>"></synthwerk-vision>
   ```

3. After sign-in, hand in the user token. Set it again after sign-out:

   ```js
   const vision = document.querySelector('synthwerk-vision')
   vision.getUserToken = () => auth.accessToken ?? null
   ```

4. Optional: listen for `synthwerk-sign-in` to start your sign-in, or set `sign-in-url`.
5. The camera needs a secure page (`https:` or `localhost`). On other pages the card shows only "Choose photo".
6. Try it local: `pnpm demo` serves `http://127.0.0.1:4174/demo/vision.html`. Add `?signed-in`, `?lang=de` or `?save-photos`.

| Attribute | Value | Default |
|---|---|---|
| `app-id` | App id from identity. Required | none: config error |
| `api-url` | Edge base URL. Services at `/identity` and `/vision`. Required | none: config error |
| `lang` | `de` or `en` | browser language, else `en` |
| `mode` | `system`, `light` or `dark` | `system` |
| `theme` | `default` or `contrast` | `default` |
| `accent` | `flagship`, `lab`, `ops` or `venture` | `flagship` |
| `sign-in-url` | `https` link, or `http` on the same origin | none: sends `synthwerk-sign-in` |
| `save-photos` | present: also store each photo for the org. `"false"` turns it off | off |

| Member | Kind | Use |
|---|---|---|
| `getUserToken` | property | `() => string \| null \| Promise<…>`. The user access token, or `null`. |
| `refreshSession()` | method | The host session changed. The widget asks `getUserToken` again. |
| `synthwerk-sign-in` | event | The visitor pressed "Sign in". Bubbles out of the shadow root. |

## Rules and limits

| Rule | Value |
|---|---|
| Upload size | JPEG at most 900 KiB (edge body limit 1 MiB, room for the multipart envelope) |
| Long edge | 1280 px first, down to 480 px for photos that do not compress |
| File size before decoding | 40 MiB; larger files are refused in the browser |
| Labels shown | the best one plus up to 4 others |
| Camera | starts only after a click; video only; stops before upload |
| Stored data | none in the browser. The server stores the photo only with `save-photos` |
| Host CSP | works with `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'` plus `connect-src` for the edge |
| Bundle | one ES module, about 128 kB (42 kB gzip) |

## Events

| Type | When |
|---|---|
| None. | The widget sends no bus event. The DOM event `synthwerk-sign-in` is listed above. |

## Errors

Vision answers FastAPI bodies `{detail}`, not problems. The widget maps the status.

| Status | Problem type | Cause |
|---|---|---|
| 401 | `unauthenticated` | Widget token refused twice. The widget shows sign-in again. |
| 403 | `forbidden` | Page origin is not the origin of the widget token. "This site cannot use image labels." |
| 413 | `input_too_large` | The edge or vision refused the size. "The photo is too large." |
| 415 | `unsupported_media_type` | Not a picture vision can read. Also when the browser cannot decode the file. |
| 503 | `model_unavailable` | Model not loaded or token keys unavailable. "Image labels are busy." Retry offered. |
| 507 | `storage_full` | `save-photos` only: the org upload quota is full. The labels stay. |
| none | `offline` | Browser offline. The buttons lock until the browser is online. |
| none | camera | `NotAllowedError`: "The camera is blocked". `NotFoundError`: "No camera found". `NotReadableError`: "in use by another app". |

## Tests

- `tests/unit/vision-widget.test.ts` — `signed-out visitor - sign-in view, no camera, no request at all`
- `tests/unit/vision-widget.test.ts` — `photo chosen - top label, score, topic path and other labels`
- `tests/unit/vision-widget.test.ts` — `camera - starts on click, photo taken, every track stopped before the upload`
- `tests/unit/vision-widget.test.ts` — `host signs out - camera stops, result dropped, sign-in view`
- `tests/unit/vision-widget.test.ts` — `save-photos and the storage quota is full (507) - labels stay, quota note`
- `tests/unit/vision-image.test.ts` — `noisy photo - steps down until the JPEG is below the upload limit`
- `tests/unit/vision-camera.test.ts` — `stop while the browser asks - the late stream stops at once`
- `tests/unit/vision-api.test.ts` — `classify - multipart photo to <apiUrl>/vision with the widget token only`
- `tests/unit/vision-state.test.ts` — `second photo while the first runs - the first answer is dropped`
- `tests/e2e/vision.spec.ts` — `signed-out visitor - sign-in prompt, no vision call, no camera`
- `tests/e2e/vision.spec.ts` — `signed-in user - large photo resized below 1 MiB, primary label and alternatives` (strict CSP page)
- `tests/e2e/vision.spec.ts` — `camera - starts only on click, photo from the fake camera, tracks stop` (Chromium fake camera)

## Changes

| Date | Change |
|---|---|
| 2026-10-30 | First version (synthwerk#43). |
| 2026-10-30 | Calls go through the SDK vision client and its generated types (synthwerk-sdk#19). No change for hosts. |
