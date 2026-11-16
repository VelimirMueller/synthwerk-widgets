import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { notesOf, releaseOf } from '../../scripts/release/bundles.ts'
import { assetUrl, parseLock, verifyBundle } from '../../scripts/release/lock.ts'

const files: Record<string, Uint8Array> = {
  'synthwerk-chat.js': new TextEncoder().encode('chat bundle'),
  'synthwerk-vision.js': new TextEncoder().encode('vision bundle, longer'),
  'synthwerk-chat-frame.html': new TextEncoder().encode('<!doctype html>')
}
const read = (file: string): Uint8Array => {
  const bytes = files[file]
  if (!bytes) throw new Error(`no ${file}`)
  return bytes
}
const release = releaseOf('0.3.0', read)
const lockOf = (entries: unknown) => JSON.stringify(entries)

describe('widget host lock releases.json (widgets#32)', () => {
  it('the committed releases.json parses', () => {
    const text = readFileSync(join(import.meta.dirname, '..', '..', 'releases.json'), 'utf8')
    expect(() => parseLock(text)).not.toThrow()
  })

  it('an entry with the shape of dist/release.json - parsed as is', () => {
    expect(parseLock(lockOf([release]))).toEqual([release])
  })

  it('a release before the chat frame (v0.3.0) - chat and vision only, parsed (widgets#33)', () => {
    const old = { ...release, bundles: release.bundles.slice(0, 2) }
    expect(parseLock(lockOf([old]))).toEqual([old])
  })

  it('not a list, or a version listed twice - refused', () => {
    expect(() => parseLock(lockOf(release))).toThrow(/list of releases/)
    expect(() => parseLock(lockOf([release, release]))).toThrow(/listed twice/)
  })

  it('bad version, missing bundle, wrong order or wrong path - refused', () => {
    expect(() => parseLock(lockOf([{ ...release, version: 'v0.3.0' }]))).toThrow(/X.Y.Z/)
    expect(() => parseLock(lockOf([{ ...release, bundles: release.bundles.slice(0, 1) }]))).toThrow(
      /must list 2 to 3 bundles/
    )
    const extra = [...release.bundles, release.bundles[0]]
    expect(() => parseLock(lockOf([{ ...release, bundles: extra }]))).toThrow(/must list 2 to 3/)
    const swapped = [...release.bundles].reverse()
    expect(() => parseLock(lockOf([{ ...release, bundles: swapped }]))).toThrow(/must be chat/)
    const [chat, vision] = release.bundles
    const moved = { ...chat, path: '/widgets/v0.2.0/synthwerk-chat.js' }
    expect(() => parseLock(lockOf([{ ...release, bundles: [moved, vision] }]))).toThrow(
      /wrong path/
    )
  })

  it('no size or no sha384 integrity - refused', () => {
    const [chat, vision] = release.bundles
    for (const bad of [
      { ...chat, bytes: 0 },
      { ...chat, bytes: '11' },
      { ...chat, integrity: 'sha256-abc' },
      { ...chat, integrity: undefined }
    ]) {
      expect(() => parseLock(lockOf([{ ...release, bundles: [bad, vision] }]))).toThrow(
        /no size|no sha384/
      )
    }
  })

  it('verifyBundle - the recorded bytes pass, other bytes fail', () => {
    const [chat] = release.bundles
    if (!chat) throw new Error('no chat bundle')
    expect(() => verifyBundle(chat, read('synthwerk-chat.js'))).not.toThrow()
    expect(() => verifyBundle(chat, new TextEncoder().encode('chat bundlE'))).toThrow(
      /\/widgets\/v0.3.0\/synthwerk-chat.js: got 11 bytes/
    )
    expect(() => verifyBundle(chat, new TextEncoder().encode('chat bundle!'))).toThrow(/got 12/)
  })

  it('assetUrl - the file in the GitHub Release of tag v<version>', () => {
    expect(assetUrl('0.3.0', 'synthwerk-chat.js')).toBe(
      'https://github.com/VelimirMueller/synthwerk-widgets/releases/download/v0.3.0/synthwerk-chat.js'
    )
  })

  it('release notes - the summary, then the releases.json entry that parses back', () => {
    const notes = notesOf(release)
    expect(notes).toContain('### Embed bundles v0.3.0')
    const json = notes.split('```json\n')[1]?.split('\n```')[0]
    expect(parseLock(`[${json}]`)).toEqual([release])
  })
})
