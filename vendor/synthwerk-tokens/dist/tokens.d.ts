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
export declare const primitives: {
    readonly white: "#FFFFFF";
    readonly black: "#000000";
    readonly 'zinc-50': "#FAFAFA";
    readonly 'zinc-100': "#F4F4F5";
    readonly 'zinc-200': "#E4E4E7";
    readonly 'zinc-300': "#D4D4D8";
    readonly 'zinc-350': "#B4B4BC";
    readonly 'zinc-400': "#A1A1AA";
    readonly 'zinc-450': "#8A8A93";
    readonly 'zinc-500': "#71717A";
    readonly 'zinc-550': "#6B6B74";
    readonly 'zinc-600': "#52525B";
    readonly 'zinc-700': "#3F3F46";
    readonly 'zinc-800': "#27272A";
    readonly 'zinc-850': "#18181B";
    readonly 'zinc-900': "#121214";
    readonly 'zinc-950': "#09090B";
    readonly 'graphite-950': "#0C0C10";
    readonly 'graphite-900': "#131318";
    readonly 'graphite-850': "#18181F";
    readonly 'graphite-800': "#1E1E28";
    readonly 'graphite-750': "#1C1C28";
    readonly 'graphite-700': "#282838";
    readonly 'graphite-500': "#6B6B84";
    readonly 'graphite-400': "#8A8AA0";
    readonly 'night-950': "#0A0A0B";
    readonly 'night-700': "#26262B";
    readonly 'emerald-300': "#6EE7B7";
    readonly 'emerald-400': "#34D399";
    readonly 'emerald-500': "#10B981";
    readonly 'emerald-700': "#047857";
    readonly 'emerald-800': "#065F46";
    readonly 'indigo-300': "#A5B4FC";
    readonly 'indigo-400': "#818CF8";
    readonly 'indigo-500': "#6366F1";
    readonly 'indigo-600': "#4F46E5";
    readonly 'indigo-700': "#4338CA";
    readonly 'indigo-800': "#3730A3";
    readonly 'violet-300': "#C4B5FD";
    readonly 'violet-400': "#A78BFA";
    readonly 'violet-500': "#8B5CF6";
    readonly 'violet-600': "#7C3AED";
    readonly 'violet-700': "#6D28D9";
    readonly 'violet-800': "#5B21B6";
    readonly 'magenta-400': "#EE4FFF";
    readonly 'fuchsia-300': "#F0ABFC";
    readonly 'fuchsia-700': "#A21CAF";
    readonly 'fuchsia-800': "#86198F";
    readonly 'pink-400': "#F472B6";
    readonly 'pink-700': "#BE185D";
    readonly 'amber-300': "#FCD34D";
    readonly 'amber-400': "#FBBF24";
    readonly 'amber-500': "#F59E0B";
    readonly 'amber-700': "#B45309";
    readonly 'amber-800': "#92400E";
    readonly 'amber-900': "#78350F";
    readonly 'red-300': "#FCA5A5";
    readonly 'red-400': "#F87171";
    readonly 'red-500': "#EF4444";
    readonly 'red-700': "#B91C1C";
    readonly 'red-800': "#991B1B";
    readonly 'blue-300': "#93C5FD";
    readonly 'blue-400': "#60A5FA";
    readonly 'blue-700': "#1D4ED8";
    readonly 'blue-800': "#1E40AF";
    readonly 'teal-400': "#2DD4BF";
    readonly 'teal-500': "#14B8A6";
    readonly 'teal-600': "#0D9488";
    readonly 'teal-700': "#0F766E";
};
export type Primitive = keyof typeof primitives;
export type Hex = (typeof primitives)[Primitive];
/** Gradients built only from primitives: the teal-to-violet edge glow of the website. */
export declare const gradients: {
    readonly 'edge-dark': readonly ["teal-500", "violet-500"];
    readonly 'edge-light': readonly ["teal-600", "violet-600"];
};
export type Gradient = keyof typeof gradients;
/**
 * Brand palette (public presence, D-41): names for brand assets, mapped to primitives.
 * `night` and `paper` are the dark and light pages. `night` is vm-brand `base.dark.page` (B-54).
 */
export declare const brand: {
    readonly ink: "zinc-850";
    readonly night: "night-950";
    readonly paper: "zinc-50";
    readonly line: "zinc-200";
    readonly sub: "zinc-600";
    readonly faint: "zinc-500";
    readonly emerald: "emerald-500";
    readonly 'emerald-print': "emerald-700";
    readonly indigo: "indigo-500";
    readonly 'indigo-print': "indigo-600";
    readonly 'glow-teal': "teal-500";
    readonly 'glow-red': "red-500";
    readonly 'glow-violet': "violet-500";
};
/**
 * - `default`: the public look (D-41). Light = velimir-mueller.de, dark = code-context dashboard.
 * - `contrast`: the same family for low vision. Text ≥ 7:1 (AAA), control borders ≥ 4.5:1,
 *   no glow, no grid, no tinted fills.
 */
export declare const themeNames: readonly ["default", "contrast"];
export declare const modes: readonly ["light", "dark"];
export type ThemeName = (typeof themeNames)[number];
export type Mode = (typeof modes)[number];
export declare const semanticColorNames: readonly ["bg", "surface", "surface-2", "border", "border-subtle", "border-control", "fg", "fg-muted", "fg-subtle", "accent", "accent-fg", "accent-text", "accent-2", "accent-2-fg", "accent-2-text", "success", "warning", "danger", "info", "ring"];
export type SemanticColor = (typeof semanticColorNames)[number];
/**
 * A colour with alpha, built from a primitive. Rendered as
 * `color-mix(in srgb, var(--<primitive>) <alpha>%, transparent)`.
 */
export interface Tint {
    readonly tint: Primitive;
    readonly alpha: number;
}
export interface ShadowLayer {
    readonly x: number;
    readonly y: number;
    readonly blur: number;
    readonly spread?: number;
    readonly inset?: boolean;
    readonly color: Tint;
}
/** A shadow is `none` or a list of layers. */
export type Shadow = 'none' | readonly ShadowLayer[];
export interface TextureGrid {
    readonly line: Tint;
    readonly size: number;
}
/** A soft radial glow at the page edge (07c: teal top-left, red top-centre, violet top-right). */
export interface EdgeGlow {
    readonly color: Tint;
    /** Centre, in percent of the page box. */
    readonly x: number;
    readonly y: number;
    /** Radii, in percent of the page box. */
    readonly rx: number;
    readonly ry: number;
}
export interface SemanticEffects {
    readonly glow: Shadow;
    /** Page background glows. Keep them at the edges, never behind text. */
    readonly 'glow-edge': readonly EdgeGlow[] | 'none';
    readonly 'shadow-card-v': Shadow;
    readonly 'gradient-edge': Gradient;
    readonly 'texture-grid': TextureGrid | 'none';
    /** Share of `--service-accent` in the service badge fill, in percent. */
    readonly 'badge-service-tint': number;
}
export declare const semanticEffectNames: readonly ["glow", "glow-edge", "shadow-card-v", "gradient-edge", "texture-grid", "badge-service-tint"];
export interface ThemeMode {
    readonly colors: Readonly<Record<SemanticColor, Primitive>>;
    readonly effects: SemanticEffects;
}
export declare const themes: {
    readonly default: {
        readonly light: {
            readonly colors: {
                readonly bg: "zinc-50";
                readonly surface: "white";
                readonly 'surface-2': "zinc-100";
                readonly border: "zinc-200";
                readonly 'border-subtle': "zinc-100";
                readonly 'border-control': "zinc-450";
                readonly fg: "zinc-850";
                readonly 'fg-muted': "zinc-600";
                readonly 'fg-subtle': "zinc-550";
                readonly accent: "zinc-850";
                readonly 'accent-fg': "zinc-50";
                readonly 'accent-text': "zinc-850";
                readonly 'accent-2': "indigo-600";
                readonly 'accent-2-fg': "white";
                readonly 'accent-2-text': "indigo-600";
                readonly success: "emerald-700";
                readonly warning: "amber-700";
                readonly danger: "red-700";
                readonly info: "blue-700";
                readonly ring: "indigo-600";
            };
            readonly effects: {
                readonly glow: readonly [{
                    readonly x: 0;
                    readonly y: 0;
                    readonly blur: 20;
                    readonly spread: 2;
                    readonly color: Tint;
                }];
                readonly 'glow-edge': readonly EdgeGlow[];
                readonly 'shadow-card-v': readonly [{
                    readonly x: 0;
                    readonly y: 1;
                    readonly blur: 2;
                    readonly color: Tint;
                }, {
                    readonly x: 0;
                    readonly y: 4;
                    readonly blur: 24;
                    readonly spread: -8;
                    readonly color: Tint;
                }];
                readonly 'gradient-edge': "edge-light";
                readonly 'texture-grid': {
                    readonly line: Tint;
                    readonly size: 32;
                };
                readonly 'badge-service-tint': 8;
            };
        };
        readonly dark: {
            readonly colors: {
                readonly bg: "night-950";
                readonly surface: "graphite-900";
                readonly 'surface-2': "graphite-850";
                readonly border: "night-700";
                readonly 'border-subtle': "graphite-750";
                readonly 'border-control': "graphite-500";
                readonly fg: "zinc-200";
                readonly 'fg-muted': "zinc-400";
                readonly 'fg-subtle': "graphite-400";
                readonly accent: "zinc-50";
                readonly 'accent-fg': "graphite-950";
                readonly 'accent-text': "zinc-50";
                readonly 'accent-2': "indigo-400";
                readonly 'accent-2-fg': "graphite-950";
                readonly 'accent-2-text': "indigo-400";
                readonly success: "emerald-500";
                readonly warning: "amber-400";
                readonly danger: "red-400";
                readonly info: "blue-400";
                readonly ring: "indigo-400";
            };
            readonly effects: {
                readonly glow: readonly [{
                    readonly x: 0;
                    readonly y: 0;
                    readonly blur: 40;
                    readonly spread: -10;
                    readonly color: Tint;
                }];
                readonly 'glow-edge': readonly EdgeGlow[];
                readonly 'shadow-card-v': "none";
                readonly 'gradient-edge': "edge-dark";
                readonly 'texture-grid': {
                    readonly line: Tint;
                    readonly size: 32;
                };
                readonly 'badge-service-tint': 14;
            };
        };
    };
    readonly contrast: {
        readonly light: {
            readonly colors: {
                readonly bg: "white";
                readonly surface: "white";
                readonly 'surface-2': "zinc-50";
                readonly border: "zinc-400";
                readonly 'border-subtle': "zinc-200";
                readonly 'border-control': "zinc-700";
                readonly fg: "zinc-950";
                readonly 'fg-muted': "zinc-700";
                readonly 'fg-subtle': "zinc-600";
                readonly accent: "zinc-950";
                readonly 'accent-fg': "white";
                readonly 'accent-text': "zinc-950";
                readonly 'accent-2': "indigo-800";
                readonly 'accent-2-fg': "white";
                readonly 'accent-2-text': "indigo-800";
                readonly success: "emerald-800";
                readonly warning: "amber-900";
                readonly danger: "red-800";
                readonly info: "blue-800";
                readonly ring: "indigo-800";
            };
            readonly effects: {
                readonly glow: "none";
                readonly 'glow-edge': "none";
                readonly 'shadow-card-v': "none";
                readonly 'gradient-edge': "edge-light";
                readonly 'texture-grid': "none";
                readonly 'badge-service-tint': 0;
            };
        };
        readonly dark: {
            readonly colors: {
                readonly bg: "black";
                readonly surface: "zinc-950";
                readonly 'surface-2': "zinc-850";
                readonly border: "zinc-600";
                readonly 'border-subtle': "zinc-800";
                readonly 'border-control': "zinc-400";
                readonly fg: "white";
                readonly 'fg-muted': "zinc-300";
                readonly 'fg-subtle': "zinc-350";
                readonly accent: "white";
                readonly 'accent-fg': "black";
                readonly 'accent-text': "white";
                readonly 'accent-2': "indigo-300";
                readonly 'accent-2-fg': "black";
                readonly 'accent-2-text': "indigo-300";
                readonly success: "emerald-300";
                readonly warning: "amber-300";
                readonly danger: "red-300";
                readonly info: "blue-300";
                readonly ring: "indigo-300";
            };
            readonly effects: {
                readonly glow: "none";
                readonly 'glow-edge': "none";
                readonly 'shadow-card-v': "none";
                readonly 'gradient-edge': "edge-dark";
                readonly 'texture-grid': "none";
                readonly 'badge-service-tint': 0;
            };
        };
    };
};
/** Mode a theme uses when the user has stored no choice. Both themes follow the OS. */
export declare const defaultMode: {
    readonly default: "system";
    readonly contrast: "system";
};
/**
 * Component tokens point to semantic tokens (`var(--x)`) or to static tokens.
 * Values are CSS strings with `var()` references only. No colour literals.
 */
export declare const components: {
    readonly 'btn-primary-bg': "var(--accent)";
    readonly 'btn-primary-fg': "var(--accent-fg)";
    readonly 'btn-primary-ring': "var(--ring)";
    readonly 'btn-secondary-bg': "transparent";
    readonly 'btn-secondary-fg': "var(--fg)";
    readonly 'btn-secondary-border': "var(--border-control)";
    readonly 'link-fg': "var(--accent-text)";
    readonly 'link-fg-hover': "var(--accent-2-text)";
    readonly 'card-bg': "var(--surface)";
    readonly 'card-border': "var(--border)";
    readonly 'card-shadow': "var(--shadow-card-v)";
    readonly 'card-radius': "var(--radius-card)";
    readonly 'input-bg': "var(--surface)";
    readonly 'input-border': "var(--border-control)";
    readonly 'select-border': "var(--border-control)";
    readonly 'checkbox-border': "var(--border-control)";
    readonly 'input-border-focus': "var(--ring)";
    readonly 'badge-service-bg': "color-mix(in oklch, var(--service-accent) var(--badge-service-tint), transparent)";
    readonly 'badge-service-fg': "var(--service-accent-text)";
    readonly 'focus-outline': "2px solid var(--ring)";
    readonly 'focus-outline-offset': "2px";
};
export type ComponentToken = keyof typeof components;
export declare const serviceNames: readonly ["studio", "llm", "vision", "pulse", "identity", "widgets"];
export type ServiceName = (typeof serviceNames)[number];
/**
 * Calm accents from the dashboard status colours. Emerald stays reserved for status (07c).
 * `dark`: the 400 step, text in dark modes and the accent stripe in all modes.
 * `light`: the 700/800 step, text in light modes. Meta repos use `--gradient-edge`.
 */
export declare const services: {
    readonly studio: {
        readonly dark: "indigo-400";
        readonly light: "indigo-700";
    };
    readonly llm: {
        readonly dark: "violet-400";
        readonly light: "violet-700";
    };
    readonly vision: {
        readonly dark: "pink-400";
        readonly light: "pink-700";
    };
    readonly pulse: {
        readonly dark: "amber-400";
        readonly light: "amber-800";
    };
    readonly identity: {
        readonly dark: "blue-400";
        readonly light: "blue-700";
    };
    readonly widgets: {
        readonly dark: "teal-400";
        readonly light: "teal-700";
    };
};
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
export declare const groupNames: readonly ["flagship", "lab", "ops", "venture"];
export type GroupName = (typeof groupNames)[number];
/**
 * Old group names, kept for one release. `data-group="vlm"` renders as `lab` and
 * `data-group="rig"` as `ops` (magenta; the amber rig of B-30 is superseded).
 * @deprecated Use `lab` and `ops`. The aliases go away in the next minor release.
 */
export declare const deprecatedGroupAliases: {
    readonly vlm: "lab";
    readonly rig: "ops";
};
/** @deprecated Use `GroupName`. */
export type DeprecatedGroupName = keyof typeof deprecatedGroupAliases;
/** A group name or a deprecated alias, resolved to the group name. */
export declare function resolveGroupName(name: GroupName | DeprecatedGroupName): GroupName;
/** `accent` is `accent-2`, `accent-2-text` and `ring`. `fg` is text on an `accent` fill. */
export interface GroupMode {
    readonly accent: Primitive;
    readonly fg: Primitive;
}
/**
 * The group style (vm-brand B-46). Groups without a style in brand.json get `plainGroupStyle`.
 * - `display`: font stack for titles, the wordmark and numbers.
 * - `corner`: factor on every radius (1 = the D-41 radii, 0.15 = near-square).
 * - `ornament`: draw the inset rule and corner brackets.
 * - `tracking`: extra letter spacing of display text.
 */
export interface GroupStyle {
    readonly display: string;
    readonly corner: number;
    readonly ornament: boolean;
    readonly tracking: string;
}
export interface Group {
    /** Graphic fill for glows, lines and banner art. Never text. */
    readonly fill: Primitive;
    readonly themes: Readonly<Record<ThemeName, Readonly<Record<Mode, GroupMode>>>>;
    readonly style: GroupStyle;
}
/** The semantic colours a group decides. Theme blocks never declare these directly. */
export declare const groupColorNames: readonly ["accent-2", "accent-2-fg", "accent-2-text", "ring"];
export type GroupColor = (typeof groupColorNames)[number];
/** The CSS custom properties a group style sets, with `--group-` in front. */
export declare const groupStyleNames: readonly ["font-display", "corner", "ornament", "tracking"];
/** Display fonts a brand.json style may name. Load the font yourself (SIL OFL 1.1). */
export declare const groupDisplayFonts: {
    readonly cinzel: "\"Cinzel\", \"Trajan Pro\", Georgia, \"Times New Roman\", serif";
};
/** The style of a group without a brand.json style: the D-41 look. */
export declare const plainGroupStyle: GroupStyle;
/**
 * `contrast` theme accents (text ≥ 7:1). brand.json has no contrast theme, so they live here.
 * `dark` sits on the black contrast page, `light` on the white one.
 */
export declare const contrastAccents: {
    readonly flagship: {
        readonly light: "indigo-800";
        readonly dark: "indigo-300";
    };
    readonly lab: {
        readonly light: "violet-800";
        readonly dark: "violet-300";
    };
    readonly ops: {
        readonly light: "fuchsia-800";
        readonly dark: "fuchsia-300";
    };
    readonly venture: {
        readonly light: "amber-900";
        readonly dark: "amber-300";
    };
};
/** The primitive with this hex value (first in declaration order). Throws when none exists. */
export declare function primitiveForHex(hex: string): Primitive;
export declare const groups: Readonly<Record<GroupName, Group>>;
/** Missing `data-group` = this group. Its values equal the theme values above. */
export declare const defaultGroup: GroupName;
export declare const motion: {
    readonly duration: {
        readonly instant: "80ms";
        readonly fast: "150ms";
        readonly base: "200ms";
        readonly slow: "320ms";
        readonly warp: "550ms";
    };
    /** Every duration under `prefers-reduced-motion: reduce`. */
    readonly reducedDuration: "0.01ms";
    readonly ease: {
        readonly standard: "cubic-bezier(0.2, 0, 0, 1)";
        readonly 'out-expo': "cubic-bezier(0.16, 1, 0.3, 1)";
        readonly in: "cubic-bezier(0.4, 0, 1, 1)";
        readonly 'spring-soft': "cubic-bezier(0.34, 1.56, 0.64, 1)";
    };
};
/** Radii of the public family (07c §Shapes): snippet 10, dashboard panel 14, card 24, page 32. */
export declare const radii: {
    readonly sm: "0.625rem";
    readonly md: "0.875rem";
    readonly card: "1.5rem";
    readonly page: "2rem";
    readonly pill: "9999px";
};
/**
 * - `display`: Space Mono. Headlines, the wordmark, labels and pills (capitals, wide tracking).
 * - `sans`: Inter. Body text and UI controls.
 * - `mono`: JetBrains Mono. Code blocks, logs and diffs. Chosen over Space Mono for code:
 *   taller x-height (0.55 vs 0.50 em) at a narrower advance (0.600 vs 0.612 em), so more
 *   code fits a line and small sizes stay legible. Both are SIL OFL 1.1.
 *   Short `$ command` snippets may use `display` to match the website.
 */
export declare const fonts: {
    readonly display: {
        readonly family: "Space Mono";
        readonly weights: readonly [400, 700];
        readonly stack: "\"Space Mono\", ui-monospace, SFMono-Regular, Menlo, monospace";
    };
    readonly sans: {
        readonly family: "Inter";
        readonly weights: readonly [400, 600];
        readonly stack: "Inter, system-ui, -apple-system, \"Segoe UI\", sans-serif";
    };
    readonly mono: {
        readonly family: "JetBrains Mono";
        readonly weights: readonly [400, 700];
        readonly stack: "\"JetBrains Mono\", ui-monospace, SFMono-Regular, Menlo, monospace";
    };
};
export interface TextStep {
    readonly size: number;
    readonly lineHeight: number;
    readonly tracking?: string;
}
/** Type scale in px. The CSS uses rem (px / 16). `xs` is the label step, `5xl` the display step. */
export declare const textScale: {
    readonly xs: {
        readonly size: 12;
        readonly lineHeight: 16;
        readonly tracking: "0.15em";
    };
    readonly sm: {
        readonly size: 13;
        readonly lineHeight: 20;
    };
    readonly base: {
        readonly size: 15;
        readonly lineHeight: 24;
    };
    readonly lg: {
        readonly size: 17;
        readonly lineHeight: 26;
    };
    readonly xl: {
        readonly size: 20;
        readonly lineHeight: 28;
    };
    readonly '2xl': {
        readonly size: 24;
        readonly lineHeight: 30;
    };
    readonly '3xl': {
        readonly size: 30;
        readonly lineHeight: 36;
    };
    readonly '5xl': {
        readonly size: 48;
        readonly lineHeight: 52;
        readonly tracking: "-0.04em";
    };
};
