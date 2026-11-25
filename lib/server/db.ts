import { runCatalogueSeeds } from './catalogue-seed'
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
    throw new Error(`Database env vars missing: ${missing.join(', ')}. Set them in the server environment.`)
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    // Match the tables' collation (schema.sql uses utf8mb4_unicode_ci) so text parameters and
    // literals never mix collations; plain 'utf8mb4' would use utf8mb4_general_ci.
    charset: 'UTF8MB4_UNICODE_CI',
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
    })
    pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'")
    })
    globalForDb.rtsPool = pool
  }
  return globalForDb.rtsPool
}

const globalForSchema = globalThis as unknown as { rtsSchema?: Promise<void> }

// Databases created by an earlier schema.sql need these additive changes.
async function runMigrations() {
  const [cols] = await getPool().query<RowDataPacket[]>(
    "SELECT COLUMN_TYPE AS t FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contractors' AND column_name = 'account_status'",
  )
  if (!String(cols[0]?.t ?? '').includes("'archived'")) {
    await getPool().query(
      "ALTER TABLE contractors MODIFY account_status ENUM('pending_approval','active','suspended','inactive','archived') NOT NULL DEFAULT 'pending_approval'",
    )
  }
  await getPool().query(ACCOUNT_ENTRIES_DDL)
  // Admin-entered reward points for a sale; NULL means the reward rules decide.
  const [manualPoints] = await getPool().query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reward_activities' AND column_name = 'manual_points'",
  )
  if (manualPoints.length === 0) {
    await getPool().query('ALTER TABLE reward_activities ADD COLUMN manual_points BIGINT UNSIGNED NULL AFTER eligible_amount')
  }
  // Product description, managed in the admin Product Catalogue and shown in the contractor app.
  const [productDescription] = await getPool().query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'description'",
  )
  if (productDescription.length === 0) {
    await getPool().query('ALTER TABLE products ADD COLUMN description TEXT NULL AFTER scheme_label')
  }
  // Optional reward points per unit for a catalogue product.
  const [productPoints] = await getPool().query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'reward_points'",
  )
  if (productPoints.length === 0) {
    await getPool().query('ALTER TABLE products ADD COLUMN reward_points BIGINT UNSIGNED NULL AFTER scheme_label')
  }
  // Visualizer: flat texture image and real tile size for catalogue products.
  for (const [column, ddl] of [
    ['texture_url', 'ALTER TABLE products ADD COLUMN texture_url VARCHAR(500) NULL AFTER image_url'],
    ['tile_width_mm', 'ALTER TABLE products ADD COLUMN tile_width_mm INT UNSIGNED NULL AFTER texture_url'],
    ['tile_height_mm', 'ALTER TABLE products ADD COLUMN tile_height_mm INT UNSIGNED NULL AFTER tile_width_mm'],
  ] as const) {
    const [has] = await getPool().query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = ?",
      [column],
    )
    if (has.length === 0) await getPool().query(ddl)
  }
  await getPool().query(ENQUIRIES_DDL)
  await getPool().query(ENQUIRY_ITEMS_DDL)
  // Cart items created before amount/activity_id existed.
  for (const [column, ddl] of [
    ['amount', 'ALTER TABLE product_enquiry_items ADD COLUMN amount DECIMAL(12,2) NULL AFTER points_per_unit'],
    ['activity_id', 'ALTER TABLE product_enquiry_items ADD COLUMN activity_id BIGINT UNSIGNED NULL AFTER amount'],
  ] as const) {
    const [has] = await getPool().query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'product_enquiry_items' AND column_name = ?",
      [column],
    )
    if (has.length === 0) await getPool().query(ddl)
  }
  await getPool().query(SALE_RETURNS_DDL)
  await runCatalogueSeeds(getPool())
}

// Kept in sync with database/schema.sql (partial sale returns).
const SALE_RETURNS_DDL = `CREATE TABLE IF NOT EXISTS sale_returns (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_id         BIGINT UNSIGNED NOT NULL,
  quantity            DECIMAL(12,2)   NOT NULL DEFAULT 0,
  amount              DECIMAL(12,2)   NOT NULL DEFAULT 0,
  points              BIGINT UNSIGNED NOT NULL DEFAULT 0,
  tokens              BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reason              VARCHAR(255)    NOT NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sale_returns_activity (activity_id),
  CONSTRAINT fk_sale_returns_activity FOREIGN KEY (activity_id) REFERENCES reward_activities (id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_returns_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

// Kept in sync with database/schema.sql (contractor cart requests).
const ENQUIRIES_DDL = `CREATE TABLE IF NOT EXISTS product_enquiries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_code        VARCHAR(30)     NULL,
  contractor_id       BIGINT UNSIGNED NOT NULL,
  customer_name       VARCHAR(150)    NULL,
  customer_mobile     VARCHAR(20)     NULL,
  note                VARCHAR(1000)   NULL,
  estimated_points    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status              ENUM('new','contacted','completed','cancelled') NOT NULL DEFAULT 'new',
  admin_note          VARCHAR(500)    NULL,
  idempotency_key     VARCHAR(64)     NOT NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enquiry_code (enquiry_code),
  UNIQUE KEY uq_enquiry_idempotency (idempotency_key),
  KEY idx_enquiries_status (status, created_at),
  KEY idx_enquiries_contractor (contractor_id, created_at),
  CONSTRAINT fk_enquiries_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiries_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

const ENQUIRY_ITEMS_DDL = `CREATE TABLE IF NOT EXISTS product_enquiry_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_id      BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NULL,
  product_name    VARCHAR(150)    NOT NULL,
  brand           VARCHAR(80)     NULL,
  unit            VARCHAR(60)     NULL,
  category_name   VARCHAR(80)     NULL,
  quantity        DECIMAL(12,2)   NOT NULL,
  points_per_unit BIGINT UNSIGNED NULL,
  amount          DECIMAL(12,2)   NULL,
  activity_id     BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_enquiry_items (enquiry_id),
  CONSTRAINT fk_enquiry_items_enquiry FOREIGN KEY (enquiry_id) REFERENCES product_enquiries (id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

// Kept in sync with database/schema.sql so existing databases gain the table without a manual import.
const ACCOUNT_ENTRIES_DDL = `CREATE TABLE IF NOT EXISTS contractor_account_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_id       BIGINT UNSIGNED NOT NULL,
  entry_type          ENUM('opening','credit','debit','udhar','advance') NOT NULL,
  amount              DECIMAL(14,2)   NOT NULL,
  description         VARCHAR(200)    NOT NULL,
  reference           VARCHAR(80)     NULL,
  entry_date          DATE            NOT NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_account_entries_contractor (contractor_id, entry_date),
  CONSTRAINT fk_account_entries_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE,
  CONSTRAINT fk_account_entries_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

// Creates every table on first use against an empty database, so the store never has to import SQL by hand.
export function ensureSchema() {
  globalForSchema.rtsSchema ??= (async () => {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'audit_logs'",
    )
    if (Number(rows[0]?.n ?? 0) > 0) return runMigrations()
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
    await runCatalogueSeeds(getPool())
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
