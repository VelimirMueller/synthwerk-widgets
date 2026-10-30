import { defineComponent, h } from 'vue';
export const inputTypes = ['text', 'email', 'password', 'search', 'tel', 'url'];
/** Single-line text field with `v-model`. `invalid` sets `aria-invalid`; pair it with a hint text. */
export const SwInput = defineComponent((props, { emit }) => () => h('input', {
    class: 'sw-input',
    type: props.type,
    value: props.modelValue,
    disabled: props.disabled,
    'aria-invalid': props.invalid ? 'true' : undefined,
    onInput: (event) => emit('update:modelValue', event.target.value)
}), {
    name: 'SwInput',
    props: {
        modelValue: { type: String, default: '' },
        type: { type: String, default: 'text' },
        invalid: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false }
    },
    emits: { 'update:modelValue': (_value) => true }
});
