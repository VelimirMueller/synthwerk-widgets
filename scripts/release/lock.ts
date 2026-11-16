// The lock of the widget host (widgets#32): releases.json lists every released version with the
// size and integrity of each bundle. The host image serves exactly these versions, and its build
// checks each downloaded release asset against this record. Pure functions: fetch.ts does the I/O,
// tests/unit/lock.test.ts checks them.
import {
  BUNDLES,
  type BundleRelease,
  integrityOf,
  REQUIRED_BUNDLES,
  type Release
} from './bundles.ts'

/** Store of record: the GitHub Release of tag v<version> holds the bundle files. */
export const RELEASE_BASE = 'https://github.com/VelimirMueller/synthwerk-widgets/releases/download'

const VERSION = /^\d+\.\d+\.\d+$/
const INTEGRITY = /^sha384-[A-Za-z0-9+/]{64}$/

/** Parse and check releases.json. Every entry has the shape of dist/release.json. */
export function parseLock(text: string): Release[] {
  const data: unknown = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('releases.json must be a list of releases')
  const seen = new Set<string>()
  return data.map((entry: unknown, i): Release => {
    const where = `releases.json entry ${i}`
    if (!isRecord(entry)) throw new Error(`${where} is not an object`)
    const { version, bundles } = entry
    if (typeof version !== 'string' || !VERSION.test(version)) {
      throw new Error(`${where}: version must be X.Y.Z`)
    }
    if (seen.has(version)) throw new Error(`${where}: version ${version} is listed twice`)
    seen.add(version)
    // Older releases have no chat frame page: they list the first REQUIRED_BUNDLES files only.
    if (
      !Array.isArray(bundles) ||
      bundles.length < REQUIRED_BUNDLES ||
      bundles.length > BUNDLES.length
    ) {
      throw new Error(
        `${where}: v${version} must list ${REQUIRED_BUNDLES} to ${BUNDLES.length} bundles`
      )
    }
    return {
      version,
      bundles: BUNDLES.slice(0, bundles.length).map(({ name, file }, j): BundleRelease => {
        const b: unknown = bundles[j]
        if (!isRecord(b) || b.name !== name || b.file !== file) {
          throw new Error(`${where}: bundle ${j} of v${version} must be ${name} (${file})`)
        }
        if (b.path !== `/widgets/v${version}/${file}`) {
          throw new Error(`${where}: ${file} of v${version} has a wrong path`)
        }
        if (typeof b.bytes !== 'number' || !Number.isInteger(b.bytes) || b.bytes <= 0) {
          throw new Error(`${where}: ${file} of v${version} has no size`)
        }
        if (typeof b.integrity !== 'string' || !INTEGRITY.test(b.integrity)) {
          throw new Error(`${where}: ${file} of v${version} has no sha384 integrity`)
        }
        return { name, file, path: b.path, bytes: b.bytes, integrity: b.integrity }
      })
    }
  })
}

/** Throws unless the bytes are exactly the recorded bundle. */
export function verifyBundle(bundle: BundleRelease, bytes: Uint8Array): void {
  if (bytes.length !== bundle.bytes || integrityOf(bytes) !== bundle.integrity) {
    throw new Error(
      `${bundle.path}: got ${bytes.length} bytes ${integrityOf(bytes)}, recorded ${bundle.bytes} bytes ${bundle.integrity}`
    )
  }
}

/** Download URL of one bundle in the GitHub Release of its version. */
export function assetUrl(version: string, file: string, base = RELEASE_BASE): string {
  return `${base}/v${version}/${file}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
