/** Renders the token data to CSS and JSON. Pure functions, no file access. */
import { brand, components, defaultGroup, defaultMode, deprecatedGroupAliases, fonts, gradients, groupColorNames, groupNames, groups, modes, motion, primitives, radii, resolveGroupName, semanticColorNames, serviceNames, services, textScale, themeNames, themes } from "./tokens.js";
const v = (name) => `var(--${name})`;
const rem = (px) => `${px / 16}rem`;
const decl = (name, value) => `  --${name}: ${value};`;
const block = (selector, lines, indent = '') => `${indent}${selector} {\n${lines.map((l) => indent + l).join('\n')}\n${indent}}`;
export function renderTint(t) {
    return `color-mix(in srgb, ${v(t.tint)} ${t.alpha}%, transparent)`;
}
export function renderShadow(shadow) {
    if (shadow === 'none')
        return 'none';
    return shadow
        .map((l) => {
        const parts = [`${l.x}px`, `${l.y}px`, `${l.blur}px`];
        if (l.spread !== undefined)
            parts.push(`${l.spread}px`);
        return `${l.inset ? 'inset ' : ''}${parts.join(' ')} ${renderTint(l.color)}`;
    })
        .join(', ');
}
/** Edge glows as stacked radial gradients that fade to transparent. */
export function renderEdgeGlow(glows) {
    if (glows === 'none')
        return 'none';
    return glows
        .map((g) => `radial-gradient(${g.rx}% ${g.ry}% at ${g.x}% ${g.y}%, ${renderTint(g.color)}, transparent)`)
        .join(', ');
}
export function renderGradient(name) {
    const [from, to] = gradients[name];
    return `linear-gradient(135deg, ${v(from)}, ${v(to)})`;
}
/** A square grid: horizontal and vertical 1 px lines, `size` px apart (07c: 32 px). */
export function renderTexture(texture) {
    if (texture === 'none')
        return 'none';
    const line = renderTint(texture.line);
    const tile = `0 0 / ${texture.size}px ${texture.size}px`;
    return [
        `linear-gradient(${line} 1px, transparent 1px) ${tile}`,
        `linear-gradient(90deg, ${line} 1px, transparent 1px) ${tile}`
    ].join(', ');
}
/** CSS value of every semantic effect token. */
export function renderEffects(effects) {
    return {
        glow: renderShadow(effects.glow),
        'glow-edge': renderEdgeGlow(effects['glow-edge']),
        'shadow-card-v': renderShadow(effects['shadow-card-v']),
        'gradient-edge': v(effects['gradient-edge']),
        'texture-grid': renderTexture(effects['texture-grid']),
        'badge-service-tint': `${effects['badge-service-tint']}%`
    };
}
// ---------------------------------------------------------------- selectors
/**
 * Switches on `<html>` (or on any element, for a scoped preview):
 * - `data-theme="default|contrast"`. Missing = `default`.
 * - `data-mode="light|dark|system"`. Missing = nothing stored.
 *
 * Nothing stored: both themes follow the OS. A stored choice always wins (brand doc §2 Q1).
 *
 * Nested scopes (a `[data-theme]` element below `<html>`) should set `data-mode` explicitly.
 */
export const selectors = {
    default: {
        light: ':root, [data-theme="default"]',
        dark: ':root:not([data-theme="contrast"])[data-mode="dark"], [data-theme="default"][data-mode="dark"]',
        systemDark: ':root:not([data-theme="contrast"]):not([data-mode="light"]), [data-theme="default"]:not([data-mode="light"])'
    },
    contrast: {
        light: '[data-theme="contrast"]',
        dark: '[data-theme="contrast"][data-mode="dark"]',
        systemDark: '[data-theme="contrast"]:not([data-mode="light"])'
    }
};
/** Every element that can carry its own theme scope. */
const SCOPE = ':root, [data-theme], [data-group], [data-service]';
const isGroupColor = (name) => groupColorNames.includes(name);
/**
 * The group colours of `group`, as `var(--group-<group>-…)` references, and its style:
 * `--group-font-display`, `--group-corner` (radius factor), `--group-ornament` (0 or 1)
 * and `--group-tracking`. Every group declares all four, so a nested group resets them.
 */
function groupLines(group) {
    const accent = v(`group-${group}-accent`);
    const style = groups[group].style;
    return [
        decl('accent-2', accent),
        decl('accent-2-fg', v(`group-${group}-fg`)),
        decl('accent-2-text', accent),
        decl('ring', accent),
        decl('group-fill', v(groups[group].fill)),
        decl('group-font-display', style.display),
        decl('group-corner', String(style.corner)),
        decl('group-ornament', style.ornament ? '1' : '0'),
        decl('group-tracking', style.tracking)
    ];
}
/** The selector of a group rule: the group and its deprecated aliases. */
export function groupSelector(group) {
    const names = [
        group,
        ...Object.entries(deprecatedGroupAliases)
            .filter(([, target]) => target === group)
            .map(([alias]) => alias)
    ];
    return names
        .map((n) => `[data-group="${n}"], [data-group="${n}"] [data-theme]:not([data-group])`)
        .join(', ');
}
// ---------------------------------------------------------------- tokens.css
function themeModeLines(theme, mode) {
    const tm = themes[theme][mode];
    const lines = semanticColorNames
        .filter((name) => !isGroupColor(name))
        .map((name) => decl(name, v(tm.colors[name])));
    for (const group of groupNames) {
        const g = groups[group].themes[theme][mode];
        lines.push(decl(`group-${group}-accent`, v(g.accent)));
        lines.push(decl(`group-${group}-fg`, v(g.fg)));
    }
    for (const [name, value] of Object.entries(renderEffects(tm.effects)))
        lines.push(decl(name, value));
    for (const service of serviceNames) {
        const s = services[service];
        lines.push(decl(`service-${service}-text`, v(mode === 'dark' ? s.dark : s.light)));
    }
    lines.push(`  color-scheme: ${mode};`);
    return lines;
}
function staticLines() {
    const lines = [];
    for (const [name, hex] of Object.entries(primitives))
        lines.push(decl(name, hex));
    for (const name of Object.keys(gradients))
        lines.push(decl(name, renderGradient(name)));
    for (const [name, value] of Object.entries(motion.duration))
        lines.push(decl(`duration-${name}`, value));
    for (const [name, value] of Object.entries(motion.ease))
        lines.push(decl(`motion-ease-${name}`, value));
    for (const [name, value] of Object.entries(radii))
        lines.push(decl(`radius-${name}`, value));
    for (const [name, font] of Object.entries(fonts))
        lines.push(decl(`font-${name}`, font.stack));
    for (const [name, step] of Object.entries(textScale)) {
        lines.push(decl(`text-${name}`, rem(step.size)));
        lines.push(decl(`text-${name}-line-height`, rem(step.lineHeight)));
    }
    return lines;
}
export function renderTokensCss() {
    const out = [
        '/* @synthwerk/tokens — generated from src/tokens.ts. Do not edit. */',
        '',
        '/* 1. Primitives and static tokens. Components never use primitives directly. */',
        block(':root', staticLines()),
        '',
        '/* 2. Semantic tokens: theme × mode. */'
    ];
    for (const theme of themeNames) {
        out.push(`/* ${theme} · light */`, block(selectors[theme].light, themeModeLines(theme, 'light')));
    }
    for (const theme of themeNames) {
        out.push(`/* ${theme} · dark, stored choice */`);
        out.push(block(selectors[theme].dark, themeModeLines(theme, 'dark')));
    }
    out.push('/* OS dark mode: only when the stored choice is "system" or nothing. */');
    out.push('@media (prefers-color-scheme: dark) {');
    for (const theme of themeNames) {
        out.push(block(selectors[theme].systemDark, themeModeLines(theme, 'dark'), '  '));
    }
    out.push('}', '');
    out.push('/* 2b. Group accent and style (VM. studio). Values: vm-brand brand.json (brand-groups.json). */', '/* Deprecated aliases for one release: vlm = lab, rig = ops. */');
    out.push(block(':where(:root, [data-theme], [data-group])', groupLines(defaultGroup)));
    for (const group of groupNames)
        out.push(block(groupSelector(group), groupLines(group)));
    out.push('');
    out.push('/* 3. Service accent: the only per-service variation. */');
    out.push(block(':where(:root, [data-theme])', [
        decl('service-accent', v('accent')),
        decl('service-accent-text', v('accent-text'))
    ]));
    for (const service of serviceNames) {
        out.push(block(`[data-service="${service}"]`, [
            decl('service-accent', v(services[service].dark)),
            decl('service-accent-text', v(`service-${service}-text`))
        ]));
    }
    out.push('');
    out.push('/* 4. Component tokens. Declared on every scope, so nested themes resolve. */');
    out.push(block(SCOPE, Object.entries(components).map(([name, value]) => decl(name, value))));
    out.push('');
    out.push('/* 5. Motion safety. */');
    out.push('@media (prefers-reduced-motion: reduce) {');
    out.push(block(':root', Object.keys(motion.duration).map((name) => decl(`duration-${name}`, motion.reducedDuration)), '  '));
    out.push(block('*, *::before, *::after', [
        `  animation-duration: ${motion.reducedDuration} !important;`,
        '  animation-iteration-count: 1 !important;',
        `  transition-duration: ${motion.reducedDuration} !important;`,
        '  scroll-behavior: auto !important;'
    ], '  '));
    out.push('}');
    out.push('@media (hover: none) {');
    out.push(block('*', ['  backdrop-filter: none !important;'], '  '));
    out.push('}', '');
    return out.join('\n');
}
// ---------------------------------------------------------------- tailwind.css
/** Tailwind 4 `dark:` variant that follows the same rules as `tokens.css`. */
const darkVariant = `@custom-variant dark {
  &:where([data-mode="dark"], [data-mode="dark"] *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:where([data-mode="system"], [data-mode="system"] *, :root:not([data-mode]), :root:not([data-mode]) *) {
      @slot;
    }
  }
}`;
export function renderTailwindCss() {
    const lines = [];
    for (const name of semanticColorNames)
        lines.push(decl(`color-${name}`, v(name)));
    lines.push(decl('color-group', v('group-fill')));
    lines.push(decl('color-service', v('service-accent')));
    lines.push(decl('color-service-text', v('service-accent-text')));
    for (const [name, font] of Object.entries(fonts))
        lines.push(decl(`font-${name}`, font.stack));
    for (const [name, value] of Object.entries(radii))
        lines.push(decl(`radius-${name}`, value));
    lines.push(decl('shadow-card', v('shadow-card-v')));
    lines.push(decl('shadow-glow', v('glow')));
    for (const name of Object.keys(motion.ease))
        lines.push(decl(`ease-${name}`, v(`motion-ease-${name}`)));
    for (const [name, step] of Object.entries(textScale)) {
        lines.push(decl(`text-${name}`, rem(step.size)));
        lines.push(decl(`text-${name}--line-height`, rem(step.lineHeight)));
        if ('tracking' in step)
            lines.push(decl(`text-${name}--letter-spacing`, step.tracking));
    }
    return [
        '/* @synthwerk/tokens — Tailwind 4 mapping. Generated from src/tokens.ts. Do not edit. */',
        '/* Import after "tailwindcss" and "@synthwerk/tokens/tokens.css". */',
        '',
        darkVariant,
        '',
        block('@theme inline', lines),
        ''
    ].join('\n');
}
/** Semantic colours of one theme × mode × group as primitive names. */
export function resolveRefs(theme, mode, group = defaultGroup) {
    const g = groups[resolveGroupName(group)].themes[theme][mode];
    const groupRefs = {
        'accent-2': g.accent,
        'accent-2-fg': g.fg,
        'accent-2-text': g.accent,
        ring: g.accent
    };
    return { ...themes[theme][mode].colors, ...groupRefs };
}
/** Semantic colours of one theme × mode × group as hex values. */
export function resolveColors(theme, mode, group = defaultGroup) {
    const refs = resolveRefs(theme, mode, group);
    return Object.fromEntries(semanticColorNames.map((n) => [n, primitives[refs[n]]]));
}
export function renderTokensJson() {
    const resolved = Object.fromEntries(themeNames.map((theme) => [
        theme,
        Object.fromEntries(modes.map((mode) => [
            mode,
            {
                colors: resolveColors(theme, mode),
                refs: themes[theme][mode].colors,
                effects: renderEffects(themes[theme][mode].effects)
            }
        ]))
    ]));
    const data = {
        primitives,
        gradients,
        brand,
        themes: resolved,
        defaultMode,
        components,
        groups: Object.fromEntries(groupNames.map((group) => [
            group,
            {
                fill: primitives[groups[group].fill],
                themes: Object.fromEntries(themeNames.map((theme) => [
                    theme,
                    Object.fromEntries(modes.map((mode) => {
                        const g = groups[group].themes[theme][mode];
                        return [mode, { accent: primitives[g.accent], fg: primitives[g.fg] }];
                    }))
                ])),
                style: groups[group].style
            }
        ])),
        defaultGroup,
        groupAliases: deprecatedGroupAliases,
        services: Object.fromEntries(serviceNames.map((s) => [
            s,
            {
                dark: primitives[services[s].dark],
                light: primitives[services[s].light]
            }
        ])),
        motion,
        radii,
        fonts,
        textScale
    };
    return `${JSON.stringify(data, null, 2)}\n`;
}
