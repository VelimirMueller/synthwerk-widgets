/** URL schemes a component may put into `href`. Relative URLs and `#fragment` are always allowed. */
export const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'];
/** C0 controls, space, DEL and C1 controls. Browsers ignore them inside a scheme. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the controls are what we strip
const IGNORED = /[\u0000- \u007F-\u009F]/g;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
/** What the WHATWG URL parser drops: C0 controls and space at the ends, tab and newline anywhere. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the controls are what we strip
const URL_TRIM = /^[\u0000-\u0020]+|[\u0000-\u0020]+$|[\t\n\r]/g;
/**
 * Returns a link target that cannot run script, or `undefined`.
 * - Checks the scheme with all whitespace and control characters removed, so `java\tscript:`
 *   and `\u0000javascript:` are seen as `javascript:`.
 * - Returns the URL as the browser parses it: ends trimmed, tab and newline removed.
 *   Inner spaces of a relative path stay.
 * - Allows relative URLs, `#fragment`, `http:`, `https:`, `mailto:` and `tel:`.
 * - Everything else (`javascript:`, `data:`, `vbscript:`, unknown schemes) gives `undefined`.
 */
export function safeHref(value) {
    if (!value)
        return undefined;
    const url = value.replace(URL_TRIM, '');
    const bare = value.replace(IGNORED, '');
    if (url === '' || bare === '')
        return undefined;
    const scheme = bare.match(SCHEME)?.[1]?.toLowerCase();
    if (scheme === undefined)
        return url;
    return SAFE_SCHEMES.includes(scheme) ? url : undefined;
}
