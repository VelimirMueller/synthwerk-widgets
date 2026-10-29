# @synthwerk/ui-vue

- `synthwerk-ui` for Vue 3.5: the components of the Synthwerk Figma library in code.
- First set: `SwButton`, `SwPill`, `SwInput`, `SwCard`, `SwStatusPill`, `SwTerminalSnippet`, `SwDivider`.
- Components read `@synthwerk/tokens` only. Dark, light and contrast come from the tokens.
- Every text passes 4.5:1 in both modes. Use and rules: [docs/features/ui-vue.md](../../docs/features/ui-vue.md).

```css
@import "@synthwerk/tokens/tokens.css";
@import "@synthwerk/ui-vue/ui.css";
```

```ts
import { SwButton, SwCard, SwStatusPill } from '@synthwerk/ui-vue'
```
