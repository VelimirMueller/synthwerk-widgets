import { defineComponent, h } from 'vue';
export const dividerKinds = ['line', 'label', 'vertical'];
/** 1 px separator. `label` splits a list ("or"), `vertical` splits items in a row. */
export const SwDivider = defineComponent((props) => () => {
    const cls = ['sw-divider', `sw-divider--${props.kind}`, { 'sw-is-disabled': props.disabled }];
    if (props.kind === 'line')
        return h('hr', { class: cls });
    return h('div', {
        class: cls,
        role: 'separator',
        'aria-orientation': props.kind === 'vertical' ? 'vertical' : 'horizontal'
    }, props.kind === 'label' ? props.label : undefined);
}, {
    name: 'SwDivider',
    props: {
        kind: { type: String, default: 'line' },
        label: { type: String, default: 'or' },
        disabled: { type: Boolean, default: false }
    }
});
