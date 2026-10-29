import { defaultMode, themeNames } from "./tokens.js";
/** localStorage key shared by studio, widgets and SDK apps (synthwerk-sdk §5). */
export const PREFS_KEY = 'sw:prefs:v1';
export const isThemeName = (value) => typeof value === 'string' && themeNames.includes(value);
/**
 * Effective mode for a theme (brand doc §2 Q1).
 * 1. A stored `light` or `dark` always wins.
 * 2. A stored `system` follows the OS.
 * 3. Nothing stored: `defaultMode[theme]` (both themes follow the OS).
 */
export function resolveMode(theme, stored, systemDark) {
    if (stored === 'light' || stored === 'dark')
        return stored;
    const choice = stored ?? defaultMode[theme];
    if (choice === 'system')
        return systemDark ? 'dark' : 'light';
    return choice;
}
/**
 * Inline this script in `<head>` before any stylesheet paints the page.
 * It copies the stored choice to `data-theme` and `data-mode` on `<html>`.
 * The CSS in `tokens.css` does the rest, also without JavaScript.
 */
export const firstPaintScript = `(function(){try{var p=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}')||{},d=document.documentElement;if(p.theme==='default'||p.theme==='contrast')d.setAttribute('data-theme',p.theme);if(p.mode==='light'||p.mode==='dark'||p.mode==='system')d.setAttribute('data-mode',p.mode)}catch(e){}})()`;
