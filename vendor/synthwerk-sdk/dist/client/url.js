/**
 * The URL without trailing slashes. A loop, not `/\/+$/`: that regex backtracks on a long
 * run of slashes followed by another character (polynomial time, CodeQL js/polynomial-redos).
 */
export function trimSlash(url) {
    let end = url.length;
    while (end > 0 && url.charCodeAt(end - 1) === 47)
        end--;
    return url.slice(0, end);
}
