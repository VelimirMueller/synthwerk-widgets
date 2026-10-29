/**
 * Synthwerk design tokens: the single source of truth.
 *
 * Look: public presence (decision D-41, docs/ecosystem-plan/07c-public-presence.md).
 * Layers (brand doc 07 §4):
 * 1. Primitives: raw hex values. The only place where a hex value may appear.
 * 2. Semantic: one role per theme × mode. Values are primitive names, never hex.
 * 3. Component: one widget's decision. Values point to semantic tokens.
 * 4. Service: `--service-accent` and `--service-accent-text` only.
 */
import brandGroups from './brand-groups.json' with { type: 'json' };
// ---------------------------------------------------------------- 1. Primitives
export const primitives = {
    white: '#FFFFFF',
    black: '#000000',
    // Neutrals of the website (velimir-mueller.de): Tailwind zinc plus three steps for contrast.
    'zinc-50': '#FAFAFA',
    'zinc-100': '#F4F4F5',
    'zinc-200': '#E4E4E7',
    'zinc-300': '#D4D4D8',
    'zinc-350': '#B4B4BC',
    'zinc-400': '#A1A1AA',
    'zinc-450': '#8A8A93',
    'zinc-500': '#71717A',
    'zinc-550': '#6B6B74',
    'zinc-600': '#52525B',
    'zinc-700': '#3F3F46',
    'zinc-800': '#27272A',
    'zinc-850': '#18181B',
    'zinc-900': '#121214',
    'zinc-950': '#09090B',
    // Dark surfaces of the code-context dashboard. 400 and 500 are lifted for AA (text3 #63637A fails).
    'graphite-950': '#0C0C10',
    'graphite-900': '#131318',
    'graphite-850': '#18181F',
    'graphite-800': '#1E1E28',
    'graphite-750': '#1C1C28',
    'graphite-700': '#282838',
    'graphite-500': '#6B6B84',
    'graphite-400': '#8A8AA0',
    // Dark page and line of vm-brand brand.json (base.dark.page, base.dark.line).
    'night-950': '#0A0A0B',
    'night-700': '#26262B',
    // Dashboard status and accent colours (Tailwind palette values).
    'emerald-300': '#6EE7B7',
    'emerald-400': '#34D399',
    'emerald-500': '#10B981',
    'emerald-700': '#047857',
    'emerald-800': '#065F46',
    'indigo-300': '#A5B4FC',
    'indigo-400': '#818CF8',
    'indigo-500': '#6366F1',
    'indigo-600': '#4F46E5',
    'indigo-700': '#4338CA',
    'indigo-800': '#3730A3',
    'violet-300': '#C4B5FD',
    'violet-400': '#A78BFA',
    'violet-500': '#8B5CF6',
    'violet-600': '#7C3AED',
    'violet-700': '#6D28D9',
    'violet-800': '#5B21B6',
    // Ops magenta (vm-brand B-26/B-34): the Overdrive magenta and Tailwind fuchsia steps.
    'magenta-400': '#EE4FFF',
    'fuchsia-300': '#F0ABFC',
    'fuchsia-700': '#A21CAF',
    'fuchsia-800': '#86198F',
    'pink-400': '#F472B6',
    'pink-700': '#BE185D',
    'amber-300': '#FCD34D',
    'amber-400': '#FBBF24',
    'amber-500': '#F59E0B',
    'amber-700': '#B45309',
    'amber-800': '#92400E',
    'amber-900': '#78350F',
    'red-300': '#FCA5A5',
    'red-400': '#F87171',
    'red-500': '#EF4444',
    'red-700': '#B91C1C',
    'red-800': '#991B1B',
    'blue-300': '#93C5FD',
    'blue-400': '#60A5FA',
    'blue-700': '#1D4ED8',
    'blue-800': '#1E40AF',
    'teal-400': '#2DD4BF',
    'teal-500': '#14B8A6',
    'teal-600': '#0D9488',
    'teal-700': '#0F766E'
};
/** Gradients built only from primitives: the teal-to-violet edge glow of the website. */
export const gradients = {
    'edge-dark': ['teal-500', 'violet-500'],
    'edge-light': ['teal-600', 'violet-600']
};
/**
 * Brand palette (public presence, D-41): names for brand assets, mapped to primitives.
 * `night` and `paper` are the dark and light pages. `night` is vm-brand `base.dark.page` (B-54).
 */
export const brand = {
    ink: 'zinc-850',
    night: 'night-950',
    paper: 'zinc-50',
    line: 'zinc-200',
    sub: 'zinc-600',
    faint: 'zinc-500',
    emerald: 'emerald-500',
    'emerald-print': 'emerald-700',
    indigo: 'indigo-500',
    'indigo-print': 'indigo-600',
    'glow-teal': 'teal-500',
    'glow-red': 'red-500',
    'glow-violet': 'violet-500'
};
// ---------------------------------------------------------------- 2. Semantic
/**
 * - `default`: the public look (D-41). Light = velimir-mueller.de, dark = code-context dashboard.
 * - `contrast`: the same family for low vision. Text ≥ 7:1 (AAA), control borders ≥ 4.5:1,
 *   no glow, no grid, no tinted fills.
 */
export const themeNames = ['default', 'contrast'];
export const modes = ['light', 'dark'];
export const semanticColorNames = [
    'bg',
    'surface',
    'surface-2',
    'border',
    'border-subtle',
    'border-control',
    'fg',
    'fg-muted',
    'fg-subtle',
    'accent',
    'accent-fg',
    'accent-text',
    'accent-2',
    'accent-2-fg',
    'accent-2-text',
    'success',
    'warning',
    'danger',
    'info',
    'ring'
];
export const semanticEffectNames = [
    'glow',
    'glow-edge',
    'shadow-card-v',
    'gradient-edge',
    'texture-grid',
    'badge-service-tint'
];
const tint = (primitive, alpha) => ({ tint: primitive, alpha });
/** The three edge glows of the website and the banners, at the given strengths in percent. */
const edgeGlows = (teal, red, violet) => [
    { color: tint('teal-500', teal), x: 16, y: 0, rx: 36, ry: 52 },
    { color: tint('red-500', red), x: 52, y: 0, rx: 28, ry: 36 },
    { color: tint('violet-500', violet), x: 90, y: 4, rx: 34, ry: 56 }
];
export const themes = {
    default: {
        // velimir-mueller.de light: #FAFAFA page, white cards, #E4E4E7 lines, #18181B ink, indigo.
        light: {
            colors: {
                bg: 'zinc-50',
                surface: 'white',
                'surface-2': 'zinc-100',
                border: 'zinc-200',
                'border-subtle': 'zinc-100',
                'border-control': 'zinc-450',
                fg: 'zinc-850',
                'fg-muted': 'zinc-600',
                'fg-subtle': 'zinc-550',
                accent: 'zinc-850',
                'accent-fg': 'zinc-50',
                'accent-text': 'zinc-850',
                'accent-2': 'indigo-600',
                'accent-2-fg': 'white',
                'accent-2-text': 'indigo-600',
                success: 'emerald-700',
                warning: 'amber-700',
                danger: 'red-700',
                info: 'blue-700',
                ring: 'indigo-600'
            },
            effects: {
                glow: [{ x: 0, y: 0, blur: 20, spread: 2, color: tint('indigo-500', 15) }],
                'glow-edge': edgeGlows(14, 8, 14),
                'shadow-card-v': [
                    { x: 0, y: 1, blur: 2, color: tint('black', 4) },
                    { x: 0, y: 4, blur: 24, spread: -8, color: tint('black', 8) }
                ],
                'gradient-edge': 'edge-light',
                'texture-grid': { line: tint('zinc-850', 5), size: 32 },
                'badge-service-tint': 8
            }
        },
        // vm-brand page #0A0A0B and lines #26262B; code-context dashboard panels #131318 / #18181F, white pill.
        dark: {
            colors: {
                bg: 'night-950',
                surface: 'graphite-900',
                'surface-2': 'graphite-850',
                border: 'night-700',
                'border-subtle': 'graphite-750',
                'border-control': 'graphite-500',
                fg: 'zinc-200',
                'fg-muted': 'zinc-400',
                'fg-subtle': 'graphite-400',
                accent: 'zinc-50',
                'accent-fg': 'graphite-950',
                'accent-text': 'zinc-50',
                'accent-2': 'indigo-400',
                'accent-2-fg': 'graphite-950',
                'accent-2-text': 'indigo-400',
                success: 'emerald-500',
                warning: 'amber-400',
                danger: 'red-400',
                info: 'blue-400',
                ring: 'indigo-400'
            },
            effects: {
                // No card shadows in dark mode (07c §Shapes). The glow is the website hover glow.
                glow: [{ x: 0, y: 0, blur: 40, spread: -10, color: tint('indigo-500', 25) }],
                'glow-edge': edgeGlows(22, 14, 22),
                'shadow-card-v': 'none',
                'gradient-edge': 'edge-dark',
                'texture-grid': { line: tint('white', 4.5), size: 32 },
                'badge-service-tint': 14
            }
        }
    },
    contrast: {
        light: {
            colors: {
                bg: 'white',
                surface: 'white',
                'surface-2': 'zinc-50',
                border: 'zinc-400',
                'border-subtle': 'zinc-200',
                'border-control': 'zinc-700',
                fg: 'zinc-950',
                'fg-muted': 'zinc-700',
                'fg-subtle': 'zinc-600',
                accent: 'zinc-950',
                'accent-fg': 'white',
                'accent-text': 'zinc-950',
                'accent-2': 'indigo-800',
                'accent-2-fg': 'white',
                'accent-2-text': 'indigo-800',
                success: 'emerald-800',
                warning: 'amber-900',
                danger: 'red-800',
                info: 'blue-800',
                ring: 'indigo-800'
            },
            effects: {
                glow: 'none',
                'glow-edge': 'none',
                'shadow-card-v': 'none',
                'gradient-edge': 'edge-light',
                'texture-grid': 'none',
                'badge-service-tint': 0
            }
        },
        dark: {
            colors: {
                bg: 'black',
                surface: 'zinc-950',
                'surface-2': 'zinc-850',
                border: 'zinc-600',
                'border-subtle': 'zinc-800',
                'border-control': 'zinc-400',
                fg: 'white',
                'fg-muted': 'zinc-300',
                'fg-subtle': 'zinc-350',
                accent: 'white',
                'accent-fg': 'black',
                'accent-text': 'white',
                'accent-2': 'indigo-300',
                'accent-2-fg': 'black',
                'accent-2-text': 'indigo-300',
                success: 'emerald-300',
                warning: 'amber-300',
                danger: 'red-300',
                info: 'blue-300',
                ring: 'indigo-300'
            },
            effects: {
                glow: 'none',
                'glow-edge': 'none',
                'shadow-card-v': 'none',
                'gradient-edge': 'edge-dark',
                'texture-grid': 'none',
                'badge-service-tint': 0
            }
        }
    }
};
/** Mode a theme uses when the user has stored no choice. Both themes follow the OS. */
export const defaultMode = {
    default: 'system',
    contrast: 'system'
};
// ---------------------------------------------------------------- 3. Component
/**
 * Component tokens point to semantic tokens (`var(--x)`) or to static tokens.
 * Values are CSS strings with `var()` references only. No colour literals.
 */
export const components = {
    'btn-primary-bg': 'var(--accent)',
    'btn-primary-fg': 'var(--accent-fg)',
    'btn-primary-ring': 'var(--ring)',
    'btn-secondary-bg': 'transparent',
    'btn-secondary-fg': 'var(--fg)',
    'btn-secondary-border': 'var(--border-control)',
    'link-fg': 'var(--accent-text)',
    'link-fg-hover': 'var(--accent-2-text)',
    'card-bg': 'var(--surface)',
    'card-border': 'var(--border)',
    'card-shadow': 'var(--shadow-card-v)',
    'card-radius': 'var(--radius-card)',
    'input-bg': 'var(--surface)',
    'input-border': 'var(--border-control)',
    'select-border': 'var(--border-control)',
    'checkbox-border': 'var(--border-control)',
    'input-border-focus': 'var(--ring)',
    'badge-service-bg': 'color-mix(in oklch, var(--service-accent) var(--badge-service-tint), transparent)',
    'badge-service-fg': 'var(--service-accent-text)',
    'focus-outline': '2px solid var(--ring)',
    'focus-outline-offset': '2px'
};
// ---------------------------------------------------------------- 4. Service accent
export const serviceNames = ['studio', 'llm', 'vision', 'pulse', 'identity', 'widgets'];
/**
 * Calm accents from the dashboard status colours. Emerald stays reserved for status (07c).
 * `dark`: the 400 step, text in dark modes and the accent stripe in all modes.
 * `light`: the 700/800 step, text in light modes. Meta repos use `--gradient-edge`.
 */
export const services = {
    studio: { dark: 'indigo-400', light: 'indigo-700' },
    llm: { dark: 'violet-400', light: 'violet-700' },
    vision: { dark: 'pink-400', light: 'pink-700' },
    pulse: { dark: 'amber-400', light: 'amber-800' },
    identity: { dark: 'blue-400', light: 'blue-700' },
    widgets: { dark: 'teal-400', light: 'teal-700' }
};
// ---------------------------------------------------------------- 4b. Group accent
/**
 * VM. studio groups (vm-brand playbook B-34, B-42, B-46, B-52). Every group shares the D-41
 * base and changes only `accent-2`, `accent-2-fg`, `accent-2-text`, `ring` and the group style.
 * Emerald stays status.
 * - `flagship`: synthwerk family. Indigo, the values of the themes above.
 * - `lab`: personal side projects. Violet, the neighbour of indigo.
 * - `ops`: private tools. Magenta. Never use it on status chips.
 * - `venture`: private-income products. Amber, with the rustic style of B-46.
 *
 * The `default` theme values and the venture style come from `brand-groups.json`, which
 * vm-brand `scripts/group-tokens.py` generates from its `brand.json`. Do not edit that file.
 * The `contrast` theme values are owned here (`contrastAccents`).
 */
export const groupNames = ['flagship', 'lab', 'ops', 'venture'];
/**
 * Old group names, kept for one release. `data-group="vlm"` renders as `lab` and
 * `data-group="rig"` as `ops` (magenta; the amber rig of B-30 is superseded).
 * @deprecated Use `lab` and `ops`. The aliases go away in the next minor release.
 */
export const deprecatedGroupAliases = { vlm: 'lab', rig: 'ops' };
/** A group name or a deprecated alias, resolved to the group name. */
export function resolveGroupName(name) {
    return name in deprecatedGroupAliases
        ? deprecatedGroupAliases[name]
        : name;
}
/** The semantic colours a group decides. Theme blocks never declare these directly. */
export const groupColorNames = ['accent-2', 'accent-2-fg', 'accent-2-text', 'ring'];
/** The CSS custom properties a group style sets, with `--group-` in front. */
export const groupStyleNames = ['font-display', 'corner', 'ornament', 'tracking'];
/** Display fonts a brand.json style may name. Load the font yourself (SIL OFL 1.1). */
export const groupDisplayFonts = {
    cinzel: '"Cinzel", "Trajan Pro", Georgia, "Times New Roman", serif'
};
/** The style of a group without a brand.json style: the D-41 look. */
export const plainGroupStyle = {
    display: 'var(--font-display)',
    corner: 1,
    ornament: false,
    tracking: '0em'
};
/**
 * `contrast` theme accents (text ≥ 7:1). brand.json has no contrast theme, so they live here.
 * `dark` sits on the black contrast page, `light` on the white one.
 */
export const contrastAccents = {
    flagship: { light: 'indigo-800', dark: 'indigo-300' },
    lab: { light: 'violet-800', dark: 'violet-300' },
    ops: { light: 'fuchsia-800', dark: 'fuchsia-300' },
    venture: { light: 'amber-900', dark: 'amber-300' }
};
/** Ink on an accent fill, per brand.json polarity (`fg: "dark" | "light"`) and theme. */
const groupInk = {
    default: { dark: 'graphite-950', light: 'white' },
    contrast: { dark: 'black', light: 'white' }
};
/** The primitive with this hex value (first in declaration order). Throws when none exists. */
export function primitiveForHex(hex) {
    const want = hex.toUpperCase();
    const hit = Object.keys(primitives).find((p) => primitives[p] === want);
    if (!hit)
        throw new Error(`brand-groups.json: ${hex} has no primitive in tokens.ts`);
    return hit;
}
function polarity(value, where) {
    if (value === 'dark' || value === 'light')
        return value;
    throw new Error(`brand-groups.json: ${where}.fg = ${value}, expected dark or light`);
}
function brandStyle(raw, group) {
    if (raw === undefined)
        return plainGroupStyle;
    const r = raw;
    const display = groupDisplayFonts[r.display];
    if (!display)
        throw new Error(`brand-groups.json: ${group}.style.display ${r.display} is unknown`);
    return { display, corner: r.corner, ornament: r.ornament, tracking: `${r.track}em` };
}
/** Builds one group from its brand-groups.json entry and the contrast table. */
function buildGroup(name) {
    const raw = brandGroups.groups[name];
    if (!raw)
        throw new Error(`brand-groups.json: group ${name} is missing`);
    const mode = (theme, m) => {
        const ink = groupInk[theme][polarity(raw[m].fg, `${name}.${m}`)];
        const accent = theme === 'default' ? primitiveForHex(raw[m].accent) : contrastAccents[name][m];
        return { accent, fg: ink };
    };
    const themesOf = (theme) => ({
        light: mode(theme, 'light'),
        dark: mode(theme, 'dark')
    });
    return {
        fill: primitiveForHex(raw.fill),
        themes: { default: themesOf('default'), contrast: themesOf('contrast') },
        style: brandStyle(raw.style, name)
    };
}
export const groups = Object.fromEntries(groupNames.map((name) => [name, buildGroup(name)]));
/** Missing `data-group` = this group. Its values equal the theme values above. */
export const defaultGroup = 'flagship';
// ---------------------------------------------------------------- 5. Static tokens
export const motion = {
    duration: {
        instant: '80ms',
        fast: '150ms',
        base: '200ms',
        slow: '320ms',
        warp: '550ms'
    },
    /** Every duration under `prefers-reduced-motion: reduce`. */
    reducedDuration: '0.01ms',
    ease: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        'spring-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
};
/** Radii of the public family (07c §Shapes): snippet 10, dashboard panel 14, card 24, page 32. */
export const radii = {
    sm: '0.625rem',
    md: '0.875rem',
    card: '1.5rem',
    page: '2rem',
    pill: '9999px'
};
/**
 * - `display`: Space Mono. Headlines, the wordmark, labels and pills (capitals, wide tracking).
 * - `sans`: Inter. Body text and UI controls.
 * - `mono`: JetBrains Mono. Code blocks, logs and diffs. Chosen over Space Mono for code:
 *   taller x-height (0.55 vs 0.50 em) at a narrower advance (0.600 vs 0.612 em), so more
 *   code fits a line and small sizes stay legible. Both are SIL OFL 1.1.
 *   Short `$ command` snippets may use `display` to match the website.
 */
export const fonts = {
    display: {
        family: 'Space Mono',
        weights: [400, 700],
        stack: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    },
    sans: {
        family: 'Inter',
        weights: [400, 600],
        stack: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
    },
    mono: {
        family: 'JetBrains Mono',
        weights: [400, 700],
        stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    }
};
/** Type scale in px. The CSS uses rem (px / 16). `xs` is the label step, `5xl` the display step. */
export const textScale = {
    xs: { size: 12, lineHeight: 16, tracking: '0.15em' },
    sm: { size: 13, lineHeight: 20 },
    base: { size: 15, lineHeight: 24 },
    lg: { size: 17, lineHeight: 26 },
    xl: { size: 20, lineHeight: 28 },
    '2xl': { size: 24, lineHeight: 30 },
    '3xl': { size: 30, lineHeight: 36 },
    '5xl': { size: 48, lineHeight: 52, tracking: '-0.04em' }
};
