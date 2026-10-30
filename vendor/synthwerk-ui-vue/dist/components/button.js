import { defineComponent, h } from 'vue';
export const buttonKinds = ['primary', 'secondary', 'ghost'];
export const buttonSizes = ['md', 'sm'];
/** Pill button. One primary per view. A disabled button emits no click. */
export const SwButton = defineComponent((props, { emit, slots }) => () => h('button', {
    class: ['sw-button', `sw-button--${props.kind}`, `sw-button--${props.size}`],
    type: props.type,
    disabled: props.disabled,
    onClick: (event) => {
        if (!props.disabled)
            emit('click', event);
    }
}, slots.default?.()), {
    name: 'SwButton',
    props: {
        kind: { type: String, default: 'primary' },
        size: { type: String, default: 'md' },
        type: { type: String, default: 'button' },
        disabled: { type: Boolean, default: false }
    },
    emits: { click: (_event) => true }
});
