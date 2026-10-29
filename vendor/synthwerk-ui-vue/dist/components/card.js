import { defineComponent, h } from 'vue';
import { safeHref } from "../url.js";
/**
 * Content card. Slots: `default` (body) and `footer`. With `href` the whole card is a link.
 * A disabled link card loses `href`, so it leaves the tab order.
 * `href` goes through `safeHref()`: an unsafe URL (`javascript:`, `data:` …) renders a plain
 * article, never a link.
 */
export const SwCard = defineComponent((props, { slots }) => () => {
    const children = [
        props.eyebrow ? h('span', { class: 'sw-card__eyebrow' }, props.eyebrow) : null,
        props.title ? h('h3', { class: 'sw-card__title' }, props.title) : null,
        slots.default ? h('div', { class: 'sw-card__body' }, slots.default()) : null,
        slots.footer ? h('div', { class: 'sw-card__footer' }, slots.footer()) : null
    ];
    const href = safeHref(props.href);
    return h(href ? 'a' : 'article', {
        class: ['sw-card', { 'sw-is-disabled': props.disabled }],
        href: href && !props.disabled ? href : undefined,
        'aria-disabled': props.disabled ? 'true' : undefined
    }, children);
}, {
    name: 'SwCard',
    props: {
        eyebrow: { type: String, default: '' },
        title: { type: String, default: '' },
        href: { type: String, default: '' },
        disabled: { type: Boolean, default: false }
    }
});
