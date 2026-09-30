import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { UPLOADS_DIR } from './constants.js'

const MIME_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }
const MAX_BYTES = 2 * 1024 * 1024

function hasMagic(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte)
}

export function decodeFlagImage(imageData) {
  const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(String(imageData || ''))
  if (!match) throw new Error('Invalid image data')
  const mime = match[1].toLowerCase()
  const ext = MIME_EXT[mime]
  if (!ext) throw new Error('Unsupported image type')
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw new Error('Image size out of range')
  if (ext === '.png' && !hasMagic(buffer, [0x89, 0x50, 0x4e, 0x47])) throw new Error('Bad PNG signature')
  if (ext === '.jpg' && !hasMagic(buffer, [0xff, 0xd8, 0xff])) throw new Error('Bad JPEG signature')
  if (ext === '.webp' && buffer.subarray(0, 4).toString('ascii') !== 'RIFF') throw new Error('Bad WEBP signature')
  return { ext, buffer }
}

export function saveFlagImage(teamId, imageData) {
  const { ext, buffer } = decodeFlagImage(imageData)
  mkdirSync(UPLOADS_DIR, { recursive: true })
  const slug = String(teamId).replace(/[^a-z0-9]/gi, '').slice(0, 20) || 'team'
  const name = `${slug}_${randomBytes(3).toString('hex')}${ext}`
  writeFileSync(join(UPLOADS_DIR, name), buffer)
  return `/flags/${name}`
}
