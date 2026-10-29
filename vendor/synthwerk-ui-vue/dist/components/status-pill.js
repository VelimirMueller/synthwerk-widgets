import { defineComponent, h } from 'vue';
export const statuses = ['live', 'building', 'planned', 'blocked'];
const labels = {
    live: 'Live',
    building: 'Building',
    planned: 'Planned',
    blocked: 'Blocked'
};
/** The current status. Live = success (emerald), building = warning, planned = fg-subtle, blocked = danger. */
export const SwStatusPill = defineComponent((props, { slots }) => () => h('span', {
    class: [
        'sw-status-pill',
        `sw-status-pill--${props.status}`,
        { 'sw-is-disabled': props.disabled }
    ],
    'aria-disabled': props.disabled ? 'true' : undefined
}, slots.default?.() ?? labels[props.status]), {
    name: 'SwStatusPill',
    props: {
        status: { type: String, required: true },
        disabled: { type: Boolean, default: false }
    }
});
