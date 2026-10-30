import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// @synthwerk/sdk, tokens and ui-vue are vendored (not on npm yet). The lock records the
// synthwerk-sdk commit and a SHA-256 per file. A hand edit or a partial sync fails here:
// run scripts/vendor/sync.sh <commit> instead.

const ROOT = join(import.meta.dirname, '..', '..')
const lock = JSON.parse(readFileSync(join(ROOT, 'vendor', 'synthwerk-sdk.lock.json'), 'utf8')) as {
  source: { repository: string; commit: string }
  packages: { name: string; version: string; vendor: string; files: Record<string, string> }[]
}
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )
}

describe('vendored synthwerk-sdk packages', () => {
  it('lock - one synthwerk-sdk commit, three packages', () => {
    expect(lock.source.repository).toBe('https://github.com/VelimirMueller/synthwerk-sdk.git')
    expect(lock.source.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(lock.packages.map((p) => p.name)).toEqual([
      '@synthwerk/sdk',
      '@synthwerk/tokens',
      '@synthwerk/ui-vue'
    ])
  })

  it.each(lock.packages.map((p) => [p.name, p] as const))(
    '%s - consumed from vendor/ and unchanged',
    (name, entry) => {
      const dir = join(ROOT, entry.vendor)
      expect(pkg.dependencies[name]).toBe(`file:${entry.vendor}`)
      const vendored = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        name: string
        version: string
      }
      expect([vendored.name, vendored.version]).toEqual([entry.name, entry.version])
      const actual = Object.fromEntries(
        walk(dir)
          .map((file) => [relative(dir, file).split(sep).join('/'), file] as const)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([n, file]) => [n, createHash('sha256').update(readFileSync(file)).digest('hex')])
      )
      expect(actual).toEqual(entry.files)
    }
  )
})
