import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

export type Conn = Pool | PoolConnection

const globalForDb = globalThis as unknown as { rtsPool?: Pool }

const REQUIRED_DB_ENV = ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'] as const

export function isDbConfigured() {
  return REQUIRED_DB_ENV.every((key) => Boolean(process.env[key]))
}

function getConnectionConfig() {
  const missing = REQUIRED_DB_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Database env vars missing: ${missing.join(', ')}. Add them in Settings > Vars.`)
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  }
}

export function getPool(): Pool {
  if (!globalForDb.rtsPool) {
    const pool = mysql.createPool({
      ...getConnectionConfig(),
      connectionLimit: 5,
      waitForConnections: true,
      timezone: 'Z',
      dateStrings: true,
      decimalNumbers: true,
      supportBigNumbers: true,
      charset: 'utf8mb4',
    })
    pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'")
    })
    globalForDb.rtsPool = pool
  }
  return globalForDb.rtsPool
}

const globalForSchema = globalThis as unknown as { rtsSchema?: Promise<void> }

// Creates every table on first use against an empty database, so the store never has to import SQL by hand.
export function ensureSchema() {
  globalForSchema.rtsSchema ??= (async () => {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'audit_logs'",
    )
    if (Number(rows[0]?.n ?? 0) > 0) return
    const [{ readFile }, path] = await Promise.all([import('node:fs/promises'), import('node:path')])
    const sql = await readFile(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8')
    const conn = await mysql.createConnection({
      ...getConnectionConfig(),
      multipleStatements: true,
    })
    try {
      await conn.query(sql)
    } finally {
      await conn.end()
    }
  })().catch((error) => {
    globalForSchema.rtsSchema = undefined
    throw error
  })
  return globalForSchema.rtsSchema
}

export async function query<T = RowDataPacket>(sql: string, params: unknown[] = [], conn?: Conn): Promise<T[]> {
  if (!conn) await ensureSchema()
  const [rows] = await (conn ?? getPool()).query<RowDataPacket[]>(sql, params)
  return rows as T[]
}

export async function queryOne<T = RowDataPacket>(sql: string, params: unknown[] = [], conn?: Conn): Promise<T | null> {
  const rows = await query<T>(sql, params, conn)
  return rows[0] ?? null
}

export async function execute(sql: string, params: unknown[] = [], conn?: Conn): Promise<ResultSetHeader> {
  if (!conn) await ensureSchema()
  const [result] = await (conn ?? getPool()).execute<ResultSetHeader>(sql, params as never[])
  return result
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  await ensureSchema()
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
