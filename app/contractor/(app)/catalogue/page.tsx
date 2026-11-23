import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ProductCatalogueView } from '@/components/contractor/catalogue/product-catalogue-view'
import { getProductCatalogue } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Product Catalogue – Rajdhani Connects' }

export default async function CataloguePage() {
  const { categories, products } = await getProductCatalogue()
  return (
    <>
      <PageHeader title="Product Catalogue" subtitle="Tiles, sanitary, marble & more" />
      <ProductCatalogueView categories={categories} products={products} />
    </>
  )
}
