export declare const buttonKinds: readonly ["primary", "secondary", "ghost"];
export declare const buttonSizes: readonly ["md", "sm"];
export type ButtonKind = (typeof buttonKinds)[number];
export type ButtonSize = (typeof buttonSizes)[number];
export interface ButtonProps {
    kind?: ButtonKind;
    size?: ButtonSize;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}
/** Pill button. One primary per view. A disabled button emits no click. */
export declare const SwButton: import("vue").DefineSetupFnComponent<ButtonProps, {
    click: (_event: MouseEvent) => true;
}, {}, ButtonProps & {
    onClick?: (_event: MouseEvent) => any;
}, import("vue").PublicProps>;
