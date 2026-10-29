// Inline SVG icons as Vue nodes. Decorative: the buttons carry the label.
import { h, type VNode } from 'vue'

function icon(paths: string[]): VNode {
  return h(
    'svg',
    {
      class: 'sw-icon',
      viewBox: '0 0 24 24',
      width: 20,
      height: 20,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false'
    },
    paths.map((d) => h('path', { d }))
  )
}

export const chatIcon = (): VNode => icon(['M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z'])

export const closeIcon = (): VNode => icon(['M6 6l12 12', 'M18 6 6 18'])
