# @synthwerk/tokens

- Synthwerk design tokens: CSS custom properties, a Tailwind 4 theme, JSON and typed exports.
- Themes `default` (the public look, D-41) and `contrast` (AAA low vision), each in `light` and `dark`.
- VM. studio groups via `data-group`: `flagship` (indigo, default), `lab` (violet), `ops` (magenta), `venture` (amber, with the B-46 style: Cinzel display font, near-square corners, ornament).
- Group values come from vm-brand `brand.json` through `src/brand-groups.json` (generated; do not edit).
- Deprecated for one release: `data-group="vlm"` (= `lab`) and `data-group="rig"` (= `ops`; the old amber rig is gone).
- Every text pair passes WCAG AA. `contrast` passes AAA.
- Use and rules: [docs/features/brand-tokens.md](../../docs/features/brand-tokens.md).

```css
@import "tailwindcss";
@import "@synthwerk/tokens/tokens.css";
@import "@synthwerk/tokens/tailwind.css";
```

```ts
import { contrastRatio, firstPaintScript, resolveColors, resolveMode } from '@synthwerk/tokens'
```
