/** URL schemes a component may put into `href`. Relative URLs and `#fragment` are always allowed. */
export declare const SAFE_SCHEMES: readonly ["http", "https", "mailto", "tel"];
/**
 * Returns a link target that cannot run script, or `undefined`.
 * - Checks the scheme with all whitespace and control characters removed, so `java\tscript:`
 *   and `\u0000javascript:` are seen as `javascript:`.
 * - Returns the URL as the browser parses it: ends trimmed, tab and newline removed.
 *   Inner spaces of a relative path stay.
 * - Allows relative URLs, `#fragment`, `http:`, `https:`, `mailto:` and `tel:`.
 * - Everything else (`javascript:`, `data:`, `vbscript:`, unknown schemes) gives `undefined`.
 */
export declare function safeHref(value: string | null | undefined): string | undefined;
