import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { BUNDLES, releaseOf, snippetOf, summaryOf } from '../../scripts/release/bundles.ts'

const files: Record<string, Uint8Array> = {
  'synthwerk-chat.js': new TextEncoder().encode('chat bundle'),
  'synthwerk-vision.js': new TextEncoder().encode('vision bundle, longer')
}
const read = (file: string): Uint8Array => {
  const bytes = files[file]
  if (!bytes) throw new Error(`no ${file}`)
  return bytes
}
const sha384 = (bytes: Uint8Array) =>
  `sha384-${createHash('sha384').update(bytes).digest('base64')}`

describe('release record (widgets#39)', () => {
  it('both bundles - versioned path, size and sha384 integrity of each', () => {
    const release = releaseOf('0.2.0', read)
    expect(release.version).toBe('0.2.0')
    expect(release.bundles).toEqual([
      {
        name: 'chat',
        file: 'synthwerk-chat.js',
        path: '/widgets/v0.2.0/synthwerk-chat.js',
        bytes: 11,
        integrity: sha384(read('synthwerk-chat.js'))
      },
      {
        name: 'vision',
        file: 'synthwerk-vision.js',
        path: '/widgets/v0.2.0/synthwerk-vision.js',
        bytes: 21,
        integrity: sha384(read('synthwerk-vision.js'))
      }
    ])
  })

  it('every bundle of the vite build is in the list', () => {
    expect(BUNDLES.map((b) => b.file)).toEqual(['synthwerk-chat.js', 'synthwerk-vision.js'])
  })

  it('version not X.Y.Z - refused', () => {
    expect(() => releaseOf('0.2', read)).toThrow(/not X.Y.Z/)
    expect(() => releaseOf('v0.2.0', read)).toThrow(/not X.Y.Z/)
  })

  it('a bundle is missing - the read error stops the release', () => {
    expect(() =>
      releaseOf('0.2.0', (f) => {
        if (f === 'synthwerk-vision.js') throw new Error('dist/synthwerk-vision.js is missing')
        return read(f)
      })
    ).toThrow(/synthwerk-vision.js is missing/)
  })

  it('snippet - module script with integrity and crossorigin', () => {
    const [, vision] = releaseOf('0.2.0', read).bundles
    if (!vision) throw new Error('no vision bundle')
    expect(snippetOf(vision)).toBe(
      `<script type="module" src="https://<widget host>/widgets/v0.2.0/synthwerk-vision.js" integrity="${vision.integrity}" crossorigin="anonymous"></script>`
    )
  })

  it('job summary - one row per bundle with path, size and integrity, then both snippets', () => {
    const release = releaseOf('0.2.0', read)
    const summary = summaryOf(release)
    for (const b of release.bundles) {
      expect(summary).toContain(
        `| ${b.name} | \`${b.path}\` | ${b.bytes} bytes | \`${b.integrity}\` |`
      )
      expect(summary).toContain(snippetOf(b))
    }
  })
})
