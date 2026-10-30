/**
 * The URL without trailing slashes. A loop, not `/\/+$/`: that regex backtracks on a long
 * run of slashes followed by another character (polynomial time, CodeQL js/polynomial-redos).
 */
export declare function trimSlash(url: string): string;
