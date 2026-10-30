// Subresource Integrity of the embed bundles (widgets#32, widgets#39). Run after `pnpm build`:
//   node scripts/release/sri.ts
// Writes dist/release.json (version, then path, size and integrity of each bundle) and prints
// the snippets. In GitHub Actions it also writes them to the job summary. A release copies the
// integrity values into its notes: the bytes behind a versioned URL never change.
import { readFileSync } from 'node:fs'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { releaseOf, snippetOf, summaryOf } from './bundles.ts'

const ROOT = join(import.meta.dirname, '..', '..')

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')) as { version: string }
const release = releaseOf(pkg.version, (file) => {
  try {
    return readFileSync(join(ROOT, 'dist', file))
  } catch {
    throw new Error(`dist/${file} is missing: run pnpm build first`)
  }
})
await writeFile(join(ROOT, 'dist', 'release.json'), `${JSON.stringify(release, null, 2)}\n`)

for (const b of release.bundles) {
  console.log(
    `${b.name}\n  path      ${b.path}\n  bytes     ${b.bytes}\n  integrity ${b.integrity}\n  ${snippetOf(b)}\n`
  )
}

const summary = process.env.GITHUB_STEP_SUMMARY
if (summary) await appendFile(summary, summaryOf(release))
