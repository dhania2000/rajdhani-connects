import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ProductCatalogueView } from '@/components/contractor/catalogue/product-catalogue-view'

export const metadata: Metadata = { title: 'Product Catalogue – Rajdhani Connects' }

export default function CataloguePage() {
  return (
    <>
      <PageHeader title="Product Catalogue" subtitle="Tiles, sanitary, marble & more" />
      <ProductCatalogueView />
    </>
  )
}
