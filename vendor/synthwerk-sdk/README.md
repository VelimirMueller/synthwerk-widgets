# @synthwerk/sdk

Framework-free core of the Synthwerk SDK for the browser and Node 24.

- Token-mode sign-in: the host page or widget hands in `getToken`. The SDK stores no token.
- Typed `openapi-fetch` clients for identity, llm and vision, generated from a pinned `synthwerk-contracts` commit.
- `requestWidgetToken()` trades a user token for a widget token (identity).
- `sw.llm.chat()` streams an answer as `delta`, `usage`, `done` and `error` events.

```ts
import { createSynthwerk } from '@synthwerk/sdk'

const sw = createSynthwerk({ apiUrl: 'https://api.example.com', auth: { mode: 'token', getToken } })
const { data } = await sw.api.llm.POST('/v1/conversations', { body: {} })
for await (const event of sw.llm.chat({ conversationId: data.id, content: 'Hi' })) {
  if (event.type === 'delta') process(event.text)
}
```

Full reference: [docs/features/sdk-core.md](../../docs/features/sdk-core.md). Not on npm yet: publish with `pnpm release` from the repo root ([docs/REFERENCE.md](../../docs/REFERENCE.md#publish-to-npm)).
