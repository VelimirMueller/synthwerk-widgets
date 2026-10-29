/** WCAG 2.2 contrast helpers (sRGB relative luminance). */
const HEX = /^#[0-9a-f]{6}$/i;
function channel(value) {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
/** Relative luminance of a `#RRGGBB` colour, 0 (black) to 1 (white). */
export function luminance(hex) {
    if (!HEX.test(hex))
        throw new TypeError(`Expected #RRGGBB, got "${hex}"`);
    const n = Number.parseInt(hex.slice(1), 16);
    return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 0xff) + 0.0722 * channel(n & 0xff);
}
/** Contrast ratio of two colours, 1 to 21. The order of the arguments does not matter. */
export function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Grade for normal text: AAA ≥ 7, AA ≥ 4.5, AA-large (and UI) ≥ 3. */
export function grade(ratio) {
    if (ratio >= 7)
        return 'AAA';
    if (ratio >= 4.5)
        return 'AA';
    if (ratio >= 3)
        return 'AA-large';
    return 'fail';
}
/** Rounds a ratio to two decimals, like the brand doc tables. */
export const round2 = (ratio) => Math.round(ratio * 100) / 100;
