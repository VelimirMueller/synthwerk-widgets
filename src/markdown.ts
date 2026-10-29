// Safe Markdown for model output. It builds Vue nodes, never an HTML string, so raw HTML
// in the answer stays text (no raw HTML sink anywhere). A small subset only: paragraphs, line
// breaks, headings, lists, quotes, fenced code, inline code, bold, italic and links.
// Links open only http, https and mailto URLs; any other link shows its text only.
import { h, type VNode } from 'vue'

export type MdNode = VNode | string

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** The URL when it is absolute and uses a safe protocol, else `null`. */
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// One alternative per inline form. The order sets the priority at the same position.
const INLINE =
  /(`+)([\s\S]+?)\1|\*\*(\S(?:[\s\S]*?\S)?)\*\*|__(\S(?:[\s\S]*?\S)?)__|\*(\S(?:[\s\S]*?\S)?)\*|(?<![\p{L}\p{N}_])_(\S(?:[\s\S]*?\S)?)_(?![\p{L}\p{N}_])|\[([^\]\n]+)\]\(([^)\s]+)\)/gu

/** Inline Markdown to nodes. `\n` becomes a line break. */
export function renderInline(text: string): MdNode[] {
  const out: MdNode[] = []
  const pushText = (value: string) => {
    value.split('\n').forEach((line, i) => {
      if (i > 0) out.push(h('br'))
      if (line !== '') out.push(line)
    })
  }
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > last) pushText(text.slice(last, index))
    const [whole, , code, strong1, strong2, em1, em2, linkText, linkUrl] = match
    if (code !== undefined) {
      out.push(h('code', code))
    } else if (strong1 !== undefined || strong2 !== undefined) {
      out.push(h('strong', renderInline(strong1 ?? strong2 ?? '')))
    } else if (em1 !== undefined || em2 !== undefined) {
      out.push(h('em', renderInline(em1 ?? em2 ?? '')))
    } else if (linkText !== undefined && linkUrl !== undefined) {
      const href = safeHref(linkUrl)
      out.push(
        href
          ? h(
              'a',
              { href, target: '_blank', rel: 'noopener noreferrer nofollow' },
              renderInline(linkText)
            )
          : linkText
      )
    } else {
      pushText(whole)
    }
    last = index + whole.length
  }
  if (last < text.length) pushText(text.slice(last))
  return out
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/
const ORDERED = /^\s{0,3}(\d{1,9})[.)]\s+(.*)$/
const QUOTE = /^\s{0,3}>\s?(.*)$/

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    QUOTE.test(line)
  )
}

/** Block Markdown to nodes. An open code fence (still streaming) runs to the end. */
export function renderMarkdown(source: string): VNode[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: VNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      i++
      continue
    }
    const fence = FENCE.exec(line)
    if (fence) {
      const marker = fence[1] ?? '```'
      const body: string[] = []
      i++
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith(marker)) {
        body.push(lines[i] ?? '')
        i++
      }
      i++
      blocks.push(h('pre', h('code', body.join('\n'))))
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push(h('p', { class: 'sw-md-heading' }, renderInline(heading[2] ?? '')))
      i++
      continue
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = !BULLET.test(line)
      const pattern = ordered ? ORDERED : BULLET
      const items: VNode[] = []
      const start = ordered ? Number(ORDERED.exec(line)?.[1] ?? 1) : 1
      while (i < lines.length) {
        const item = pattern.exec(lines[i] ?? '')
        if (!item) break
        items.push(h('li', renderInline((ordered ? item[2] : item[1]) ?? '')))
        i++
      }
      blocks.push(ordered ? h('ol', start === 1 ? {} : { start }, items) : h('ul', items))
      continue
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length) {
        const q = QUOTE.exec(lines[i] ?? '')
        if (!q) break
        quoted.push(q[1] ?? '')
        i++
      }
      blocks.push(h('blockquote', renderMarkdown(quoted.join('\n'))))
      continue
    }
    const para: string[] = [line]
    i++
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !isBlockStart(lines[i] ?? '')) {
      para.push(lines[i] ?? '')
      i++
    }
    blocks.push(h('p', renderInline(para.join('\n'))))
  }
  return blocks
}
