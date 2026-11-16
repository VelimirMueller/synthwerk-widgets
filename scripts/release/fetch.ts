// Collect the files of the widget host image (widgets#32). Runs inside the image build (Dockerfile):
//   node scripts/release/fetch.ts --lock releases.json --out /out [--dist dist]
// Every version in releases.json: download each bundle from its GitHub Release and check its size
// and integrity against the lock. Any mismatch or download error fails the build.
// --dist (test images only, never published): also serve the local build under its version, when
// releases.json does not list that version yet. The version comes from dist/release.json.
// Writes <out>/widgets/v<X.Y.Z>/<file> for nginx (image/nginx.conf).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { Release } from './bundles.ts'
import { assetUrl, parseLock, verifyBundle } from './lock.ts'

const { values } = parseArgs({
  options: {
    lock: { type: 'string' },
    out: { type: 'string' },
    dist: { type: 'string' }
  },
  strict: true
})
if (!values.lock || !values.out) {
  throw new Error('usage: fetch.ts --lock <releases.json> --out <dir> [--dist <dir>]')
}
const out = values.out

async function place(release: Release, read: (file: string) => Promise<Uint8Array>) {
  const dir = join(out, 'widgets', `v${release.version}`)
  await mkdir(dir, { recursive: true })
  for (const bundle of release.bundles) {
    const bytes = await read(bundle.file)
    verifyBundle(bundle, bytes)
    await writeFile(join(dir, bundle.file), bytes)
    console.log(`${bundle.path} ${bundle.bytes} bytes ${bundle.integrity}`)
  }
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

const released = parseLock(await readFile(values.lock, 'utf8'))
for (const release of released) {
  await place(release, (file) => download(assetUrl(release.version, file)))
}

let served = released.length
if (values.dist) {
  const dist = values.dist
  const local = JSON.parse(await readFile(join(dist, 'release.json'), 'utf8')) as Release
  if (released.some((r) => r.version === local.version)) {
    console.log(`v${local.version} is released: the image serves the release asset, not dist/`)
  } else {
    await place(local, async (file) => new Uint8Array(await readFile(join(dist, file))))
    served++
  }
}
if (served === 0) throw new Error('releases.json lists no version: the image would serve nothing')
