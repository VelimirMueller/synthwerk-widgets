export declare const inputTypes: readonly ["text", "email", "password", "search", "tel", "url"];
export type InputType = (typeof inputTypes)[number];
export interface InputProps {
    modelValue?: string;
    type?: InputType;
    invalid?: boolean;
    disabled?: boolean;
}
/** Single-line text field with `v-model`. `invalid` sets `aria-invalid`; pair it with a hint text. */
export declare const SwInput: import("vue").DefineSetupFnComponent<InputProps, {
    'update:modelValue': (_value: string) => true;
}, {}, InputProps & {
    "onUpdate:modelValue"?: (_value: string) => any;
}, import("vue").PublicProps>;
