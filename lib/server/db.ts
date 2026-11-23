import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

export type Conn = Pool | PoolConnection

const globalForDb = globalThis as unknown as { rtsPool?: Pool }

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it in Settings > Vars.')
  }
  if (!globalForDb.rtsPool) {
    const pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5,
      waitForConnections: true,
      timezone: 'Z',
      dateStrings: true,
      decimalNumbers: true,
      supportBigNumbers: true,
      charset: 'utf8mb4',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
    pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'")
    })
    globalForDb.rtsPool = pool
  }
  return globalForDb.rtsPool
}

export async function query<T = RowDataPacket>(sql: string, params: unknown[] = [], conn?: Conn): Promise<T[]> {
  const [rows] = await (conn ?? getPool()).query<RowDataPacket[]>(sql, params)
  return rows as T[]
}

export async function queryOne<T = RowDataPacket>(sql: string, params: unknown[] = [], conn?: Conn): Promise<T | null> {
  const rows = await query<T>(sql, params, conn)
  return rows[0] ?? null
}

export async function execute(sql: string, params: unknown[] = [], conn?: Conn): Promise<ResultSetHeader> {
  const [result] = await (conn ?? getPool()).execute<ResultSetHeader>(sql, params as never[])
  return result
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY'
}

export function padCode(prefix: string, id: number, width = 6) {
  return `${prefix}${String(id).padStart(width, '0')}`
}
