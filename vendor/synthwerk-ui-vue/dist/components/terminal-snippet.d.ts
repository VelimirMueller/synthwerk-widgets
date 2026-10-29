/** How long the copy button says "Copied". */
export declare const COPIED_MS = 2000;
export declare const terminalTones: readonly ["default", "muted", "success", "danger"];
export type TerminalTone = (typeof terminalTones)[number];
export interface TerminalLine {
    readonly text: string;
    readonly tone?: TerminalTone;
}
export interface TerminalSnippetProps {
    command?: string;
    lines?: readonly TerminalLine[];
    title?: string;
    disabled?: boolean;
}
/**
 * `command`: "$ command" with a copy button. `lines`: a session with window chrome
 * (three grey dots, never traffic lights) and output lines.
 */
export declare const SwTerminalSnippet: import("vue").DefineSetupFnComponent<TerminalSnippetProps, {
    copy: (_command: string) => true;
}, {}, TerminalSnippetProps & {
    onCopy?: (_command: string) => any;
}, import("vue").PublicProps>;
