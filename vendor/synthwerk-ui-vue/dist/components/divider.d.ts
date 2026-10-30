export declare const dividerKinds: readonly ["line", "label", "vertical"];
export type DividerKind = (typeof dividerKinds)[number];
export interface DividerProps {
    kind?: DividerKind;
    label?: string;
    disabled?: boolean;
}
/** 1 px separator. `label` splits a list ("or"), `vertical` splits items in a row. */
export declare const SwDivider: import("vue").DefineSetupFnComponent<DividerProps, {}, {}, DividerProps & {}, import("vue").PublicProps>;
