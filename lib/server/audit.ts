import { execute, type Conn } from './db'

export interface AuditEntry {
  actorType: 'admin' | 'contractor' | 'system'
  actorId: number | null
  action: string
  entityType: string
  entityId?: number | null
  summary?: string
  metadata?: Record<string, unknown>
  ip?: string | null
}

export async function writeAudit(entry: AuditEntry, conn?: Conn) {
  await execute(
    `INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, summary, metadata, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorType,
      entry.actorId,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.summary?.slice(0, 255) ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ip ?? null,
    ],
    conn,
  )
}
