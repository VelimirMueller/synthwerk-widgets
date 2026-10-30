<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/banner/hero-v2-light.svg">
  <img alt="SYNTHWERK-WIDGETS. Embeddable AI chat and vision widgets. Chat widget shipped. Widgets, chat, vision." src="assets/banner/hero-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/lead-v2-light.svg">
  <img alt="synthwerk-widgets holds the embeddable widgets for synthwerk (https://github.com/VelimirMueller/synthwerk). The chat widget ships as one custom element. The vision widget comes next." src="assets/readme/lead-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/stats-v2-light.svg">
  <img alt="1 CHAT WIDGET SHIPPED. 1 VISION WIDGET PLANNED. 1 SCRIPT TAG PER PAGE. 0 COOKIES OR STORAGE WRITES" src="assets/readme/stats-v2-dark.svg" width="100%">
</picture>
</p>

## Status

- **Chat widget:** shipped in [synthwerk#34](https://github.com/VelimirMueller/synthwerk/issues/34). One `<synthwerk-chat>` element, beta. Docs: [docs/features/chat-widget.md](docs/features/chat-widget.md).
- **Today:** `main` holds the widget source, unit and e2e tests and the full CI. The bundle `dist/synthwerk-chat.js` is built in CI and not hosted yet.
- **Next:** the vision widget, and a host (CDN or edge route) for the bundle.
- **Old code:** tag `legacy-final` holds the Nuxt 3 chat page, for history only.

<br>

<p>
<img alt="01 WHAT IT DOES. A BUTTON. IT KNOWS ITS PLACE." src="assets/readme/divider-what-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/features-v2-light.svg">
  <img alt="ANY PAGE: One script tag and one &lt;synthwerk-chat&gt; element put a chat launcher on any page. DESKTOP AND MOBILE: Round launcher and panel on desktop. A full-screen sheet below 640 px. SIGN-IN FIRST: Signed-in users chat. Signed-out visitors see a sign-in prompt and send no request" src="assets/readme/features-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/what-v2-light.svg">
  <img alt="One custom element: &lt;synthwerk-chat&gt; renders into an open shadow root. Host CSS and widget CSS do not mix. Desktop and mobile: Launcher and panel on desktop, full-screen sheet on small screens. Streamed answers: The answer streams in as safe Markdown. Raw HTML stays text. Signed-in users only: Signed-out visitors see a sign-in prompt. The widget then sends no request" src="assets/readme/what-v2-dark.svg" width="100%">
</picture>
</p>

<br>

<p>
<img alt="02 QUICK START. ONE SCRIPT TAG. ONE ELEMENT." src="assets/readme/divider-start-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/start-v2-light.svg">
  <img alt="Terminal: $ gh repo clone VelimirMueller/synthwerk-widgets | $ cd synthwerk-widgets &amp;&amp; pnpm install | $ pnpm check | # lint, typecheck, unit tests, build | $ pnpm demo | # test page at http://127.0.0.1:4174/" src="assets/readme/start-v2-dark.svg" width="100%">
</picture>
</p>

<details>
<summary><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-6-v2-light.svg"><img alt="Plain text" src="assets/readme/links-6-v2-dark.svg" width="32%"></picture></summary>

```bash
gh repo clone VelimirMueller/synthwerk-widgets
cd synthwerk-widgets && pnpm install
pnpm check   # lint, typecheck, unit tests, build
pnpm demo    # test page at http://127.0.0.1:4174/
```

</details>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/startnotes-v2-light.svg">
  <img alt="Embed: Load synthwerk-chat.js as a module, add &lt;synthwerk-chat app-id api-url&gt;, hand in the user token with getUserToken. Details: Attributes, errors and limits: docs/features/chat-widget.md" src="assets/readme/startnotes-v2-dark.svg" width="100%">
</picture>
</p>

<p align="center">
<a href="https://github.com/VelimirMueller/synthwerk"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-1-v2-light.svg"><img alt="synthwerk (https://github.com/VelimirMueller/synthwerk)" src="assets/readme/links-1-v2-dark.svg" width="32%"></picture></a>
<a href="https://github.com/VelimirMueller/synthwerk-blueprint"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-2-v2-light.svg"><img alt="Blueprint (https://github.com/VelimirMueller/synthwerk-blueprint)" src="assets/readme/links-2-v2-dark.svg" width="32%"></picture></a>
<a href="https://github.com/VelimirMueller/synthwerk-widgets/tree/legacy-final"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-3-v2-light.svg"><img alt="legacy-final (https://github.com/VelimirMueller/synthwerk-widgets/tree/legacy-final)" src="assets/readme/links-3-v2-dark.svg" width="32%"></picture></a>
</p>

<br>

<p>
<img alt="03 HOW IT WORKS. BOXES AND ARROWS. NOW BUILT." src="assets/readme/divider-how-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/flow-v2-light.svg">
  <img alt="PAGE -&gt; ELEMENT -&gt; SHADOW ROOT -&gt; SERVICES. The shadow root keeps host CSS and widget CSS apart. On purpose." src="assets/readme/flow-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/hownotes-v2-light.svg">
  <img alt="Two services today: The chat trades the user token for a widget token at synthwerk-identity, then streams from synthwerk-llm. The host page: The host page meets one element. The widget token stays in memory and is bound to the page origin" src="assets/readme/hownotes-v2-dark.svg" width="100%">
</picture>
</p>

<br>

<p>
<img alt="04 USAGE. FACTS. SOME OLD, SOME NEW." src="assets/readme/divider-usage-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/usage-v2-light.svg">
  <img alt="Ecosystem map: synthwerk (https://github.com/VelimirMueller/synthwerk). Blueprint: Shared CI, lint configs and templates: synthwerk-blueprint (https://github.com/VelimirMueller/synthwerk-blueprint). Renamed: This repo was renamed. The old URL still redirects here. Old code: Tag legacy-final holds a Nuxt 3 chat page for the old GPT4All server. Tier: Library: the bundle is built and packed in CI, not deployed yet. License: MIT. Copyright 2026 Velimir Mueller" src="assets/readme/usage-v2-dark.svg" width="100%">
</picture>
</p>

<br>

<p>
<img alt="05 STATUS. TRUE THINGS. IN SMALL BOXES." src="assets/readme/divider-status-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/status-v2-light.svg">
  <img alt="chat widget: shipped (synthwerk#34): &lt;synthwerk-chat&gt;, beta. vision widget: planned. bundle: dist/synthwerk-chat.js, built in CI, not hosted yet. old code: tag legacy-final: Nuxt 3 chat page, old GPT4All server" src="assets/readme/status-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/statuslog-v2-light.svg">
  <img alt="[ STATUS ]: Chat widget shipped, beta (synthwerk#34). [ WORKS ]: Sign-in prompt, widget token, streamed answers, error and offline states, German and English. [ NEXT ]: Vision widget. A host for the bundle" src="assets/readme/statuslog-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/honest-v2-light.svg">
  <img alt="Tests: Vitest unit tests and a Playwright e2e test on a strict CSP page. CI: Lint, typecheck, unit with coverage, e2e and build on every PR. Stack: Vue 3.5 custom element, Vite, pnpm" src="assets/readme/honest-v2-dark.svg" width="100%">
</picture>
</p>

<p align="center">
<a href="LICENSE"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-4-v2-light.svg"><img alt="License (LICENSE)" src="assets/readme/links-4-v2-dark.svg" width="32%"></picture></a>
<a href="https://github.com/VelimirMueller"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-5-v2-light.svg"><img alt="VM. flagship (https://github.com/VelimirMueller)" src="assets/readme/links-5-v2-dark.svg" width="32%"></picture></a>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/footer-v2-light.svg">
  <img alt="VM. studio / flagship · open source · look per vm-brand playbook · MIT © 2026 Velimir Mueller · -- EOF -- stays in its frame --" src="assets/readme/footer-v2-dark.svg" width="100%">
</picture>
</p>
