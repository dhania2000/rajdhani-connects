import type { Pool, RowDataPacket } from 'mysql2/promise'

/**
 * One-time catalogue additions. Each batch runs once per database (tracked in
 * contractor_app_configuration), so products an admin later edits or deletes are never re-added.
 */
const SEEDS: { key: string; brand: string; products: SeedProduct[] }[] = [
  {
    key: 'seed_derron_tf_d1_v1',
    brand: 'Derron',
    products: [
      {
        name: 'TF-D1 Extreme Density Tile Adhesive',
        points: 10,
        image: '/images/products/derron-tf-d1.jpg',
        // Listed first in Tile Adhesive / Glue, above the Furbo XD range.
        order: 0,
        description:
          'C1E Type 1 tile adhesive (IS 15477, ISO certified). High bond strength, water resistant, heat and weather resistant, easy workability. Extreme density formula. 20 kg bag.',
      },
    ],
  },
  {
    key: 'seed_furbo_xd_adhesives_v1',
    brand: 'Furbo',
    products: [
      {
        name: 'XD15 Pro Strength Tile Adhesive',
        points: 15,
        image: '/images/products/furbo-xd15.jpg',
        description:
          'Type 1 (C1E) polymer-modified tile adhesive for internal floors. Fixes ceramic and vitrified floor tiles in kitchens, bathrooms, covered balconies and internal areas. Ready to mix, high strength. Open time min. 30 min @27°C. Covers about 3 sq m per 20 kg at 3 mm bed. Grey. Do not mix with cement.',
      },
      {
        name: 'XD30 Pro Strength Tile Adhesive',
        points: 30,
        image: '/images/products/furbo-xd30.jpg',
        description:
          'Type 2 (C2TE) polymer-modified tile adhesive for internal walls and floors. Fixes vitrified tiles up to 600x1200 mm, wall tiles and tile-on-tile. Ready to mix, high strength. Open time min. 30 min @27°C. Covers about 3 sq m per 20 kg at 3 mm bed. Grey and White. Do not mix with cement.',
      },
      {
        name: 'XD55 Pro Strength Tile Adhesive',
        points: 55,
        image: '/images/products/furbo-xd55.jpg',
        description:
          'Type 3 (C2TE) polymer-modified tile adhesive for internal and external walls and floors. Fixes all tiles, mosaics, marble and natural stone; suits terraces, open balconies and heavy-traffic commercial areas. Open time min. 30 min @27°C. Covers about 3 sq m per 20 kg at 3 mm bed. Grey and White. Do not mix with cement.',
      },
      {
        name: 'XD90 Pro Strength Tile Adhesive',
        points: 90,
        image: '/images/products/furbo-xd90.jpg',
        description:
          'Type 3 (C2TES1) highly flexible tile adhesive for internal and external walls and floors. For large-format tiles, marble, natural stone and swimming pool tiles; slip resistant with extended open time (min. 40 min @27°C). Covers about 3 sq m per 20 kg at 3 mm bed. Grey and White. Do not mix with cement.',
      },
    ],
  },
]

interface SeedProduct {
  name: string
  points: number
  image: string
  description: string
  /** Display order within the category; defaults to the product's position in its batch (1, 2, ...). */
  order?: number
}

const UNIT = 'per 20 kg bag'

/** Finds the tile adhesive category (seeded as slug "adhesive"), creating it if an admin removed it. */
async function adhesiveCategory(pool: Pool) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM product_categories WHERE slug = 'adhesive' OR name LIKE '%adhesive%' ORDER BY slug = 'adhesive' DESC, id LIMIT 1",
  )
  if (rows[0]) return Number(rows[0].id)
  const [r] = await pool.query<RowDataPacket[] & { insertId: number }>(
    "INSERT INTO product_categories (slug, name, image_url, display_order, status) VALUES ('adhesive', 'Tile Adhesive / Glue', '/images/products/adhesive.png', 3, 'active')",
  )
  return Number((r as unknown as { insertId: number }).insertId)
}

export async function runCatalogueSeeds(pool: Pool) {
  for (const seed of SEEDS) {
    const [done] = await pool.query<RowDataPacket[]>('SELECT 1 FROM contractor_app_configuration WHERE config_key = ?', [seed.key])
    if (done.length > 0) continue
    // Claim the seed first so concurrent workers never insert twice.
    const [claim] = await pool.query<RowDataPacket[] & { affectedRows: number }>(
      "INSERT IGNORE INTO contractor_app_configuration (config_key, config_value) VALUES (?, 'done')",
      [seed.key],
    )
    if ((claim as unknown as { affectedRows: number }).affectedRows === 0) continue

    const categoryId = await adhesiveCategory(pool)
    for (const [i, p] of seed.products.entries()) {
      const [exists] = await pool.query<RowDataPacket[]>('SELECT 1 FROM products WHERE name = ? LIMIT 1', [p.name])
      if (exists.length > 0) continue
      await pool.query(
        `INSERT INTO products (category_id, name, brand, unit, reward_points, description, image_url, display_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [categoryId, p.name, seed.brand, UNIT, p.points, p.description, p.image, p.order ?? i + 1],
      )
    }
  }
}
