import type { Pool, RowDataPacket } from 'mysql2/promise'

/**
 * One-time catalogue additions. Each batch runs once per database (tracked in
 * contractor_app_configuration), so products an admin later edits or deletes are never re-added.
 */
const SEEDS: { key: string; brand: string; products: SeedProduct[] }[] = [
  {
    // Sample products for every other category so the catalogue, points and Visualizer can be tested.
    // Brand "Sample" makes them easy to find and delete later.
    key: 'seed_sample_products_v1',
    brand: 'Sample',
    products: [
      { category: 'tiles', name: 'Carrara Marble Look Tile 600x600', unit: 'per box (4 pcs)', points: 20, description: 'Glossy vitrified floor and wall tile with a white Carrara marble look. Sample product for testing.', image: '/images/products/samples/carrara-marble-tile.jpg', texture: '/images/products/samples/carrara-marble-tile.jpg', tileSizeMm: [600, 600], order: 50 },
      { category: 'tiles', name: 'Oak Wood Plank Tile 1200x200', unit: 'per box (6 pcs)', points: 25, description: 'Matt wooden-finish plank tile for floors. Sample product for testing.', image: '/images/products/samples/oak-wood-plank.jpg', texture: '/images/products/samples/oak-wood-plank.jpg', tileSizeMm: [1200, 200], order: 51 },
      { category: 'tiles', name: 'Grey Concrete Matt Tile 600x1200', unit: 'per box (2 pcs)', points: 30, description: 'Large-format matt grey concrete-look tile for floors and walls. Sample product for testing.', image: '/images/products/samples/grey-concrete-tile.jpg', texture: '/images/products/samples/grey-concrete-tile.jpg', tileSizeMm: [600, 1200], order: 52 },
      { category: 'marble', name: 'Statuario White Marble', unit: 'per sq. ft.', points: 5, description: 'Premium white marble with bold grey veining. Sample product for testing.', image: '/images/products/samples/statuario-marble.jpg', texture: '/images/products/samples/statuario-marble.jpg', tileSizeMm: [600, 600], order: 53 },
      { category: 'marble', name: 'Nero Marquina Black Marble', unit: 'per sq. ft.', points: 6, description: 'Black marble with white veins for feature walls and counters. Sample product for testing.', image: '/images/products/samples/nero-marquina-marble.jpg', texture: '/images/products/samples/nero-marquina-marble.jpg', tileSizeMm: [600, 600], order: 54 },
      { category: 'stone', name: 'Kota Blue Stone', unit: 'per sq. ft.', points: 2, description: 'Natural blue-grey Kota stone for floors, terraces and outdoor paving. Sample product for testing.', image: '/images/products/samples/kota-blue-stone.jpg', texture: '/images/products/samples/kota-blue-stone.jpg', tileSizeMm: [600, 600], order: 55 },
      { category: 'stone', name: 'Jaisalmer Golden Stone', unit: 'per sq. ft.', points: 3, description: 'Natural golden-yellow Jaisalmer stone for elevations and garden paving. Sample product for testing.', image: '/images/products/samples/jaisalmer-yellow-stone.jpg', texture: '/images/products/samples/jaisalmer-yellow-stone.jpg', tileSizeMm: [600, 600], order: 56 },
      { category: 'sanitary', name: 'Wall-hung Basin 500mm', unit: 'per piece', points: 40, description: 'White ceramic wall-hung wash basin. Sample product for testing.', order: 57 },
      { category: 'sanitary', name: 'Single-lever Basin Mixer', unit: 'per piece', points: 35, description: 'Chrome single-lever basin mixer tap. Sample product for testing.', order: 58 },
      { category: 'sanitary', name: 'Health Faucet Set', unit: 'per set', points: 15, description: 'Health faucet with hose and holder. Sample product for testing.', order: 59 },
      { category: 'other', name: 'Tile Spacers 2mm (200 pcs)', unit: 'per pack', points: 5, description: 'Plastic tile spacers for even 2mm joints. Sample product for testing.', order: 60 },
      { category: 'other', name: 'Epoxy Tile Grout 1kg', unit: 'per tub', points: 12, description: 'Stain-proof epoxy grout for tile joints. Sample product for testing.', order: 61 },
    ],
  },
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
  /** Product picture; omitted = the category picture is shown. */
  image?: string
  description: string
  /** Category code; defaults to "adhesive". */
  category?: string
  /** Defaults to "per 20 kg bag". */
  unit?: string
  /** Flat surface image for the Visualizer. */
  texture?: string
  tileSizeMm?: [number, number]
  /** Display order within the category; defaults to the product's position in its batch (1, 2, ...). */
  order?: number
}

const UNIT = 'per 20 kg bag'

const CATEGORY_DEFAULTS: Record<string, { name: string; image: string; order: number }> = {
  adhesive: { name: 'Tile Adhesive / Glue', image: '/images/products/adhesive.png', order: 3 },
  tiles: { name: 'Tiles', image: '/images/products/tiles.png', order: 1 },
  sanitary: { name: 'Sanitary', image: '/images/products/sanitary.png', order: 2 },
  marble: { name: 'Marble', image: '/images/products/marble.png', order: 4 },
  stone: { name: 'Stone', image: '/images/products/stone.png', order: 5 },
  other: { name: 'Other Products', image: '/images/products/other.png', order: 6 },
}

/** Finds a category by its code, creating it (with the standard name/picture) if an admin removed it. */
async function categoryId(pool: Pool, slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM product_categories WHERE slug = ? LIMIT 1', [slug])
  if (rows[0]) return Number(rows[0].id)
  const d = CATEGORY_DEFAULTS[slug] ?? { name: slug, image: null, order: 99 }
  const [r] = await pool.query<RowDataPacket[] & { insertId: number }>(
    "INSERT INTO product_categories (slug, name, image_url, display_order, status) VALUES (?, ?, ?, ?, 'active')",
    [slug, d.name, d.image, d.order],
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

    for (const [i, p] of seed.products.entries()) {
      const [exists] = await pool.query<RowDataPacket[]>('SELECT 1 FROM products WHERE name = ? LIMIT 1', [p.name])
      if (exists.length > 0) continue
      await pool.query(
        `INSERT INTO products (category_id, name, brand, unit, reward_points, description, image_url, texture_url, tile_width_mm, tile_height_mm, display_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          await categoryId(pool, p.category ?? 'adhesive'),
          p.name,
          seed.brand,
          p.unit ?? UNIT,
          p.points,
          p.description,
          p.image ?? null,
          p.texture ?? null,
          p.tileSizeMm?.[0] ?? null,
          p.tileSizeMm?.[1] ?? null,
          p.order ?? i + 1,
        ],
      )
    }
  }
}
