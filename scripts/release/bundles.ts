// The release record of the embed bundles (widgets#32, widgets#39): one entry per bundle, each
// with its versioned path and its Subresource Integrity value. Pure functions: sri.ts reads the
// files, tests/unit/release.test.ts checks the record and the summary.
import { createHash } from 'node:crypto'

/** Every bundle `pnpm build` makes (vite.config.ts), in the order the release lists them. */
export const BUNDLES = [
  { name: 'chat', file: 'synthwerk-chat.js' },
  { name: 'vision', file: 'synthwerk-vision.js' }
] as const

export type BundleName = (typeof BUNDLES)[number]['name']

export interface BundleRelease {
  name: BundleName
  file: string
  /** One immutable path per version on the widget host (docs/features/chat-widget.md). */
  path: string
  bytes: number
  integrity: string
}

export interface Release {
  version: string
  bundles: BundleRelease[]
}

const VERSION = /^\d+\.\d+\.\d+$/

export function integrityOf(bytes: Uint8Array): string {
  return `sha384-${createHash('sha384').update(bytes).digest('base64')}`
}

/** The release record. `read` gives the bytes of a file in dist/. */
export function releaseOf(version: string, read: (file: string) => Uint8Array): Release {
  if (!VERSION.test(version)) throw new Error(`package.json version ${version} is not X.Y.Z`)
  return {
    version,
    bundles: BUNDLES.map(({ name, file }) => {
      const bytes = read(file)
      return {
        name,
        file,
        path: `/widgets/v${version}/${file}`,
        bytes: bytes.length,
        integrity: integrityOf(bytes)
      }
    })
  }
}

/** The script tag of one bundle, with SRI. */
export function snippetOf(bundle: BundleRelease): string {
  return `<script type="module" src="https://<widget host>${bundle.path}" integrity="${bundle.integrity}" crossorigin="anonymous"></script>`
}

/** The GitHub job summary: path, size and integrity of every bundle, then the snippets. */
export function summaryOf(release: Release): string {
  return [
    `### Embed bundles v${release.version}`,
    '',
    '| Bundle | Path | Size | Integrity |',
    '|---|---|---|---|',
    ...release.bundles.map(
      (b) => `| ${b.name} | \`${b.path}\` | ${b.bytes} bytes | \`${b.integrity}\` |`
    ),
    '',
    '```html',
    ...release.bundles.map(snippetOf),
    '```',
    ''
  ].join('\n')
}
