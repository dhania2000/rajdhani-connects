import { randomBytes } from 'node:crypto'
import { execute, queryOne } from './db'

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type ImageType = (typeof ALLOWED_TYPES)[number]

const globalForMedia = globalThis as unknown as { rtsMediaTable?: Promise<void> }

// Existing databases were created before media storage existed, so the table is added lazily.
function ensureMediaTable() {
  globalForMedia.rtsMediaTable ??= execute(
    `CREATE TABLE IF NOT EXISTS media_files (
       id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       media_key     CHAR(32)        NOT NULL UNIQUE,
       mime_type     VARCHAR(50)     NOT NULL,
       size_bytes    INT UNSIGNED    NOT NULL,
       original_name VARCHAR(255)    NULL,
       data          MEDIUMBLOB      NOT NULL,
       uploaded_by_admin_id BIGINT UNSIGNED NULL,
       created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ).then(
    () => undefined,
    (error) => {
      globalForMedia.rtsMediaTable = undefined
      throw error
    },
  )
  return globalForMedia.rtsMediaTable
}

// Trust the file's bytes, not the browser-supplied MIME type.
function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return 'image/gif'
  return null
}

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value === 'object' && value !== null && 'arrayBuffer' in value && value.size > 0
}

export async function saveImageUpload(file: File, adminId: number | null) {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false as const, error: 'Image must be 4 MB or smaller.' }
  const buf = Buffer.from(await file.arrayBuffer())
  const mime = sniffImageType(buf)
  if (!mime) return { ok: false as const, error: 'Upload a JPG, PNG, WebP, or GIF image.' }
  await ensureMediaTable()
  const key = randomBytes(16).toString('hex')
  await execute(
    'INSERT INTO media_files (media_key, mime_type, size_bytes, original_name, data, uploaded_by_admin_id) VALUES (?, ?, ?, ?, ?, ?)',
    [key, mime, buf.length, file.name.slice(0, 255) || null, buf, adminId],
  )
  return { ok: true as const, url: `/api/media/${key}` }
}

export async function getMedia(key: string) {
  if (!/^[a-f0-9]{32}$/.test(key)) return null
  await ensureMediaTable()
  return queryOne<{ mime_type: string; data: Buffer }>('SELECT mime_type, data FROM media_files WHERE media_key = ?', [key])
}
