export declare const pillKinds: readonly ["neutral", "accent", "solid"];
export type PillKind = (typeof pillKinds)[number];
export interface PillProps {
    kind?: PillKind;
    as?: 'span' | 'button';
    disabled?: boolean;
}
/**
 * Pill label (Figma: Badge). A `span` by default. `as="button"` makes it a focusable
 * toggle or filter chip; then `disabled` blocks the click.
 */
export declare const SwPill: import("vue").DefineSetupFnComponent<PillProps, {
    click: (_event: MouseEvent) => true;
}, {}, PillProps & {
    onClick?: (_event: MouseEvent) => any;
}, import("vue").PublicProps>;
