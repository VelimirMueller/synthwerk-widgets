// Test pictures made in Node: no binary fixtures in the repo.
import { randomBytes } from 'node:crypto'
import { deflateSync } from 'node:zlib'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Buffer): number {
  let c = 0xffffffff
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

/**
 * An RGB PNG. `noise` true: random pixels, which neither PNG nor JPEG can compress, so
 * the widget must step down its JPEG quality and size.
 */
export function png(width: number, height: number, noise = false): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row = width * 3 + 1
  const raw = Buffer.alloc(row * height)
  for (let y = 0; y < height; y++) {
    if (noise) {
      randomBytes(width * 3).copy(raw, y * row + 1)
      continue
    }
    for (let x = 0; x < width; x++) {
      const at = y * row + 1 + x * 3
      raw[at] = (x * 255) / width
      raw[at + 1] = (y * 255) / height
      raw[at + 2] = 128
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** Width and height of the first JPEG in a buffer (SOF0 or SOF2 marker), or `null`. */
export function jpegSize(body: Buffer): { width: number; height: number } | null {
  const start = body.indexOf(Buffer.from([0xff, 0xd8, 0xff]))
  if (start < 0) return null
  let at = start + 2
  while (at + 9 < body.length) {
    if (body[at] !== 0xff) return null
    const marker = body[at + 1] as number
    // Fill bytes and markers without a length (TEM, RST0-7) carry no payload.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += marker === 0xff ? 1 : 2
      continue
    }
    const length = body.readUInt16BE(at + 2)
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: body.readUInt16BE(at + 5), width: body.readUInt16BE(at + 7) }
    }
    at += 2 + length
  }
  return null
}
