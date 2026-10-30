import { defineComponent, h } from 'vue';
export const pillKinds = ['neutral', 'accent', 'solid'];
/**
 * Pill label (Figma: Badge). A `span` by default. `as="button"` makes it a focusable
 * toggle or filter chip; then `disabled` blocks the click.
 */
export const SwPill = defineComponent((props, { emit, slots }) => () => {
    const tag = props.as ?? 'span';
    const cls = ['sw-pill', `sw-pill--${props.kind}`, { 'sw-is-disabled': props.disabled }];
    if (tag === 'span') {
        return h('span', { class: cls, 'aria-disabled': props.disabled ? 'true' : undefined }, slots.default?.());
    }
    return h('button', {
        class: cls,
        type: 'button',
        disabled: props.disabled,
        onClick: (event) => {
            if (!props.disabled)
                emit('click', event);
        }
    }, slots.default?.());
}, {
    name: 'SwPill',
    props: {
        kind: { type: String, default: 'neutral' },
        as: { type: String, default: 'span' },
        disabled: { type: Boolean, default: false }
    },
    emits: { click: (_event) => true }
});
