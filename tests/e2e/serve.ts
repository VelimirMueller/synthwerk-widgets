// Static server for the test page: demo/ and the built dist/. It sends a strict CSP header,
// so the e2e test proves the widget runs without 'unsafe-inline' or 'unsafe-eval'.
// /api/* is not served here: the Playwright test answers it.
// Iframe mode (widgets#33): the host page is http://127.0.0.1:<port>, the widget host is
// http://localhost:<port> (another origin, same server). The frame page gets the CSP of the
// widget host image (image/nginx.conf).
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

/** The widget host origin in the tests: same server, other host name. */
export const WIDGET_HOST = `http://localhost:${PORT}`

/** The host page of iframe mode loads the bundle from the widget host and frames it. */
const IFRAME_PAGE_CSP = [
  "default-src 'none'",
  `script-src 'self' ${WIDGET_HOST}`,
  "style-src 'self'",
  `connect-src 'self' ${WIDGET_HOST}`,
  `frame-src ${WIDGET_HOST}`,
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

/** Same as image/nginx.conf for the frame page. */
export const FRAME_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  'frame-ancestors *'
].join('; ')

function cspOf(path: string): string {
  if (path === '/demo/iframe.html') return IFRAME_PAGE_CSP
  if (path === '/dist/synthwerk-chat-frame.html') return FRAME_CSP
  return CSP
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  // The browser asks for an icon on its own. No icon: no 404 in the console.
  if (path === '/favicon.ico') {
    res.writeHead(204).end()
    return
  }
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
        'content-security-policy': cspOf(safe),
        'cache-control': 'no-store',
        // A module script from the widget host loads cross-origin only with this header.
        ...(safe.startsWith('/dist/') ? { 'access-control-allow-origin': '*' } : {})
      })
      .end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`test page on http://127.0.0.1:${PORT}/`)
})
