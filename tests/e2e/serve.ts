// Static server for the test page: demo/ and the built dist/. It sends a strict CSP header,
// so the e2e test proves the widget runs without 'unsafe-inline' or 'unsafe-eval'.
// /api/* is not served here: the Playwright test answers it.
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const PORT = Number(process.env.PORT ?? 4174)
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json'
}
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const file = path === '/' ? '/demo/index.html' : path
  const safe = normalize(file)
  if (!/^\/(demo|dist)\/[\w.-]+$/.test(safe)) {
    res.writeHead(404).end()
    return
  }
  try {
    const body = await readFile(join(ROOT, safe))
    res
      .writeHead(200, {
        'content-type': TYPES[extname(safe)] ?? 'application/octet-stream',
        'content-security-policy': CSP,
        'cache-control': 'no-store'
      })
      .end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`test page on http://127.0.0.1:${PORT}/`)
})
