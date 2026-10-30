import { defineComponent, h, onBeforeUnmount, ref, watch } from 'vue';
/** How long the copy button says "Copied". */
export const COPIED_MS = 2000;
export const terminalTones = ['default', 'muted', 'success', 'danger'];
/**
 * `command`: "$ command" with a copy button. `lines`: a session with window chrome
 * (three grey dots, never traffic lights) and output lines.
 */
export const SwTerminalSnippet = defineComponent((props, { emit }) => {
    const copied = ref(false);
    let timer;
    const reset = () => {
        clearTimeout(timer);
        copied.value = false;
    };
    watch(() => props.command, reset);
    onBeforeUnmount(reset);
    const copy = async () => {
        const clipboard = globalThis.navigator?.clipboard;
        const command = props.command ?? '';
        if (props.disabled || !clipboard)
            return;
        try {
            await clipboard.writeText(command);
        }
        catch {
            // Denied (no secure context or no permission): keep the "Copy" label, emit nothing.
            return;
        }
        reset();
        copied.value = true;
        timer = setTimeout(reset, COPIED_MS);
        emit('copy', command);
    };
    return () => {
        const state = { 'sw-is-disabled': props.disabled };
        const lines = props.lines ?? [];
        if (lines.length === 0) {
            return h('div', { class: ['sw-terminal', 'sw-terminal--command', state] }, [
                h('span', { class: 'sw-terminal__prompt', 'aria-hidden': 'true' }, '$'),
                h('code', { class: 'sw-terminal__command' }, props.command),
                props.command
                    ? h('button', {
                        class: 'sw-terminal__copy',
                        type: 'button',
                        disabled: props.disabled,
                        'aria-label': copied.value ? 'Command copied' : 'Copy command',
                        onClick: copy
                    }, copied.value ? 'Copied' : 'Copy')
                    : null
            ]);
        }
        return h('div', { class: ['sw-terminal', 'sw-terminal--session', state] }, [
            h('div', { class: 'sw-terminal__chrome', 'aria-hidden': 'true' }, [
                h('span', { class: 'sw-terminal__dot' }),
                h('span', { class: 'sw-terminal__dot' }),
                h('span', { class: 'sw-terminal__dot' }),
                props.title ? h('span', { class: 'sw-terminal__title' }, props.title) : null
            ]),
            h('pre', { class: 'sw-terminal__output' }, lines.map((line) => h('code', {
                class: [
                    'sw-terminal__line',
                    line.tone && line.tone !== 'default' ? `sw-terminal__line--${line.tone}` : null
                ]
            }, line.text)))
        ]);
    };
}, {
    name: 'SwTerminalSnippet',
    props: {
        command: { type: String, default: '' },
        lines: { type: Array, default: () => [] },
        title: { type: String, default: '' },
        disabled: { type: Boolean, default: false }
    },
    emits: { copy: (_command) => true }
});
