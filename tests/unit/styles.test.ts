import { describe, expect, it } from 'vitest'
import { applyStyles, scopeToWidget } from '../../src/styles.ts'

describe('scopeToWidget', () => {
  it(':root selectors - point at the widget root', () => {
    expect(scopeToWidget(':root, [data-theme="default"] { --bg: #fff }')).toBe(
      '.sw-root, [data-theme="default"] { --bg: #fff }'
    )
    expect(scopeToWidget(':where(:root, [data-theme]) {}')).toBe(
      ':where(.sw-root, [data-theme]) {}'
    )
  })
})

describe('applyStyles', () => {
  it('two roots - one shared constructable sheet', () => {
    const a = document.createElement('div').attachShadow({ mode: 'open' })
    const b = document.createElement('div').attachShadow({ mode: 'open' })
    applyStyles(a, '.x { color: red }')
    applyStyles(b, '.x { color: red }')
    expect(a.adoptedStyleSheets[0]).toBe(b.adoptedStyleSheets[0])
  })

  it('no constructable sheets - a style element', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' })
    const original = CSSStyleSheet.prototype.replaceSync
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
      value: undefined,
      configurable: true
    })
    try {
      applyStyles(root, '.y { color: blue }')
    } finally {
      Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
        value: original,
        configurable: true
      })
    }
    expect(root.querySelector('style')?.textContent).toBe('.y { color: blue }')
  })
})
