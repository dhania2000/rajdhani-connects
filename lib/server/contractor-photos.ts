import { execute, query, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { saveImageUpload } from './media'
import type { AdminSession } from './auth'

export interface ContractorPhoto {
  id: number
  url: string
  caption: string | null
  /** Upload date, YYYY-MM-DD (also stamped on the picture itself). */
  date: string
}

const toPhoto = (r: { id: number; image_url: string; caption: string | null; photo_date: string }): ContractorPhoto => ({
  id: Number(r.id),
  url: r.image_url,
  caption: r.caption,
  date: String(r.photo_date),
})

/** Newest first. */
export async function listContractorPhotos(contractorId: number) {
  const rows = await query<{ id: number; image_url: string; caption: string | null; photo_date: string }>(
    "SELECT id, image_url, caption, DATE_FORMAT(photo_date, '%Y-%m-%d') AS photo_date FROM contractor_photos WHERE contractor_id = ? ORDER BY photo_date DESC, id DESC",
    [contractorId],
  )
  return rows.map(toPhoto)
}

/**
 * Saves one photo (already date-stamped and shrunk in the browser). Photos go up one per request
 * because server actions accept at most 5 MB per request.
 */
export async function addContractorPhoto(admin: AdminSession, contractorId: number, file: File, caption: string | null, date: string) {
  const contractor = await queryOne<{ id: number }>('SELECT id FROM contractors WHERE id = ?', [contractorId])
  if (!contractor) return { ok: false as const, error: 'Contractor not found.' }
  const r = await saveImageUpload(file, admin.adminId)
  if (!r.ok) return { ok: false as const, error: r.error }
  const res = await execute(
    'INSERT INTO contractor_photos (contractor_id, image_url, caption, photo_date, uploaded_by_admin_id) VALUES (?, ?, ?, ?, ?)',
    [contractorId, r.url, caption, date, admin.adminId],
  )
  return { ok: true as const, photo: { id: Number(res.insertId), url: r.url, caption, date } satisfies ContractorPhoto }
}

/** One notification + audit entry after a batch of photos has been uploaded. */
export async function finishContractorPhotoUpload(admin: AdminSession, contractorId: number, count: number, caption: string | null) {
  if (count <= 0) return { ok: true as const }
  await withTransaction(async (conn) => {
    const n = await execute(
      `INSERT INTO notifications (kind, event_type, title, body, created_by_type, created_by_id)
       VALUES ('system', 'gallery_photos', 'New photos in your gallery', ?, 'admin', ?)`,
      [`${count} new photo${count === 1 ? '' : 's'} added to your Gallery.${caption ? ` ${caption}` : ''}`.slice(0, 500), admin.adminId],
      conn,
    )
    await execute('INSERT INTO notification_recipients (notification_id, contractor_id) VALUES (?, ?)', [n.insertId, contractorId], conn)
  })
  await writeAudit({
    actorType: 'admin',
    actorId: admin.adminId,
    action: 'contractor.photos_uploaded',
    entityType: 'contractor',
    entityId: contractorId,
    summary: `${count} gallery photo(s) uploaded`,
  })
  return { ok: true as const }
}

export async function deleteContractorPhoto(admin: AdminSession, photoId: number) {
  const photo = await queryOne<{ contractor_id: number }>('SELECT contractor_id FROM contractor_photos WHERE id = ?', [photoId])
  if (!photo) return { ok: false as const, error: 'Photo not found.' }
  await execute('DELETE FROM contractor_photos WHERE id = ?', [photoId])
  await writeAudit({
    actorType: 'admin',
    actorId: admin.adminId,
    action: 'contractor.photo_deleted',
    entityType: 'contractor',
    entityId: Number(photo.contractor_id),
    summary: 'Gallery photo removed',
  })
  return { ok: true as const }
}
