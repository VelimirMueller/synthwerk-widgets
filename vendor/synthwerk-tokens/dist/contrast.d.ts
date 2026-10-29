/** WCAG 2.2 contrast helpers (sRGB relative luminance). */
/** Relative luminance of a `#RRGGBB` colour, 0 (black) to 1 (white). */
export declare function luminance(hex: string): number;
/** Contrast ratio of two colours, 1 to 21. The order of the arguments does not matter. */
export declare function contrastRatio(a: string, b: string): number;
export type Grade = 'AAA' | 'AA' | 'AA-large' | 'fail';
/** Grade for normal text: AAA ≥ 7, AA ≥ 4.5, AA-large (and UI) ≥ 3. */
export declare function grade(ratio: number): Grade;
/** Rounds a ratio to two decimals, like the brand doc tables. */
export declare const round2: (ratio: number) => number;
