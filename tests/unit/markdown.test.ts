import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { renderMarkdown, safeHref } from '../../src/markdown.ts'

function render(source: string): HTMLElement {
  const wrapper = mount(defineComponent(() => () => h('div', renderMarkdown(source))))
  return wrapper.element as HTMLElement
}

describe('renderMarkdown', () => {
  it('raw HTML in model output - shown as text, no element made', () => {
    const el = render('Hi <img src=x onerror="alert(1)"> and <script>alert(2)</script>')
    expect(el.querySelector('img')).toBeNull()
    expect(el.querySelector('script')).toBeNull()
    expect(el.textContent).toBe('Hi <img src=x onerror="alert(1)"> and <script>alert(2)</script>')
  })

  it('HTML inside code and links - still text', () => {
    const el = render('`<b>x</b>` [<i>y</i>](https://example.com)\n\n```\n<div>z</div>\n```')
    expect(el.querySelector('b, i, div div')).toBeNull()
    expect(el.querySelector('code')?.textContent).toBe('<b>x</b>')
    expect(el.querySelector('a')?.textContent).toBe('<i>y</i>')
    expect(el.querySelector('pre code')?.textContent).toBe('<div>z</div>')
  })

  it('bold, italic, code and line breaks - inline elements', () => {
    const el = render('**bold** and *it* and _also_ and `c`\nnext line')
    expect(el.querySelector('strong')?.textContent).toBe('bold')
    expect([...el.querySelectorAll('em')].map((e) => e.textContent)).toEqual(['it', 'also'])
    expect(el.querySelector('code')?.textContent).toBe('c')
    expect(el.querySelectorAll('br')).toHaveLength(1)
  })

  it('underscores inside a word - stay text', () => {
    const el = render('snake_case_name')
    expect(el.querySelector('em')).toBeNull()
    expect(el.textContent).toBe('snake_case_name')
  })

  it('lists, ordered start, quote and heading - block elements', () => {
    const el = render('# Title\n\n- a\n- b\n\n3. c\n4. d\n\n> quoted\n\nplain')
    expect(el.querySelector('.sw-md-heading')?.textContent).toBe('Title')
    expect([...el.querySelectorAll('ul li')].map((e) => e.textContent)).toEqual(['a', 'b'])
    expect(el.querySelector('ol')?.getAttribute('start')).toBe('3')
    expect(el.querySelector('blockquote p')?.textContent).toBe('quoted')
    expect(el.querySelectorAll(':scope > p')).toHaveLength(2)
  })

  it('open code fence while streaming - code runs to the end', () => {
    const el = render('Look:\n```js\nconst a = 1')
    expect(el.querySelector('pre code')?.textContent).toBe('const a = 1')
  })

  it('safe link - opens in a new tab without opener', () => {
    const a = render('[docs](https://example.com/a?b=1)').querySelector('a')
    expect(a?.getAttribute('href')).toBe('https://example.com/a?b=1')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer nofollow')
  })

  it('javascript, data and relative links - text only, no anchor', () => {
    const el = render('[x](javascript:alert(1)) [y](data:text/html,hi) [z](/local)')
    expect(el.querySelector('a')).toBeNull()
    expect(el.textContent).toContain('x')
    expect(el.textContent).toContain('z')
  })

  it('unclosed marks - stay text', () => {
    expect(render('**half').textContent).toBe('**half')
  })
})

describe('safeHref', () => {
  it('protocols - only http, https and mailto pass', () => {
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com')
    expect(safeHref('http://example.com')).toBe('http://example.com/')
    expect(safeHref('JAVASCRIPT:alert(1)')).toBeNull()
    expect(safeHref('vbscript:x')).toBeNull()
    expect(safeHref('not a url')).toBeNull()
  })
})
