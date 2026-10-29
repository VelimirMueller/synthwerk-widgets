/** Renders the token data to CSS and JSON. Pure functions, no file access. */
import { type DeprecatedGroupName, type Gradient, type GroupName, type Mode, type Primitive, type SemanticColor, type SemanticEffects, type Shadow, type TextureGrid, type ThemeName, type Tint } from './tokens.ts';
export declare function renderTint(t: Tint): string;
export declare function renderShadow(shadow: Shadow): string;
/** Edge glows as stacked radial gradients that fade to transparent. */
export declare function renderEdgeGlow(glows: SemanticEffects['glow-edge']): string;
export declare function renderGradient(name: Gradient): string;
/** A square grid: horizontal and vertical 1 px lines, `size` px apart (07c: 32 px). */
export declare function renderTexture(texture: TextureGrid | 'none'): string;
/** CSS value of every semantic effect token. */
export declare function renderEffects(effects: SemanticEffects): Record<keyof SemanticEffects, string>;
/**
 * Switches on `<html>` (or on any element, for a scoped preview):
 * - `data-theme="default|contrast"`. Missing = `default`.
 * - `data-mode="light|dark|system"`. Missing = nothing stored.
 *
 * Nothing stored: both themes follow the OS. A stored choice always wins (brand doc §2 Q1).
 *
 * Nested scopes (a `[data-theme]` element below `<html>`) should set `data-mode` explicitly.
 */
export declare const selectors: {
    readonly default: {
        readonly light: ":root, [data-theme=\"default\"]";
        readonly dark: ":root:not([data-theme=\"contrast\"])[data-mode=\"dark\"], [data-theme=\"default\"][data-mode=\"dark\"]";
        readonly systemDark: ":root:not([data-theme=\"contrast\"]):not([data-mode=\"light\"]), [data-theme=\"default\"]:not([data-mode=\"light\"])";
    };
    readonly contrast: {
        readonly light: "[data-theme=\"contrast\"]";
        readonly dark: "[data-theme=\"contrast\"][data-mode=\"dark\"]";
        readonly systemDark: "[data-theme=\"contrast\"]:not([data-mode=\"light\"])";
    };
};
/** The selector of a group rule: the group and its deprecated aliases. */
export declare function groupSelector(group: GroupName): string;
export declare function renderTokensCss(): string;
export declare function renderTailwindCss(): string;
export interface ResolvedThemeMode {
    readonly colors: Record<SemanticColor, string>;
    readonly refs: Record<SemanticColor, Primitive>;
    readonly effects: Record<keyof SemanticEffects, string>;
}
/** Semantic colours of one theme × mode × group as primitive names. */
export declare function resolveRefs(theme: ThemeName, mode: Mode, group?: GroupName | DeprecatedGroupName): Record<SemanticColor, Primitive>;
/** Semantic colours of one theme × mode × group as hex values. */
export declare function resolveColors(theme: ThemeName, mode: Mode, group?: GroupName | DeprecatedGroupName): Record<SemanticColor, string>;
export declare function renderTokensJson(): string;
