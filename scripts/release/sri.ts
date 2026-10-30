// Subresource Integrity of the embed bundle (widgets#32). Run after `pnpm build`:
//   node scripts/release/sri.ts
// Writes dist/release.json (version, versioned path, integrity) and prints the snippet. In
// GitHub Actions it also writes the snippet to the job summary. A release copies the
// integrity into its notes: the bytes behind a versioned URL never change.
import { createHash } from 'node:crypto'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const FILE = 'synthwerk-chat.js'

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')) as { version: string }
if (!/^\d+\.\d+\.\d+$/.test(pkg.version))
  throw new Error(`package.json version ${pkg.version} is not X.Y.Z`)

const bundle = await readFile(join(ROOT, 'dist', FILE)).catch(() => {
  throw new Error(`dist/${FILE} is missing: run pnpm build first`)
})
const integrity = `sha384-${createHash('sha384').update(bundle).digest('base64')}`
// The URL scheme: one immutable path per version on the widget host (docs/features/chat-widget.md).
const path = `/widgets/v${pkg.version}/${FILE}`

const release = { version: pkg.version, file: FILE, path, bytes: bundle.length, integrity }
await writeFile(join(ROOT, 'dist', 'release.json'), `${JSON.stringify(release, null, 2)}\n`)

const snippet = `<script type="module" src="https://<widget host>${path}" integrity="${integrity}" crossorigin="anonymous"></script>`
console.log(
  `version   ${pkg.version}\npath      ${path}\nbytes     ${bundle.length}\nintegrity ${integrity}\n\n${snippet}`
)

const summary = process.env.GITHUB_STEP_SUMMARY
if (summary) {
  await appendFile(
    summary,
    [
      `### Embed bundle v${pkg.version}`,
      '',
      '| Field | Value |',
      '|---|---|',
      `| Path | \`${path}\` |`,
      `| Size | ${bundle.length} bytes |`,
      `| Integrity | \`${integrity}\` |`,
      '',
      '```html',
      snippet,
      '```',
      ''
    ].join('\n')
  )
}
