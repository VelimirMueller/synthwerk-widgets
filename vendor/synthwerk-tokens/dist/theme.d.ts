import { type Mode, type ThemeName } from './tokens.ts';
/** Stored mode choice. `undefined` means "the user stored nothing". */
export type StoredMode = Mode | 'system' | undefined;
/** localStorage key shared by studio, widgets and SDK apps (synthwerk-sdk §5). */
export declare const PREFS_KEY = "sw:prefs:v1";
export declare const isThemeName: (value: unknown) => value is ThemeName;
/**
 * Effective mode for a theme (brand doc §2 Q1).
 * 1. A stored `light` or `dark` always wins.
 * 2. A stored `system` follows the OS.
 * 3. Nothing stored: `defaultMode[theme]` (both themes follow the OS).
 */
export declare function resolveMode(theme: ThemeName, stored: StoredMode, systemDark: boolean): Mode;
/**
 * Inline this script in `<head>` before any stylesheet paints the page.
 * It copies the stored choice to `data-theme` and `data-mode` on `<html>`.
 * The CSS in `tokens.css` does the rest, also without JavaScript.
 */
export declare const firstPaintScript = "(function(){try{var p=JSON.parse(localStorage.getItem('sw:prefs:v1')||'{}')||{},d=document.documentElement;if(p.theme==='default'||p.theme==='contrast')d.setAttribute('data-theme',p.theme);if(p.mode==='light'||p.mode==='dark'||p.mode==='system')d.setAttribute('data-mode',p.mode)}catch(e){}})()";
